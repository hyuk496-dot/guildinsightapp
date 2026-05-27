-- ============================================================
-- Guild Insight · 006_guild_ranking_targets.sql
-- 목적
--   - 길드·컨텐츠·주차별 목표 총점/예상 순위를 DB에 영구 저장
--   - RLS: 길드 소유자만 접근 (gi_is_guild_owner 재사용)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.guild_ranking_targets (
  id            bigserial PRIMARY KEY,
  guild_id      bigint NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  content_name  text   NOT NULL,
  week_monday   text   NOT NULL, -- YYYY-MM-DD (weekMondayKey)
  target_score  bigint NOT NULL DEFAULT 0,
  target_rank   integer,
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (guild_id, content_name, week_monday)
);

CREATE INDEX IF NOT EXISTS guild_ranking_targets_guild_idx
  ON public.guild_ranking_targets (guild_id);

CREATE INDEX IF NOT EXISTS guild_ranking_targets_lookup_idx
  ON public.guild_ranking_targets (guild_id, content_name, week_monday);

ALTER TABLE public.guild_ranking_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "guild_ranking_targets_owner_all" ON public.guild_ranking_targets;
CREATE POLICY "guild_ranking_targets_owner_all" ON public.guild_ranking_targets
  FOR ALL TO authenticated
  USING (public.gi_is_guild_owner(guild_id))
  WITH CHECK (public.gi_is_guild_owner(guild_id));

-- PostgREST 스키마 캐시 리로드
NOTIFY pgrst, 'reload schema';

