# onpu-quiz-bot

毎朝 1 問、五線譜の音符を当てる Discord bot。[おんぷクイズ](https://bee2.dev/onpu/) の出題範囲（ト音記号 F3〜C6、ヘ音記号 C2〜G4）から出題します。

- 毎朝 9:00（JST）に、五線譜の画像と「ド〜シ」のボタンを投稿
- ボタンで回答すると、本人にだけ正解・不正解と音の位置（例：ト音記号の下第1線の「ド」）を返す
- 次の日の問題に、前回の答えと正解率を載せる
- `/ranking`：正解数のランキング、`/stats`：自分の成績

## 構成

- Cloudflare Workers：Cron Triggers（出題）と Interactions Endpoint（ボタン・コマンド）
- D1：問題と回答
- Static Assets：五線譜の画像（`public/notes/`）
- 五線譜の画像は [VexFlow](https://www.vexflow.com/) で事前に生成（`scripts/generate-images.ts`）

Discord からのリクエストは Ed25519 の署名を検証してから処理します。

## セットアップ

```sh
npm run db:migrate                         # D1 にテーブルを作る
npx wrangler secret put DISCORD_BOT_TOKEN  # Bot Token を登録
npm run deploy
cp .dev.vars.example .dev.vars             # Bot Token を書く（git には入らない）
npm run register-commands                  # /ranking と /stats を登録
```

Discord Developer Portal の Interactions Endpoint URL に `https://<worker のドメイン>/interactions` を設定します。

## 開発

```sh
npm run images   # 五線譜の画像を作り直す（src/notes.ts を変えたとき）
npm test
```
