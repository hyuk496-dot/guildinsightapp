-- ============================================================
-- Guild Insight · 005_user_isolation_rls.sql
-- 목적
--   1) profiles 테이블 신설 — auth.users 와 1:1, last_managed_guild_id 보관
--   2) guilds 에 owner_id (auth.uid()) 추가
--   3) 기존 데이터를 admin 계정 소유로 백필
--   4) 모든 테이블에 RLS 적용 — 본인 소유 길드의 데이터만 접근 가능
--
-- 실행 위치
--   Supabase Dashboard → SQL Editor → New query → 전체 붙여넣고 Run
--
-- 선행 조건 (반드시)
--   * Supabase Dashboard → Authentication → Users → "Add user → Create new user"
--     - Email:    admin@guildinsight.local
--     - Password: <길고 강력한 임의의 비밀번호로 직접 설정>  (Auto Confirm User 체크)
--   * 위 사용자가 없으면 백필 단계에서 RAISE NOTICE 만 띄우고 owner_id 는 NULL 로 남음.
--     이 경우 admin 사용자를 만든 뒤 본 마이그레이션의 [PART B] 만 다시 실행하면 됨.
-- ============================================================

-- ============================================================
-- PART A · 스키마 변경
-- ============================================================

-- A1. profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id                       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                    text,
  display_name             text,
  last_managed_guild_id    bigint,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- 신규 가입자 자동 profile 생성
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 이미 존재하는 auth.users 도 profiles 로 backfill
INSERT INTO public.profiles (id, email, display_name)
SELECT
  u.id,
  u.email,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1)
  )
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- A2. guilds.owner_id
ALTER TABLE public.guilds
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS guilds_owner_id_idx ON public.guilds (owner_id);

-- ============================================================
-- PART B · 기존 데이터 admin 백필
--   admin@guildinsight.local 이 존재하지 않으면 NOTICE 만 띄움
-- ============================================================
DO $$
DECLARE
  admin_uid uuid;
  affected   integer;
BEGIN
  SELECT id INTO admin_uid
  FROM auth.users
  WHERE email = 'admin@guildinsight.local'
  LIMIT 1;

  IF admin_uid IS NULL THEN
    RAISE NOTICE
      '[skip backfill] admin@guildinsight.local 사용자가 없습니다. '
      'Supabase Dashboard 에서 만든 뒤 PART B 만 다시 실행하세요.';
  ELSE
    UPDATE public.guilds
       SET owner_id = admin_uid
     WHERE owner_id IS NULL;
    GET DIAGNOSTICS affected = ROW_COUNT;
    RAISE NOTICE '[ok] guilds % rows backfilled to admin (%).', affected, admin_uid;

    -- admin 의 last_managed_guild_id 도 첫 번째 길드로 채워둔다
    UPDATE public.profiles
       SET last_managed_guild_id = (
         SELECT id FROM public.guilds
          WHERE owner_id = admin_uid
          ORDER BY id
          LIMIT 1
       )
     WHERE id = admin_uid AND last_managed_guild_id IS NULL;
  END IF;
END
$$;

-- ============================================================
-- PART C · RLS 활성화
-- ============================================================
ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guilds        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpt_reports   ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART D · 정책 (Policy) — 항상 DROP IF EXISTS 후 재생성 (idempotent)
-- ============================================================

-- D1. profiles : 본인 행만 SELECT/UPDATE
DROP POLICY IF EXISTS "profiles_self_select" ON public.profiles;
CREATE POLICY "profiles_self_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
CREATE POLICY "profiles_self_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_self_insert" ON public.profiles;
CREATE POLICY "profiles_self_insert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- D2. guilds : owner 만
DROP POLICY IF EXISTS "guilds_owner_select" ON public.guilds;
CREATE POLICY "guilds_owner_select" ON public.guilds
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "guilds_owner_insert" ON public.guilds;
CREATE POLICY "guilds_owner_insert" ON public.guilds
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "guilds_owner_update" ON public.guilds;
CREATE POLICY "guilds_owner_update" ON public.guilds
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "guilds_owner_delete" ON public.guilds;
CREATE POLICY "guilds_owner_delete" ON public.guilds
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- D3. child 테이블 공통 패턴: guild 의 owner 만 접근
-- guild_owned(guild_id) 헬퍼 함수로 RLS 정책을 짧고 빠르게 유지
CREATE OR REPLACE FUNCTION public.gi_is_guild_owner(g_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.guilds
    WHERE id = g_id AND owner_id = auth.uid()
  );
$$;

-- D3a. members
DROP POLICY IF EXISTS "members_owner_all" ON public.members;
CREATE POLICY "members_owner_all" ON public.members
  FOR ALL TO authenticated
  USING (public.gi_is_guild_owner(guild_id))
  WITH CHECK (public.gi_is_guild_owner(guild_id));

-- D3b. scores
DROP POLICY IF EXISTS "scores_owner_all" ON public.scores;
CREATE POLICY "scores_owner_all" ON public.scores
  FOR ALL TO authenticated
  USING (public.gi_is_guild_owner(guild_id))
  WITH CHECK (public.gi_is_guild_owner(guild_id));

-- D3c. contributions
DROP POLICY IF EXISTS "contributions_owner_all" ON public.contributions;
CREATE POLICY "contributions_owner_all" ON public.contributions
  FOR ALL TO authenticated
  USING (public.gi_is_guild_owner(guild_id))
  WITH CHECK (public.gi_is_guild_owner(guild_id));

-- D3d. gpt_reports
DROP POLICY IF EXISTS "gpt_reports_owner_all" ON public.gpt_reports;
CREATE POLICY "gpt_reports_owner_all" ON public.gpt_reports
  FOR ALL TO authenticated
  USING (public.gi_is_guild_owner(guild_id))
  WITH CHECK (public.gi_is_guild_owner(guild_id));

-- ============================================================
-- PART E · PostgREST 스키마 캐시 리로드
-- ============================================================
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- 끝. 결과 확인:
--   SELECT id, email FROM auth.users WHERE email='admin@guildinsight.local';
--   SELECT id, name, owner_id FROM public.guilds ORDER BY id;
-- ============================================================
