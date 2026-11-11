// Google Picker で保存先フォルダを1つ選ばせる（設計書 3.1.1）
import { loadScript } from './loadScript';

interface PickerDocsView {
  setSelectFolderEnabled(v: boolean): PickerDocsView;
  setIncludeFolders(v: boolean): PickerDocsView;
  setMimeTypes(v: string): PickerDocsView;
}

interface PickerBuilderLike {
  addView(view: PickerDocsView): PickerBuilderLike;
  setOAuthToken(token: string): PickerBuilderLike;
  setDeveloperKey(key: string): PickerBuilderLike;
  setAppId(appId: string): PickerBuilderLike;
  setTitle(title: string): PickerBuilderLike;
  setCallback(cb: (data: PickerResult) => void): PickerBuilderLike;
  build(): { setVisible(v: boolean): void };
}

interface PickerResult {
  action: string;
  docs?: { id: string }[];
}

export interface PickerNamespace {
  DocsView: new (viewId: string) => PickerDocsView;
  PickerBuilder: new () => PickerBuilderLike;
  ViewId: { FOLDERS: string };
  Action: { PICKED: string; CANCEL: string };
}

async function loadPickerDefault(): Promise<PickerNamespace> {
  await loadScript('https://apis.google.com/js/api.js');
  const w = window as unknown as {
    gapi: { load(name: string, cb: () => void): void };
    google: { picker: PickerNamespace };
  };
  await new Promise<void>((resolve) => w.gapi.load('picker', resolve));
  return w.google.picker;
}

export async function pickFolder(opts: {
  apiKey: string;
  appId: string;
  getToken: () => string;
  loadPicker?: () => Promise<PickerNamespace>;
}): Promise<string | null> {
  const picker = await (opts.loadPicker ?? loadPickerDefault)();
  const token = opts.getToken();
  return new Promise((resolve) => {
    const view = new picker.DocsView(picker.ViewId.FOLDERS)
      .setSelectFolderEnabled(true)
      .setIncludeFolders(true)
      .setMimeTypes('application/vnd.google-apps.folder');
    new picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(token)
      .setDeveloperKey(opts.apiKey)
      .setAppId(opts.appId)
      .setTitle('保存先フォルダを選んでください')
      .setCallback((data) => {
        if (data.action === picker.Action.PICKED) resolve(data.docs?.[0]?.id ?? null);
        else if (data.action === picker.Action.CANCEL) resolve(null);
      })
      .build()
      .setVisible(true);
  });
}
