import { expect, it } from 'vitest';
import { SaveQueue } from './saveQueue';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

it('前の保存が終わるまで次を始めない', async () => {
  const log: string[] = [];
  const q = new SaveQueue();
  const a = q.run(async () => {
    log.push('a-start');
    await sleep(20);
    log.push('a-end');
  });
  const b = q.run(async () => {
    log.push('b-start');
  });
  await Promise.all([a, b]);
  expect(log).toEqual(['a-start', 'a-end', 'b-start']);
});

it('失敗しても次の保存は動く', async () => {
  const q = new SaveQueue();
  const a = q.run(async () => {
    throw new Error('boom');
  });
  const b = q.run(async () => 'ok');
  await expect(a).rejects.toThrow('boom');
  expect(await b).toBe('ok');
});
