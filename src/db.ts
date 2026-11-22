/** D1 への読み書き */

import type { Clef } from './notes';

export interface QuestionRow {
  id: number;
  posted_on: string;
  clef: Clef;
  note: string;
  message_id: string | null;
}

export interface ScoreRow {
  user_id: string;
  username: string;
  correct: number;
  answered: number;
}

export async function latestQuestion(db: D1Database): Promise<QuestionRow | null> {
  return db.prepare('SELECT * FROM questions ORDER BY id DESC LIMIT 1').first<QuestionRow>();
}

export async function findQuestion(db: D1Database, id: number): Promise<QuestionRow | null> {
  return db.prepare('SELECT * FROM questions WHERE id = ?').bind(id).first<QuestionRow>();
}

/** 問題を登録する。同じ日の問題がすでにあれば null を返す */
export async function insertQuestion(
  db: D1Database,
  postedOn: string,
  clef: Clef,
  note: string,
): Promise<QuestionRow | null> {
  return db
    .prepare(
      'INSERT INTO questions (posted_on, clef, note) VALUES (?, ?, ?) ON CONFLICT (posted_on) DO NOTHING RETURNING *',
    )
    .bind(postedOn, clef, note)
    .first<QuestionRow>();
}

export async function setMessageId(db: D1Database, questionId: number, messageId: string): Promise<void> {
  await db.prepare('UPDATE questions SET message_id = ? WHERE id = ?').bind(messageId, questionId).run();
}

export async function deleteQuestion(db: D1Database, questionId: number): Promise<void> {
  await db.prepare('DELETE FROM questions WHERE id = ?').bind(questionId).run();
}

/** 回答を記録する。すでに回答済みなら false を返す */
export async function insertAnswer(
  db: D1Database,
  answer: { questionId: number; userId: string; username: string; answer: string; correct: boolean },
): Promise<boolean> {
  const result = await db
    .prepare(
      `INSERT INTO answers (question_id, user_id, username, answer, correct) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (question_id, user_id) DO NOTHING`,
    )
    .bind(answer.questionId, answer.userId, answer.username, answer.answer, answer.correct ? 1 : 0)
    .run();
  return result.meta.changes > 0;
}

export async function findAnswer(
  db: D1Database,
  questionId: number,
  userId: string,
): Promise<{ answer: string; correct: number } | null> {
  return db
    .prepare('SELECT answer, correct FROM answers WHERE question_id = ? AND user_id = ?')
    .bind(questionId, userId)
    .first();
}

export async function questionResult(db: D1Database, questionId: number): Promise<{ answered: number; correct: number }> {
  const row = await db
    .prepare('SELECT COUNT(*) AS answered, COALESCE(SUM(correct), 0) AS correct FROM answers WHERE question_id = ?')
    .bind(questionId)
    .first<{ answered: number; correct: number }>();
  return row ?? { answered: 0, correct: 0 };
}

/** 正解数の多い順。同じなら回答数が少ない（＝正答率が高い）順 */
export async function ranking(db: D1Database, limit: number): Promise<ScoreRow[]> {
  const { results } = await db
    .prepare(
      `SELECT user_id, MAX(username) AS username, SUM(correct) AS correct, COUNT(*) AS answered
       FROM answers GROUP BY user_id ORDER BY correct DESC, answered ASC LIMIT ?`,
    )
    .bind(limit)
    .all<ScoreRow>();
  return results;
}

export async function userScore(db: D1Database, userId: string): Promise<ScoreRow | null> {
  return db
    .prepare(
      `SELECT user_id, MAX(username) AS username, SUM(correct) AS correct, COUNT(*) AS answered
       FROM answers WHERE user_id = ? GROUP BY user_id`,
    )
    .bind(userId)
    .first<ScoreRow>();
}
