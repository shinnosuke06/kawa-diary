// テスト・画面確認用のメモリ実装（本番ビルドには含めない）
import { emptyData } from '../domain/validate';
import type { DiaryData } from '../domain/types';
import { FileNotFoundError } from '../errors';
import { NotSetUpError, type Repository } from './repository';

export interface FakeRepository extends Repository {
  files: Map<string, Blob>;
  peekData(): DiaryData | null;
}

export function createFakeRepository(opts: { configured?: boolean; data?: DiaryData } = {}): FakeRepository {
  let data: DiaryData | null = opts.configured ? structuredClone(opts.data ?? emptyData()) : null;
  let counter = 0;
  const files = new Map<string, Blob>();
  const nextId = () => `fake-${++counter}`;

  const need = (): DiaryData => {
    if (!data) throw new NotSetUpError();
    return data;
  };

  return {
    files,
    peekData: () => (data ? structuredClone(data) : null),
    async findSetup() {
      return data !== null;
    },
    async setup() {
      data = emptyData();
    },
    async load() {
      return structuredClone(need());
    },
    async mutate(fn) {
      const next = fn(structuredClone(need()));
      data = structuredClone(next);
      return next;
    },
    async uploadPhoto(_photoId, full, thumb) {
      need();
      const fileId = nextId();
      const thumbFileId = nextId();
      files.set(fileId, full);
      files.set(thumbFileId, thumb);
      return { fileId, thumbFileId };
    },
    async getImage(fileId) {
      const blob = files.get(fileId);
      if (!blob) throw new FileNotFoundError(fileId);
      return blob;
    },
    async trashFiles(fileIds) {
      for (const id of fileIds) files.delete(id);
    },
  };
}
