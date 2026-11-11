# Kawa Diary 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 革製品・ジーンズなどの経年変化を写真と記録で残し、2枚をスライダーで重ねて比較できるスマホ向け Web アプリ（PWA）を作り、GitHub Pages で公開する。

**Architecture:** サーバーなしの静的 SPA。ブラウザから Google Identity Services でトークンを取り、Drive API v3 を直接呼んで本人が Picker で選んだフォルダに `data.json` と縮小写真を保存する。データ変更はすべて純粋関数（domain）で表し、`AppController` が「最新を読む → 関数を適用 → 書く」を保存キューで順に実行する。画面は React、テスト用に Drive をメモリ実装に差し替えるビルドモードを持つ。

**Tech Stack:** React 19 / TypeScript / Vite 8 / vite-plugin-pwa 2 / Vitest 5 / @playwright/test 1.63.0 / exifr / idb-keyval / fake-indexeddb（テストのみ）

**Spec:** `docs/superpowers/specs/2026-11-11-kawa-diary-design.md`（実装者は必ず併読すること）

## Global Constraints

- Node 22 / npm。依存はインストール時点の最新安定版。ただし `@playwright/test` は **1.63.0 に固定**（環境に入っている Chromium と一致させるため。`npx playwright install` は実行しない）。`typescript` は最新を使い、`tsc --noEmit` が動かない場合のみ最新の 6.x に下げる
- Vite の `base` は `'/kawa-diary/'`。ルーティングはハッシュ方式
- 環境変数: `VITE_GOOGLE_CLIENT_ID` / `VITE_GOOGLE_API_KEY` / `VITE_GOOGLE_APP_ID` / `VITE_FAKE_DRIVE`（`'1'` でメモリ実装）
- Drive の権限スコープは `src/config.ts` の定数 `DRIVE_SCOPE` の1か所だけで定義する。値は `'https://www.googleapis.com/auth/drive.file'`
- Drive 上の目印: `appProperties` のキーは `kawaDiary`、値は data.json が `'data'`、photos フォルダが `'photos'`。ファイル名は `data.json` / `photos` / `<photoId>.jpg` / `<photoId>_thumb.jpg`
- 写真: 本体は長辺 2048px・JPEG 品質 0.85、サムネイルは長辺 480px・JPEG 品質 0.8。どちらも元より大きくしない
- 日付は `'YYYY-MM-DD'`（端末ローカル時刻で判定）、日時は ISO 8601（`Date#toISOString()`）
- data.json は `JSON.stringify(data, null, 2)` で書く
- 画面の文言は日本語。下の「画面文言」表の文字列は一字一句そのまま使う（E2E テストがこの文字列で要素を探す）
- 見た目: CSS 変数 `--bg #f5efe6` `--surface #fffaf3` `--text #2a1f17` `--muted #7a6a5c` `--accent #8b4a24` `--border #e2d6c6` `--danger #b3261e`、角丸 12px。見出しは `"Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif`、本文は `system-ui,-apple-system,"Hiragino Sans","Noto Sans JP",sans-serif`。タップ対象は 44px 以上。幅 360px で横スクロールが出ないこと。PC では本文最大幅 720px（ホームの一覧のみ 960px）で中央寄せ
- コード内の識別子は英語、コメントは短い日本語
- コミットメッセージの末尾には次の2行を付ける（モデル名は書かない）:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01Pm8pjLkC7Bh5MehrgxVRUp
  ```
- 作業ブランチは `claude/modest-gauss-k20k64`。各タスクの最後にコミットし、`git push -u origin claude/modest-gauss-k20k64`

### 画面文言

| 場所 | 文言 |
|---|---|
| アプリ名・ホーム見出し | `Kawa Diary` |
| ログインボタン | `Google で続ける` |
| ログイン切れの帯 | `ログインの有効期限が切れました` |
| 初回画面の説明 | `革製品やジーンズなど、育てていく持ち物の記録帳です。写真と記録は Google ドライブに保存されます。` |
| 初回設定 見出し / 説明 / ボタン | `保存先フォルダを選んでください` / `Google ドライブの「Kawa Diary」フォルダを選んでください。初回設定は PC で行うのがおすすめです。` / `フォルダを選ぶ` |
| 読み込み中 / 同期中 | `読み込み中…` / `同期中…` |
| 戻るリンク | `‹ 戻る` |
| ホーム空 / 登録ボタンの aria-label / 絞り込み先頭 | `まだ持ち物がありません。「＋」から登録しましょう。` / `持ち物を登録` / `すべて` |
| カードの着用回数 | `着用 {n}回` |
| 登録・編集画面の見出し | `持ち物を登録` / `持ち物を編集` |
| 登録フォームのラベル | `製品名` `ブランド` `カテゴリ` `購入日` `金額（円）` `メモ` |
| 汎用ボタン | `保存` `削除` `編集` `追加` |
| 入力エラー | `製品名を入力してください` / `金額は0以上の整数で入力してください` |
| 持ち物の削除確認 | `「{name}」を削除しますか？写真もドライブのゴミ箱に移動します。` |
| 詳細のボタン | `今日着た` / `今日着た ✓` / `写真を追加` / `手入れを記録` / `比較する` |
| 詳細の集計ラベル | `着用回数` `最後の手入れ` `使用期間` `1回あたり` |
| 記録一覧 見出し / 空 | `記録` / `まだ記録がありません` |
| 持ち物が無い | `この持ち物は見つかりません` |
| 写真画面 見出し / ラベル | `写真を追加` / `写真を編集`、`写真を選ぶ` `撮影日` `メモ` |
| 写真の削除確認 | `この写真を削除しますか？` |
| 手入れ画面 見出し / ラベル | `手入れを記録` / `手入れを編集`、`日付` `種類` `メモ` `写真（任意）` |
| 手入れの削除確認 | `この手入れの記録を削除しますか？` |
| 着用履歴 見出し / 回数 / 日付ラベル / 空 | `着用履歴` / `着用 {n}回` / `着た日` / `まだ着用の記録がありません` |
| 着用履歴の行の削除ボタン aria-label | `{YYYY/MM/DD} を削除` |
| 比較画面 | 見出し `比較`、`前` `後`、`位置合わせ` `位置をリセット`、`{n}日経過`、境界線の aria-label `境界線`、写真不足 `比較するには写真が2枚以上必要です` |
| 保存失敗 | 見出し `保存できませんでした。`、ボタン `再試行`（ログイン切れの場合は `Google で続けて再試行`） |
| 存在しないページ | `ページが見つかりません` |

## Review Focus

- 金額欄に全角数字・カンマ・「¥」（例 `¥１２，０００`）を入力 → 12000 として保存される（Task 2 `parsePrice` のテスト）
- 他の端末で削除済みの持ち物に、この端末から着用・写真・手入れを保存 → 落ちずに「この記録は他の端末で削除されたようです。」を表示し、削除済みの持ち物は復活しない（Task 3 のテスト、Task 10 のテスト）
- 購入日が未来の日付、または購入日より前の撮影日 → 使用期間は「0日」以上で表示され、負の数や NaN にならない（Task 4 のテスト）
- アプリを開いたまま1時間たってトークンが切れた後に保存 → 入力内容が残り、「Google で続けて再試行」で保存し直せる（Task 10 のテスト、Task 11 の `SaveError`）
- 通信が遅い時に「保存」や「今日着た」を2回タップ → 二重登録・取り消しにならない（Task 9 `singleFlight` のテスト。全フォームと「今日着た」は Task 11 の `useAsyncAction` を必ず通す）

---

## ファイル構成

```
package.json  tsconfig.json  vite.config.ts  playwright.config.ts  index.html  .env.fake  .gitignore
src/
  main.tsx                      起動。本番/フェイクの部品を組み立てて描画
  config.ts                     環境変数・定数
  errors.ts                     エラー型と日本語メッセージ
  domain/  types.ts dates.ts format.ts validate.ts mutations.ts stats.ts testData.ts
  images/  fit.ts exifDate.ts preparePhoto.ts
  drive/   loadScript.ts auth.ts picker.ts driveApi.ts
  storage/ repository.ts driveRepository.ts fakeRepository.ts
  cache/   localCache.ts
  state/   saveQueue.ts singleFlight.ts controller.ts AppContext.tsx useImageUrl.ts
  dev/     fakeServices.ts      VITE_FAKE_DRIVE=1 のときだけ読み込む
  ui/      App.tsx router.ts useAsyncAction.ts styles.css
    components/ Header.tsx AuthBanner.tsx SaveError.tsx Thumb.tsx PhotoView.tsx PhotoPicker.tsx CategoryFilter.tsx Timeline.tsx
    pages/      WelcomePage.tsx SetupPage.tsx HomePage.tsx ItemFormPage.tsx ItemDetailPage.tsx WearsPage.tsx PhotoFormPage.tsx CareFormPage.tsx ComparePage.tsx NotFoundPage.tsx
    compare/    alignTransform.ts CompareSlider.tsx
e2e/  helpers.ts setup.spec.ts items.spec.ts detail.spec.ts photos.spec.ts compare.spec.ts
public/ icon.svg pwa-192.png pwa-512.png apple-touch-icon.png
scripts/make-icons.mjs
.github/workflows/deploy.yml
docs/setup.md  README.md
```

単体テストは対象ファイルの隣に `*.test.ts` で置く。

---

### Task 1: プロジェクトの土台

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.env.fake`, `.gitignore`, `src/main.tsx`, `src/ui/App.tsx`, `src/config.ts`, `src/vite-env.d.ts`
- Test: `src/config.test.ts`

**Interfaces:**
- Produces（`src/config.ts`）:
  - `DRIVE_SCOPE: string`、`APP_PROPERTY_KEY = 'kawaDiary'`
  - `GOOGLE_CLIENT_ID` / `GOOGLE_API_KEY` / `GOOGLE_APP_ID: string`（未設定は `''`）
  - `USE_FAKE_DRIVE: boolean`（`import.meta.env.VITE_FAKE_DRIVE === '1'`）
  - `IMAGE = { full: { maxLongSide: 2048, quality: 0.85 }, thumb: { maxLongSide: 480, quality: 0.8 } } as const`
- npm scripts: `dev`=`vite`、`dev:fake`=`vite --mode fake --port 5199 --strictPort`、`build`=`vite build`、`preview`=`vite preview`、`typecheck`=`tsc --noEmit`、`test`=`vitest run`、`e2e`=`playwright test --trace off`

- [ ] **Step 1: 依存を入れる**

Run: `npm init -y && npm i react react-dom exifr idb-keyval && npm i -D vite @vitejs/plugin-react typescript @types/react @types/react-dom vitest fake-indexeddb @playwright/test@1.63.0`
Expected: エラーなく完了。`package.json` の `"type": "module"`、`"private": true`、`name` は `kawa-diary`

- [ ] **Step 2: 失敗するテストを書く**

```ts
// src/config.test.ts
import { DRIVE_SCOPE, IMAGE, APP_PROPERTY_KEY } from './config';
it('Drive の権限と画像サイズが設計どおり', () => {
  expect(DRIVE_SCOPE).toBe('https://www.googleapis.com/auth/drive.file');
  expect(APP_PROPERTY_KEY).toBe('kawaDiary');
  expect(IMAGE.full).toEqual({ maxLongSide: 2048, quality: 0.85 });
  expect(IMAGE.thumb).toEqual({ maxLongSide: 480, quality: 0.8 });
});
```

- [ ] **Step 3: テストが失敗することを確認**

Run: `npx vitest run src/config.test.ts`
Expected: FAIL（`./config` が無い）

- [ ] **Step 4: 土台を作る**

