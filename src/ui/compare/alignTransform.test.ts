import { expect, it } from 'vitest';
import { IDENTITY, dividerPercent, pan, pinch, zoomAt } from './alignTransform';

it('zoomAt は指定点を固定する', () => {
  expect(zoomAt(IDENTITY, 2, 100, 50)).toEqual({ scale: 2, x: -100, y: -50 });
});

it('zoomAt は上限で止まり位置も変えない', () => {
  const t = { scale: 4, x: -10, y: -10 };
  expect(zoomAt(t, 2, 100, 50)).toEqual(t);
});

it('zoomAt は下限 0.5 で止まる', () => {
  expect(zoomAt(IDENTITY, 0.1, 0, 0).scale).toBe(0.5);
});

it('pan', () => {
  expect(pan({ scale: 2, x: 1, y: 2 }, 10, -5)).toEqual({ scale: 2, x: 11, y: -3 });
});

it('pinch は距離比で拡大し中点を追う', () => {
  expect(pinch(IDENTITY, [{ x: 0, y: 0 }, { x: 100, y: 0 }], [{ x: 0, y: 0 }, { x: 200, y: 0 }])).toEqual({
    scale: 2,
    x: 0,
    y: 0,
  });
  expect(pinch(IDENTITY, [{ x: 0, y: 0 }, { x: 100, y: 0 }], [{ x: 10, y: 20 }, { x: 110, y: 20 }])).toEqual({
    scale: 1,
    x: 10,
    y: 20,
  });
});

it('dividerPercent は 0〜100', () => {
  expect(dividerPercent(150, 100, 200)).toBe(25);
  expect(dividerPercent(0, 100, 200)).toBe(0);
  expect(dividerPercent(999, 100, 200)).toBe(100);
});
