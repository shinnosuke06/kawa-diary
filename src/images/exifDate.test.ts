import { expect, it, vi } from 'vitest';

vi.mock('exifr', () => ({ default: { parse: vi.fn() } }));
import exifr from 'exifr';
import { readTakenDate } from './exifDate';

const file = (lastModified: number) => new File(['x'], 'a.jpg', { type: 'image/jpeg', lastModified });

it('EXIF の撮影日を使う', async () => {
  vi.mocked(exifr.parse).mockResolvedValue({ DateTimeOriginal: new Date(2025, 2, 10, 9, 0) });
  expect(await readTakenDate(file(new Date(2026, 0, 1).getTime()), '2026-11-11')).toBe('2025-03-10');
});

it('EXIF が無ければファイルの日付', async () => {
  vi.mocked(exifr.parse).mockResolvedValue(undefined);
  expect(await readTakenDate(file(new Date(2026, 0, 1).getTime()), '2026-11-11')).toBe('2026-01-01');
});

it('exifr が失敗してもファイルの日付', async () => {
  vi.mocked(exifr.parse).mockRejectedValue(new Error('bad'));
  expect(await readTakenDate(file(new Date(2026, 0, 1).getTime()), '2026-11-11')).toBe('2026-01-01');
});

it('どちらも無ければ今日', async () => {
  vi.mocked(exifr.parse).mockResolvedValue(undefined);
  expect(await readTakenDate(file(0), '2026-11-11')).toBe('2026-11-11');
});
