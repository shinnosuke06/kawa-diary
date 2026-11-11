// Repository のドライブ実装（設計書 3.1.1 / 3.4）
import { APP_PROPERTY_KEY } from '../config';
import type { DriveApiLike } from '../drive/driveApi';
import { emptyData, parseDiaryData } from '../domain/validate';
import type { DiaryData } from '../domain/types';
import { DriveApiError, FileNotFoundError, FolderNotWritableError } from '../errors';
import { NotSetUpError, type Repository, type UploadedPhoto } from './repository';

interface Location {
  dataFileId: string;
  photosFolderId: string;
}

const marker = (value: string) => `appProperties has { key='${APP_PROPERTY_KEY}' and value='${value}' }`;

function toJson(data: DiaryData): string {
  return JSON.stringify(data, null, 2);
}

export function createDriveRepository(api: DriveApiLike): Repository {
  let location: Location | null = null;

  const need = (): Location => {
    if (!location) throw new NotSetUpError();
    return location;
  };

  async function findPhotosFolder(rootId: string): Promise<string> {
    const found = await api.listFiles(`${marker('photos')} and '${rootId}' in parents and trashed = false`);
    if (found.length > 0) return found[0].id;
    const created = await api.createFolder('photos', rootId, { [APP_PROPERTY_KEY]: 'photos' });
    return created.id;
  }

  const load = async (): Promise<DiaryData> => parseDiaryData(await api.downloadText(need().dataFileId));

  return {
    async findSetup() {
      const files = await api.listFiles(`${marker('data')} and trashed = false`);
      const dataFile = files[0];
      const rootId = dataFile?.parents?.[0];
      if (!dataFile || !rootId) return false;
      location = { dataFileId: dataFile.id, photosFolderId: await findPhotosFolder(rootId) };
      return true;
    },

    async setup(folderId) {
      try {
        const photos = await api.createFolder('photos', folderId, { [APP_PROPERTY_KEY]: 'photos' });
        const data = await api.createFile('data.json', folderId, 'application/json', toJson(emptyData()), {
          [APP_PROPERTY_KEY]: 'data',
        });
        location = { dataFileId: data.id, photosFolderId: photos.id };
      } catch (e) {
        if ((e instanceof DriveApiError && e.status === 403) || e instanceof FileNotFoundError) {
          throw new FolderNotWritableError();
        }
        throw e;
      }
    },

    load,

    async mutate(fn) {
      const { dataFileId } = need();
      const next = fn(await load());
      await api.updateContent(dataFileId, toJson(next), 'application/json');
      return next;
    },

    async uploadPhoto(photoId, full, thumb): Promise<UploadedPhoto> {
      const { photosFolderId } = need();
      const f = await api.createFile(`${photoId}.jpg`, photosFolderId, 'image/jpeg', full);
      const t = await api.createFile(`${photoId}_thumb.jpg`, photosFolderId, 'image/jpeg', thumb);
      return { fileId: f.id, thumbFileId: t.id };
    },

    getImage(fileId) {
      return api.downloadBlob(fileId);
    },

    async trashFiles(fileIds) {
      for (const id of fileIds) {
        try {
          await api.trash(id);
        } catch (e) {
          if (!(e instanceof FileNotFoundError)) throw e;
        }
      }
    },
  };
}
