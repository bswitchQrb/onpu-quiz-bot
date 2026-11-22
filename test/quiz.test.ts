import { describe, expect, it } from 'vitest';
import { verifyDiscordRequest } from '../src/discord/verify';
import { answerResultMessage, escapeMarkdown, questionMessage, rankingMessage } from '../src/messages';
import { ALL_NOTES, BASS_NOTES, TREBLE_NOTES, describePosition, findNote } from '../src/notes';
import { answerCustomId, describeNote, isCorrect, parseAnswerCustomId, pickNote } from '../src/quiz';

describe('音符の一覧', () => {
  it('onpu と同じ範囲（ト音記号 F3〜C6、ヘ音記号 C2〜G4）', () => {
    expect(TREBLE_NOTES.map((n) => n.name)).toEqual(
      ['F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5', 'C6'],
    );
    expect(BASS_NOTES[0].name).toBe('C2');
    expect(BASS_NOTES.at(-1)?.name).toBe('G4');
    expect(ALL_NOTES).toHaveLength(38);
  });

  it.each([
    [0, '第1線'],
    [1, '第1間'],
    [8, '第5線'],
    [-1, '第1線の下'],
    [-2, '下第1線'],
    [-3, '下第1線の下'],
    [-6, '下第3線'],
    [9, '第5線の上'],
    [10, '上第1線'],
    [11, '上第1線の上'],
    [14, '上第3線'],
  ])('位置 %i は「%s」', (position, expected) => {
    expect(describePosition(position)).toBe(expected);
  });

  it('音符を日本語で説明する', () => {
    expect(describeNote(findNote('treble', 'C4')!)).toBe('ト音記号の下第1線の「ド」（C4）');
    expect(describeNote(findNote('bass', 'G4')!)).toBe('ヘ音記号の上第3線の「ソ」（G4）');
  });
});

describe('出題', () => {
  it('前回と同じ音符は出さない', () => {
    const previous = ALL_NOTES[0];
    for (let i = 0; i < 38; i++) {
      const note = pickNote(previous, () => i / 38);
      expect(note.clef === previous.clef && note.name === previous.name).toBe(false);
    }
  });

  it('ボタンの ID を作って読み戻せる', () => {
    expect(parseAnswerCustomId(answerCustomId(12, 'F'))).toEqual({ questionId: 12, letter: 'F' });
    expect(parseAnswerCustomId('answer:12:X')).toBeNull();
    expect(parseAnswerCustomId('other')).toBeNull();
  });

  it('オクターブに関係なく、音名が合っていれば正解', () => {
    const c4 = findNote('treble', 'C4')!;
    expect(isCorrect(c4, 'C')).toBe(true);
    expect(isCorrect(c4, 'D')).toBe(false);
  });
});

describe('メッセージ', () => {
  it('問題には画像と 7 つのボタン（4 + 3）が付く', () => {
    const message = questionMessage(5, '2026-11-23', findNote('treble', 'C4')!, 'https://example.com', null);
    expect(message.embeds?.[0].image?.url).toBe('https://example.com/notes/treble-C4.png');
    expect(message.components?.map((row) => row.components.map((b) => b.label))).toEqual([
      ['ド', 'レ', 'ミ', 'ファ'],
      ['ソ', 'ラ', 'シ'],
    ]);
    expect(message.components?.[0].components[0].custom_id).toBe('answer:5:C');
  });

  it('前回の答えと正解率を載せる', () => {
    const message = questionMessage(6, '2026-11-24', findNote('bass', 'C3')!, 'https://example.com', {
      note: findNote('treble', 'C4')!,
      answered: 5,
      correct: 3,
    });
    expect(message.embeds?.[0].description).toContain('ト音記号の下第1線の「ド」（C4）・正解 3 / 5 人');
  });

  it('回答の結果は本人にだけ見える', () => {
    const message = answerResultMessage(findNote('treble', 'C4')!, 'D', false);
    expect(message.flags).toBe(64);
    expect(message.content).toContain('「レ」じゃなくて');
  });

  it('ランキングのユーザー名は Markdown をエスケープする', () => {
    expect(escapeMarkdown('**a_b**')).toBe('\\*\\*a\\_b\\*\\*');
    const description = rankingMessage([{ user_id: '1', username: 'x', correct: 3, answered: 4 }]).embeds?.[0].description;
    expect(description).toBe('🥇 x — **3 問**正解（4 問中・75%）');
  });
});

describe('署名の検証', () => {
  const toHex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');

  it('正しい署名だけを通す', async () => {
    const keys = (await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify'])) as CryptoKeyPair;
    const publicKey = toHex((await crypto.subtle.exportKey('raw', keys.publicKey)) as ArrayBuffer);
    const body = '{"type":1}';
    const timestamp = '1700000000';
    const signature = toHex(await crypto.subtle.sign('Ed25519', keys.privateKey, new TextEncoder().encode(timestamp + body)));

    expect(await verifyDiscordRequest(publicKey, signature, timestamp, body)).toBe(true);
    expect(await verifyDiscordRequest(publicKey, signature, timestamp, '{"type":2}')).toBe(false);
    expect(await verifyDiscordRequest(publicKey, null, timestamp, body)).toBe(false);
    expect(await verifyDiscordRequest(publicKey, 'zz', timestamp, body)).toBe(false);
  });
});