- `vite.config.ts`: `base: '/kawa-diary/'`、`plugins: [react()]`、`test: { environment: 'node', include: ['src/**/*.test.ts'] }`（`/// <reference types="vitest/config" />`）
- `tsconfig.json`: `strict: true`、`jsx: 'react-jsx'`、`moduleResolution: 'bundler'`、`types: ['vite/client']`、`noEmit: true`、include `src` と `e2e` と `playwright.config.ts`
- `.env.fake`: `VITE_FAKE_DRIVE=1`
- `.gitignore`: `node_modules` `dist` `test-results` `playwright-report`
- `index.html`: `lang="ja"`、`<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`、`<meta name="theme-color" content="#8b4a24">`、`<title>Kawa Diary</title>`
- `src/ui/App.tsx`: 仮に `<h1>Kawa Diary</h1>` を描くだけ。`src/main.tsx` で描画
- `src/config.ts`: Interfaces のとおり

- [ ] **Step 5: テストとビルドが通ることを確認**

Run: `npm test && npm run typecheck && npm run build`
Expected: テスト 1 件 PASS、型エラーなし、`dist/index.html` が生成される

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: scaffold Vite + React + TypeScript project"
```

---

### Task 2: 型・エラー・日付・入力整形・data.json の検証

**Files:**
- Create: `src/domain/types.ts`, `src/errors.ts`, `src/domain/dates.ts`, `src/domain/format.ts`, `src/domain/validate.ts`, `src/domain/testData.ts`
- Test: `src/domain/dates.test.ts`, `src/domain/format.test.ts`, `src/domain/validate.test.ts`, `src/errors.test.ts`

**Interfaces:**
- Produces（`types.ts`）: 設計書 3.2 の `Category` `CareType` `DiaryData` `Item` `Photo` `CareRecord` をそのまま。加えて
  - `CATEGORIES: Category[]`（順序 `jacket, shoes, jeans, hat, other`）、`CATEGORY_LABELS: Record<Category,string>` = ジャケット / 靴 / ジーンズ / 帽子 / その他
  - `CARE_TYPES: CareType[]`（順序 `oil, brushing, wash, waterproof, repair, other`）、`CARE_LABELS` = オイル・クリーム / ブラッシング / 洗濯 / 防水 / 修理 / その他
  - `interface ItemInput { name: string; brand: string; category: Category; purchaseDate: string | null; price: number | null; memo: string }`
  - `interface PhotoMeta { takenAt: string; memo: string }`
  - `interface CareInput { date: string; type: CareType; memo: string }`
- Produces（`errors.ts`）: `AuthRequiredError` `NetworkError` `QuotaExceededError` `FileNotFoundError` `FolderNotWritableError` `DataFormatError` `MissingRecordError` `ImageDecodeError`（すべて `Error` 派生、`name` をクラス名に設定）、`DriveApiError(status: number, reason: string | null)`、`errorMessage(e: unknown): string`
- Produces（`dates.ts`）: `toLocalDate(d: Date): string`、`todayLocal(now?: Date): string`、`daysBetween(from: string, to: string): number`（to − from。負もあり）、`formatUsagePeriod(from: string, to: string): string`、`formatDate(d: string): string`（`'2026/11/11'`）
- Produces（`format.ts`）: `parsePrice(text: string): number | null | 'invalid'`、`formatYen(n: number): string`
- Produces（`validate.ts`）: `emptyData(): DiaryData`（`{ version: 1, items: [] }`）、`parseDiaryData(text: string): DiaryData`（失敗は `DataFormatError`）
- Produces（`testData.ts`、テスト専用）: `makePhoto(o?: Partial<Photo>): Photo`（既定 `id 'p1'` `takenAt '2026-01-01'` `memo ''` `fileId 'f-<id>'` `thumbFileId 't-<id>'` `width 2048` `height 1536`）、`makeCare(o?)`（`id 'c1'` `date '2026-01-01'` `type 'oil'` `memo ''` `photoId null`）、`makeItem(o?)`（`id 'i1'` `name 'ブーツ'` `brand ''` `category 'shoes'` 他は null / 空、日時 `'2026-01-01T00:00:00.000Z'`）、`makeData(items?: Item[]): DiaryData`

- [ ] **Step 1: 失敗するテストを書く**

```ts
// dates.test.ts
it.each([
  ['2024-08-11', '2026-11-11', '2年3ヶ月'],
  ['2025-11-11', '2026-11-11', '1年'],
  ['2026-05-11', '2026-11-11', '6ヶ月'],
  ['2026-11-01', '2026-11-11', '10日'],
  ['2026-10-12', '2026-11-11', '30日'],   // 日が足りないので1ヶ月未満
  ['2026-01-31', '2026-02-28', '28日'],
  ['2026-12-01', '2026-11-11', '0日'],    // 未来の日付は 0日
])('formatUsagePeriod(%s, %s) = %s', (from, to, want) => expect(formatUsagePeriod(from, to)).toBe(want));
it('daysBetween', () => {
  expect(daysBetween('2025-01-10', '2026-11-11')).toBe(670);
  expect(daysBetween('2026-03-29', '2026-03-30')).toBe(1);   // 夏時間の影響を受けない
  expect(daysBetween('2026-11-11', '2026-11-01')).toBe(-10);
});
it('todayLocal はローカル日付', () => expect(todayLocal(new Date(2026, 10, 11, 23, 59))).toBe('2026-11-11'));
it('formatDate', () => expect(formatDate('2026-11-11')).toBe('2026/11/11'));

// format.test.ts
it.each([
  ['', null], ['  ', null], ['12000', 12000], ['12,000', 12000], ['１２０００', 12000],
  ['¥12,000', 12000], ['￥１２，０００', 12000], ['0', 0],
  ['12.5', 'invalid'], ['-1', 'invalid'], ['abc', 'invalid'],
])('parsePrice(%j) = %j', (text, want) => expect(parsePrice(text)).toBe(want));
it('formatYen', () => expect(formatYen(12000)).toBe('¥12,000'));

// validate.test.ts
it('正しい data.json を読める', () => {
  const d = makeData([makeItem()]);
  expect(parseDiaryData(JSON.stringify(d))).toEqual(d);
});
it.each(['{', '{"version":2,"items":[]}', '{"version":1}', 'null'])('壊れた data.json %s は DataFormatError', (t) =>
  expect(() => parseDiaryData(t)).toThrow(DataFormatError));
it('emptyData', () => expect(emptyData()).toEqual({ version: 1, items: [] }));

