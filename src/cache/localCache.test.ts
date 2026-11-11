import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { makeData, makeItem } from '../domain/testData';
import { createIdbCache, createMemoryCache } from './localCache';

it.each([
  ['idb', createIdbCache],
  ['memory', createMemoryCache],
])('%s: 初期は null、data と thumb の往復、削除', async (_name, make) => {
  const c = make();
  expect(await c.getData()).toBeNull();
  await c.setData(makeData([makeItem()]));
  expect(await c.getData()).toEqual(makeData([makeItem()]));
  await c.setThumb('t1', new Blob(['abc'], { type: 'image/jpeg' }));
  const b = await c.getThumb('t1');
  expect(b?.type).toBe('image/jpeg');
  expect(await b?.text()).toBe('abc');
  expect(await c.getThumb('none')).toBeNull();
  await c.deleteThumbs(['t1']);
  expect(await c.getThumb('t1')).toBeNull();
});
