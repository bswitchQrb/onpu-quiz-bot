-- 毎日の問題
CREATE TABLE questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- 出題日（JST の YYYY-MM-DD）。同じ日に 2 回出題しないための一意制約
  posted_on TEXT NOT NULL UNIQUE,
  clef TEXT NOT NULL CHECK (clef IN ('treble', 'bass')),
  note TEXT NOT NULL,
  -- Discord に投稿したメッセージの ID（投稿に成功したら入る）
  message_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 回答。1 人 1 問につき最初の 1 回だけ記録する
CREATE TABLE answers (
  question_id INTEGER NOT NULL REFERENCES questions (id),
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  answer TEXT NOT NULL,
  correct INTEGER NOT NULL CHECK (correct IN (0, 1)),
  answered_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (question_id, user_id)
);

CREATE INDEX answers_user_id ON answers (user_id);
