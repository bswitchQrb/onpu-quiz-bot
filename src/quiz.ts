/** 出題と判定のロジック（Discord や D1 に依存しない部分） */

import { ALL_NOTES, CLEF_NAMES, JA_NAMES, LETTERS, describePosition, type Letter, type Note } from './notes';

/** 前回と同じ音符は出さずに、ランダムに 1 つ選ぶ */
export function pickNote(previous: Pick<Note, 'clef' | 'name'> | null, random: () => number = Math.random): Note {
  const candidates = ALL_NOTES.filter((n) => !(previous && n.clef === previous.clef && n.name === previous.name));
  return candidates[Math.floor(random() * candidates.length)];
}

/** ボタンの custom_id: "answer:<問題 ID>:<音名>" */
export function answerCustomId(questionId: number, letter: Letter): string {
  return `answer:${questionId}:${letter}`;
}

export function parseAnswerCustomId(customId: string): { questionId: number; letter: Letter } | null {
  const match = customId.match(/^answer:(\d+):([A-G])$/);
  if (!match) return null;
  return { questionId: Number(match[1]), letter: match[2] as Letter };
}

/** 「ト音記号の下第1線の『ド』（C4）」のような説明 */
export function describeNote(note: Note): string {
  return `${CLEF_NAMES[note.clef]}の${describePosition(note.position)}の「${JA_NAMES[note.letter]}」（${note.name}）`;
}

export function isCorrect(note: Note, answer: Letter): boolean {
  return note.letter === answer;
}

export { LETTERS };
