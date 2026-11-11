// Google Drive API v3 を fetch で呼ぶ薄いラッパー
import {
  AuthRequiredError,
  DriveApiError,
  FileNotFoundError,
  NetworkError,
  QuotaExceededError,
} from '../errors';

export interface DriveFile {
  id: string;
  name: string;
  parents?: string[];
  appProperties?: Record<string, string>;
  createdTime?: string;
}

const API = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
const FILE_FIELDS = 'id,name,parents,appProperties,createdTime';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

export interface DriveApiOptions {
  getToken: () => string;
  onUnauthorized: () => void;
  fetchFn?: typeof fetch;
}

export class DriveApi {
  private readonly getToken: () => string;
  private readonly onUnauthorized: () => void;
  private readonly fetchFn: typeof fetch;

  constructor(opts: DriveApiOptions) {
    this.getToken = opts.getToken;
    this.onUnauthorized = opts.onUnauthorized;
    this.fetchFn = opts.fetchFn ?? ((input, init) => fetch(input, init));
  }

  async listFiles(q: string): Promise<DriveFile[]> {
    const params = new URLSearchParams({
      q,
      fields: `files(${FILE_FIELDS})`,
      orderBy: 'createdTime',
      pageSize: '100',
      spaces: 'drive',
    });
    const res = await this.request(`${API}?${params}`, { method: 'GET' });
    const body = (await res.json()) as { files?: DriveFile[] };
    return body.files ?? [];
  }

  async createFolder(name: string, parentId: string, appProperties: Record<string, string>): Promise<DriveFile> {
    const res = await this.request(`${API}?fields=${FILE_FIELDS}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parentId], appProperties }),
    });
    return (await res.json()) as DriveFile;
  }

  async createFile(
    name: string,
    parentId: string,
    mimeType: string,
    content: Blob | string,
    appProperties?: Record<string, string>,
  ): Promise<DriveFile> {
    const boundary = `kawa-${crypto.randomUUID()}`;
    const metadata = JSON.stringify({ name, parents: [parentId], ...(appProperties ? { appProperties } : {}) });
    const body = new Blob([
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
      `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
      content,
      `\r\n--${boundary}--`,
    ]);
    const res = await this.request(`${UPLOAD}?uploadType=multipart&fields=${FILE_FIELDS}`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    });
    return (await res.json()) as DriveFile;
  }

  async downloadText(fileId: string): Promise<string> {
    const res = await this.download(fileId);
    return res.text();
  }

  async downloadBlob(fileId: string): Promise<Blob> {
    const res = await this.download(fileId);
    return res.blob();
  }

  async updateContent(fileId: string, content: Blob | string, mimeType: string): Promise<void> {
    await this.request(`${UPLOAD}/${encodeURIComponent(fileId)}?uploadType=media`, {
      method: 'PATCH',
      headers: { 'Content-Type': mimeType },
      body: content,
    });
  }

  async trash(fileId: string): Promise<void> {
    await this.request(`${API}/${encodeURIComponent(fileId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trashed: true }),
    });
  }

  private download(fileId: string): Promise<Response> {
    return this.request(`${API}/${encodeURIComponent(fileId)}?alt=media`, { method: 'GET', cache: 'no-store' });
  }

  private async request(url: string, init: RequestInit): Promise<Response> {
    const token = this.getToken();
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    let res: Response;
    try {
      res = await this.fetchFn(url, { ...init, headers });
    } catch (e) {
      throw new NetworkError(e instanceof Error ? e.message : 'network error');
    }
    if (res.ok) return res;
    const reason = await readReason(res);
    if (res.status === 401) {
      this.onUnauthorized();
      throw new AuthRequiredError('token expired or revoked');
    }
    if (res.status === 403 && reason === 'storageQuotaExceeded') throw new QuotaExceededError();
    if (res.status === 404) throw new FileNotFoundError(url);
    throw new DriveApiError(res.status, reason);
  }
}

async function readReason(res: Response): Promise<string | null> {
  try {
    const body = (await res.json()) as { error?: { errors?: { reason?: string }[] } };
    return body.error?.errors?.[0]?.reason ?? null;
  } catch {
    return null;
  }
}

export type DriveApiLike = Pick<
  DriveApi,
  'listFiles' | 'createFolder' | 'createFile' | 'downloadText' | 'downloadBlob' | 'updateContent' | 'trash'
>;
