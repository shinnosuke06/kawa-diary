# Kawa Diary

レザージャケット、ブーツ、ジーンズ、帽子など「育てていく持ち物」の経年変化を記録するスマホ向け Web アプリです。
写真・購入情報・手入れ・着用回数を残し、2枚の写真をスライダーで重ねて比較できます。データは自分の Google ドライブに保存されます。

- 使えるようにする手順: [docs/setup.md](docs/setup.md)
- 公開 URL: <https://shinnosuke06.github.io/kawa-diary/>
- 設計書: [docs/superpowers/specs/2026-11-11-kawa-diary-design.md](docs/superpowers/specs/2026-11-11-kawa-diary-design.md)

## 開発

```bash
npm install
npm run dev:fake   # Google を使わず、メモリ上の保存先で画面を動かす（http://localhost:5199/kawa-diary/）
npm run dev        # 本物の Google ドライブにつなぐ（.env.local に VITE_GOOGLE_* を設定）
npm test           # 単体テスト
npm run e2e        # 画面のテスト（Playwright）
npm run typecheck
npm run build
```

`npm run dev` で本物の Google につなぐ場合は、OAuth クライアントの「承認済みの JavaScript 生成元」に `http://localhost:5173` を追加してください。

アイコンを作り直すときは `node scripts/make-icons.mjs` を実行します。
