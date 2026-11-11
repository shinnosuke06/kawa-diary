# Kawa Diary 設計書

作成日: 2026-11-11

## 1. 目的

レザージャケット、ブーツ、ジーンズ、帽子など「長く使って育てる物」の経年変化を記録するアプリ。
写真で変化を残し、購入情報・手入れ・着用回数とあわせて振り返れるようにする。

- 利用者: 本人1人のみ
- 主な端末: スマホ（確認・追加）。PCでも閲覧する
- 保存先: 本人の Google ドライブ

### 成功の基準

- スマホで「持ち物の登録 → 写真追加 → 手入れ記録 → 着用記録」が迷わずできる
- 2枚の写真をスライダーで重ねて比較し、変化がわかる
- スマホで追加した内容を PC でも見られる
- PC で全画面表示しても写真が粗く見えない

## 2. 機能と画面

### 2.1 ホーム（持ち物一覧）

- カード表示: 最新写真のサムネイル、製品名、ブランド、使用期間（例「2年3ヶ月」）、着用回数
- カテゴリで絞り込み: すべて / ジャケット / 靴 / ジーンズ / 帽子 / その他
- 並び順: 最終更新が新しい順
- 「＋」ボタンで持ち物を登録

### 2.2 持ち物の登録・編集

| 項目 | 必須 | 備考 |
|---|---|---|
| 製品名 | 必須 | |
| ブランド | 任意 | |
| カテゴリ | 必須 | 上記5種から選択。初期値「その他」 |
| 購入日 | 任意 | |
| 金額 | 任意 | 円、整数 |
| メモ | 任意 | |

編集画面から持ち物を削除できる（確認ダイアログあり）。削除すると紐づく写真ファイルもドライブのゴミ箱へ移動する。

### 2.3 持ち物の詳細

- 最新写真、基本情報
- 集計: 着用回数、最後の手入れ日、使用期間、1回あたりの金額（金額 ÷ 着用回数を円未満四捨五入。金額が無いか着用0回なら表示しない）
- 使用期間の起点: 購入日。購入日が無ければ最初の写真の撮影日。どちらも無ければ表示しない
- 使用期間の表示: 1ヶ月未満は「◯日」、それ以上は「◯年◯ヶ月」（0年なら「◯ヶ月」、0ヶ月なら「◯年」）
- 「今日」などの日付はすべて端末のローカル時刻で判定する
- ボタン:
  - 「今日着た」: 1タップで今日を着用日に追加。追加済みなら「今日着た ✓」と表示し、タップで取り消し
  - 写真を追加 / 手入れを記録 / 比較する（写真が2枚以上ある時のみ有効）
- 着用回数をタップすると着用履歴画面へ（過去の日付を追加・削除できる。記録し忘れ対策）
- 記録タイムライン: 写真と手入れを日付の新しい順に混在表示。各記録はタップで編集・削除できる

### 2.4 写真の追加

- カメラで撮影 または アルバムから選択（`<input type="file" accept="image/*">`）
- 選択後ブラウザ内で縮小（3.3 節）
- 撮影日: 写真の EXIF（DateTimeOriginal）から自動取得 → 無ければファイルの更新日 → それも無ければ今日。手動で変更可
- メモ（任意）

### 2.5 手入れの記録

- 日付（初期値: 今日）
- 種類: オイル・クリーム / ブラッシング / 洗濯 / 防水 / 修理 / その他
- メモ（任意）
- 写真（任意、1枚。追加した写真は通常の写真としても扱われ、比較に使える）

### 2.6 比較画面

- 2枚を選ぶ（「前」と「後」）。初期値は「前」= 一番古い写真、「後」= 最新の写真。サムネイル列からそれぞれ選び直せる
- 2枚を重ねて表示する。縦の境界線より左に「前」、右に「後」が見える。境界線を指（またはマウス）で左右にドラッグして比較
- 「後」の写真を指で拡大・移動（ピンチ・ドラッグ、PC はホイールとドラッグ）して「前」に位置を合わせられる。境界線の操作と区別するため、位置調整は「位置合わせ」モードに切り替えて行う。「位置をリセット」ボタンあり
- 位置調整の状態は保存しない
- 各写真の撮影日と、2枚の間の経過日数を表示

