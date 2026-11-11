import { describe, expect, it } from 'vitest';
import {
  costPerWear,
  itemsForHome,
  lastCareDate,
  latestPhoto,
  oldestPhoto,
  photosByDate,
  timeline,
  usagePeriod,
  usageStart,
  wearCount,
} from './stats';
import { makeCare, makeData, makeItem, makePhoto } from './testData';

it('wearCount', () => {
  expect(wearCount(makeItem({ wearDates: ['2026-01-01', '2026-01-02'] }))).toBe(2);
});

it('costPerWear', () => {
  expect(costPerWear(makeItem({ price: 30000, wearDates: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }))).toBe(4286);
  expect(costPerWear(makeItem({ price: null, wearDates: ['a'] }))).toBeNull();
  expect(costPerWear(makeItem({ price: 30000 }))).toBeNull();
  expect(costPerWear(makeItem({ price: 0, wearDates: ['a'] }))).toBe(0);
});

it('usageStart / usagePeriod', () => {
  const photos = [makePhoto({ id: 'a', takenAt: '2025-05-01' }), makePhoto({ id: 'b', takenAt: '2025-03-01' })];
  expect(usageStart(makeItem({ purchaseDate: '2024-08-11', photos }))).toBe('2024-08-11');
  expect(usageStart(makeItem({ photos }))).toBe('2025-03-01');
  expect(usageStart(makeItem())).toBeNull();
  expect(usagePeriod(makeItem({ purchaseDate: '2024-08-11' }), '2026-11-11')).toBe('2年3ヶ月');
  expect(usagePeriod(makeItem({ purchaseDate: '2026-12-01' }), '2026-11-11')).toBe('0日');
  expect(usagePeriod(makeItem(), '2026-11-11')).toBeNull();
});

it('latestPhoto / oldestPhoto の同日の扱い', () => {
  const item = makeItem({
    photos: [makePhoto({ id: 'x', takenAt: '2026-01-01' }), makePhoto({ id: 'y', takenAt: '2026-01-01' })],
  });
  expect(latestPhoto(item)?.id).toBe('y');
  expect(oldestPhoto(item)?.id).toBe('x');
  expect(latestPhoto(makeItem())).toBeNull();
  expect(oldestPhoto(makeItem())).toBeNull();
});

it('photosByDate は撮影日の昇順、同日は配列順', () => {
  const item = makeItem({
    photos: [
      makePhoto({ id: 'b', takenAt: '2026-02-01' }),
      makePhoto({ id: 'a', takenAt: '2026-01-01' }),
      makePhoto({ id: 'c', takenAt: '2026-02-01' }),
    ],
  });
  expect(photosByDate(item).map((p) => p.id)).toEqual(['a', 'b', 'c']);
});

it('lastCareDate', () => {
  const item = makeItem({ care: [makeCare({ id: 'a', date: '2026-03-01' }), makeCare({ id: 'b', date: '2026-01-01' })] });
  expect(lastCareDate(item)).toBe('2026-03-01');
  expect(lastCareDate(makeItem())).toBeNull();
});

describe('timeline', () => {
  it('手入れの写真を重複させない', () => {
    const item = makeItem({
      photos: [makePhoto({ id: 'p1', takenAt: '2026-02-01' }), makePhoto({ id: 'p2', takenAt: '2026-03-01' })],
      care: [makeCare({ id: 'c1', date: '2026-02-01', photoId: 'p1' }), makeCare({ id: 'c2', date: '2026-03-01' })],
    });
    expect(timeline(item).map((e) => (e.kind === 'care' ? e.care.id : e.photo.id))).toEqual(['c2', 'p2', 'c1']);
    const c1 = timeline(item)[2];
    expect(c1.kind === 'care' && c1.photo?.id).toBe('p1');
  });
  it('同日の項目は配列の後ろから', () => {
    const item = makeItem({
      photos: [makePhoto({ id: 'p1', takenAt: '2026-01-01' }), makePhoto({ id: 'p2', takenAt: '2026-01-01' })],
    });
    expect(timeline(item).map((e) => (e.kind === 'photo' ? e.photo.id : ''))).toEqual(['p2', 'p1']);
  });
});

it('itemsForHome は絞り込みと更新順', () => {
  const d = makeData([
    makeItem({ id: 'a', category: 'shoes', updatedAt: '2026-01-01T00:00:00.000Z' }),
    makeItem({ id: 'b', category: 'jeans', updatedAt: '2026-03-01T00:00:00.000Z' }),
    makeItem({ id: 'c', category: 'shoes', updatedAt: '2026-02-01T00:00:00.000Z' }),
  ]);
  expect(itemsForHome(d, 'all').map((i) => i.id)).toEqual(['b', 'c', 'a']);
  expect(itemsForHome(d, 'shoes').map((i) => i.id)).toEqual(['c', 'a']);
});
