import { describe, expect, it } from 'vitest';
import { formatYen, parsePrice } from './format';

describe('parsePrice', () => {
  it.each([
    ['', null],
    ['  ', null],
    ['12000', 12000],
    ['12,000', 12000],
    ['１２０００', 12000],
    ['¥12,000', 12000],
    ['￥１２，０００', 12000],
    ['0', 0],
    ['12.5', 'invalid'],
    ['-1', 'invalid'],
    ['abc', 'invalid'],
  ])('parsePrice(%j) = %j', (text, want) => {
    expect(parsePrice(text)).toBe(want);
  });
});

it('formatYen', () => {
  expect(formatYen(12000)).toBe('¥12,000');
});