### 2.7 入れないもの

共有機能、オフラインでの追加・編集、手放した物の保管（アーカイブ）機能、撮影時の重ね表示ガイド、検索。

## 3. データと保存

### 3.1 Google ドライブの構成

```
マイドライブ/
  Kawa Diary/
    data.json              ← 文字データすべて
    photos/
      <photoId>.jpg        長辺 2048px
      <photoId>_thumb.jpg  長辺 480px
```

- 「Kawa Diary」フォルダは本人が手動で作成済み。アプリはこのフォルダを使う
- 権限は `https://www.googleapis.com/auth/drive.file`。アプリが操作できるのは「アプリが作ったファイル」と「本人が Google Picker で選んだファイル・フォルダ」だけ。ドライブの他のファイルには触れない
- 手動で「Kawa Diary」フォルダに入れたファイルはアプリからは見えない（アプリ経由で追加したものだけ扱う）

### 3.1.1 初回設定（フォルダの選択）

ログイン後、次の順で保存先を決める。

1. `appProperties` に `kawaDiary='data'` を持つ `data.json`（ゴミ箱以外）を検索する。見つかれば、その親フォルダを保存先とし、`photos` フォルダも同様に `appProperties` の `kawaDiary='photos'` で探す。設定完了
2. 見つからなければ「保存先フォルダを選んでください」画面を表示し、Google Picker（フォルダのみ選択可能）を開く
3. 選ばれたフォルダの中に `photos` フォルダと空の `data.json` を作成する（どちらも `appProperties` で目印をつける）。設定完了

- 2台目の端末では手順1で見つかるため、フォルダを選び直す必要はない
- 選ばれたフォルダ名が「Kawa Diary」でなくてもそのまま使う
- Google Picker はスマホのブラウザで不安定な場合があるため、手順書では「初回設定は PC で行う」ことを推奨する
- 未検証の前提: 「Picker で選んだフォルダの中に、drive.file 権限でファイルを作成できる」。Google の公式文書に明記はなく、開発者コミュニティでは可能と報告されている。手順3で作成に失敗した場合は、権限を `https://www.googleapis.com/auth/drive`（ドライブ全体）に切り替える。本人専用（OAuth 同意画面がテストモード）のため審査は不要だが、初回ログイン時に「確認されていないアプリ」の警告が出る。この切り替えはデプロイ後の実機確認で判断し、必要なら設定値の変更だけで済むようにスコープを定数1か所にまとめておく

### 3.2 data.json の形式

```ts
type Category = 'jacket' | 'shoes' | 'jeans' | 'hat' | 'other';
type CareType = 'oil' | 'brushing' | 'wash' | 'waterproof' | 'repair' | 'other';

interface DiaryData {
  version: 1;
  items: Item[];
}

interface Item {
  id: string;              // crypto.randomUUID()
  name: string;
  brand: string;           // 未入力は ''
  category: Category;
  purchaseDate: string | null;  // 'YYYY-MM-DD'
  price: number | null;    // 円
  memo: string;
  photos: Photo[];
  care: CareRecord[];
  wearDates: string[];     // 'YYYY-MM-DD'、重複なし、昇順
  createdAt: string;       // ISO 8601
  updatedAt: string;       // ISO 8601
}

interface Photo {
  id: string;
  takenAt: string;         // 'YYYY-MM-DD'
  memo: string;
  fileId: string;          // ドライブのファイルID（2048px版）
  thumbFileId: string;     // ドライブのファイルID（480px版）
  width: number;           // 2048px版の幅
  height: number;
}

interface CareRecord {
  id: string;
  date: string;            // 'YYYY-MM-DD'
  type: CareType;
  memo: string;
  photoId: string | null;  // Item.photos 内の Photo.id
}
```

- 着用回数は `wearDates.length`
- 最新写真は `takenAt` が最も新しい写真（同日なら配列の後ろ側）
- 手入れに紐づく写真を削除した場合、その手入れ記録の `photoId` を `null` にする
- 読み込み時に `version` が 1 でなければエラー表示して書き込みを行わない

