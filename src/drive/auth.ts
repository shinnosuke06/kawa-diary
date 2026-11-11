// Google Identity Services でアクセストークンを取得・保持する（設計書 4.3）
import { AuthRequiredError } from '../errors';
import { loadScript } from './loadScript';

export interface AuthService {
  /** GIS を読み込みトークンクライアントを作る。何度呼んでもよい */
  prepare(): Promise<void>;
  /** 有効期限の 60 秒前までを有効とみなす */
  isSignedIn(): boolean;
  /** 無効なら AuthRequiredError */
  getToken(): string;
  /** タップ処理の中から直接呼ぶ（await を挟まない） */
  signIn(): Promise<void>;
  clear(): void;
}

export interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
}

export interface TokenClientConfig {
  client_id: string;
  scope: string;
  callback: (response: TokenResponse) => void;
  error_callback?: (error: { type: string }) => void;
}

export interface GisLike {
  accounts: {
    oauth2: {
      initTokenClient(config: TokenClientConfig): { requestAccessToken(overrides?: { prompt?: string }): void };
    };
  };
}

const STORAGE_KEY = 'kawa-diary.token';
const MARGIN_MS = 60_000;

interface StoredToken {
  accessToken: string;
  expiresAt: number;
}

async function loadGisDefault(): Promise<GisLike> {
  await loadScript('https://accounts.google.com/gsi/client');
  return (window as unknown as { google: GisLike }).google;
}

export function createGisAuth(opts: {
  clientId: string;
  scope: string;
  storage?: Storage;
  now?: () => number;
  loadGis?: () => Promise<GisLike>;
}): AuthService {
  const storage = opts.storage ?? localStorage;
  const now = opts.now ?? Date.now;
  const loadGis = opts.loadGis ?? loadGisDefault;
  let client: { requestAccessToken(overrides?: { prompt?: string }): void } | null = null;
  let preparing: Promise<void> | null = null;
  let pending: { resolve: () => void; reject: (e: unknown) => void } | null = null;

  const read = (): StoredToken | null => {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const t = JSON.parse(raw) as StoredToken;
      return typeof t.accessToken === 'string' && typeof t.expiresAt === 'number' ? t : null;
    } catch {
      return null;
    }
  };

  const settle = (error: unknown | null) => {
    const p = pending;
    pending = null;
    if (!p) return;
    if (error) p.reject(error);
    else p.resolve();
  };

  const auth: AuthService = {
    prepare() {
      preparing ??= loadGis().then((gis) => {
        client = gis.accounts.oauth2.initTokenClient({
          client_id: opts.clientId,
          scope: opts.scope,
          callback: (res) => {
            if (res.error || !res.access_token) {
              settle(new AuthRequiredError(res.error ?? 'no access token'));
              return;
            }
            const token: StoredToken = { accessToken: res.access_token, expiresAt: now() + (res.expires_in ?? 3600) * 1000 };
            storage.setItem(STORAGE_KEY, JSON.stringify(token));
            settle(null);
          },
          error_callback: (err) => settle(new AuthRequiredError(err.type)),
        });
      });
      preparing.catch(() => {
        preparing = null;
      });
      return preparing;
    },

    isSignedIn() {
      const t = read();
      return t !== null && t.expiresAt - MARGIN_MS > now();
    },

    getToken() {
      const t = read();
      if (!t || t.expiresAt - MARGIN_MS <= now()) throw new AuthRequiredError();
      return t.accessToken;
    },

    signIn() {
      if (!client) return Promise.reject(new AuthRequiredError('準備中です。もう一度押してください。'));
      settle(new AuthRequiredError('superseded'));
      const p = new Promise<void>((resolve, reject) => {
        pending = { resolve, reject };
      });
      client.requestAccessToken({ prompt: '' });
      return p;
    },

    clear() {
      storage.removeItem(STORAGE_KEY);
    },
  };
  return auth;
}

// 画面確認用。常にログイン済み
export function createFakeAuth(): AuthService {
  return {
    prepare: async () => {},
    isSignedIn: () => true,
    getToken: () => 'fake-token',
    signIn: async () => {},
    clear: () => {},
  };
}
