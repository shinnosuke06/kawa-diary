import { describe, expect, it, vi } from 'vitest';
import { createMemoryCache } from '../cache/localCache';
import type { AuthService } from '../drive/auth';
import { deleteItem } from '../domain/mutations';
import { makeData, makeItem } from '../domain/testData';
import { AuthRequiredError, FolderNotWritableError, MissingRecordError } from '../errors';
import type { PreparedPhoto } from '../images/preparePhoto';
import { createFakeRepository } from '../storage/fakeRepository';
import { AppController } from './controller';

function controllableAuth(signedIn: boolean): AuthService & { expire(): void } {
  let ok = signedIn;
  return {
    prepare: async () => {},
    isSignedIn: () => ok,
    getToken: () => {
      if (!ok) throw new AuthRequiredError();
      return 'tok';
    },
    signIn: async () => {
      ok = true;
    },
    clear: () => {
      ok = false;
    },
    expire: () => {
      ok = false;
    },
  };
}

const prepared = (): PreparedPhoto => ({
  full: new Blob(['full'], { type: 'image/jpeg' }),
  thumb: new Blob(['thumb'], { type: 'image/jpeg' }),
  width: 2048,
  height: 1365,
  takenAt: '2026-11-11',
});

function setup(opts: { configured?: boolean; data?: ReturnType<typeof makeData>; signedIn?: boolean; picked?: string | null } = {}) {
  const repo = createFakeRepository({ configured: opts.configured ?? true, data: opts.data ?? makeData() });
  const auth = controllableAuth(opts.signedIn ?? true);
  const cache = createMemoryCache();
  let n = 0;
  const c = new AppController({
    repo,
    auth,
    cache,
    pickFolder: async () => (opts.picked === undefined ? 'folder' : opts.picked),
    newId: () => `id-${++n}`,
    now: () => new Date('2026-11-11T10:00:00.000Z'),
  });
  return { c, repo, auth, cache };
}

describe('起動', () => {
  it('起動時はキャッシュを先に表示し、その後ドライブの最新に差し替える', async () => {
    const cache = createMemoryCache();
    await cache.setData(makeData([makeItem({ id: 'old' })]));
    const repo = createFakeRepository({ configured: true, data: makeData([makeItem({ id: 'new' })]) });
    const c = new AppController({ repo, auth: controllableAuth(true), pickFolder: async () => null, cache });
    const seen: string[][] = [];
    c.subscribe(() => seen.push(c.getState().data?.items.map((i) => i.id) ?? []));
    await c.start();
    expect(seen[0]).toEqual(['old']);
    expect(c.getState().data?.items.map((i) => i.id)).toEqual(['new']);
    expect(c.getState()).toMatchObject({ signedIn: true, setup: 'ready', syncing: false, loadError: null });
    expect((await cache.getData())?.items.map((i) => i.id)).toEqual(['new']);
  });

  it('未ログインならドライブを読まず、キャッシュだけ表示', async () => {
    const { c, cache } = setup({ signedIn: false });
    await cache.setData(makeData([makeItem({ id: 'cached' })]));
    await c.start();
    expect(c.getState()).toMatchObject({ signedIn: false, setup: 'unknown' });
    expect(c.getState().data?.items.map((i) => i.id)).toEqual(['cached']);
  });

  it('signIn 後に読み込む', async () => {
    const { c } = setup({ signedIn: false, data: makeData([makeItem()]) });
    await c.start();
    await c.signIn();
    expect(c.getState()).toMatchObject({ signedIn: true, setup: 'ready' });
    expect(c.getState().data?.items).toHaveLength(1);
  });
});

describe('初回設定', () => {
  it('保存先が未設定なら needsFolder → フォルダを選ぶと ready', async () => {
    const { c } = setup({ configured: false });
    await c.start();
    expect(c.getState().setup).toBe('needsFolder');
    await c.chooseFolder();
    expect(c.getState().setup).toBe('ready');
    expect(c.getState().data).toEqual({ version: 1, items: [] });
  });

  it('フォルダ選択をキャンセルしたら needsFolder のまま', async () => {
    const { c } = setup({ configured: false, picked: null });
    await c.start();
    await c.chooseFolder();
    expect(c.getState().setup).toBe('needsFolder');
  });

  it('フォルダに作れなければ loadError に FolderNotWritableError', async () => {
    const { c, repo } = setup({ configured: false });
    repo.setup = async () => {
      throw new FolderNotWritableError();
    };
    await c.start();
    await c.chooseFolder();
    expect(c.getState().loadError).toBeInstanceOf(FolderNotWritableError);
    expect(c.getState().setup).toBe('needsFolder');
  });
});

