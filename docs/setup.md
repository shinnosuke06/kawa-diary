# Kawa Diary を使えるようにする手順

アプリを公開して、Google ドライブに保存できるようにするまでの手順です。全体で 20〜30 分ほどかかります。
Google Cloud と GitHub の作業は PC で行うのがおすすめです。

> Google Cloud の画面の名前は、ときどき変わります。見つからないときは、画面上部の検索欄に名前を入れて探してください。

---

## 1. Google Cloud でプロジェクトを作る

1. <https://console.cloud.google.com/> を開き、Google アカウントでログインします
2. 画面上部のプロジェクト選択 →「新しいプロジェクト」→ 名前を `kawa-diary` にして「作成」
3. 作ったプロジェクトが選ばれていることを確認します

## 2. API を有効にする

1. 左上のメニュー →「API とサービス」→「ライブラリ」
2. `Google Drive API` を検索して開き、「有効にする」
3. 同じように `Google Picker API` も「有効にする」

## 3. ログイン画面（OAuth 同意画面）を設定する

1. 「API とサービス」→「OAuth 同意画面」（「Google Auth Platform」と表示されることもあります）→「開始」
2. アプリ名: `Kawa Diary`、ユーザーサポートメール: 自分のメールアドレス
3. 対象（ユーザーの種類）: **外部**
4. 連絡先: 自分のメールアドレス → 同意して「作成」
5. 「対象」（Audience）の画面で、公開ステータスが **テスト** のままであることを確認し、「テストユーザー」に**自分の Google アカウント**を追加します
6. 「データアクセス」の画面で「スコープを追加または削除」→ `https://www.googleapis.com/auth/drive.file` にチェック →「更新」→「保存」

## 4. OAuth クライアント ID を作る

1. 「クライアント」（または「API とサービス」→「認証情報」→「認証情報を作成」→「OAuth クライアント ID」）
2. アプリケーションの種類: **ウェブ アプリケーション**、名前: `Kawa Diary`
3. 「承認済みの JavaScript 生成元」に `https://shinnosuke06.github.io` を追加（最後に `/` を付けない）
4. 「作成」→ 表示された **クライアント ID**（`〜.apps.googleusercontent.com`）を控えます

## 5. API キーを作る（フォルダを選ぶ画面用）

1. 「API とサービス」→「認証情報」→「認証情報を作成」→「API キー」
2. 作成されたキーの「キーを編集」を開きます
3. アプリケーションの制限: **ウェブサイト** → `https://shinnosuke06.github.io/*` を追加
4. API の制限: **キーを制限** → `Google Picker API` だけを選ぶ →「保存」
5. **API キー** を控えます

## 6. プロジェクト番号を控える

1. 画面上部のプロジェクト選択 → `kawa-diary` の行、または「Cloud の概要」→「ダッシュボード」
2. 「プロジェクト番号」（数字だけのもの）を控えます

## 7. GitHub に設定を登録する

1. <https://github.com/shinnosuke06/kawa-diary> を開く →「Settings」
2. 左メニュー「Secrets and variables」→「Actions」→「**Variables**」タブ →「New repository variable」
3. 次の3つを登録します（どれもブラウザに公開される前提の値で、秘密情報ではありません）

| Name | Value |
|---|---|
| `VITE_GOOGLE_CLIENT_ID` | 手順 4 のクライアント ID |
| `VITE_GOOGLE_API_KEY` | 手順 5 の API キー |
| `VITE_GOOGLE_APP_ID` | 手順 6 のプロジェクト番号 |

## 8. GitHub Pages を有効にする

1. 「Settings」→ 左メニュー「Pages」
2. 「Build and deployment」の Source を **GitHub Actions** にします

## 9. 公開する

1. このアプリのプルリクエストを `main` にマージします
2. 「Actions」タブで「Deploy to GitHub Pages」が緑色のチェックになれば公開完了です（数分かかります）
3. 公開 URL: <https://shinnosuke06.github.io/kawa-diary/>

設定を変えたあとに公開し直したいときは、「Actions」→「Deploy to GitHub Pages」→「Run workflow」を押します。

## 10. 初回設定（PC で行うのがおすすめ）

1. PC のブラウザで公開 URL を開き、「Google で続ける」を押してログインします
   - 「Google はこのアプリを確認していません」と出た場合は、「詳細」→「Kawa Diary（安全ではないページ）に移動」で進みます（自分専用のアプリなので問題ありません）
2. 「保存先フォルダを選んでください」と出たら「フォルダを選ぶ」を押し、マイドライブの **Kawa Diary** フォルダを選びます
3. Google ドライブを開き、「Kawa Diary」フォルダの中に `photos` フォルダと `data.json` ができていれば成功です

スマホでは、同じ URL を開いて「Google で続ける」を押すだけで使えます（フォルダを選び直す必要はありません）。

### 「このフォルダには保存できません」と出た場合

選んだフォルダにアプリがファイルを作れなかった場合です（Google の仕様上、まれに起こる可能性があります）。次のように権限を広げてください。

1. `src/config.ts` の次の行を書き換えます
   ```ts
   export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';
   ```
2. 手順 3-6 の「データアクセス」に `https://www.googleapis.com/auth/drive` も追加します
3. 変更を `main` に反映して公開し直し、もう一度ログインします
   - 初回ログイン時に「Google はこのアプリを確認していません」と出るので、「詳細」→「Kawa Diary（安全ではないページ）に移動」で進みます

## 11. スマホのホーム画面に追加する

- **iPhone（Safari）**: 公開 URL を開く → 共有ボタン →「ホーム画面に追加」
- **Android（Chrome）**: 公開 URL を開く → 右上の「︙」→「ホーム画面に追加」または「アプリをインストール」

## 使い方のメモ

- ログインは 1 時間で切れます。切れた後は画面上部の「Google で続ける」を 1 回押してください。押す前でも、これまでの記録とサムネイルは見られます
- 写真は長辺 2048px に縮小して保存します。元の写真はスマホに残ります
- 写真や持ち物を削除すると、ドライブの写真はゴミ箱に移ります（30 日間は復元できます）
- `data.json` を壊してしまった場合は、ドライブで `data.json` を右クリック →「ファイル情報」→「版を管理」から以前の版に戻せます
