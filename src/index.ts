import * as db from './db';
import { InteractionType, ResponseType, postMessage, type Interaction, type MessagePayload } from './discord/api';
import { verifyDiscordRequest } from './discord/verify';
import { answerResultMessage, ephemeral, questionMessage, rankingMessage, statsMessage } from './messages';
import { JA_NAMES, findNote, type Letter } from './notes';
import { isCorrect, parseAnswerCustomId, pickNote } from './quiz';

const RANKING_SIZE = 10;

/** JST の日付（YYYY-MM-DD） */
function jstDate(time: number): string {
  return new Date(time + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function respond(payload: MessagePayload): Response {
  return Response.json({ type: ResponseType.CHANNEL_MESSAGE, data: payload });
}

/** 今日の問題を投稿する。同じ日にもう出題済みなら何もしない */
async function postDailyQuestion(env: Env, now: number): Promise<void> {
  const previous = await db.latestQuestion(env.DB);
  const postedOn = jstDate(now);
  const note = pickNote(previous ? { clef: previous.clef, name: previous.note } : null);

  const question = await db.insertQuestion(env.DB, postedOn, note.clef, note.name);
  if (!question) {
    console.log(`${postedOn} の問題は出題済み`);
    return;
  }

  const previousNote = previous && findNote(previous.clef, previous.note);
  const previousResult = previousNote ? { note: previousNote, ...(await db.questionResult(env.DB, previous.id)) } : null;

  try {
    const message = await postMessage(
      env.DISCORD_BOT_TOKEN,
      env.QUIZ_CHANNEL_ID,
      questionMessage(question.id, postedOn, note, env.PUBLIC_BASE_URL, previousResult),
    );
    await db.setMessageId(env.DB, question.id, message.id);
    console.log(`問題 #${question.id}（${note.clef} ${note.name}）を投稿`);
  } catch (error) {
    // 投稿できなかった問題は残さない（次の実行でやり直せるように）
    await db.deleteQuestion(env.DB, question.id);
    throw error;
  }
}

async function handleAnswer(env: Env, interaction: Interaction): Promise<Response> {
  const parsed = parseAnswerCustomId(interaction.data?.custom_id ?? '');
  const user = interaction.member?.user ?? interaction.user;
  if (!parsed || !user) return respond(ephemeral('このボタンには答えられないみたい…'));

  const [question, latest] = await Promise.all([db.findQuestion(env.DB, parsed.questionId), db.latestQuestion(env.DB)]);
  const note = question && findNote(question.clef, question.note);
  if (!question || !note) return respond(ephemeral('問題が見つからなかったよ'));
  if (question.id !== latest?.id) return respond(ephemeral('この問題は締め切ったよ。今日の問題に答えてね🎵'));

  const correct = isCorrect(note, parsed.letter);
  const inserted = await db.insertAnswer(env.DB, {
    questionId: question.id,
    userId: user.id,
    username: user.global_name ?? user.username,
    answer: parsed.letter,
    correct,
  });
  if (!inserted) {
    const previous = await db.findAnswer(env.DB, question.id, user.id);
    const answered = previous ? `（あなたの答え：「${JA_NAMES[previous.answer as Letter]}」）` : '';
    return respond(ephemeral(`この問題にはもう答えてるよ${answered}。また明日ね！`));
  }
  return respond(answerResultMessage(note, parsed.letter, correct));
}

async function handleCommand(env: Env, interaction: Interaction): Promise<Response> {
  switch (interaction.data?.name) {
    case 'ranking':
      return respond(rankingMessage(await db.ranking(env.DB, RANKING_SIZE)));
    case 'stats': {
      const user = interaction.member?.user ?? interaction.user;
      return respond(statsMessage(user ? await db.userScore(env.DB, user.id) : null));
    }
    default:
      return respond(ephemeral('知らないコマンドだよ'));
  }
}

async function handleInteraction(request: Request, env: Env): Promise<Response> {
  const body = await request.text();
  const valid = await verifyDiscordRequest(
    env.DISCORD_PUBLIC_KEY,
    request.headers.get('X-Signature-Ed25519'),
    request.headers.get('X-Signature-Timestamp'),
    body,
  );
  if (!valid) return new Response('invalid request signature', { status: 401 });

  const interaction = JSON.parse(body) as Interaction;
  switch (interaction.type) {
    case InteractionType.PING:
      return Response.json({ type: ResponseType.PONG });
    case InteractionType.MESSAGE_COMPONENT:
      return handleAnswer(env, interaction);
    case InteractionType.APPLICATION_COMMAND:
      return handleCommand(env, interaction);
    default:
      return new Response('unsupported interaction', { status: 400 });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/interactions') {
      return handleInteraction(request, env);
    }
    return new Response('Not Found', { status: 404 });
  },

  async scheduled(controller, env) {
    await postDailyQuestion(env, controller.scheduledTime);
  },
} satisfies ExportedHandler<Env>;
