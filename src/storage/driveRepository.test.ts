import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DriveApiLike } from '../drive/driveApi';
import { addItem, createItem } from '../domain/mutations';
import { makeData, makeItem } from '../domain/testData';
import {
  AuthRequiredError,
  DataFormatError,
  DriveApiError,
  FileNotFoundError,
  FolderNotWritableError,
  MissingRecordError,
} from '../errors';
import { createDriveRepository } from './driveRepository';
import type { Repository } from './repository';

type Stub = { [K in keyof DriveApiLike]: ReturnType<typeof vi.fn> };

let api: Stub;
let repo: Repository;

beforeEach(() => {
  api = {
    listFiles: vi.fn().mockResolvedValue([]),
    createFolder: vi.fn().mockResolvedValue({ id: 'ph-new', name: 'photos' }),
    createFile: vi.fn().mockResolvedValue({ id: 'd-new', name: 'data.json' }),
    downloadText: vi.fn(),
    downloadBlob: vi.fn(),
    updateContent: vi.fn().mockResolvedValue(undefined),
    trash: vi.fn().mockResolvedValue(undefined),
  };
  repo = createDriveRepository(api as unknown as DriveApiLike);
});

async function existingSetup() {
  api.listFiles
    .mockResolvedValueOnce([{ id: 'd1', name: 'data.json', parents: ['root1'] }])
    .mockResolvedValueOnce([{ id: 'ph1', name: 'photos' }]);
  await repo.findSetup();
}

describe('findSetup', () => {
  it('data.json が無ければ false', async () => {
    expect(await repo.findSetup()).toBe(false);
    expect(api.listFiles.mock.calls[0][0]).toBe("appProperties has { key='kawaDiary' and value='data' } and trashed = false");
  });

  it('2台目の端末: 既存の data.json と photos を再利用し何も作らない', async () => {
    api.listFiles
      .mockResolvedValueOnce([{ id: 'd1', name: 'data.json', parents: ['root1'] }])
      .mockResolvedValueOnce([{ id: 'ph1', name: 'photos' }]);
    expect(await repo.findSetup()).toBe(true);
    expect(api.createFolder).not.toHaveBeenCalled();
    expect(api.createFile).not.toHaveBeenCalled();
    expect(api.listFiles.mock.calls[1][0]).toBe(
      "appProperties has { key='kawaDiary' and value='photos' } and 'root1' in parents and trashed = false",
    );
  });

  it('photos フォルダが消えていたら作り直す', async () => {
    api.listFiles.mockResolvedValueOnce([{ id: 'd1', name: 'data.json', parents: ['root1'] }]).mockResolvedValueOnce([]);
    expect(await repo.findSetup()).toBe(true);
    expect(api.createFolder).toHaveBeenCalledWith('photos', 'root1', { kawaDiary: 'photos' });
  });
});

describe('setup', () => {
  it('選ばれたフォルダに photos と空の data.json を作る', async () => {
    await repo.setup('picked');
    expect(api.createFolder).toHaveBeenCalledWith('photos', 'picked', { kawaDiary: 'photos' });
    const [name, parent, mime, content, props] = api.createFile.mock.calls[0];
    expect([name, parent, mime, props]).toEqual(['data.json', 'picked', 'application/json', { kawaDiary: 'data' }]);
    expect(JSON.parse(content as string)).toEqual({ version: 1, items: [] });
    api.downloadText.mockResolvedValue(content);
    expect(await repo.load()).toEqual({ version: 1, items: [] });
    expect(api.downloadText).toHaveBeenCalledWith('d-new');
  });

  it.each([new DriveApiError(403, 'insufficientFilePermissions'), new FileNotFoundError()])(
    'setup で作れなければ FolderNotWritableError (%s)',
    async (err) => {
      api.createFolder.mockRejectedValue(err);
      await expect(repo.setup('picked')).rejects.toBeInstanceOf(FolderNotWritableError);
    },
  );
});

describe('保存前', () => {
  it('保存先が決まる前の load はエラー', async () => {
    await expect(repo.load()).rejects.toThrow('storage is not set up');
  });
});

describe('mutate', () => {
  beforeEach(existingSetup);

  it('最新を読み直してから適用する（他端末の変更を消さない）', async () => {
    const other = makeData([makeItem({ id: 'other' })]);
    api.downloadText.mockResolvedValue(JSON.stringify(other));
    const next = await repo.mutate((d) =>
      addItem(d, createItem({ name: 'mine', brand: '', category: 'other', purchaseDate: null, price: null, memo: '' }, 'mine', 'now')),
    );
    expect(next.items.map((i) => i.id)).toEqual(['other', 'mine']);
    const [fileId, written, mime] = api.updateContent.mock.calls[0];
    expect([fileId, mime]).toEqual(['d1', 'application/json']);
    expect(JSON.parse(written as string).items.map((i: { id: string }) => i.id)).toEqual(['other', 'mine']);
    expect(written).toBe(JSON.stringify(next, null, 2));
  });

  it('fn が投げたら書き込まない', async () => {
    api.downloadText.mockResolvedValue(JSON.stringify(makeData()));
    await expect(
      repo.mutate(() => {
        throw new MissingRecordError();
      }),
    ).rejects.toBeInstanceOf(MissingRecordError);
    expect(api.updateContent).not.toHaveBeenCalled();
  });

  it('data.json が壊れていたら DataFormatError で書き込まない', async () => {
    api.downloadText.mockResolvedValue('{broken');
    await expect(repo.mutate((d) => d)).rejects.toBeInstanceOf(DataFormatError);
    expect(api.updateContent).not.toHaveBeenCalled();
  });

  it('ログイン切れ（AuthRequiredError）はそのまま投げる', async () => {
    api.downloadText.mockRejectedValue(new AuthRequiredError());
    await expect(repo.mutate((d) => d)).rejects.toBeInstanceOf(AuthRequiredError);
  });
});

describe('写真', () => {
  beforeEach(existingSetup);

  it('uploadPhoto のファイル名と保存先', async () => {
    api.createFile.mockResolvedValueOnce({ id: 'full1', name: 'p9.jpg' }).mockResolvedValueOnce({ id: 'thumb1', name: 'p9_thumb.jpg' });
    const full = new Blob(['f']);
    const thumb = new Blob(['t']);
    expect(await repo.uploadPhoto('p9', full, thumb)).toEqual({ fileId: 'full1', thumbFileId: 'thumb1' });
    expect(api.createFile).toHaveBeenNthCalledWith(1, 'p9.jpg', 'ph1', 'image/jpeg', full);
    expect(api.createFile).toHaveBeenNthCalledWith(2, 'p9_thumb.jpg', 'ph1', 'image/jpeg', thumb);
  });

  it('getImage は downloadBlob', async () => {
    const blob = new Blob(['x']);
    api.downloadBlob.mockResolvedValue(blob);
    expect(await repo.getImage('f1')).toBe(blob);
  });

  it('trashFiles は見つからないファイルを無視して続ける', async () => {
    api.trash.mockRejectedValueOnce(new FileNotFoundError()).mockResolvedValueOnce(undefined);
    await repo.trashFiles(['gone', 'ok']);
    expect(api.trash).toHaveBeenCalledTimes(2);
    expect(api.trash).toHaveBeenLastCalledWith('ok');
  });
});
