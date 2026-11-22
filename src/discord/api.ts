/** Discord の REST API と、メッセージの型 */

const API = 'https://discord.com/api/v10';
const USER_AGENT = 'DiscordBot (https://github.com/bswitchQrb/onpu-quiz-bot, 0.1.0)';

export const InteractionType = { PING: 1, APPLICATION_COMMAND: 2, MESSAGE_COMPONENT: 3 } as const;
export const ResponseType = { PONG: 1, CHANNEL_MESSAGE: 4 } as const;
/** 押した本人にだけ見えるメッセージ */
export const EPHEMERAL = 1 << 6;

export interface Embed {
  title?: string;
  description?: string;
  color?: number;
  image?: { url: string };
  footer?: { text: string };
}

export interface Button {
  type: 2;
  style: 1 | 2;
  label: string;
  custom_id: string;
}

export interface ActionRow {
  type: 1;
  components: Button[];
}

export interface MessagePayload {
  content?: string;
  embeds?: Embed[];
  components?: ActionRow[];
  flags?: number;
}

export interface DiscordUser {
  id: string;
  username: string;
  global_name?: string | null;
}

export interface Interaction {
  type: number;
  data?: {
    name?: string;
    custom_id?: string;
    options?: { name: string; value: string | number | boolean }[];
  };
  /** permissions はビットフラグを 10 進数の文字列にしたもの */
  member?: { user: DiscordUser; permissions?: string };
  user?: DiscordUser;
}

export const Permission = {
  ADMINISTRATOR: 1n << 3n,
  MANAGE_GUILD: 1n << 5n,
} as const;

/** サーバーの管理（または管理者）権限があるか */
export function canManageGuild(interaction: Interaction): boolean {
  const raw = interaction.member?.permissions;
  if (!raw) return false;
  const permissions = BigInt(raw);
  return (permissions & (Permission.ADMINISTRATOR | Permission.MANAGE_GUILD)) !== 0n;
}

export async function postMessage(botToken: string, channelId: string, payload: MessagePayload): Promise<{ id: string }> {
  const res = await fetch(`${API}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${botToken}`,
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Discord API が ${res.status} を返しました: ${await res.text()}`);
  }
  return res.json();
}
