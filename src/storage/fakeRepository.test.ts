import { expect, it } from 'vitest';
import { addItem } from '../domain/mutations';
import { makeData, makeItem } from '../domain/testData';
import { FileNotFoundError } from '../errors';
import { createFakeRepository } from './fakeRepository';

it('setup → mutate → load の往復', async () => {
  const repo = createFakeRepository();
  expect(await repo.findSetup()).toBe(false);
  await repo.setup('folder');
  expect(await repo.findSetup()).toBe(true);
  const next = await repo.mutate((d) => addItem(d, makeItem()));
  expect(next.items).toHaveLength(1);
  expect(await repo.load()).toEqual(makeData([makeItem()]));
  expect(repo.peekData()).toEqual(makeData([makeItem()]));
});

it('読み書きで参照を共有しない', async () => {
  const repo = createFakeRepository({ configured: true, data: makeData([makeItem()]) });
  const loaded = await repo.load();
  loaded.items[0].name = '書き換え';
  expect((await repo.load()).items[0].name).toBe('ブーツ');
});

it('uploadPhoto → getImage の往復、無い ID は FileNotFoundError', async () => {
  const repo = createFakeRepository({ configured: true });
  const { fileId, thumbFileId } = await repo.uploadPhoto('p1', new Blob(['full']), new Blob(['thumb']));
  expect(fileId).not.toBe(thumbFileId);
  expect(await (await repo.getImage(fileId)).text()).toBe('full');
  expect(repo.files.get(thumbFileId)).toBeDefined();
  await repo.trashFiles([fileId]);
  await expect(repo.getImage(fileId)).rejects.toBeInstanceOf(FileNotFoundError);
});

it('setup 前の load はエラー', async () => {
  const repo = createFakeRepository();
  await expect(repo.load()).rejects.toThrow('storage is not set up');
});
