import { expect, it } from 'vitest';
import { pickFolder, type PickerNamespace } from './picker';

function fakePicker() {
  const calls: Record<string, unknown[]> = {};
  let callback: ((data: { action: string; docs?: { id: string }[] }) => void) | null = null;
  const record = (name: string, value: unknown) => {
    calls[name] = [...(calls[name] ?? []), value];
  };
  class DocsView {
    constructor(viewId: string) {
      record('view', viewId);
    }
    setSelectFolderEnabled(v: boolean) {
      record('setSelectFolderEnabled', v);
      return this;
    }
    setIncludeFolders(v: boolean) {
      record('setIncludeFolders', v);
      return this;
    }
    setMimeTypes(v: string) {
      record('setMimeTypes', v);
      return this;
    }
  }
  class PickerBuilder {
    addView(v: unknown) {
      record('addView', v);
      return this;
    }
    setOAuthToken(v: string) {
      record('setOAuthToken', v);
      return this;
    }
    setDeveloperKey(v: string) {
      record('setDeveloperKey', v);
      return this;
    }
    setAppId(v: string) {
      record('setAppId', v);
      return this;
    }
    setTitle(v: string) {
      record('setTitle', v);
      return this;
    }
    setCallback(cb: typeof callback) {
      callback = cb;
      return this;
    }
    build() {
      return {
        setVisible(v: boolean) {
          record('setVisible', v);
        },
      };
    }
  }
  const ns = {
    DocsView,
    PickerBuilder,
    ViewId: { FOLDERS: 'folders' },
    Action: { PICKED: 'picked', CANCEL: 'cancel' },
  } as unknown as PickerNamespace;
  return { ns, calls, fire: (data: { action: string; docs?: { id: string }[] }) => callback!(data) };
}

it('選んだフォルダの ID を返し、setAppId と setOAuthToken を設定する', async () => {
  const fake = fakePicker();
  const p = pickFolder({ apiKey: 'key', appId: '123', getToken: () => 'tok', loadPicker: async () => fake.ns });
  await new Promise((r) => setTimeout(r, 0));
  expect(fake.calls.setAppId).toEqual(['123']);
  expect(fake.calls.setOAuthToken).toEqual(['tok']);
  expect(fake.calls.setDeveloperKey).toEqual(['key']);
  expect(fake.calls.setMimeTypes).toEqual(['application/vnd.google-apps.folder']);
  expect(fake.calls.setSelectFolderEnabled).toEqual([true]);
  expect(fake.calls.setVisible).toEqual([true]);
  fake.fire({ action: 'loaded' });
  fake.fire({ action: 'picked', docs: [{ id: 'folder-1' }] });
  expect(await p).toBe('folder-1');
});

it('キャンセルは null', async () => {
  const fake = fakePicker();
  const p = pickFolder({ apiKey: 'key', appId: '123', getToken: () => 'tok', loadPicker: async () => fake.ns });
  await new Promise((r) => setTimeout(r, 0));
  fake.fire({ action: 'cancel' });
  expect(await p).toBeNull();
});
