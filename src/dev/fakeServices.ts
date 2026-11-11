// VITE_FAKE_DRIVE=1 のときだけ読み込む。Google を使わずに画面を動かす
import { createIdbCache } from '../cache/localCache';
import { createFakeAuth } from '../drive/auth';
import type { ControllerDeps } from '../state/controller';
import { createFakeRepository } from '../storage/fakeRepository';

export function createFakeServices(): ControllerDeps {
  const repo = createFakeRepository();
  (window as unknown as { __kawaFake: unknown }).__kawaFake = { repo };
  return { repo, auth: createFakeAuth(), pickFolder: async () => 'fake-folder', cache: createIdbCache() };
}
