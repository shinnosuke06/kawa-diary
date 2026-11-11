import { expect, it } from 'vitest';
import { fitWithin } from './fit';

it.each([
  [4032, 3024, 2048, 2048, 1536],
  [3024, 4032, 2048, 1536, 2048],
  [3000, 2000, 2048, 2048, 1365],
  [1000, 800, 2048, 1000, 800],
  [4032, 3024, 480, 480, 360],
])('fitWithin(%i,%i,%i)', (w, h, max, ew, eh) => {
  expect(fitWithin(w, h, max)).toEqual({ width: ew, height: eh });
});