// errors.test.ts
it('エラーごとの文言', () => {
  expect(errorMessage(new FolderNotWritableError())).toBe('このフォルダには保存できません。');
  expect(errorMessage(new ImageDecodeError())).toBe('この形式の画像は読み込めません');
  expect(errorMessage(new FileNotFoundError())).toBe('画像が見つかりません');
  expect(errorMessage(new MissingRecordError())).toBe('この記録は他の端末で削除されたようです。');
  expect(errorMessage(new Error('x'))).toBe('予期しないエラーが発生しました。');
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/domain src/errors.test.ts`
Expected: FAIL（モジュールが無い）

- [ ] **Step 3: 実装する**

- `errorMessage` の残りの文言: `AuthRequiredError` → `Google のログインが切れました。`、`NetworkError` → `通信できませんでした。電波の良い場所で再試行してください。`、`QuotaExceededError` → `Google ドライブの容量が不足しています。`、`DataFormatError` → `data.json の形式が正しくないため読み込めません。Google ドライブの「版を管理」から以前の版に戻してください。`、`DriveApiError` → `Google ドライブでエラーが発生しました（{status}）。`
- `daysBetween`: 両日付を `Date.UTC(y, m-1, d)` にして差を 86400000 で割り `Math.round`
- `formatUsagePeriod`: 満月数 = `(年差)*12 + (月差)`、`to` の日 < `from` の日なら −1。満月数 < 1 なら `max(0, daysBetween)` 日。それ以外は年 = floor(月/12)、余り月で設計書 2.3 の形式
- `parsePrice`: 前後空白除去 → 全角数字・全角カンマを半角に → `¥` `￥` `,` を除去 → 空なら `null`、`/^\d+$/` なら数値、それ以外 `'invalid'`
- `formatYen`: `'¥' + n.toLocaleString('ja-JP')`
- `parseDiaryData`: `JSON.parse` 失敗、オブジェクトでない、`version !== 1`、`items` が配列でない → `DataFormatError`。中身の細かい検証はしない

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/domain src/errors.test.ts && npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src && git commit -m "feat: add domain types, errors, dates and input formatting"
```

---

### Task 3: データ変更関数（mutations）

**Files:**
- Create: `src/domain/mutations.ts`
- Test: `src/domain/mutations.test.ts`

**Interfaces:**
- Consumes: Task 2 の型、`MissingRecordError`、`testData`
- Produces（すべて純粋関数。引数を書き換えず新しい `DiaryData` を返す。`now` は ISO 日時で、変更した持ち物の `updatedAt` に入る）:
  - `createItem(input: ItemInput, id: string, now: string): Item`（`name` `brand` は trim、配列は空、`createdAt = updatedAt = now`）
  - `addItem(data, item: Item): DiaryData`
  - `updateItem(data, itemId, input: ItemInput, now): DiaryData`
  - `deleteItem(data, itemId): DiaryData`
  - `addPhoto(data, itemId, photo: Photo, now): DiaryData`
  - `updatePhoto(data, itemId, photoId, meta: PhotoMeta, now): DiaryData`
  - `deletePhoto(data, itemId, photoId, now): DiaryData`（その写真を参照する手入れの `photoId` を `null` に）
  - `addCare(data, itemId, care: CareRecord, now)` / `updateCare(data, itemId, careId, input: CareInput, now)` / `deleteCare(data, itemId, careId, now)`（手入れを消しても写真は残す）
  - `addWearDate(data, itemId, date, now)` / `removeWearDate(data, itemId, date, now)` / `toggleWearDate(data, itemId, date, now)`
- 対象が無いとき: 追加・更新・着用系は `MissingRecordError` を投げる。削除系（`deleteItem` `deletePhoto` `deleteCare`）は対象が無ければ `data` をそのまま返す

- [ ] **Step 1: 失敗するテストを書く**

```ts
const NOW = '2026-11-11T10:00:00.000Z';
it('createItem', () => {
  const it1 = createItem({ name: ' 501 ', brand: ' Levi\'s ', category: 'jeans', purchaseDate: null, price: 15000, memo: '' }, 'i9', NOW);
  expect(it1).toMatchObject({ id: 'i9', name: '501', brand: "Levi's", photos: [], care: [], wearDates: [], createdAt: NOW, updatedAt: NOW });
});
it('updateItem は写真を残して項目と updatedAt を更新', () => {
  const d = makeData([makeItem({ photos: [makePhoto()] })]);
  const next = updateItem(d, 'i1', { name: 'エンジニアブーツ', brand: 'RED WING', category: 'shoes', purchaseDate: '2024-01-01', price: 50000, memo: '' }, NOW);
  expect(next.items[0]).toMatchObject({ name: 'エンジニアブーツ', price: 50000, updatedAt: NOW });
  expect(next.items[0].photos).toHaveLength(1);
});
it('他端末で削除済みの持ち物への変更は MissingRecordError', () => {
  const d = makeData([]);
  expect(() => updateItem(d, 'i1', {} as ItemInput, NOW)).toThrow(MissingRecordError);
  expect(() => addPhoto(d, 'i1', makePhoto(), NOW)).toThrow(MissingRecordError);
  expect(() => toggleWearDate(d, 'i1', '2026-11-11', NOW)).toThrow(MissingRecordError);
  expect(() => addCare(d, 'i1', makeCare(), NOW)).toThrow(MissingRecordError);
});
it('削除系は対象が無くてもそのまま返す', () => {
  const d = makeData([makeItem()]);
  expect(deleteItem(d, 'nope')).toEqual(d);
  expect(deletePhoto(d, 'i1', 'nope', NOW)).toEqual(d);
});
it('deletePhoto は手入れの photoId を null にする', () => {
  const d = makeData([makeItem({ photos: [makePhoto({ id: 'p1' })], care: [makeCare({ photoId: 'p1' })] })]);
  const next = deletePhoto(d, 'i1', 'p1', NOW);
  expect(next.items[0].photos).toEqual([]);
  expect(next.items[0].care[0].photoId).toBeNull();
});
it('deleteCare は写真を残す', () => {
  const d = makeData([makeItem({ photos: [makePhoto({ id: 'p1' })], care: [makeCare({ photoId: 'p1' })] })]);
  expect(deleteCare(d, 'i1', 'c1', NOW).items[0].photos).toHaveLength(1);
});
it('着用日は重複なし・昇順', () => {
  let d = makeData([makeItem()]);
  d = addWearDate(d, 'i1', '2026-11-11', NOW);
  d = addWearDate(d, 'i1', '2026-01-01', NOW);
  d = addWearDate(d, 'i1', '2026-11-11', NOW);
  expect(d.items[0].wearDates).toEqual(['2026-01-01', '2026-11-11']);
  d = toggleWearDate(d, 'i1', '2026-11-11', NOW);
  expect(d.items[0].wearDates).toEqual(['2026-01-01']);
  d = toggleWearDate(d, 'i1', '2026-11-11', NOW);
  expect(d.items[0].wearDates).toEqual(['2026-01-01', '2026-11-11']);
});
it('引数を書き換えない', () => {
  const d = makeData([makeItem()]);
  const before = structuredClone(d);
  addPhoto(d, 'i1', makePhoto(), NOW); addWearDate(d, 'i1', '2026-11-11', NOW); deleteItem(d, 'i1');
  expect(d).toEqual(before);
});
```

加えて `addItem` `updatePhoto` `updateCare` `removeWearDate` について、変更内容と `updatedAt` を確かめるテストを1件ずつ書く。

- [ ] **Step 2: 失敗を確認** — Run: `npx vitest run src/domain/mutations.test.ts` / Expected: FAIL
- [ ] **Step 3: Interfaces のとおり `src/domain/mutations.ts` を実装する**（持ち物の差し替えは共通の内部関数 `updateItemById(data, itemId, fn, now)` にまとめる）
- [ ] **Step 4: 通過を確認** — Run: `npx vitest run src/domain && npm run typecheck` / Expected: PASS
- [ ] **Step 5: Commit** — `git add src/domain && git commit -m "feat: add pure data mutations"`

---

### Task 4: 集計とタイムライン（stats）

**Files:**
- Create: `src/domain/stats.ts`
- Test: `src/domain/stats.test.ts`

**Interfaces:**
- Consumes: Task 2 の型と `formatUsagePeriod`
- Produces:
  - `wearCount(item): number`
  - `costPerWear(item): number | null`（`Math.round(price / 回数)`。金額 null か 0 回なら null）
  - `usageStart(item): string | null`（購入日 → 最古の写真の撮影日 → null）
  - `usagePeriod(item, today: string): string | null`
  - `latestPhoto(item): Photo | null`（`takenAt` 最大。同日は配列の後ろ）、`oldestPhoto(item): Photo | null`（最小。同日は配列の前）
  - `photosByDate(item): Photo[]`（`takenAt` 昇順、同日は配列順）
  - `lastCareDate(item): string | null`
  - `type TimelineEntry = { kind: 'photo'; date: string; photo: Photo } | { kind: 'care'; date: string; care: CareRecord; photo: Photo | null }`
  - `timeline(item): TimelineEntry[]`（日付の新しい順。同日は手入れ → 写真、それぞれ配列の後ろから。手入れに紐づく写真は手入れの項目にだけ出し、写真単独では出さない）
  - `itemsForHome(data, filter: Category | 'all'): Item[]`（`updatedAt` 降順）

- [ ] **Step 1: 失敗するテストを書く**

```ts
it('costPerWear', () => {
  expect(costPerWear(makeItem({ price: 30000, wearDates: ['a','b','c','d','e','f','g'] }))).toBe(4286);
  expect(costPerWear(makeItem({ price: null, wearDates: ['a'] }))).toBeNull();
  expect(costPerWear(makeItem({ price: 30000 }))).toBeNull();
  expect(costPerWear(makeItem({ price: 0, wearDates: ['a'] }))).toBe(0);
});
it('usageStart / usagePeriod', () => {
  const photos = [makePhoto({ id: 'a', takenAt: '2025-05-01' }), makePhoto({ id: 'b', takenAt: '2025-03-01' })];
  expect(usageStart(makeItem({ purchaseDate: '2024-08-11', photos }))).toBe('2024-08-11');
  expect(usageStart(makeItem({ photos }))).toBe('2025-03-01');
  expect(usageStart(makeItem())).toBeNull();
  expect(usagePeriod(makeItem({ purchaseDate: '2024-08-11' }), '2026-11-11')).toBe('2年3ヶ月');
  expect(usagePeriod(makeItem({ purchaseDate: '2026-12-01' }), '2026-11-11')).toBe('0日');
  expect(usagePeriod(makeItem(), '2026-11-11')).toBeNull();
});
it('latestPhoto / oldestPhoto の同日の扱い', () => {
  const item = makeItem({ photos: [makePhoto({ id: 'x', takenAt: '2026-01-01' }), makePhoto({ id: 'y', takenAt: '2026-01-01' })] });
  expect(latestPhoto(item)?.id).toBe('y');
  expect(oldestPhoto(item)?.id).toBe('x');
  expect(latestPhoto(makeItem())).toBeNull();
});
it('timeline は手入れの写真を重複させない', () => {
  const item = makeItem({
    photos: [makePhoto({ id: 'p1', takenAt: '2026-02-01' }), makePhoto({ id: 'p2', takenAt: '2026-03-01' })],
    care: [makeCare({ id: 'c1', date: '2026-02-01', photoId: 'p1' }), makeCare({ id: 'c2', date: '2026-03-01' })],
  });
  expect(timeline(item).map((e) => (e.kind === 'care' ? e.care.id : e.photo.id))).toEqual(['c2', 'p2', 'c1']);
  const c1 = timeline(item)[2];
  expect(c1.kind === 'care' && c1.photo?.id).toBe('p1');
});
it('itemsForHome は絞り込みと更新順', () => {
  const d = makeData([
    makeItem({ id: 'a', category: 'shoes', updatedAt: '2026-01-01T00:00:00.000Z' }),
    makeItem({ id: 'b', category: 'jeans', updatedAt: '2026-03-01T00:00:00.000Z' }),
    makeItem({ id: 'c', category: 'shoes', updatedAt: '2026-02-01T00:00:00.000Z' }),
  ]);
  expect(itemsForHome(d, 'all').map((i) => i.id)).toEqual(['b', 'c', 'a']);
  expect(itemsForHome(d, 'shoes').map((i) => i.id)).toEqual(['c', 'a']);
});
```

`lastCareDate` と `photosByDate` も1件ずつテストを書く。

- [ ] **Step 2: 失敗を確認** — Run: `npx vitest run src/domain/stats.test.ts` / Expected: FAIL
- [ ] **Step 3: Interfaces のとおり `src/domain/stats.ts` を実装する**
- [ ] **Step 4: 通過を確認** — Run: `npx vitest run src/domain && npm run typecheck` / Expected: PASS
- [ ] **Step 5: Commit** — `git add src/domain && git commit -m "feat: add item stats and timeline"`

---

### Task 5: 写真の縮小と撮影日の取得

**Files:**
- Create: `src/images/fit.ts`, `src/images/exifDate.ts`, `src/images/preparePhoto.ts`
- Test: `src/images/fit.test.ts`, `src/images/exifDate.test.ts`

**Interfaces:**
- Consumes: `IMAGE`（Task 1）、`toLocalDate`（Task 2）、`ImageDecodeError`
- Produces:
  - `fitWithin(width: number, height: number, maxLongSide: number): { width: number; height: number }`（拡大しない。短辺は `Math.round`）
  - `readTakenDate(file: File, today: string): Promise<string>`（EXIF の `DateTimeOriginal` → `file.lastModified`（0 や未設定は無し扱い）→ `today`。exifr が例外を投げても次へ進む）
  - `interface PreparedPhoto { full: Blob; thumb: Blob; width: number; height: number; takenAt: string }`（`width` `height` は本体の寸法）
  - `preparePhoto(file: File, today: string): Promise<PreparedPhoto>`

- [ ] **Step 1: 失敗するテストを書く**

```ts
// fit.test.ts
it.each([
  [4032, 3024, 2048, 2048, 1536],
  [3024, 4032, 2048, 1536, 2048],
  [3000, 2000, 2048, 2048, 1365],
  [1000, 800, 2048, 1000, 800],
  [4032, 3024, 480, 480, 360],
])('fitWithin(%i,%i,%i)', (w, h, max, ew, eh) => expect(fitWithin(w, h, max)).toEqual({ width: ew, height: eh }));

// exifDate.test.ts
vi.mock('exifr', () => ({ default: { parse: vi.fn() } }));
import exifr from 'exifr';
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
```

- [ ] **Step 2: 失敗を確認** — Run: `npx vitest run src/images` / Expected: FAIL
- [ ] **Step 3: 実装する**
  - `readTakenDate`: `exifr.parse(file, { pick: ['DateTimeOriginal'] })`
  - `preparePhoto`: `createImageBitmap(file, { imageOrientation: 'from-image' })`（失敗 → `ImageDecodeError`）→ 本体とサムネイルをそれぞれ元のビットマップから `<canvas>` に描いて `toBlob('image/jpeg', quality)`（`imageSmoothingQuality = 'high'`、`null` → `ImageDecodeError`）→ `bitmap.close()`。撮影日は `readTakenDate`。ブラウザ依存のため単体テストは無し（Task 14 の E2E で確認）
- [ ] **Step 4: 通過を確認** — Run: `npx vitest run src/images && npm run typecheck` / Expected: PASS
- [ ] **Step 5: Commit** — `git add src/images && git commit -m "feat: resize photos and read taken date"`

---

### Task 6: Drive API ラッパー

**Files:**
- Create: `src/drive/driveApi.ts`
- Test: `src/drive/driveApi.test.ts`

**Interfaces:**
- Consumes: Task 2 のエラー型
- Produces:
  ```ts
  interface DriveFile { id: string; name: string; parents?: string[]; appProperties?: Record<string, string>; createdTime?: string }
  class DriveApi {
    constructor(opts: { getToken: () => string; onUnauthorized: () => void; fetchFn?: typeof fetch })
    listFiles(q: string): Promise<DriveFile[]>
    createFolder(name: string, parentId: string, appProperties: Record<string, string>): Promise<DriveFile>
    createFile(name: string, parentId: string, mimeType: string, content: Blob | string, appProperties?: Record<string, string>): Promise<DriveFile>
    downloadText(fileId: string): Promise<string>
    downloadBlob(fileId: string): Promise<Blob>
    updateContent(fileId: string, content: Blob | string, mimeType: string): Promise<void>
    trash(fileId: string): Promise<void>
  }
  type DriveApiLike = Pick<DriveApi, 'listFiles' | 'createFolder' | 'createFile' | 'downloadText' | 'downloadBlob' | 'updateContent' | 'trash'>
  ```
- エンドポイント（すべて `Authorization: Bearer <token>`）:
  - list: `GET https://www.googleapis.com/drive/v3/files?q=<q>&fields=files(id,name,parents,appProperties,createdTime)&orderBy=createdTime&pageSize=100&spaces=drive`
  - createFolder: `POST https://www.googleapis.com/drive/v3/files?fields=id,name,parents,appProperties,createdTime`、JSON `{ name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId], appProperties }`
  - createFile: `POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=...`、`multipart/related`（1部目 JSON メタデータ `{ name, parents, appProperties }`、2部目が本体）
  - download: `GET https://www.googleapis.com/drive/v3/files/<id>?alt=media`、`cache: 'no-store'`
  - updateContent: `PATCH https://www.googleapis.com/upload/drive/v3/files/<id>?uploadType=media`、`Content-Type: <mimeType>`
  - trash: `PATCH https://www.googleapis.com/drive/v3/files/<id>`、JSON `{ trashed: true }`
- エラー変換: `fetch` が reject → `NetworkError`。401 → `onUnauthorized()` を呼んで `AuthRequiredError`。403 かつ `error.errors[0].reason === 'storageQuotaExceeded'` → `QuotaExceededError`。404 → `FileNotFoundError`。その他の非 2xx → `DriveApiError(status, reason)`。`getToken()` が投げた例外はそのまま投げる（fetch しない）

- [ ] **Step 1: 失敗するテストを書く**（`fetchFn` に `vi.fn()` を渡し、`new Response(...)` を返す）

```ts
it('listFiles は q をエンコードしトークンを付ける', async () => {
  const f = vi.fn().mockResolvedValue(Response.json({ files: [{ id: 'a', name: 'data.json' }] }));
  const api = new DriveApi({ getToken: () => 'tok', onUnauthorized: vi.fn(), fetchFn: f });
  expect(await api.listFiles("name = 'data.json'")).toEqual([{ id: 'a', name: 'data.json' }]);
  const [url, init] = f.mock.calls[0];
  expect(new URL(url).searchParams.get('q')).toBe("name = 'data.json'");
  expect(new Headers(init.headers).get('Authorization')).toBe('Bearer tok');
});
it('createFile は multipart/related でメタデータを送る', async () => { /* body を text にして name / parents / appProperties と本体文字列を含むことを確認 */ });
it('401 で onUnauthorized を呼び AuthRequiredError', async () => { /* status 401 */ });
it('403 storageQuotaExceeded は QuotaExceededError', async () => {
  const body = { error: { code: 403, errors: [{ reason: 'storageQuotaExceeded' }] } };
  /* Response.json(body, { status: 403 }) → rejects.toBeInstanceOf(QuotaExceededError) */
});
it('その他の 403 は DriveApiError(403)', async () => { /* reason 'insufficientFilePermissions' → status 403 */ });
it('404 は FileNotFoundError', async () => {});
it('fetch 失敗は NetworkError', async () => { /* mockRejectedValue(new TypeError('Failed to fetch')) */ });
it('download は cache: no-store', async () => { /* init.cache === 'no-store' */ });
it('getToken が投げたら fetch しない', async () => { /* getToken: () => { throw new AuthRequiredError() } → f 未呼び出し */ });
```

- [ ] **Step 2: 失敗を確認** — Run: `npx vitest run src/drive/driveApi.test.ts` / Expected: FAIL
- [ ] **Step 3: Interfaces のとおり実装する**（multipart の境界文字列は `'kawa-' + crypto.randomUUID()`、本体は `new Blob([前文, content, 後文])`）
- [ ] **Step 4: 通過を確認** — Run: `npx vitest run src/drive && npm run typecheck` / Expected: PASS
- [ ] **Step 5: Commit** — `git add src/drive && git commit -m "feat: add Drive API v3 client"`

---

### Task 7: 保存先（Repository）のドライブ実装とメモリ実装

**Files:**
- Create: `src/storage/repository.ts`, `src/storage/driveRepository.ts`, `src/storage/fakeRepository.ts`
- Test: `src/storage/driveRepository.test.ts`, `src/storage/fakeRepository.test.ts`

**Interfaces:**
- Consumes: `DriveApiLike`（Task 6）、`emptyData` `parseDiaryData`（Task 2）、`APP_PROPERTY_KEY`
- Produces:
  ```ts
  interface UploadedPhoto { fileId: string; thumbFileId: string }
  interface Repository {
    findSetup(): Promise<boolean>;             // 既存の data.json が見つかり保存先が決まったら true
    setup(folderId: string): Promise<void>;    // 選ばれたフォルダに photos と data.json を作る
    load(): Promise<DiaryData>;
    mutate(fn: (data: DiaryData) => DiaryData): Promise<DiaryData>;
    uploadPhoto(photoId: string, full: Blob, thumb: Blob): Promise<UploadedPhoto>;
    getImage(fileId: string): Promise<Blob>;
    trashFiles(fileIds: string[]): Promise<void>;
  }
  createDriveRepository(api: DriveApiLike): Repository
  createFakeRepository(opts?: { configured?: boolean; data?: DiaryData }): Repository & {
    files: Map<string, Blob>;          // fileId → 中身（E2E から寸法を確認する）
    peekData(): DiaryData | null;
  }
  ```
- 保存先が決まる前に `load` `mutate` `uploadPhoto` を呼んだら `Error('storage is not set up')`
- driveRepository の検索条件:
  - data.json: `appProperties has { key='kawaDiary' and value='data' } and trashed = false`（結果の先頭 = 作成が最も古いものを使い、親 `parents[0]` を保存先にする）
  - photos: `appProperties has { key='kawaDiary' and value='photos' } and '<rootId>' in parents and trashed = false`（無ければ作り直す）
- `setup`: `createFolder('photos', folderId, { kawaDiary: 'photos' })` → `createFile('data.json', folderId, 'application/json', JSON.stringify(emptyData(), null, 2), { kawaDiary: 'data' })`。`DriveApiError` の 403 と `FileNotFoundError` は `FolderNotWritableError` に変換
- `mutate`: `downloadText` → `parseDiaryData` → `fn` → `updateContent(..., JSON.stringify(next, null, 2), 'application/json')` → `next` を返す。`fn` や読み込みが失敗したら書かない
- `uploadPhoto`: photos フォルダに `<photoId>.jpg` と `<photoId>_thumb.jpg`（`image/jpeg`）を作る
- `trashFiles`: 順に `trash`。`FileNotFoundError` は無視
- fakeRepository: ID は `fake-1`, `fake-2`… の連番。`configured` 既定は false。`getImage` で無い ID は `FileNotFoundError`。読み書きは `structuredClone` でコピーして参照を共有しない

- [ ] **Step 1: 失敗するテストを書く**（driveRepository は `DriveApiLike` の各メソッドを `vi.fn()` にしたスタブで検証）

```ts
it('data.json が無ければ findSetup は false', async () => {});
it('2台目の端末: 既存の data.json と photos を再利用し何も作らない', async () => {
  api.listFiles.mockResolvedValueOnce([{ id: 'd1', name: 'data.json', parents: ['root1'] }])
               .mockResolvedValueOnce([{ id: 'ph1', name: 'photos' }]);
  expect(await repo.findSetup()).toBe(true);
  expect(api.createFolder).not.toHaveBeenCalled();
  expect(api.listFiles.mock.calls[1][0]).toContain("'root1' in parents");
});
it('photos フォルダが消えていたら作り直す', async () => {});
it('setup は選ばれたフォルダに photos と空の data.json を作る', async () => {
  await repo.setup('picked');
  expect(api.createFolder).toHaveBeenCalledWith('photos', 'picked', { kawaDiary: 'photos' });
  const [name, parent, mime, content, props] = api.createFile.mock.calls[0];
  expect([name, parent, mime, props]).toEqual(['data.json', 'picked', 'application/json', { kawaDiary: 'data' }]);
  expect(JSON.parse(content as string)).toEqual({ version: 1, items: [] });
});
it.each([new DriveApiError(403, 'insufficientFilePermissions'), new FileNotFoundError()])(
  'setup で作れなければ FolderNotWritableError', async (err) => { /* createFolder.mockRejectedValue(err) */ });
it('mutate は最新を読み直してから適用する（他端末の変更を消さない）', async () => {
  // downloadText が「他端末で追加された item 'other'」を含む JSON を返す
  // fn で item 'mine' を追加 → updateContent に渡った JSON に 'other' と 'mine' の両方がある
});
it('fn が投げたら書き込まない', async () => { /* MissingRecordError → updateContent 未呼び出し */ });
it('data.json が壊れていたら DataFormatError で書き込まない', async () => {});
it('ログイン切れ（AuthRequiredError）はそのまま投げる', async () => {});
it('uploadPhoto のファイル名と保存先', async () => { /* 'p9.jpg' / 'p9_thumb.jpg' / photos フォルダ ID / image/jpeg */ });
it('trashFiles は見つからないファイルを無視して続ける', async () => {});
// fakeRepository.test.ts
it('setup → mutate → load の往復', async () => {});
it('uploadPhoto → getImage の往復、無い ID は FileNotFoundError', async () => {});
it('setup 前の load はエラー', async () => {});
```

- [ ] **Step 2: 失敗を確認** — Run: `npx vitest run src/storage` / Expected: FAIL
- [ ] **Step 3: Interfaces のとおり実装する**
- [ ] **Step 4: 通過を確認** — Run: `npx vitest run src/storage && npm run typecheck` / Expected: PASS
- [ ] **Step 5: Commit** — `git add src/storage && git commit -m "feat: add Drive and in-memory repositories"`

---

### Task 8: ログイン（GIS）とフォルダ選択（Picker）

**Files:**
- Create: `src/drive/loadScript.ts`, `src/drive/auth.ts`, `src/drive/picker.ts`
- Test: `src/drive/auth.test.ts`, `src/drive/picker.test.ts`

**Interfaces:**
- Consumes: `AuthRequiredError`
- Produces:
  ```ts
  loadScript(src: string): Promise<void>        // 同じ src は1回だけ読み込む
  interface AuthService {
    prepare(): Promise<void>;   // GIS を読み込みトークンクライアントを作る。何度呼んでもよい
    isSignedIn(): boolean;      // 有効期限の 60 秒前までを有効とみなす
    getToken(): string;         // 無効なら AuthRequiredError
    signIn(): Promise<void>;    // タップ処理の中から直接呼ぶ（await を挟まない）
    clear(): void;
  }
  createGisAuth(opts: { clientId: string; scope: string; storage?: Storage; now?: () => number; loadGis?: () => Promise<GisLike> }): AuthService
  createFakeAuth(): AuthService  // 常にログイン済み、トークン 'fake-token'
  pickFolder(opts: { apiKey: string; appId: string; getToken: () => string; loadPicker?: () => Promise<PickerNamespace> }): Promise<string | null>
  ```
- トークンは localStorage のキー `kawa-diary.token` に `{ accessToken, expiresAt }`（`expiresAt = now() + expires_in * 1000`）
- `signIn`: `prepare` 前なら `AuthRequiredError` で reject。`client.requestAccessToken({ prompt: '' })` を同期的に呼ぶ。`callback` の応答に `error` があるか `error_callback` が呼ばれたら `AuthRequiredError` で reject
- GIS スクリプト: `https://accounts.google.com/gsi/client`。`initTokenClient({ client_id, scope, callback, error_callback })`
- Picker: `https://apis.google.com/js/api.js` を読み込み `gapi.load('picker', ...)` → `google.picker`。ビュー `new DocsView(ViewId.FOLDERS).setSelectFolderEnabled(true).setIncludeFolders(true).setMimeTypes('application/vnd.google-apps.folder')`、`new PickerBuilder().addView(view).setOAuthToken(token).setDeveloperKey(apiKey).setAppId(appId).setTitle('保存先フォルダを選んでください').setCallback(cb).build().setVisible(true)`。`cb` で `action === Action.PICKED` → `docs[0].id`、`Action.CANCEL` → `null`

- [ ] **Step 1: 失敗するテストを書く**（`storage` には Map で作った簡易 `Storage`、`loadGis` には `initTokenClient` が渡された設定を保持する偽物を渡す）

```ts
it('初期状態は未ログイン', () => { expect(auth.isSignedIn()).toBe(false); expect(() => auth.getToken()).toThrow(AuthRequiredError); });
it('signIn でトークンと期限を保存', async () => {
  await auth.prepare();
  const p = auth.signIn();
  fakeGis.lastConfig.callback({ access_token: 'tok', expires_in: 3600 });
  await p;
  expect(auth.getToken()).toBe('tok');
  expect(JSON.parse(storage.getItem('kawa-diary.token')!).expiresAt).toBe(NOW + 3600_000);
});
it('再起動後も期限内ならログイン済み', () => { /* 同じ storage で新しい auth */ });
it('期限の 60 秒前で無効になる', () => { /* now = expiresAt - 59_000 → false、expiresAt - 61_000 → true */ });
it('clear でログアウト', () => {});
it('ポップアップを閉じたら AuthRequiredError', async () => { /* error_callback({ type: 'popup_closed' }) */ });
it('prepare 前の signIn は AuthRequiredError', async () => {});
// picker.test.ts（偽の PickerNamespace で builder への呼び出しを記録）
it('選んだフォルダの ID を返し、setAppId と setOAuthToken を設定する', async () => {});
it('キャンセルは null', async () => {});
```

- [ ] **Step 2: 失敗を確認** — Run: `npx vitest run src/drive` / Expected: FAIL
- [ ] **Step 3: Interfaces のとおり実装する**（GIS・Picker の型は使う範囲だけ `GisLike` `PickerNamespace` として自前で定義する）
- [ ] **Step 4: 通過を確認** — Run: `npx vitest run src/drive && npm run typecheck` / Expected: PASS
- [ ] **Step 5: Commit** — `git add src/drive && git commit -m "feat: add Google sign-in and folder picker"`

---

### Task 9: 端末内キャッシュ・保存キュー・二重実行防止

**Files:**
- Create: `src/cache/localCache.ts`, `src/state/saveQueue.ts`, `src/state/singleFlight.ts`
- Test: `src/cache/localCache.test.ts`, `src/state/saveQueue.test.ts`, `src/state/singleFlight.test.ts`

**Interfaces:**
- Produces:
  ```ts
  interface LocalCache {
    getData(): Promise<DiaryData | null>; setData(d: DiaryData): Promise<void>;
    getThumb(fileId: string): Promise<Blob | null>; setThumb(fileId: string, blob: Blob): Promise<void>;
    deleteThumbs(fileIds: string[]): Promise<void>;
  }
  createIdbCache(): LocalCache      // idb-keyval の createStore('kawa-diary', 'cache')。キー 'data' と 'thumb:<fileId>'
  createMemoryCache(): LocalCache   // テスト用
  class SaveQueue { run<T>(task: () => Promise<T>): Promise<T> }   // 1件ずつ順に実行。失敗しても次は動く
  singleFlight<A extends unknown[], T>(fn: (...args: A) => Promise<T>): (...args: A) => Promise<T>  // 実行中の呼び出しは同じ Promise を返す
  ```
- サムネイルは IndexedDB に `{ type: string; bytes: ArrayBuffer }` で入れ、読み出し時に `Blob` に戻す（Safari と fake-indexeddb の Blob 保存の不具合を避けるため）
- IndexedDB の例外（プライベートモードなど）はすべて握りつぶし、読み出しは `null`、書き込みは何もしない

- [ ] **Step 1: 失敗するテストを書く**

```ts
// localCache.test.ts（先頭で import 'fake-indexeddb/auto'）
it('初期は null、data と thumb の往復、削除', async () => {
  const c = createIdbCache();
  expect(await c.getData()).toBeNull();
  await c.setData(makeData([makeItem()]));
  expect(await c.getData()).toEqual(makeData([makeItem()]));
  await c.setThumb('t1', new Blob(['abc'], { type: 'image/jpeg' }));
  const b = await c.getThumb('t1');
  expect(b?.type).toBe('image/jpeg'); expect(await b?.text()).toBe('abc');
  await c.deleteThumbs(['t1']);
  expect(await c.getThumb('t1')).toBeNull();
});
// saveQueue.test.ts
it('前の保存が終わるまで次を始めない', async () => {
  const log: string[] = []; const q = new SaveQueue();
  const a = q.run(async () => { log.push('a-start'); await sleep(20); log.push('a-end'); });
  const b = q.run(async () => { log.push('b-start'); });
  await Promise.all([a, b]);
  expect(log).toEqual(['a-start', 'a-end', 'b-start']);
});
it('失敗しても次の保存は動く', async () => {});
// singleFlight.test.ts
it('実行中に2回呼んでも1回しか実行しない', async () => {
  const fn = vi.fn(() => sleep(10)); const once = singleFlight(fn);
  await Promise.all([once(), once()]);
  expect(fn).toHaveBeenCalledTimes(1);
  await once();
  expect(fn).toHaveBeenCalledTimes(2);
});
it('失敗後は再実行できる', async () => {});
```

- [ ] **Step 2: 失敗を確認** — Run: `npx vitest run src/cache src/state` / Expected: FAIL
- [ ] **Step 3: Interfaces のとおり実装する**
- [ ] **Step 4: 通過を確認** — Run: `npx vitest run src/cache src/state && npm run typecheck` / Expected: PASS
- [ ] **Step 5: Commit** — `git add src/cache src/state && git commit -m "feat: add local cache, save queue and single-flight guard"`

---

### Task 10: アプリの状態管理（AppController）

**Files:**
- Create: `src/state/controller.ts`, `src/state/AppContext.tsx`, `src/state/useImageUrl.ts`
- Test: `src/state/controller.test.ts`

**Interfaces:**
- Consumes: `Repository`（Task 7）、`AuthService`（Task 8）、`LocalCache` `SaveQueue`（Task 9）、mutations（Task 3）、`PreparedPhoto`（Task 5）
- Produces:
  ```ts
  type SetupStatus = 'unknown' | 'needsFolder' | 'ready';
  interface AppState { data: DiaryData | null; signedIn: boolean; setup: SetupStatus; syncing: boolean; loadError: unknown | null }
  interface ControllerDeps { repo: Repository; auth: AuthService; pickFolder: () => Promise<string | null>; cache: LocalCache; newId?: () => string; now?: () => Date }
  class AppController {
    constructor(deps: ControllerDeps)
    getState(): AppState; subscribe(listener: () => void): () => void;
    start(): Promise<void>;
    signIn(): Promise<void>;
    refresh(): Promise<void>;
    chooseFolder(): Promise<void>;
    saveItem(input: ItemInput, itemId?: string): Promise<string>;   // 保存した持ち物の id
    deleteItem(itemId: string): Promise<void>;
    addPhoto(itemId: string, prepared: PreparedPhoto, meta: PhotoMeta): Promise<void>;
    updatePhoto(itemId: string, photoId: string, meta: PhotoMeta): Promise<void>;
    deletePhoto(itemId: string, photoId: string): Promise<void>;
    saveCare(itemId: string, input: CareInput, prepared: PreparedPhoto | null, careId?: string): Promise<void>;
    deleteCare(itemId: string, careId: string): Promise<void>;
    toggleWear(itemId: string, date: string): Promise<void>;
    addWear(itemId: string, date: string): Promise<void>;
    removeWear(itemId: string, date: string): Promise<void>;
    loadImage(fileId: string, size: 'thumb' | 'full'): Promise<Blob>;
  }
  // AppContext.tsx
  AppProvider(props: { controller: AppController; children: ReactNode })
  useController(): AppController
  useAppState(): AppState            // useSyncExternalStore
  // useImageUrl.ts
  useImageUrl(fileId: string | null, size: 'thumb' | 'full'): { url: string | null; error: unknown | null }  // object URL を作り、外れたら revoke
  usePhotoUrl(photo: Photo | null): { url: string | null; notFound: boolean }
      // まずサムネイルを出し、本体が読めたら差し替える。本体が読めなければ（未ログイン・通信失敗など）サムネイルのまま。
      // notFound は「表示できる画像が無く、原因が FileNotFoundError」のときだけ true
  ```
- 振る舞い:
  - `start`: キャッシュがあれば即 `data` に入れる → `auth.prepare()`（失敗は無視）→ `signedIn = auth.isSignedIn()` → ログイン済みなら `refresh()`
  - `refresh`: `syncing` を立てる → `repo.findSetup()` が false なら `setup = 'needsFolder'`、true なら `repo.load()` → `data` とキャッシュを更新、`setup = 'ready'`。例外は `loadError` に入れる（`AuthRequiredError` なら `signedIn = false`）。成功時は `loadError = null`
  - `signIn`: 最初の文で `auth.signIn()` を呼ぶ（await より前）→ 完了後 `signedIn = true` → `refresh()`
  - `chooseFolder`: `pickFolder()` が null なら何もしない → `repo.setup(id)` → `refresh()`。例外は `loadError` に入れて投げない
  - 保存（内部 `save(fn)`）: 未ログインなら `signedIn = false` にして `AuthRequiredError`。`SaveQueue` で `repo.mutate(fn)` → `data` とキャッシュを更新。`AuthRequiredError` なら `signedIn = false`。例外はすべて呼び出し元へ投げ直す
  - 写真を追加: `photoId = newId()` → `repo.uploadPhoto` → サムネイルをキャッシュ → `save(d => addPhoto(d, ...))`
  - `saveCare`（新規・写真あり）: アップロード後、1回の `save` で `addPhoto` と `addCare`（`photoId` 付き）を両方適用
  - `deleteItem` / `deletePhoto`: `save` の関数の中で「最新データ上の」対象を控え、保存成功後にその写真ファイル（本体・サムネイル）を `repo.trashFiles` し `cache.deleteThumbs`。ゴミ箱移動の失敗は `console.warn` だけ
  - `loadImage`: thumb はキャッシュ → 無ければ `repo.getImage` してキャッシュ。full はメモリの `Map` → 無ければ `repo.getImage` して `Map` に入れる（端末には保存しない）

- [ ] **Step 1: 失敗するテストを書く**（`createFakeRepository` / `createMemoryCache` と、テストファイル内で定義する `controllableAuth(signedIn: boolean): AuthService & { expire(): void }`（`expire()` 後は `isSignedIn()` が false、`getToken()` が `AuthRequiredError`、`signIn()` で再びログイン済み）を使う）

```ts
it('起動時はキャッシュを先に表示し、その後ドライブの最新に差し替える', async () => {
  const cache = createMemoryCache(); await cache.setData(makeData([makeItem({ id: 'old' })]));
  const repo = createFakeRepository({ configured: true, data: makeData([makeItem({ id: 'new' })]) });
  const c = new AppController({ repo, auth: controllableAuth(true), pickFolder: async () => null, cache });
  const seen: string[][] = []; c.subscribe(() => seen.push(c.getState().data?.items.map((i) => i.id) ?? []));
  await c.start();
  expect(seen[0]).toEqual(['old']);
  expect(c.getState().data?.items.map((i) => i.id)).toEqual(['new']);
});
it('保存先が未設定なら needsFolder → フォルダを選ぶと ready', async () => { /* pickFolder: async () => 'folder' */ });
it('フォルダ選択をキャンセルしたら needsFolder のまま', async () => {});
it('フォルダに作れなければ loadError に FolderNotWritableError', async () => { /* repo.setup を差し替えて reject */ });
it('saveItem で持ち物が増え、キャッシュも更新される', async () => {});
it('addPhoto は2ファイルをアップロードし写真を追加、サムネイルをキャッシュ', async () => {});
it('saveCare（写真あり）は写真と手入れを1回で保存し photoId でつなぐ', async () => {});
it('deleteItem は写真ファイルをゴミ箱へ移す', async () => { /* repo.files から消えている */ });
it('保存時にログインが切れていたら signedIn=false にして AuthRequiredError', async () => {
  const auth = controllableAuth(true); /* start 後 auth.expire() */
  await expect(c.toggleWear('i1', '2026-11-11')).rejects.toBeInstanceOf(AuthRequiredError);
  expect(c.getState().signedIn).toBe(false);
});
it('他の端末で削除された持ち物への保存は MissingRecordError で、持ち物は復活しない', async () => {
  // start 後に repo.mutate(d => deleteItem(d, 'i1')) で他端末の削除を再現
  await expect(c.toggleWear('i1', '2026-11-11')).rejects.toBeInstanceOf(MissingRecordError);
  expect(repo.peekData()?.items).toEqual([]);
});
it('loadImage(full) は2回目にドライブを読まない', async () => {});
```

- [ ] **Step 2: 失敗を確認** — Run: `npx vitest run src/state/controller.test.ts` / Expected: FAIL
- [ ] **Step 3: Interfaces のとおり `controller.ts` を実装し、`AppContext.tsx` と `useImageUrl.ts` を作る**
- [ ] **Step 4: 通過を確認** — Run: `npm test && npm run typecheck` / Expected: PASS
- [ ] **Step 5: Commit** — `git add src/state && git commit -m "feat: add app controller and React bindings"`

---

### Task 11: 画面の骨組み（ルーティング・ログイン・初回設定）と E2E の準備

**Files:**
- Create: `src/ui/router.ts`, `src/ui/useAsyncAction.ts`, `src/ui/styles.css`, `src/ui/components/Header.tsx`, `src/ui/components/AuthBanner.tsx`, `src/ui/components/SaveError.tsx`, `src/ui/pages/WelcomePage.tsx`, `src/ui/pages/SetupPage.tsx`, `src/ui/pages/NotFoundPage.tsx`, `src/dev/fakeServices.ts`, `playwright.config.ts`, `e2e/helpers.ts`, `e2e/setup.spec.ts`
- Modify: `src/ui/App.tsx`, `src/main.tsx`
- Test: `src/ui/router.test.ts`, `e2e/setup.spec.ts`

**Interfaces:**
- Consumes: `AppController` `AppProvider` `useAppState` `useController`（Task 10）、`createDriveRepository` `createFakeRepository`、`DriveApi`、`createGisAuth` `createFakeAuth` `pickFolder`、`createIdbCache`、`singleFlight`、`errorMessage`
- Produces:
  ```ts
  type Route =
    | { name: 'home' } | { name: 'itemNew' } | { name: 'item'; itemId: string } | { name: 'itemEdit'; itemId: string }
    | { name: 'photoNew'; itemId: string } | { name: 'photoEdit'; itemId: string; photoId: string }
    | { name: 'careNew'; itemId: string } | { name: 'careEdit'; itemId: string; careId: string }
    | { name: 'wears'; itemId: string } | { name: 'compare'; itemId: string } | { name: 'notFound' };
  parseRoute(hash: string): Route        // 設計書 4.1 のパス。'' と '#/' は home。各 id は decodeURIComponent
  useRoute(): Route                      // hashchange を購読
  navigate(path: string, opts?: { replace?: boolean }): void   // path は '/items/abc' の形
  href(path: string): string             // '#' + path
  useAsyncAction<A extends unknown[]>(fn: (...args: A) => Promise<void>): { run: (...args: A) => Promise<void>; busy: boolean; error: unknown | null }
      // singleFlight で包む。例外は error に入れ、投げない。run 開始時に error を null に戻す
  <Header title={string} back?: string />           // back があれば '‹ 戻る'（href(back)）。syncing 中は '同期中…'
  <SaveError error={unknown} onRetry={() => void} /> // '保存できませんでした。' + errorMessage + ボタン
      // AuthRequiredError なら 'Google で続けて再試行'（onClick 内で controller.signIn().then(onRetry)）、それ以外は '再試行'
  ```
- `App.tsx` の表示の切り替え（上から順に判定）:
  1. `loadError instanceof DataFormatError` → `errorMessage` を出すだけの画面（保存操作を一切出さない）
  2. 未ログインかつ `data === null` → `WelcomePage`（アプリ名・説明文・`Google で続ける`）
  3. ログイン済みかつ `setup === 'needsFolder'` → `SetupPage`（見出し・説明・`フォルダを選ぶ` → `controller.chooseFolder()`。`loadError` があれば `errorMessage` を表示）
  4. ログイン済みかつ `data === null` → `読み込み中…`
  5. それ以外 → 未ログインなら `AuthBanner`（`ログインの有効期限が切れました` + `Google で続ける`）を上に出し、ルートに応じたページ。Task 11 では home は仮のページ、未知のルートは `NotFoundPage`
- `main.tsx`: `import.meta.env.VITE_FAKE_DRIVE === '1'` のときだけ `await import('./dev/fakeServices')`（本番ビルドに含めないため、この条件式をそのまま書く）。本番は `createGisAuth({ clientId: GOOGLE_CLIENT_ID, scope: DRIVE_SCOPE })`、`new DriveApi({ getToken: () => auth.getToken(), onUnauthorized: () => auth.clear() })`、`createDriveRepository(api)`、`pickFolder({ apiKey, appId, getToken })`、`createIdbCache()`。`controller.start()` を呼んでから描画
- `fakeServices.ts`: `createFakeRepository()`（未設定状態）、`createFakeAuth()`、`pickFolder: async () => 'fake-folder'`、`createIdbCache()`。`window.__kawaFake = { repo }` を公開
- `playwright.config.ts`: `testDir: 'e2e'`、`use: { ...devices['Pixel 7'], baseURL: 'http://localhost:5199/kawa-diary/' }`、`webServer: { command: 'npm run dev:fake', url: 'http://localhost:5199/kawa-diary/', reuseExistingServer: !process.env.CI }`
- `e2e/helpers.ts`:
  - `finishSetup(page): Promise<void>`（`goto('./')` → `フォルダを選ぶ` を押す → ホームが出るまで待つ）
  - `makeJpeg(page, width, height, color): Promise<Buffer>`（ページ内 canvas で JPEG を作り返す）
  - `createItem(page, opts: { name: string; brand?: string; category?: string; price?: string; purchaseDate?: string }): Promise<void>`（Task 12 で中身を作る）

- [ ] **Step 1: 失敗するテストを書く**

```ts
// router.test.ts
it.each([
  ['', { name: 'home' }], ['#/', { name: 'home' }], ['#/items/new', { name: 'itemNew' }],
  ['#/items/a%20b', { name: 'item', itemId: 'a b' }], ['#/items/a/edit', { name: 'itemEdit', itemId: 'a' }],
  ['#/items/a/photos/new', { name: 'photoNew', itemId: 'a' }], ['#/items/a/photos/p1', { name: 'photoEdit', itemId: 'a', photoId: 'p1' }],
  ['#/items/a/care/new', { name: 'careNew', itemId: 'a' }], ['#/items/a/care/c1', { name: 'careEdit', itemId: 'a', careId: 'c1' }],
  ['#/items/a/wears', { name: 'wears', itemId: 'a' }], ['#/items/a/compare', { name: 'compare', itemId: 'a' }],
  ['#/foo', { name: 'notFound' }],
])('parseRoute(%s)', (hash, want) => expect(parseRoute(hash)).toEqual(want));
```

```ts
// e2e/setup.spec.ts
test('初回はフォルダを選ぶとホームが表示される', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: '保存先フォルダを選んでください' })).toBeVisible();
  await page.getByRole('button', { name: 'フォルダを選ぶ' }).click();
  await expect(page.getByRole('heading', { name: 'Kawa Diary' })).toBeVisible();
});
test('存在しないページ', async ({ page }) => {
  await finishSetup(page);
  await page.goto('./#/foo');
  await expect(page.getByText('ページが見つかりません')).toBeVisible();
});
```

- [ ] **Step 2: 失敗を確認** — Run: `npx vitest run src/ui && npm run e2e -- e2e/setup.spec.ts` / Expected: どちらも FAIL
- [ ] **Step 3: Interfaces のとおり実装する。** `styles.css` に Global Constraints の CSS 変数とフォント、ボタン・入力欄・カードの基本スタイルを書き、`main.tsx` で読み込む
- [ ] **Step 4: 通過を確認** — Run: `npm test && npm run typecheck && npm run e2e -- e2e/setup.spec.ts` / Expected: PASS
- [ ] **Step 5: 本番ビルドにフェイクが入らないことを確認** — Run: `npm run build && ! grep -r "fake-folder" dist/` / Expected: grep が何も見つけず終了コード 0
- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: add routing, sign-in and folder setup screens"`

---

### Task 12: ホーム（一覧）と持ち物の登録・編集

**Files:**
- Create: `src/ui/pages/HomePage.tsx`, `src/ui/pages/ItemFormPage.tsx`, `src/ui/pages/ItemDetailPage.tsx`（仮）, `src/ui/components/Thumb.tsx`, `src/ui/components/CategoryFilter.tsx`, `e2e/items.spec.ts`
- Modify: `src/ui/App.tsx`（home / itemNew / item / itemEdit をつなぐ）, `e2e/helpers.ts`（`createItem` の中身）

**Interfaces:**
- Consumes: `itemsForHome` `latestPhoto` `usagePeriod` `wearCount`、`parsePrice`、`todayLocal`、`CATEGORIES` `CATEGORY_LABELS`、`useImageUrl`、`useAsyncAction`、`SaveError`、`Header`
- Produces:
  - `<Thumb fileId={string | null} alt={string} />`: サムネイル表示。null なら背景色だけの枠。`FileNotFoundError` なら `画像が見つかりません`
  - `<CategoryFilter value={Category | 'all'} onChange />`: `すべて` + 5カテゴリのボタン（選択中は `aria-pressed="true"`）
  - `ItemDetailPage`（仮）: `Header`（戻る先 `/`）と製品名・ブランド・`編集` リンクだけ。Task 13 で完成させる
- HomePage: 見出し `Kawa Diary`、絞り込み、カード（`href('/items/<id>')` のリンク。最新写真のサムネイル・製品名・ブランド・使用期間・`着用 {n}回`）、空のとき空メッセージ、右下に `＋` ボタン（aria-label `持ち物を登録`）。PC では `grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))`
- ItemFormPage（`itemId` 無し = 登録、有り = 編集）: ラベル付き入力（製品名 text・ブランド text・カテゴリ select（初期値 `other`）・購入日 date・金額 text `inputmode="numeric"`・メモ textarea）。保存時に検証（製品名が空 → `製品名を入力してください`、`parsePrice` が `'invalid'` → `金額は0以上の整数で入力してください`）→ `controller.saveItem` → `navigate('/items/<id>', { replace: true })`。失敗は `SaveError`（入力は残す）。編集時のみ `削除`（`confirm` の文言は画面文言の表どおり）→ `controller.deleteItem` → `navigate('/', { replace: true })`。編集対象が無ければ `この持ち物は見つかりません`

- [ ] **Step 1: 失敗する E2E を書く**（全テストで `page.on('dialog', (d) => d.accept())`、開始時に `finishSetup`）

```ts
test('登録するとホームに出る', async ({ page }) => {
  await createItem(page, { name: '501XX', brand: "Levi's", category: 'ジーンズ' });
  await page.goto('./#/');
  const card = page.getByRole('link', { name: /501XX/ });
  await expect(card).toContainText("Levi's");
  await expect(card).toContainText('着用 0回');
});
test('カテゴリで絞り込める', async ({ page }) => {
  await createItem(page, { name: '501XX', category: 'ジーンズ' });
  await createItem(page, { name: 'エンジニア', category: '靴' });
  await page.goto('./#/');
  await page.getByRole('button', { name: '靴' }).click();
  await expect(page.getByRole('link', { name: /エンジニア/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /501XX/ })).toHaveCount(0);
});
test('入力エラー', async ({ page }) => {
  await page.goto('./#/items/new');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByText('製品名を入力してください')).toBeVisible();
  await page.getByLabel('製品名').fill('a'); await page.getByLabel('金額（円）').fill('abc');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByText('金額は0以上の整数で入力してください')).toBeVisible();
});
test('全角の金額も保存できる', async ({ page }) => {
  await createItem(page, { name: 'ライダース', price: '￥１２，０００' });
  const price = await page.evaluate(() => (window as any).__kawaFake.repo.peekData().items[0].price);
  expect(price).toBe(12000);
});
test('編集と削除', async ({ page }) => {
  await createItem(page, { name: '旧名' });
  await page.getByRole('link', { name: '編集' }).click();
  await page.getByLabel('製品名').fill('新名');
  await page.getByRole('button', { name: '保存' }).click();
  await page.goto('./#/');
  await expect(page.getByRole('link', { name: /新名/ })).toBeVisible();
  await page.getByRole('link', { name: /新名/ }).click();
  await page.getByRole('link', { name: '編集' }).click();
  await page.getByRole('button', { name: '削除' }).click();
  await expect(page.getByText('まだ持ち物がありません。「＋」から登録しましょう。')).toBeVisible();
});
```

- [ ] **Step 2: 失敗を確認** — Run: `npm run e2e -- e2e/items.spec.ts` / Expected: FAIL
- [ ] **Step 3: Interfaces のとおり実装する。** `createItem` ヘルパーは `＋` → フォーム入力 → `保存` → 詳細ページの見出しに製品名が出るまで待つ
- [ ] **Step 4: 通過を確認** — Run: `npm run typecheck && npm run e2e` / Expected: PASS
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add item list and item form"`

---

### Task 13: 持ち物の詳細・着用記録・記録一覧

**Files:**
- Create: `src/ui/components/PhotoView.tsx`, `src/ui/components/Timeline.tsx`, `src/ui/pages/WearsPage.tsx`, `e2e/detail.spec.ts`
- Modify: `src/ui/pages/ItemDetailPage.tsx`（完成させる）, `src/ui/App.tsx`（wears をつなぐ）

**Interfaces:**
- Consumes: `latestPhoto` `wearCount` `costPerWear` `usagePeriod` `lastCareDate` `timeline`、`formatDate` `formatYen` `todayLocal`、`CATEGORY_LABELS` `CARE_LABELS`、`controller.toggleWear` `addWear` `removeWear`
- Produces:
  - `<PhotoView photo={Photo} />`: `usePhotoUrl(photo)` で表示（未ログインでもキャッシュ済みのサムネイルは見える）。`aspect-ratio: width / height` で枠を先に確保。`notFound` なら `画像が見つかりません`
  - `<Timeline itemId={string} entries={TimelineEntry[]} />`: 写真の項目 = サムネイル・撮影日・メモ（リンク先 `/items/<id>/photos/<photoId>`）。手入れの項目 = 日付・種類名・メモ・写真があればサムネイル（リンク先 `/items/<id>/care/<careId>`）。空なら `まだ記録がありません`
- ItemDetailPage: `Header`（戻る先 `/`、タイトルは製品名）→ 最新写真（あれば `PhotoView`）→ ブランド・カテゴリ名・購入日・金額・メモ（値があるものだけ）→ 集計（`着用回数` は `{n}回` で着用履歴へのリンク、`最後の手入れ` `使用期間` `1回あたり` は値があるときだけ行を出す）→ ボタン（`今日着た` / `今日着た ✓`、`aria-pressed`、`useAsyncAction` で実行中は disabled）、`写真を追加` `手入れを記録` `比較する`（写真 2 枚未満は disabled）、`編集` リンク → 見出し `記録` と `Timeline`。持ち物が無ければ `この持ち物は見つかりません` とホームへのリンク。ボタンの保存失敗は `SaveError`
- WearsPage: `Header`（タイトル `着用履歴`、戻る先は詳細）、`着用 {n}回`、日付入力（ラベル `着た日`、初期値は今日）+ `追加`、着た日の一覧（新しい順、`formatDate`、行ごとに `削除`、aria-label は `{YYYY/MM/DD} を削除`）、空なら `まだ着用の記録がありません`

- [ ] **Step 1: 失敗する E2E を書く**

```ts
test('今日着たで回数と1回あたりが変わり、もう一度押すと取り消せる', async ({ page }) => {
  await createItem(page, { name: 'ライダース', price: '12000' });
  const wear = page.getByRole('button', { name: '今日着た', exact: true });
  await wear.click();
  await expect(page.getByRole('button', { name: '今日着た ✓', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('¥12,000').first()).toBeVisible();      // 金額 と 1回あたり
  await expect(page.getByRole('link', { name: '1回', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '今日着た ✓', exact: true }).click();
  await expect(page.getByRole('button', { name: '今日着た', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText('1回あたり')).toHaveCount(0);
});
test('着用履歴で過去の日付を追加・削除できる', async ({ page }) => {
  await createItem(page, { name: 'ライダース' });
  await page.getByRole('link', { name: '0回', exact: true }).click();
  await page.getByLabel('着た日').fill('2026-01-05');
  await page.getByRole('button', { name: '追加' }).click();
  await expect(page.getByText('着用 1回')).toBeVisible();
  await page.getByRole('button', { name: '2026/01/05 を削除' }).click();
  await expect(page.getByText('まだ着用の記録がありません')).toBeVisible();
});
test('写真が無いと比較できない・記録は空', async ({ page }) => {
  await createItem(page, { name: 'ライダース', purchaseDate: '2024-08-11' });
  await expect(page.getByRole('button', { name: '比較する' })).toBeDisabled();
  await expect(page.getByText('まだ記録がありません')).toBeVisible();
  await expect(page.getByText('使用期間')).toBeVisible();
});
test('存在しない持ち物', async ({ page }) => {
  await page.goto('./#/items/nope');
  await expect(page.getByText('この持ち物は見つかりません')).toBeVisible();
});
```

- [ ] **Step 2: 失敗を確認** — Run: `npm run e2e -- e2e/detail.spec.ts` / Expected: FAIL
- [ ] **Step 3: Interfaces のとおり実装する**
- [ ] **Step 4: 通過を確認** — Run: `npm run typecheck && npm run e2e` / Expected: PASS
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add item detail, wear log and timeline"`

---

### Task 14: 写真の追加・編集と手入れの記録

**Files:**
- Create: `src/ui/components/PhotoPicker.tsx`, `src/ui/pages/PhotoFormPage.tsx`, `src/ui/pages/CareFormPage.tsx`, `e2e/photos.spec.ts`
- Modify: `src/ui/App.tsx`（photoNew / photoEdit / careNew / careEdit をつなぐ）, `src/ui/pages/ItemDetailPage.tsx`（ボタンのリンク先）

**Interfaces:**
- Consumes: `preparePhoto` `PreparedPhoto`（Task 5）、`controller.addPhoto` `updatePhoto` `deletePhoto` `saveCare` `deleteCare`、`CARE_TYPES` `CARE_LABELS`、`todayLocal`、`Thumb`、`SaveError`、`useAsyncAction`
- Produces:
  - `<PhotoPicker label={string} onPrepared={(p: PreparedPhoto | null) => void} />`: `<input type="file" accept="image/*">`（ラベル付き）。選択後 `preparePhoto(file, todayLocal())` → サムネイルのプレビュー（object URL）。失敗は `errorMessage`（`この形式の画像は読み込めません`）を表示し `onPrepared(null)`。処理中は `読み込み中…`
- PhotoFormPage（新規）: 見出し `写真を追加`、`PhotoPicker`（ラベル `写真を選ぶ`）、`撮影日`（選んだ写真の `takenAt` を初期値に入れる。変更可）、`メモ`、`保存`（写真が無い間は disabled）→ `controller.addPhoto` → 詳細へ `replace`
- PhotoFormPage（編集）: 見出し `写真を編集`、`Thumb`、`撮影日`、`メモ`、`保存` → `updatePhoto`、`削除`（`この写真を削除しますか？`）→ `deletePhoto`
- CareFormPage（新規）: 見出し `手入れを記録`、`日付`（初期値は今日）、`種類`（select、初期値 `oil`）、`メモ`、`PhotoPicker`（ラベル `写真（任意）`）、`保存` → `saveCare(itemId, input, prepared)`
- CareFormPage（編集）: 見出し `手入れを編集`、日付・種類・メモ（写真は表示のみで変更不可）、`保存` → `saveCare(itemId, input, null, careId)`、`削除`（`この手入れの記録を削除しますか？`）→ `deleteCare`
- どの画面も保存失敗は `SaveError` で表示し、入力と選んだ写真は残す

- [ ] **Step 1: 失敗する E2E を書く**

```ts
async function photoFromPage(page: Page, which: 'fileId' | 'thumbFileId') {
  return page.evaluate(async (key) => {
    const repo = (window as any).__kawaFake.repo;
    const blob: Blob = repo.files.get(repo.peekData().items[0].photos[0][key]);
    const bmp = await createImageBitmap(blob);
    return { width: bmp.width, height: bmp.height, type: blob.type };
  }, which);
}
test('写真を追加すると長辺 2048 / 480 の JPEG で保存され、記録に出る', async ({ page }) => {
  await createItem(page, { name: 'ブーツ' });
  await page.getByRole('link', { name: '写真を追加' }).click();
  await page.getByLabel('写真を選ぶ').setInputFiles({ name: 'a.jpg', mimeType: 'image/jpeg', buffer: await makeJpeg(page, 3000, 2000, '#663300') });
  await expect(page.getByLabel('撮影日')).not.toHaveValue('');
  await page.getByLabel('メモ').fill('初日');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByText('初日')).toBeVisible();
  expect(await photoFromPage(page, 'fileId')).toEqual({ width: 2048, height: 1365, type: 'image/jpeg' });
  expect(await photoFromPage(page, 'thumbFileId')).toEqual({ width: 480, height: 320, type: 'image/jpeg' });
});
test('写真のメモを編集し、削除できる', async ({ page }) => { /* 記録の項目をタップ → メモ変更 → 保存 → 表示確認 → 再度開いて削除 → 'まだ記録がありません' */ });
test('読み込めない画像はエラーを表示', async ({ page }) => {
  await createItem(page, { name: 'ブーツ' });
  await page.getByRole('link', { name: '写真を追加' }).click();
  await page.getByLabel('写真を選ぶ').setInputFiles({ name: 'x.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('not an image') });
  await expect(page.getByText('この形式の画像は読み込めません')).toBeVisible();
  await expect(page.getByRole('button', { name: '保存' })).toBeDisabled();
});
test('写真付きの手入れは記録に1件だけ出て、写真としても数えられる', async ({ page }) => {
  await createItem(page, { name: 'ブーツ' });
  await page.getByRole('link', { name: '手入れを記録' }).click();
  await page.getByLabel('種類').selectOption({ label: 'オイル・クリーム' });
  await page.getByLabel('写真（任意）').setInputFiles({ name: 'b.jpg', mimeType: 'image/jpeg', buffer: await makeJpeg(page, 800, 600, '#331100') });
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByText('オイル・クリーム')).toHaveCount(1);
  const counts = await page.evaluate(() => { const i = (window as any).__kawaFake.repo.peekData().items[0]; return [i.photos.length, i.care.length, i.care[0].photoId === i.photos[0].id]; });
  expect(counts).toEqual([1, 1, true]);
});
```

- [ ] **Step 2: 失敗を確認** — Run: `npm run e2e -- e2e/photos.spec.ts` / Expected: FAIL
- [ ] **Step 3: Interfaces のとおり実装する**
- [ ] **Step 4: 通過を確認** — Run: `npm run typecheck && npm run e2e` / Expected: PASS
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add photo and care forms"`

---

### Task 15: 比較画面（スライダーと位置合わせ）

**Files:**
- Create: `src/ui/compare/alignTransform.ts`, `src/ui/compare/CompareSlider.tsx`, `src/ui/pages/ComparePage.tsx`, `e2e/compare.spec.ts`
- Modify: `src/ui/App.tsx`（compare をつなぐ）, `src/ui/pages/ItemDetailPage.tsx`（`比較する` の遷移先）
- Test: `src/ui/compare/alignTransform.test.ts`

**Interfaces:**
- Consumes: `photosByDate` `oldestPhoto` `latestPhoto`、`daysBetween` `formatDate`、`useImageUrl`
- Produces（`alignTransform.ts`、純粋関数。画面座標 = `scale * 画像座標 + (x, y)`、`transform-origin: 0 0`）:
  ```ts
  interface Transform { scale: number; x: number; y: number }
  const IDENTITY: Transform  // { scale: 1, x: 0, y: 0 }
  const MIN_SCALE = 0.5, MAX_SCALE = 4
  pan(t: Transform, dx: number, dy: number): Transform
  zoomAt(t: Transform, factor: number, cx: number, cy: number): Transform   // (cx, cy) の点を動かさずに拡大縮小。scale は範囲内に丸め、丸めた時は位置も変えない
  pinch(start: Transform, from: [Pt, Pt], to: [Pt, Pt]): Transform          // 2点間距離の比で拡大、中点の移動で平行移動
  dividerPercent(clientX: number, left: number, width: number): number      // 0〜100 に丸める
  ```
- `<CompareSlider beforeUrl afterUrl aspectRatio mode transform onTransformChange divider onDividerChange />`:
  - 枠は `aspect-ratio`（「前」の写真の幅/高さ）、`touch-action: none`
  - 下に「前」の画像。上に `clip-path: inset(0 0 0 {divider}%)` の div、その中に `transform: translate(x,y) scale(s)` をかけた「後」の画像（境界線は画面上で固定のまま）
  - 境界線: `role="slider"` `aria-label="境界線"` `aria-valuemin=0` `aria-valuemax=100` `aria-valuenow={round(divider)}`、左右キーで ±2
  - `mode === 'slider'`: 枠内のドラッグで `dividerPercent`
  - `mode === 'align'`: 1本指ドラッグ = `pan`、2本指 = `pinch`、ホイール = `zoomAt(t, Math.exp(-deltaY / 500), ...)`。Pointer Events で指を管理し `setPointerCapture`
- ComparePage: 画像は `usePhotoUrl` で読む（本体が読めなければサムネイル）。`Header`（タイトル `比較`、戻る先は詳細）。写真 2 枚未満なら `比較するには写真が2枚以上必要です`。初期値 前 = `oldestPhoto`、後 = `latestPhoto`。`前` `後` それぞれのサムネイル列（`photosByDate` 順、選択中は `aria-pressed="true"`、aria-label は `前: {YYYY/MM/DD}` / `後: {YYYY/MM/DD}`）。前後の撮影日と `{|daysBetween|}日経過`。`位置合わせ` トグル（`aria-pressed`）と `位置をリセット`（`IDENTITY` に戻す）。比較には本体画像を使う。状態は保存しない

- [ ] **Step 1: 失敗するテストを書く**

```ts
// alignTransform.test.ts
it('zoomAt は指定点を固定する', () => expect(zoomAt(IDENTITY, 2, 100, 50)).toEqual({ scale: 2, x: -100, y: -50 }));
it('zoomAt は上限で止まり位置も変えない', () => {
  const t = { scale: 4, x: -10, y: -10 };
  expect(zoomAt(t, 2, 100, 50)).toEqual(t);
});
it('pan', () => expect(pan({ scale: 2, x: 1, y: 2 }, 10, -5)).toEqual({ scale: 2, x: 11, y: -3 }));
it('pinch は距離比で拡大し中点を追う', () => {
  expect(pinch(IDENTITY, [{ x: 0, y: 0 }, { x: 100, y: 0 }], [{ x: 0, y: 0 }, { x: 200, y: 0 }])).toEqual({ scale: 2, x: 0, y: 0 });
  expect(pinch(IDENTITY, [{ x: 0, y: 0 }, { x: 100, y: 0 }], [{ x: 10, y: 20 }, { x: 110, y: 20 }])).toEqual({ scale: 1, x: 10, y: 20 });
});
it('dividerPercent は 0〜100', () => {
  expect(dividerPercent(150, 100, 200)).toBe(25);
  expect(dividerPercent(0, 100, 200)).toBe(0);
  expect(dividerPercent(999, 100, 200)).toBe(100);
});
```

```ts
// e2e/compare.spec.ts
async function addPhoto(page: Page, date: string, color: string) { /* 写真を追加 → 撮影日を date に → 保存 */ }
test('最古と最新を重ねて比較し、境界線と位置合わせを操作できる', async ({ page }) => {
  await createItem(page, { name: 'ブーツ' });
  await addPhoto(page, '2025-01-10', '#aa7744');
  await addPhoto(page, '2026-11-11', '#442211');
  await page.getByRole('button', { name: '比較する' }).click();
  await expect(page.getByText('670日経過')).toBeVisible();
  await expect(page.getByRole('button', { name: '前: 2025/01/10' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: '後: 2026/11/11' })).toHaveAttribute('aria-pressed', 'true');
  const slider = page.getByRole('slider', { name: '境界線' });
  await expect(slider).toHaveAttribute('aria-valuenow', '50');
  const box = (await page.getByTestId('compare-frame').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.mouse.move(box.x + box.width / 4, box.y + box.height / 2); await page.mouse.up();
  await expect(slider).toHaveAttribute('aria-valuenow', '25');
  await page.getByRole('button', { name: '位置合わせ' }).click();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2); await page.mouse.up();
  await expect(page.getByTestId('after-image')).toHaveCSS('transform', /matrix\(1, 0, 0, 1, 30, 0\)/);
  await expect(slider).toHaveAttribute('aria-valuenow', '25');   // 位置合わせ中は境界線が動かない
  await page.getByRole('button', { name: '位置をリセット' }).click();
  await expect(page.getByTestId('after-image')).toHaveCSS('transform', /matrix\(1, 0, 0, 1, 0, 0\)|none/);
});
```

枠に `data-testid="compare-frame"`、「後」の画像に `data-testid="after-image"` を付ける。

- [ ] **Step 2: 失敗を確認** — Run: `npx vitest run src/ui/compare && npm run e2e -- e2e/compare.spec.ts` / Expected: FAIL
- [ ] **Step 3: Interfaces のとおり実装する**
- [ ] **Step 4: 通過を確認** — Run: `npm test && npm run typecheck && npm run e2e` / Expected: PASS
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add photo comparison slider with alignment"`

---

### Task 16: PWA 化・公開設定・手順書

**Files:**
- Create: `public/icon.svg`, `scripts/make-icons.mjs`, `public/pwa-192.png`, `public/pwa-512.png`, `public/apple-touch-icon.png`, `.github/workflows/deploy.yml`, `docs/setup.md`, `README.md`
- Modify: `vite.config.ts`, `index.html`

**Interfaces:**
- `vite.config.ts` に `VitePWA({ registerType: 'autoUpdate', manifest: { name: 'Kawa Diary', short_name: 'Kawa Diary', lang: 'ja', start_url: './', scope: './', display: 'standalone', background_color: '#f5efe6', theme_color: '#8b4a24', icons: [192, 512 の png] }, workbox: { globPatterns: ['**/*.{js,css,html,svg,png}'] } })`。`runtimeCaching` は設定しない（Google の通信はキャッシュしない）
- `index.html` に `<link rel="apple-touch-icon" href="apple-touch-icon.png">` と `<meta name="apple-mobile-web-app-capable" content="yes">`
- アイコン: `icon.svg` は茶色（`#8b4a24`）の角丸四角に白の「革」の字。`scripts/make-icons.mjs` は Playwright（`require('playwright')` 相当の import）で SVG を 192 / 512 / 180px の PNG にする。生成した PNG もコミットする
- `deploy.yml`: `main` への push と手動実行で動く。build ジョブ = checkout → setup-node（22、npm キャッシュ）→ `npm ci` → `npm run typecheck` → `npm test` → `npm run build`（env に `VITE_GOOGLE_CLIENT_ID: ${{ vars.VITE_GOOGLE_CLIENT_ID }}` など3つ）→ upload-pages-artifact（`dist`）。deploy ジョブ = deploy-pages（environment `github-pages`）。`permissions: { contents: read, pages: write, id-token: write }`。各 action は実装時点の最新メジャー版を使う
- `docs/setup.md`（日本語、スマホでも読める短い段落）: 設計書 7 章の手順を画面上のボタン名つきで書く。加えて
  - OAuth 同意画面の「データアクセス」に `.../auth/drive.file` を追加すること
  - PR を `main` にマージすると公開されること、公開 URL `https://shinnosuke06.github.io/kawa-diary/`
  - iPhone の「共有 → ホーム画面に追加」、Android Chrome の「ホーム画面に追加」
  - 初回設定後の確認: ドライブの「Kawa Diary」内に `photos` フォルダと `data.json` ができていること
  - 「このフォルダには保存できません」と出た場合: `src/config.ts` の `DRIVE_SCOPE` を `'https://www.googleapis.com/auth/drive'` に変え、同意画面のデータアクセスにも追加して再公開する（初回ログイン時に「Google はこのアプリを確認していません」と出るので「詳細」→「Kawa Diary（安全ではないページ）に移動」で進む）
- `README.md`: アプリの一言説明、`docs/setup.md` へのリンク、開発コマンド（`npm run dev:fake` / `npm test` / `npm run e2e`）

- [ ] **Step 1: アイコンを生成する** — Run: `node scripts/make-icons.mjs && file public/*.png` / Expected: 192x192・512x512・180x180 の PNG
- [ ] **Step 2: PWA 設定と index.html を更新しビルドする** — Run: `npm run build && cat dist/manifest.webmanifest && ls dist/sw.js` / Expected: manifest に `"name":"Kawa Diary"` と `"start_url":"./"`、`sw.js` がある
- [ ] **Step 3: サービスワーカーが登録されることを確認** — Run: `npm run preview -- --port 4173 &` の後、Playwright のスクリプトで `http://localhost:4173/kawa-diary/` を開き `await navigator.serviceWorker.ready` が解決すること、`Kawa Diary` が表示されることを確認（スクリプトはスクラッチ領域に置きコミットしない）。終わったら preview を止める
- [ ] **Step 4: `deploy.yml` `docs/setup.md` `README.md` を書く**
- [ ] **Step 5: 全部の確認** — Run: `npm run typecheck && npm test && npm run e2e && npm run build` / Expected: すべて PASS
- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: make the app installable and add deploy workflow and setup guide"`
