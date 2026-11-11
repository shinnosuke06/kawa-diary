import type { DiaryData } from '../domain/types';

export interface UploadedPhoto {
  fileId: string;
  thumbFileId: string;
}

// 保存先のインターフェース（設計書 4.2）
export interface Repository {
  /** 既存の data.json が見つかり保存先が決まったら true */
  findSetup(): Promise<boolean>;
  /** 選ばれたフォルダに photos と data.json を作る */
  setup(folderId: string): Promise<void>;
  load(): Promise<DiaryData>;
  /** 最新を読み直して fn を適用し、書き込む */
  mutate(fn: (data: DiaryData) => DiaryData): Promise<DiaryData>;
  uploadPhoto(photoId: string, full: Blob, thumb: Blob): Promise<UploadedPhoto>;
  getImage(fileId: string): Promise<Blob>;
  trashFiles(fileIds: string[]): Promise<void>;
}

export class NotSetUpError extends Error {
  constructor() {
    super('storage is not set up');
    this.name = 'NotSetUpError';
  }
}
