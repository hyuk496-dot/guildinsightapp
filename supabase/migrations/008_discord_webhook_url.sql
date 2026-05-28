-- ============================================================
-- Guild Insight · 008_discord_webhook_url.sql
-- 목적
--   profiles 에 디스코드 Webhook URL 저장 필드 추가
--   - 본인 행만 RLS 업데이트 가능 (005 정책 그대로 사용)
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS discord_webhook_url text;

-- 길이 제한 + 기본 형태 검증(완벽한 검증은 앱 서버에서 수행)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_discord_webhook_url_len'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_discord_webhook_url_len
      CHECK (discord_webhook_url IS NULL OR length(discord_webhook_url) <= 300);
  END IF;
END $$;

