// 画面とデータ保存をつなぐ状態管理（設計書 3.4 / 3.5 / 4.3）
import type { LocalCache } from '../cache/localCache';
import type { AuthService } from '../drive/auth';
import {
  addCare,
  addItem,
  addPhoto,
  addWearDate,
  createItem,
  deleteCare,
  deleteItem,
  deletePhoto,
  removeWearDate,
  toggleWearDate,
  updateCare,
  updateItem,
  updatePhoto,
} from '../domain/mutations';
import type { CareInput, DiaryData, Item, ItemInput, Photo, PhotoMeta } from '../domain/types';
import { AuthRequiredError } from '../errors';
import type { PreparedPhoto } from '../images/preparePhoto';
import type { Repository } from '../storage/repository';
import { SaveQueue } from './saveQueue';

export type SetupStatus = 'unknown' | 'needsFolder' | 'ready';

export interface AppState {
  data: DiaryData | null;
  signedIn: boolean;
  setup: SetupStatus;
  syncing: boolean;
  loadError: unknown | null;
}

export interface ControllerDeps {
  repo: Repository;
  auth: AuthService;
  pickFolder: () => Promise<string | null>;
  cache: LocalCache;
  newId?: () => string;
  now?: () => Date;
}

const FULL_IMAGE_LIMIT = 20;

export class AppController {
  private state: AppState = { data: null, signedIn: false, setup: 'unknown', syncing: false, loadError: null };
  private readonly listeners = new Set<() => void>();
  private readonly queue = new SaveQueue();
  private readonly fullImages = new Map<string, Blob>();
  private readonly repo: Repository;
  private readonly auth: AuthService;
  private readonly cache: LocalCache;
  private readonly pickFolderFn: () => Promise<string | null>;
  private readonly newId: () => string;
  private readonly now: () => Date;

  constructor(deps: ControllerDeps) {
    this.repo = deps.repo;
    this.auth = deps.auth;
    this.cache = deps.cache;
    this.pickFolderFn = deps.pickFolder;
    this.newId = deps.newId ?? (() => crypto.randomUUID());
    this.now = deps.now ?? (() => new Date());
    // 保存済みトークンで分かる範囲のログイン状態を最初から反映する
    this.state = { ...this.state, signedIn: this.auth.isSignedIn() };
  }

  getState = (): AppState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private setState(patch: Partial<AppState>) {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l();
  }

  private nowIso(): string {
    return this.now().toISOString();
  }

  private async setData(data: DiaryData) {
    this.setState({ data });
    await this.cache.setData(data);
  }

  async start(): Promise<void> {
    const cached = await this.cache.getData();
    if (cached && !this.state.data) this.setState({ data: cached });
    try {
      await this.auth.prepare();
    } catch {
      // 読み込めなくてもキャッシュは見られる。ログイン時に再試行される
    }
    const signedIn = this.auth.isSignedIn();
    this.setState({ signedIn });
    if (signedIn) await this.refresh();
  }

  async signIn(): Promise<void> {
    // ポップアップがブロックされないよう、await より前に呼ぶ
    const pending = this.auth.signIn();
    try {
      await pending;
    } catch (e) {
      // GIS の読み込みに失敗していた場合に備え、次のタップ用に準備し直す
      this.auth.prepare().catch(() => {});
      throw e;
    }
    this.setState({ signedIn: true, loadError: null });
    await this.refresh();
  }

  async refresh(): Promise<void> {
    if (!this.auth.isSignedIn()) {
      this.setState({ signedIn: false });
      return;
    }
    this.setState({ syncing: true });
    try {
      if (!(await this.repo.findSetup())) {
        this.setState({ setup: 'needsFolder', loadError: null });
        return;
      }
      await this.setData(await this.repo.load());
      this.setState({ setup: 'ready', loadError: null });
    } catch (e) {
      this.setState({ loadError: e, ...(e instanceof AuthRequiredError ? { signedIn: false } : {}) });
    } finally {
      this.setState({ syncing: false });
    }
  }

  async chooseFolder(): Promise<void> {
    try {
      const folderId = await this.pickFolderFn();
      if (!folderId) return;
      await this.repo.setup(folderId);
    } catch (e) {
      this.setState({ loadError: e, ...(e instanceof AuthRequiredError ? { signedIn: false } : {}) });
      return;
    }
    await this.refresh();
  }

  // 保存の前提（ログイン済み・保存先決定済み）を整える
  private async ensureReady(): Promise<void> {
    if (!this.auth.isSignedIn()) {
      this.setState({ signedIn: false });
      throw new AuthRequiredError();
    }
    if (this.state.setup !== 'ready') {
      await this.refresh();
      const after = this.getState();
      if (after.setup !== 'ready') throw after.loadError ?? new Error('storage is not ready');
    }
  }

  private async withAuth<T>(task: () => Promise<T>): Promise<T> {
    try {
      return await task();
    } catch (e) {
      if (e instanceof AuthRequiredError) this.setState({ signedIn: false });
      throw e;
    }
  }

