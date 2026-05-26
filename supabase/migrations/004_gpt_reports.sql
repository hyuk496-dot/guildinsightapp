-- ============================================================
-- Guild Insight · gpt_reports 테이블
-- 실행 위치: Supabase Dashboard → SQL Editor → New query
-- ============================================================

CREATE TABLE IF NOT EXISTS gpt_reports (
  id              BIGSERIAL PRIMARY KEY,
  guild_id        INTEGER REFERENCES guilds(id) ON DELETE CASCADE,
  guild_name      TEXT,
  title           TEXT NOT NULL,
  date            TEXT,
  badge           TEXT,
  content_filter  TEXT DEFAULT '전체',
  summary         TEXT,
  sections        JSONB DEFAULT '[]'::jsonb,
  chips           JSONB DEFAULT '[]'::jsonb,
  metrics         JSONB DEFAULT '{}'::jsonb,
  model           TEXT,
  prompt_tokens   INTEGER,
  completion_tokens INTEGER,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gpt_reports_guild_idx ON gpt_reports (guild_id);
CREATE INDEX IF NOT EXISTS gpt_reports_created_idx ON gpt_reports (created_at DESC);

NOTIFY pgrst, 'reload schema';
