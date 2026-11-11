import { describe, expect, it, vi } from 'vitest';
import {
  AuthRequiredError,
  DriveApiError,
  FileNotFoundError,
  NetworkError,
  QuotaExceededError,
} from '../errors';
import { DriveApi } from './driveApi';

function setup(response: Response | Error = Response.json({})) {
  const fetchFn = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
  const onUnauthorized = vi.fn();
  const api = new DriveApi({ getToken: () => 'tok', onUnauthorized, fetchFn: fetchFn as unknown as typeof fetch });
  const call = (i = 0) => fetchFn.mock.calls[i] as unknown as [string, RequestInit];
  return { api, fetchFn, onUnauthorized, call };
}

describe('DriveApi', () => {
  it('listFiles は q をエンコードしトークンを付ける', async () => {
    const { api, call } = setup(Response.json({ files: [{ id: 'a', name: 'data.json' }] }));
    expect(await api.listFiles("name = 'data.json'")).toEqual([{ id: 'a', name: 'data.json' }]);
    const [url, init] = call();
    expect(new URL(url).searchParams.get('q')).toBe("name = 'data.json'");
    expect(new URL(url).searchParams.get('orderBy')).toBe('createdTime');
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer tok');
  });

  it('createFolder はフォルダの mimeType と親を送る', async () => {
    const { api, call } = setup(Response.json({ id: 'f1', name: 'photos' }));
    expect(await api.createFolder('photos', 'root1', { kawaDiary: 'photos' })).toEqual({ id: 'f1', name: 'photos' });
    const [url, init] = call();
    expect(url).toContain('https://www.googleapis.com/drive/v3/files');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      name: 'photos',
      mimeType: 'application/vnd.google-apps.folder',
      parents: ['root1'],
      appProperties: { kawaDiary: 'photos' },
    });
  });

  it('createFile は multipart/related でメタデータと本体を送る', async () => {
    const { api, call } = setup(Response.json({ id: 'd1', name: 'data.json' }));
    await api.createFile('data.json', 'root1', 'application/json', '{"version":1}', { kawaDiary: 'data' });
    const [url, init] = call();
    expect(url).toContain('https://www.googleapis.com/upload/drive/v3/files');
    expect(new URL(url).searchParams.get('uploadType')).toBe('multipart');
    expect(new Headers(init.headers).get('Content-Type')).toMatch(/^multipart\/related; boundary=/);
    const body = await (init.body as Blob).text();
    expect(body).toContain('"name":"data.json"');
    expect(body).toContain('"parents":["root1"]');
    expect(body).toContain('"appProperties":{"kawaDiary":"data"}');
    expect(body).toContain('Content-Type: application/json\r\n\r\n{"version":1}');
  });

  it('updateContent は PATCH uploadType=media', async () => {
    const { api, call } = setup(Response.json({ id: 'd1' }));
    await api.updateContent('d1', '{}', 'application/json');
    const [url, init] = call();
    expect(url).toBe('https://www.googleapis.com/upload/drive/v3/files/d1?uploadType=media');
    expect(init.method).toBe('PATCH');
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json');
  });

  it('trash は trashed: true を送る', async () => {
    const { api, call } = setup(Response.json({ id: 'x' }));
    await api.trash('x');
    const [url, init] = call();
    expect(url).toBe('https://www.googleapis.com/drive/v3/files/x');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ trashed: true });
  });

  it('download は alt=media かつ cache: no-store', async () => {
    const { api, call } = setup(new Response('hello'));
    expect(await api.downloadText('d1')).toBe('hello');
    const [url, init] = call();
    expect(url).toBe('https://www.googleapis.com/drive/v3/files/d1?alt=media');
    expect(init.cache).toBe('no-store');
  });

  it('downloadBlob は Blob を返す', async () => {
    const { api } = setup(new Response(new Blob(['img'], { type: 'image/jpeg' })));
    const blob = await api.downloadBlob('f1');
    expect(await blob.text()).toBe('img');
  });

  it('401 で onUnauthorized を呼び AuthRequiredError', async () => {
    const { api, onUnauthorized } = setup(new Response('', { status: 401 }));
    await expect(api.listFiles('x')).rejects.toBeInstanceOf(AuthRequiredError);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('403 storageQuotaExceeded は QuotaExceededError', async () => {
    const body = { error: { code: 403, errors: [{ reason: 'storageQuotaExceeded' }] } };
    const { api } = setup(Response.json(body, { status: 403 }));
    await expect(api.createFile('a.jpg', 'p', 'image/jpeg', new Blob(['x']))).rejects.toBeInstanceOf(QuotaExceededError);
  });

  it('その他の 403 は DriveApiError(403)', async () => {
    const body = { error: { code: 403, errors: [{ reason: 'insufficientFilePermissions' }] } };
    const { api } = setup(Response.json(body, { status: 403 }));
    await expect(api.createFolder('photos', 'p', {})).rejects.toMatchObject({
      constructor: DriveApiError,
      status: 403,
      reason: 'insufficientFilePermissions',
    });
  });

  it('404 は FileNotFoundError', async () => {
    const { api } = setup(Response.json({ error: { code: 404 } }, { status: 404 }));
    await expect(api.downloadBlob('nope')).rejects.toBeInstanceOf(FileNotFoundError);
  });

  it('fetch 失敗は NetworkError', async () => {
    const { api } = setup(new TypeError('Failed to fetch'));
    await expect(api.listFiles('x')).rejects.toBeInstanceOf(NetworkError);
  });

  it('getToken が投げたら fetch しない', async () => {
    const fetchFn = vi.fn();
    const api = new DriveApi({
      getToken: () => {
        throw new AuthRequiredError();
      },
      onUnauthorized: vi.fn(),
      fetchFn,
    });
    await expect(api.listFiles('x')).rejects.toBeInstanceOf(AuthRequiredError);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
