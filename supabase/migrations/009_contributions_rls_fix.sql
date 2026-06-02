-- contributions INSERT/UPDATE RLS 보강 및 권한 명시
-- (gi_is_guild_owner 타입·NULL 안전, authenticated GRANT)

CREATE OR REPLACE FUNCTION public.gi_is_guild_owner(g_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN g_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.guilds g
      WHERE g.id = g_id::bigint
        AND g.owner_id IS NOT NULL
        AND g.owner_id = auth.uid()
    )
  END;
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contributions TO authenticated;
GRANT ALL ON public.contributions TO service_role;

-- 정책 재생성 (idempotent)
DROP POLICY IF EXISTS "contributions_owner_all" ON public.contributions;
CREATE POLICY "contributions_owner_all" ON public.contributions
  FOR ALL TO authenticated
  USING (public.gi_is_guild_owner(guild_id::bigint))
  WITH CHECK (public.gi_is_guild_owner(guild_id::bigint));

NOTIFY pgrst, 'reload schema';
