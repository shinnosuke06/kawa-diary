import { expect, it, vi } from 'vitest';
import { singleFlight } from './singleFlight';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

it('実行中に2回呼んでも1回しか実行しない', async () => {
  const fn = vi.fn(() => sleep(10));
  const once = singleFlight(fn);
  await Promise.all([once(), once()]);
  expect(fn).toHaveBeenCalledTimes(1);
  await once();
  expect(fn).toHaveBeenCalledTimes(2);
});

it('失敗後は再実行できる', async () => {
  const fn = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce('ok');
  const once = singleFlight(fn);
  await expect(once()).rejects.toThrow('x');
  expect(await once()).toBe('ok');
  expect(fn).toHaveBeenCalledTimes(2);
});
