-- Cloudflare D1 > Console に貼り付けて実行してください
CREATE TABLE IF NOT EXISTS bbs_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER REFERENCES bbs_posts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_hash TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS bbs_posts_roots ON bbs_posts(parent_id,id DESC);
CREATE INDEX IF NOT EXISTS bbs_posts_rate ON bbs_posts(ip_hash,created_at);
