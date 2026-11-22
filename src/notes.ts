/**
 * 出題する音符の一覧。おんぷクイズ（bswitchQrb/onpu）の出題範囲と同じ。
 * position: 五線の一番下の線を 0 として、線と間を 1 ずつ数えた位置
 */

export type Clef = 'treble' | 'bass';

/** 音名（オクターブなし）。ボタンの選択肢にもなる */
export type Letter = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';

export interface Note {
  clef: Clef;
  /** 例: "C4" */
  name: string;
  letter: Letter;
  position: number;
}

export const LETTERS: Letter[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

export const JA_NAMES: Record<Letter, string> = {
  C: 'ド',
  D: 'レ',
  E: 'ミ',
  F: 'ファ',
  G: 'ソ',
  A: 'ラ',
  B: 'シ',
};

export const CLEF_NAMES: Record<Clef, string> = {
  treble: 'ト音記号',
  bass: 'ヘ音記号',
};

/** 一番下の線の音から、指定した数だけ音を並べる */
function range(clef: Clef, bottomLine: string, from: number, to: number): Note[] {
  const startIndex = LETTERS.indexOf(bottomLine[0] as Letter);
  const startOctave = Number(bottomLine.slice(1));
  const notes: Note[] = [];
  for (let position = from; position <= to; position++) {
    const step = startIndex + position;
    const letter = LETTERS[((step % 7) + 7) % 7];
    const octave = startOctave + Math.floor(step / 7);
    notes.push({ clef, name: `${letter}${octave}`, letter, position });
  }
  return notes;
}

/** ト音記号：一番下の線が E4。F3〜C6 の 19 音 */
export const TREBLE_NOTES = range('treble', 'E4', -6, 12);
/** ヘ音記号：一番下の線が G2。C2〜G4 の 19 音 */
export const BASS_NOTES = range('bass', 'G2', -4, 14);

export const ALL_NOTES: Note[] = [...TREBLE_NOTES, ...BASS_NOTES];

export function findNote(clef: Clef, name: string): Note | undefined {
  return ALL_NOTES.find((n) => n.clef === clef && n.name === name);
}

/** 画像のファイル名（public/notes/ 以下） */
export function imagePath(note: Note): string {
  return `/notes/${note.clef}-${note.name}.png`;
}

/**
 * 五線の上の位置を日本語で説明する。
 * 例: 0 → 第1線、1 → 第1間、-2 → 下第1線、9 → 第5線の上
 */
export function describePosition(position: number): string {
  if (position >= 0 && position <= 8) {
    const n = Math.floor(position / 2) + 1;
    return position % 2 === 0 ? `第${n}線` : `第${n}間`;
  }
  if (position === -1) return '第1線の下';
  if (position === 9) return '第5線の上';
  if (position < 0) {
    const n = Math.floor((-position - 1) / 2);
    return position % 2 === 0 ? `下第${-position / 2}線` : `下第${n}線の下`;
  }
  const n = Math.floor((position - 9) / 2);
  return position % 2 === 0 ? `上第${(position - 8) / 2}線` : `上第${n}線の上`;
}
