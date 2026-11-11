import { describe, expect, it } from 'vitest';
import { daysBetween, formatDate, formatUsagePeriod, todayLocal } from './dates';

describe('formatUsagePeriod', () => {
  it.each([
    ['2024-08-11', '2026-11-11', '2年3ヶ月'],
    ['2025-11-11', '2026-11-11', '1年'],
    ['2026-05-11', '2026-11-11', '6ヶ月'],
    ['2026-11-01', '2026-11-11', '10日'],
    ['2026-10-12', '2026-11-11', '30日'], // 日が足りないので1ヶ月未満
    ['2026-01-31', '2026-02-28', '28日'],
    ['2026-12-01', '2026-11-11', '0日'], // 未来の日付は 0日
  ])('formatUsagePeriod(%s, %s) = %s', (from, to, want) => {
    expect(formatUsagePeriod(from, to)).toBe(want);
  });
});

describe('dates', () => {
  it('daysBetween', () => {
    expect(daysBetween('2025-01-10', '2026-11-11')).toBe(670);
    expect(daysBetween('2026-03-29', '2026-03-30')).toBe(1); // 夏時間の影響を受けない
    expect(daysBetween('2026-11-11', '2026-11-01')).toBe(-10);
  });
  it('todayLocal はローカル日付', () => {
    expect(todayLocal(new Date(2026, 10, 11, 23, 59))).toBe('2026-11-11');
  });
  it('formatDate', () => {
    expect(formatDate('2026-11-11')).toBe('2026/11/11');
  });
});
