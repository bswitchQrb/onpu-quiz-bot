// `wrangler secret put` で登録するシークレット（wrangler types では生成されないので手で宣言する）
interface Env {
  DISCORD_BOT_TOKEN: string;
}