describe('保存', () => {
  it('saveItem で持ち物が増え、キャッシュも更新される', async () => {
    const { c, cache, repo } = setup();
    await c.start();
    const id = await c.saveItem({ name: '501', brand: '', category: 'jeans', purchaseDate: null, price: null, memo: '' });
    expect(id).toBe('id-1');
    expect(c.getState().data?.items.map((i) => i.name)).toEqual(['501']);
    expect((await cache.getData())?.items).toHaveLength(1);
    expect(repo.peekData()?.items[0].createdAt).toBe('2026-11-11T10:00:00.000Z');
    await c.saveItem({ name: '501XX', brand: '', category: 'jeans', purchaseDate: null, price: null, memo: '' }, id);
    expect(repo.peekData()?.items.map((i) => i.name)).toEqual(['501XX']);
  });

  it('addPhoto は2ファイルをアップロードし写真を追加、サムネイルをキャッシュ', async () => {
    const { c, repo, cache } = setup({ data: makeData([makeItem()]) });
    await c.start();
    await c.addPhoto('i1', prepared(), { takenAt: '2026-11-10', memo: '初日' });
    const photo = repo.peekData()!.items[0].photos[0];
    expect(photo).toMatchObject({ id: 'id-1', takenAt: '2026-11-10', memo: '初日', width: 2048, height: 1365 });
    expect(await repo.files.get(photo.fileId)?.text()).toBe('full');
    expect(await (await cache.getThumb(photo.thumbFileId))?.text()).toBe('thumb');
  });

  it('saveCare（写真あり）は写真と手入れを1回で保存し photoId でつなぐ', async () => {
    const { c, repo } = setup({ data: makeData([makeItem()]) });
    await c.start();
    const mutate = vi.spyOn(repo, 'mutate');
    await c.saveCare('i1', { date: '2026-11-11', type: 'oil', memo: 'ミンクオイル' }, prepared());
    expect(mutate).toHaveBeenCalledTimes(1);
    const item = repo.peekData()!.items[0];
    expect(item.photos).toHaveLength(1);
    expect(item.care[0]).toMatchObject({ type: 'oil', memo: 'ミンクオイル', photoId: item.photos[0].id });
    expect(item.photos[0].takenAt).toBe('2026-11-11');
  });

  it('saveCare（編集）は内容を更新する', async () => {
    const { c, repo } = setup({ data: makeData([makeItem()]) });
    await c.start();
    await c.saveCare('i1', { date: '2026-11-11', type: 'oil', memo: '' }, null);
    const careId = repo.peekData()!.items[0].care[0].id;
    await c.saveCare('i1', { date: '2026-11-12', type: 'brushing', memo: '馬毛' }, null, careId);
    expect(repo.peekData()!.items[0].care).toEqual([{ id: careId, date: '2026-11-12', type: 'brushing', memo: '馬毛', photoId: null }]);
  });

  it('deleteItem は写真ファイルをゴミ箱へ移す', async () => {
    const { c, repo } = setup({ data: makeData([makeItem()]) });
    await c.start();
    await c.addPhoto('i1', prepared(), { takenAt: '2026-11-10', memo: '' });
    expect(repo.files.size).toBe(2);
    await c.deleteItem('i1');
    expect(repo.files.size).toBe(0);
    expect(c.getState().data?.items).toEqual([]);
  });

  it('deletePhoto は写真ファイルとサムネイルのキャッシュを消す', async () => {
    const { c, repo, cache } = setup({ data: makeData([makeItem()]) });
    await c.start();
    await c.addPhoto('i1', prepared(), { takenAt: '2026-11-10', memo: '' });
    const photo = repo.peekData()!.items[0].photos[0];
    await c.deletePhoto('i1', photo.id);
    expect(repo.files.size).toBe(0);
    expect(await cache.getThumb(photo.thumbFileId)).toBeNull();
  });

  it('着用の切り替え・追加・削除', async () => {
    const { c, repo } = setup({ data: makeData([makeItem()]) });
    await c.start();
    await c.toggleWear('i1', '2026-11-11');
    await c.addWear('i1', '2026-01-05');
    expect(repo.peekData()!.items[0].wearDates).toEqual(['2026-01-05', '2026-11-11']);
    await c.removeWear('i1', '2026-01-05');
    await c.toggleWear('i1', '2026-11-11');
    expect(repo.peekData()!.items[0].wearDates).toEqual([]);
  });

  it('保存時にログインが切れていたら signedIn=false にして AuthRequiredError', async () => {
    const { c, auth } = setup({ data: makeData([makeItem()]) });
    await c.start();
    auth.expire();
    await expect(c.toggleWear('i1', '2026-11-11')).rejects.toBeInstanceOf(AuthRequiredError);
    expect(c.getState().signedIn).toBe(false);
  });

  it('ドライブ側でログイン切れ（401）なら signedIn=false にして AuthRequiredError', async () => {
    const { c, repo } = setup({ data: makeData([makeItem()]) });
    await c.start();
    repo.mutate = async () => {
      throw new AuthRequiredError();
    };
    await expect(c.toggleWear('i1', '2026-11-11')).rejects.toBeInstanceOf(AuthRequiredError);
    expect(c.getState().signedIn).toBe(false);
  });

  it('他の端末で削除された持ち物への保存は MissingRecordError で、持ち物は復活しない', async () => {
    const { c, repo } = setup({ data: makeData([makeItem()]) });
    await c.start();
    await repo.mutate((d) => deleteItem(d, 'i1'));
    await expect(c.toggleWear('i1', '2026-11-11')).rejects.toBeInstanceOf(MissingRecordError);
    expect(repo.peekData()?.items).toEqual([]);
  });
});

describe('画像', () => {
  it('loadImage(full) は2回目にドライブを読まない', async () => {
    const { c, repo } = setup({ data: makeData([makeItem()]) });
    await c.start();
    await c.addPhoto('i1', prepared(), { takenAt: '2026-11-10', memo: '' });
    const photo = repo.peekData()!.items[0].photos[0];
    const getImage = vi.spyOn(repo, 'getImage');
    expect(await (await c.loadImage(photo.fileId, 'full')).text()).toBe('full');
    await c.loadImage(photo.fileId, 'full');
    expect(getImage).toHaveBeenCalledTimes(1);
  });

  it('loadImage(thumb) はキャッシュにあればドライブを読まない', async () => {
    const { c, repo, cache } = setup();
    await c.start();
    await cache.setThumb('t9', new Blob(['cached']));
    const getImage = vi.spyOn(repo, 'getImage');
    expect(await (await c.loadImage('t9', 'thumb')).text()).toBe('cached');
    expect(getImage).not.toHaveBeenCalled();
  });
});
