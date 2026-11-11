import { beforeEach, describe, expect, it } from 'vitest';
import { AuthRequiredError } from '../errors';
import { createGisAuth, type GisLike, type TokenClientConfig } from './auth';

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
}

const NOW = 1_800_000_000_000;

function fakeGis() {
  const state: { lastConfig: TokenClientConfig | null; requested: unknown[] } = { lastConfig: null, requested: [] };
  const gis: GisLike = {
    accounts: {
      oauth2: {
        initTokenClient(config) {
          state.lastConfig = config;
          return {
            requestAccessToken(overrides) {
              state.requested.push(overrides);
            },
          };
        },
      },
    },
  };
  return { gis, state };
}

let storage: MemoryStorage;
let now: number;
let fake: ReturnType<typeof fakeGis>;
const make = () =>
  createGisAuth({ clientId: 'cid', scope: 'scope-x', storage, now: () => now, loadGis: async () => fake.gis });

beforeEach(() => {
  storage = new MemoryStorage();
  now = NOW;
  fake = fakeGis();
});

describe('createGisAuth', () => {
  it('初期状態は未ログイン', () => {
    const auth = make();
    expect(auth.isSignedIn()).toBe(false);
    expect(() => auth.getToken()).toThrow(AuthRequiredError);
  });

  it('signIn でトークンと期限を保存', async () => {
    const auth = make();
    await auth.prepare();
    expect(fake.state.lastConfig).toMatchObject({ client_id: 'cid', scope: 'scope-x' });
    const p = auth.signIn();
    expect(fake.state.requested).toEqual([{ prompt: '' }]);
    fake.state.lastConfig!.callback({ access_token: 'tok', expires_in: 3600 });
    await p;
    expect(auth.isSignedIn()).toBe(true);
    expect(auth.getToken()).toBe('tok');
    expect(JSON.parse(storage.getItem('kawa-diary.token')!)).toEqual({
      accessToken: 'tok',
      expiresAt: NOW + 3600_000,
      scope: 'scope-x',
    });
  });

  it('再起動後も期限内ならログイン済み', () => {
    storage.setItem('kawa-diary.token', JSON.stringify({ accessToken: 'tok', expiresAt: NOW + 3600_000, scope: 'scope-x' }));
    expect(make().getToken()).toBe('tok');
  });

  it('期限の 60 秒前で無効になる', () => {
    storage.setItem('kawa-diary.token', JSON.stringify({ accessToken: 'tok', expiresAt: NOW + 3600_000, scope: 'scope-x' }));
    const auth = make();
    now = NOW + 3600_000 - 61_000;
    expect(auth.isSignedIn()).toBe(true);
    now = NOW + 3600_000 - 59_000;
    expect(auth.isSignedIn()).toBe(false);
  });

  it('clear でログアウト', () => {
    storage.setItem('kawa-diary.token', JSON.stringify({ accessToken: 'tok', expiresAt: NOW + 3600_000, scope: 'scope-x' }));
    const auth = make();
    auth.clear();
    expect(auth.isSignedIn()).toBe(false);
    expect(storage.getItem('kawa-diary.token')).toBeNull();
  });

  it('ポップアップを閉じたら AuthRequiredError', async () => {
    const auth = make();
    await auth.prepare();
    const p = auth.signIn();
    fake.state.lastConfig!.error_callback!({ type: 'popup_closed' });
    await expect(p).rejects.toBeInstanceOf(AuthRequiredError);
  });

  it('応答にエラーがあれば AuthRequiredError', async () => {
    const auth = make();
    await auth.prepare();
    const p = auth.signIn();
    fake.state.lastConfig!.callback({ error: 'access_denied' });
    await expect(p).rejects.toBeInstanceOf(AuthRequiredError);
  });

  it('prepare 前の signIn は AuthRequiredError', async () => {
    await expect(make().signIn()).rejects.toBeInstanceOf(AuthRequiredError);
  });

  it('スコープが違う（設定変更前の）保存済みトークンは未ログイン扱い', () => {
    storage.setItem('kawa-diary.token', JSON.stringify({ accessToken: 'old', expiresAt: NOW + 3600_000, scope: 'other' }));
    expect(make().isSignedIn()).toBe(false);
    expect(() => make().getToken()).toThrow(AuthRequiredError);
    storage.setItem('kawa-diary.token', JSON.stringify({ accessToken: 'old', expiresAt: NOW + 3600_000 }));
    expect(make().isSignedIn()).toBe(false);
  });

  it('壊れた保存値は未ログイン扱い', () => {
    storage.setItem('kawa-diary.token', '{oops');
    expect(make().isSignedIn()).toBe(false);
  });
});