### 3.3 写真の処理

- 縮小はブラウザ内の canvas で行い、元の大きな写真はアップロードしない
  - 本体: 長辺 2048px（元が小さければそのまま）、JPEG 品質 0.85、1枚 400〜800KB 程度
  - サムネイル: 長辺 480px、JPEG 品質 0.8
- 向き: `createImageBitmap(file, { imageOrientation: 'from-image' })` で EXIF の回転を反映
- EXIF の撮影日は `exifr` ライブラリで読む
- iPhone の HEIC はファイル選択時にブラウザが JPEG に変換する前提。読み込めない形式の場合はエラー表示

### 3.4 保存の流れと同時編集

- すべての変更は「変更関数」として表す（例: `addPhoto(itemId, photo)`）。純粋関数で `DiaryData` を受け取り新しい `DiaryData` を返す
- 保存手順: ドライブから最新の data.json を読む → 変更関数を適用 → data.json を上書き
- これにより、スマホと PC で時間をずらして編集しても互いの変更が消えない。全く同時に保存した場合のみ後勝ちになる（1人利用のため許容）
- 端末内での保存は1件ずつ順番に実行する（キュー）
- 写真の追加は「2枚（本体・サムネイル）をアップロード → data.json を更新」の順。data.json 更新に失敗した場合、アップロード済みの写真は残る（参照されないだけで害はない）

### 3.5 端末内キャッシュ

- IndexedDB に data.json の最新内容とサムネイル画像を保存
- 起動時はキャッシュを即表示し、ログイン済みなら裏でドライブから最新を取得して差し替える
- 本体画像（2048px）は表示中のみメモリに保持し、端末には保存しない（容量節約）

## 4. 技術構成

### 4.1 全体

- React + TypeScript + Vite
- ルーティング: ハッシュ方式（GitHub Pages で直接 URL を開いても 404 にならないため）
  - `#/` ホーム
  - `#/items/new` 登録
  - `#/items/:id` 詳細
  - `#/items/:id/edit` 編集
  - `#/items/:id/photos/new` 写真追加、`#/items/:id/photos/:photoId` 写真の編集
  - `#/items/:id/care/new` 手入れ記録、`#/items/:id/care/:careId` 手入れの編集
  - `#/items/:id/wears` 着用履歴
  - `#/items/:id/compare` 比較
- PWA: `vite-plugin-pwa` で manifest とサービスワーカー（アプリ本体のみキャッシュ）を生成。ホーム画面に追加して起動できる
- 公開: GitHub Actions で build し GitHub Pages（`https://shinnosuke06.github.io/kawa-diary/`）へデプロイ
- 設定: 次の3つを環境変数で渡す（GitHub のリポジトリ変数に登録）。いずれもブラウザに公開される前提の値で、秘密情報ではない
  - `VITE_GOOGLE_CLIENT_ID`: OAuth クライアント ID
  - `VITE_GOOGLE_API_KEY`: Google Picker 用の API キー（HTTP リファラーを `https://shinnosuke06.github.io/*` に、API を Google Picker API に制限する）
  - `VITE_GOOGLE_APP_ID`: Google Cloud のプロジェクト番号（Picker の `setAppId` に必要）

### 4.2 部品の分け方

| 部品 | 役割 | 依存 |
|---|---|---|
| `domain/` | 型定義、変更関数、集計（着用回数・1回あたり金額・使用期間・最新写真） | なし（純粋関数） |
| `drive/auth` | Google Identity Services でアクセストークン取得・保持 | GIS スクリプト |
| `drive/driveApi` | Drive API v3 の fetch ラッパー（list / create / get media / update / trash） | auth |
| `drive/picker` | Google Picker でフォルダを1つ選ばせ、フォルダ ID を返す | GIS トークン、Picker スクリプト |
| `storage/Repository` | 保存先のインターフェース: `findSetup()` / `setup(folderId)` / `load()` / `mutate(fn)` / `uploadPhoto()` / `getImage()` / `trashFiles()` | domain |
| `storage/driveRepository` | Repository のドライブ実装（3.1.1 の初回設定を含む） | driveApi |
| `storage/fakeRepository` | Repository のメモリ実装（テスト用。フォルダ選択も即座に成功させる） | domain |
| `images/` | 縮小、EXIF 撮影日の取得 | exifr |
| `cache/` | IndexedDB キャッシュ | idb-keyval |
| `state/` | 画面に渡す状態管理。キャッシュと Repository をつなぎ、保存キューを持つ | 上記 |
| `ui/` | 画面とコンポーネント | state |

