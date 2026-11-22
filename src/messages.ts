/** Discord に出すメッセージの組み立て（文言と見た目はここにまとめる） */

import type { ActionRow, Embed, MessagePayload } from './discord/api';
import { EPHEMERAL } from './discord/api';
import { JA_NAMES, LETTERS, MODE_NAMES, imagePath, type Letter, type Mode, type Note } from './notes';
import { answerCustomId, describeNote } from './quiz';
import type { ScoreRow } from './db';

const COLOR = 0x8fb3d4;

export interface PreviousResult {
  note: Note;
  answered: number;
  correct: number;
}

function answerButtons(questionId: number): ActionRow[] {
  const button = (letter: Letter) => ({
    type: 2 as const,
    style: 2 as const,
    label: JA_NAMES[letter],
    custom_id: answerCustomId(questionId, letter),
  });
  // 1 行に置けるボタンは 5 個まで。ドレミファ / ソラシ の 2 行に分ける
  return [
    { type: 1, components: LETTERS.slice(0, 4).map(button) },
    { type: 1, components: LETTERS.slice(4).map(button) },
  ];
}

export function questionMessage(
  questionId: number,
  postedOn: string,
  note: Note,
  mode: Mode,
  baseUrl: string,
  previous: PreviousResult | null,
): MessagePayload {
  const lines = ['この音符は何の音？ ボタンで答えてね（1 人 1 回まで）'];
  if (previous) {
    const rate = previous.answered > 0 ? `・正解 ${previous.correct} / ${previous.answered} 人` : '';
    lines.push('', `**前回の答え**：${describeNote(previous.note)}${rate}`);
  }
  const embed: Embed = {
    title: `🎵 今日の音符クイズ（${postedOn}）`,
    description: lines.join('\n'),
    color: COLOR,
    image: { url: `${baseUrl}${imagePath(note)}` },
    footer: { text: `問題 #${questionId}・出題：${MODE_NAMES[mode]}` },
  };
  return { embeds: [embed], components: answerButtons(questionId) };
}

export function ephemeral(content: string): MessagePayload {
  return { content, flags: EPHEMERAL };
}

export function answerResultMessage(note: Note, answer: Letter, correct: boolean): MessagePayload {
  return correct
    ? ephemeral(`⭕ 正解！ ${describeNote(note)}だよ🎉`)
    : ephemeral(`❌ 残念…「${JA_NAMES[answer]}」じゃなくて、${describeNote(note)}でした`);
}

/** Discord の Markdown として解釈される記号をエスケープする */
export function escapeMarkdown(text: string): string {
  return text.replace(/([\\*_~`|>#[\]()-])/g, '\\$1');
}

function rate(score: Pick<ScoreRow, 'correct' | 'answered'>): string {
  return `${Math.round((score.correct / score.answered) * 100)}%`;
}

export function rankingMessage(rows: ScoreRow[]): MessagePayload {
  if (rows.length === 0) {
    return { embeds: [{ title: '🏆 ランキング', description: 'まだ誰も回答していないよ', color: COLOR }] };
  }
  const medals = ['🥇', '🥈', '🥉'];
  const lines = rows.map(
    (row, i) =>
      `${medals[i] ?? `${i + 1}.`} ${escapeMarkdown(row.username)} — **${row.correct} 問**正解（${row.answered} 問中・${rate(row)}）`,
  );
  return { embeds: [{ title: '🏆 ランキング（正解数）', description: lines.join('\n'), color: COLOR }] };
}

export function statsMessage(score: ScoreRow | null): MessagePayload {
  if (!score) return ephemeral('まだ回答していないみたい。今日の問題に答えてみてね🎵');
  return ephemeral(`📊 あなたの成績：${score.answered} 問中 **${score.correct} 問**正解（正答率 ${rate(score)}）`);
}

export function modeMessage(mode: Mode): MessagePayload {
  return ephemeral(`今の出題モードは「${MODE_NAMES[mode]}」だよ`);
}

/** モードの変更はみんなに知らせる */
export function modeChangedMessage(mode: Mode, changedBy: string): MessagePayload {
  return {
    content: `🎼 次の問題から、出題モードを「${MODE_NAMES[mode]}」にしたよ（変更：${escapeMarkdown(changedBy)}）`,
  };
}
