-- 기여도 분석 테이블 (Supabase SQL Editor에서 실행)
CREATE TABLE IF NOT EXISTS contributions (
  id BIGSERIAL PRIMARY KEY,
  guild_id INTEGER NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  nick TEXT,
  score INTEGER DEFAULT 0,
  history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (guild_id, member_id)
);

CREATE INDEX IF NOT EXISTS contributions_guild_id_idx ON contributions (guild_id);