### 4.3 ログイン

- Google Identity Services のトークンクライアント（`initTokenClient`）を使用。スコープは `drive.file`（3.1.1 の未検証の前提が崩れた場合は `drive`）
- トークンは有効期限とともに localStorage に保存し、期限内なら再起動後もそのまま使う
- 期限切れ時は画面上部に「Google で続ける」ボタンを表示。ブラウザのポップアップブロックを避けるため、タップ操作から取得する
- 同意済みなら2回目以降は確認画面が一瞬出て自動で閉じる
- ログイン前でもキャッシュの内容は閲覧できる。追加・編集ボタンは押せるが、保存時にログインを求める

## 5. エラー時の動き

| 状況 | 動き |
|---|---|
| 通信失敗 | 入力内容を残したまま「保存できませんでした。再試行」を表示 |
| トークン切れ（401） | トークンを破棄し、ログインを求める。ログイン後に同じ保存を再実行 |
| ドライブ容量不足（403 storageQuotaExceeded） | 容量不足である旨を表示 |
| 画像の読み込み失敗 | 「この形式の画像は読み込めません」を表示 |
| data.json が壊れている・形式が違う | エラー表示し、上書きしない（ドライブの版履歴から復元可能） |
| 写真ファイルがドライブで見つからない | その写真の位置に「画像が見つかりません」を表示。記録自体は残す |
| 初回設定で選んだフォルダにファイルを作れない（403） | 「このフォルダには保存できません」と表示し、フォルダ選択からやり直せるようにする（3.1.1 の切り替え判断の材料にもなる） |
| Picker でフォルダを選ばずに閉じた | 「保存先フォルダを選んでください」画面に戻る |

## 6. テスト

- 単体テスト（Vitest）
  - domain: 各変更関数、着用日の追加・取り消し・重複防止、1回あたり金額、使用期間、最新写真の選び方、写真削除時の手入れ記録の `photoId` 解除
  - driveRepository: fetch をモックし、既存 data.json の検索（2台目の端末）、選ばれたフォルダ内への photos・data.json 作成、作成時 403 の扱い、保存時の「読み直してから適用」、401 時の挙動
  - images: 縮小後のサイズ計算（長辺 2048 / 480、元が小さい場合）
  - state: 保存キューが順番に実行されること
- 画面テスト（Playwright、スマホサイズ）
  - fakeRepository を使うビルドモード（`VITE_FAKE_DRIVE=1`）で実行。本番ビルドには含めない
  - 主な流れ: 初回のフォルダ選択 → 登録 → 写真追加 → 手入れ記録 → 今日着た → 比較画面でスライダー操作
- 本物の Google ログイン、Picker でのフォルダ選択、ドライブ保存は、デプロイ後に本人の PC とスマホで確認する（3.1.1 の未検証の前提もここで確かめる）

## 7. 本人に行ってもらう作業

手順書（`docs/setup.md`）を用意する。

1. Google Cloud でプロジェクト作成、Google Drive API と Google Picker API を有効化
2. OAuth 同意画面を「外部・テスト」で作成し、自分をテストユーザーに追加
3. OAuth クライアント ID（ウェブアプリ）を作成。承認済み JavaScript 生成元に `https://shinnosuke06.github.io` を登録
4. API キーを作成し、HTTP リファラーと API（Google Picker API）で制限する
5. GitHub のリポジトリ変数 `VITE_GOOGLE_CLIENT_ID` / `VITE_GOOGLE_API_KEY` / `VITE_GOOGLE_APP_ID`（プロジェクト番号）を登録
6. GitHub Pages を有効化（ソース: GitHub Actions）
7. デプロイ後、PC でアプリを開いてログインし、「Kawa Diary」フォルダを選ぶ（初回設定）
