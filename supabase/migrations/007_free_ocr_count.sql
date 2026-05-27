-- ============================================================
-- Guild Insight · 007_free_ocr_count.sql
-- 무료 AI 이미지 OCR 잔여 횟수 (엑셀 가져오기는 제한 없음)
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS free_ocr_count integer;

ALTER TABLE public.profiles
  ALTER COLUMN free_ocr_count SET DEFAULT 3;

UPDATE public.profiles
SET free_ocr_count = 3
WHERE free_ocr_count IS NULL
  AND (email IS DISTINCT FROM 'admin@guildinsight.local');

UPDATE public.profiles
SET free_ocr_count = NULL
WHERE email = 'admin@guildinsight.local';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_free_ocr_count_nonneg;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_free_ocr_count_nonneg
  CHECK (free_ocr_count IS NULL OR free_ocr_count >= 0);

-- 신규 가입자: 기본 3회 (admin 이메일은 무제한 NULL)
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, free_ocr_count)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    CASE
      WHEN NEW.email = 'admin@guildinsight.local' THEN NULL
      ELSE 3
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- OCR 성공 후 1회 차감 (원자적, 0 이하에서는 차감 안 함)
CREATE OR REPLACE FUNCTION public.gi_consume_free_ocr_scan(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_remaining integer;
BEGIN
  SELECT email, free_ocr_count INTO v_email, v_remaining
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN -1;
  END IF;

  IF v_email = 'admin@guildinsight.local' OR v_remaining IS NULL THEN
    RETURN COALESCE(v_remaining, 9999);
  END IF;

  IF v_remaining <= 0 THEN
    RETURN 0;
  END IF;

  UPDATE public.profiles
  SET free_ocr_count = free_ocr_count - 1,
      updated_at = now()
  WHERE id = p_user_id
    AND free_ocr_count > 0
  RETURNING free_ocr_count INTO v_remaining;

  RETURN COALESCE(v_remaining, 0);
END;
$$;

NOTIFY pgrst, 'reload schema';
