/**
 * スラッシュコマンド（/ranking, /stats）を Discord に登録する。
 * コマンドを追加・変更したときだけ実行する: npm run register-commands
 *
 * Bot Token は .dev.vars（git 管理外）から読む。コマンドラインや環境変数に直接書くと、
 * シェルの履歴に残ってしまうため。
 */
import { readFileSync } from 'node:fs';

function readDevVars(): Record<string, string> {
  const text = readFileSync('.dev.vars', 'utf8');
  return Object.fromEntries(
    text
      .split('\n')
      .filter((line) => line.includes('=') && !line.trimStart().startsWith('#'))
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
      }),
  );
}

const config = readFileSync('wrangler.jsonc', 'utf8');
const applicationId = config.match(/"DISCORD_APPLICATION_ID":\s*"(\d+)"/)?.[1];
const token = readDevVars().DISCORD_BOT_TOKEN;
if (!applicationId || !token) {
  throw new Error('wrangler.jsonc の DISCORD_APPLICATION_ID と .dev.vars の DISCORD_BOT_TOKEN が必要です');
}

const commands = [
  { name: 'ranking', description: '正解数のランキングを表示する', type: 1 },
  { name: 'stats', description: '自分の成績を表示する（自分にだけ見えます）', type: 1 },
];

const res = await fetch(`https://discord.com/api/v10/applications/${applicationId}/commands`, {
  method: 'PUT',
  headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(commands),
});
if (!res.ok) {
  throw new Error(`登録に失敗しました: ${res.status} ${await res.text()}`);
}
console.log(`${commands.length} 個のコマンドを登録しました`);