  private async save(fn: (data: DiaryData) => DiaryData): Promise<DiaryData> {
    await this.ensureReady();
    const next = await this.withAuth(() => this.queue.run(() => this.repo.mutate(fn)));
    await this.setData(next);
    return next;
  }

  private async upload(prepared: PreparedPhoto, meta: PhotoMeta): Promise<Photo> {
    await this.ensureReady();
    const id = this.newId();
    const uploaded = await this.withAuth(() => this.repo.uploadPhoto(id, prepared.full, prepared.thumb));
    await this.cache.setThumb(uploaded.thumbFileId, prepared.thumb);
    return {
      id,
      takenAt: meta.takenAt,
      memo: meta.memo,
      fileId: uploaded.fileId,
      thumbFileId: uploaded.thumbFileId,
      width: prepared.width,
      height: prepared.height,
    };
  }

  private async trash(photos: Photo[]): Promise<void> {
    const ids = photos.flatMap((p) => [p.fileId, p.thumbFileId]);
    if (ids.length === 0) return;
    for (const id of ids) this.fullImages.delete(id);
    await this.cache.deleteThumbs(ids);
    try {
      await this.repo.trashFiles(ids);
    } catch (e) {
      // data.json は更新済み。ファイルが残っても参照されないだけなので警告のみ
      console.warn('failed to trash files', e);
    }
  }

  async saveItem(input: ItemInput, itemId?: string): Promise<string> {
    const now = this.nowIso();
    if (itemId) {
      await this.save((d) => updateItem(d, itemId, input, now));
      return itemId;
    }
    const id = this.newId();
    await this.save((d) => addItem(d, createItem(input, id, now)));
    return id;
  }

  async deleteItem(itemId: string): Promise<void> {
    let removed: Item | undefined;
    await this.save((d) => {
      removed = d.items.find((i) => i.id === itemId);
      return deleteItem(d, itemId);
    });
    if (removed) await this.trash(removed.photos);
  }

  async addPhoto(itemId: string, prepared: PreparedPhoto, meta: PhotoMeta): Promise<void> {
    const photo = await this.upload(prepared, meta);
    const now = this.nowIso();
    await this.save((d) => addPhoto(d, itemId, photo, now));
  }

  async updatePhoto(itemId: string, photoId: string, meta: PhotoMeta): Promise<void> {
    const now = this.nowIso();
    await this.save((d) => updatePhoto(d, itemId, photoId, meta, now));
  }

  async deletePhoto(itemId: string, photoId: string): Promise<void> {
    let removed: Photo | undefined;
    const now = this.nowIso();
    await this.save((d) => {
      removed = d.items.find((i) => i.id === itemId)?.photos.find((p) => p.id === photoId);
      return deletePhoto(d, itemId, photoId, now);
    });
    if (removed) await this.trash([removed]);
  }

  async saveCare(itemId: string, input: CareInput, prepared: PreparedPhoto | null, careId?: string): Promise<void> {
    const now = this.nowIso();
    if (careId) {
      await this.save((d) => updateCare(d, itemId, careId, input, now));
      return;
    }
    const photo = prepared ? await this.upload(prepared, { takenAt: input.date, memo: '' }) : null;
    const care = { id: this.newId(), ...input, photoId: photo?.id ?? null };
    await this.save((d) => addCare(photo ? addPhoto(d, itemId, photo, now) : d, itemId, care, now));
  }

  async deleteCare(itemId: string, careId: string): Promise<void> {
    const now = this.nowIso();
    await this.save((d) => deleteCare(d, itemId, careId, now));
  }

  async toggleWear(itemId: string, date: string): Promise<void> {
    const now = this.nowIso();
    await this.save((d) => toggleWearDate(d, itemId, date, now));
  }

  async addWear(itemId: string, date: string): Promise<void> {
    const now = this.nowIso();
    await this.save((d) => addWearDate(d, itemId, date, now));
  }

  async removeWear(itemId: string, date: string): Promise<void> {
    const now = this.nowIso();
    await this.save((d) => removeWearDate(d, itemId, date, now));
  }

  async loadImage(fileId: string, size: 'thumb' | 'full'): Promise<Blob> {
    if (size === 'thumb') {
      const cached = await this.cache.getThumb(fileId);
      if (cached) return cached;
      const blob = await this.withAuth(() => this.repo.getImage(fileId));
      await this.cache.setThumb(fileId, blob);
      return blob;
    }
    const hit = this.fullImages.get(fileId);
    if (hit) return hit;
    const blob = await this.withAuth(() => this.repo.getImage(fileId));
    this.fullImages.set(fileId, blob);
    // 本体画像はメモリに少しだけ持つ（端末には保存しない）
    if (this.fullImages.size > FULL_IMAGE_LIMIT) {
      const oldest = this.fullImages.keys().next().value;
      if (oldest !== undefined) this.fullImages.delete(oldest);
    }
    return blob;
  }
}
