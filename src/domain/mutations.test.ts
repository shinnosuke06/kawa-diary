import { describe, expect, it } from 'vitest';
import { MissingRecordError } from '../errors';
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
} from './mutations';
import { makeCare, makeData, makeItem, makePhoto } from './testData';
import type { ItemInput } from './types';

const NOW = '2026-11-11T10:00:00.000Z';

describe('持ち物', () => {
  it('createItem', () => {
    const it1 = createItem(
      { name: ' 501 ', brand: " Levi's ", category: 'jeans', purchaseDate: null, price: 15000, memo: '' },
      'i9',
      NOW,
    );
    expect(it1).toMatchObject({
      id: 'i9',
      name: '501',
      brand: "Levi's",
      category: 'jeans',
      price: 15000,
      photos: [],
      care: [],
      wearDates: [],
      createdAt: NOW,
      updatedAt: NOW,
    });
  });
  it('addItem は末尾に追加', () => {
    const d = addItem(makeData([makeItem({ id: 'a' })]), makeItem({ id: 'b' }));
    expect(d.items.map((i) => i.id)).toEqual(['a', 'b']);
  });
  it('updateItem は写真を残して項目と updatedAt を更新', () => {
    const d = makeData([makeItem({ photos: [makePhoto()] })]);
    const next = updateItem(
      d,
      'i1',
      { name: 'エンジニアブーツ', brand: 'RED WING', category: 'shoes', purchaseDate: '2024-01-01', price: 50000, memo: '' },
      NOW,
    );
    expect(next.items[0]).toMatchObject({ name: 'エンジニアブーツ', price: 50000, updatedAt: NOW });
    expect(next.items[0].photos).toHaveLength(1);
  });
  it('deleteItem', () => {
    expect(deleteItem(makeData([makeItem()]), 'i1').items).toEqual([]);
  });
});

it('他端末で削除済みの持ち物への変更は MissingRecordError', () => {
  const d = makeData([]);
  expect(() => updateItem(d, 'i1', {} as ItemInput, NOW)).toThrow(MissingRecordError);
  expect(() => addPhoto(d, 'i1', makePhoto(), NOW)).toThrow(MissingRecordError);
  expect(() => toggleWearDate(d, 'i1', '2026-11-11', NOW)).toThrow(MissingRecordError);
  expect(() => addCare(d, 'i1', makeCare(), NOW)).toThrow(MissingRecordError);
});

it('削除済みの写真・手入れの更新は MissingRecordError', () => {
  const d = makeData([makeItem()]);
  expect(() => updatePhoto(d, 'i1', 'nope', { takenAt: '2026-01-01', memo: '' }, NOW)).toThrow(MissingRecordError);
  expect(() => updateCare(d, 'i1', 'nope', { date: '2026-01-01', type: 'oil', memo: '' }, NOW)).toThrow(MissingRecordError);
});

it('削除系は対象が無くてもそのまま返す', () => {
  const d = makeData([makeItem()]);
  expect(deleteItem(d, 'nope')).toEqual(d);
  expect(deletePhoto(d, 'i1', 'nope', NOW)).toEqual(d);
  expect(deleteCare(d, 'i1', 'nope', NOW)).toEqual(d);
  expect(deletePhoto(d, 'nope', 'p1', NOW)).toEqual(d);
});

describe('写真', () => {
  it('addPhoto は追加して updatedAt を更新', () => {
    const next = addPhoto(makeData([makeItem()]), 'i1', makePhoto({ id: 'p9' }), NOW);
    expect(next.items[0].photos.map((p) => p.id)).toEqual(['p9']);
    expect(next.items[0].updatedAt).toBe(NOW);
  });
  it('updatePhoto は撮影日とメモを変える', () => {
    const d = makeData([makeItem({ photos: [makePhoto()] })]);
    const next = updatePhoto(d, 'i1', 'p1', { takenAt: '2025-05-05', memo: '色が濃くなった' }, NOW);
    expect(next.items[0].photos[0]).toMatchObject({ takenAt: '2025-05-05', memo: '色が濃くなった', fileId: 'f-p1' });
    expect(next.items[0].updatedAt).toBe(NOW);
  });
  it('deletePhoto は手入れの photoId を null にする', () => {
    const d = makeData([makeItem({ photos: [makePhoto({ id: 'p1' })], care: [makeCare({ photoId: 'p1' })] })]);
    const next = deletePhoto(d, 'i1', 'p1', NOW);
    expect(next.items[0].photos).toEqual([]);
    expect(next.items[0].care[0].photoId).toBeNull();
  });
});

describe('手入れ', () => {
  it('addCare / updateCare', () => {
    let d = addCare(makeData([makeItem()]), 'i1', makeCare({ id: 'c5' }), NOW);
    expect(d.items[0].care.map((c) => c.id)).toEqual(['c5']);
    d = updateCare(d, 'i1', 'c5', { date: '2026-02-02', type: 'brushing', memo: '馬毛' }, NOW);
    expect(d.items[0].care[0]).toMatchObject({ date: '2026-02-02', type: 'brushing', memo: '馬毛', photoId: null });
    expect(d.items[0].updatedAt).toBe(NOW);
  });
  it('deleteCare は写真を残す', () => {
    const d = makeData([makeItem({ photos: [makePhoto({ id: 'p1' })], care: [makeCare({ photoId: 'p1' })] })]);
    const next = deleteCare(d, 'i1', 'c1', NOW);
    expect(next.items[0].care).toEqual([]);
    expect(next.items[0].photos).toHaveLength(1);
  });
});

describe('着用', () => {
  it('着用日は重複なし・昇順', () => {
    let d = makeData([makeItem()]);
    d = addWearDate(d, 'i1', '2026-11-11', NOW);
    d = addWearDate(d, 'i1', '2026-01-01', NOW);
    d = addWearDate(d, 'i1', '2026-11-11', NOW);
    expect(d.items[0].wearDates).toEqual(['2026-01-01', '2026-11-11']);
    d = toggleWearDate(d, 'i1', '2026-11-11', NOW);
    expect(d.items[0].wearDates).toEqual(['2026-01-01']);
    d = toggleWearDate(d, 'i1', '2026-11-11', NOW);
    expect(d.items[0].wearDates).toEqual(['2026-01-01', '2026-11-11']);
  });
  it('removeWearDate', () => {
    const d = makeData([makeItem({ wearDates: ['2026-01-01', '2026-02-01'] })]);
    const next = removeWearDate(d, 'i1', '2026-01-01', NOW);
    expect(next.items[0].wearDates).toEqual(['2026-02-01']);
    expect(next.items[0].updatedAt).toBe(NOW);
  });
});

it('引数を書き換えない', () => {
  const d = makeData([makeItem({ photos: [makePhoto()], care: [makeCare({ photoId: 'p1' })] })]);
  const before = structuredClone(d);
  addPhoto(d, 'i1', makePhoto({ id: 'p2' }), NOW);
  addWearDate(d, 'i1', '2026-11-11', NOW);
  deletePhoto(d, 'i1', 'p1', NOW);
  deleteItem(d, 'i1');
  expect(d).toEqual(before);
});
