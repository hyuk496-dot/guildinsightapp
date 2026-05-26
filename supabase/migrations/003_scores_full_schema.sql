-- ============================================================
-- Guild Insight · scores 테이블 통합 마이그레이션
-- 실행 위치: Supabase Dashboard → SQL Editor → New query
-- 실행 후: 앱 dev 서버 재시작 권장 (스키마 캐시 갱신)
-- ============================================================

-- 1) 누락된 컬럼 보강 (이미 있으면 건너뜀)
ALTER TABLE scores ADD COLUMN IF NOT EXISTS prev_score   INTEGER DEFAULT 0;
ALTER TABLE scores ADD COLUMN IF NOT EXISTS job          TEXT;
ALTER TABLE scores ADD COLUMN IF NOT EXISTS created_at   TIMESTAMPTZ DEFAULT now();
ALTER TABLE scores ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT now();
ALTER TABLE scores ADD COLUMN IF NOT EXISTS week_monday  DATE;

-- 2) 기존 행에 week_monday 채워넣기 (Asia/Seoul 기준 주 월요일)
UPDATE scores
SET week_monday = (
  date_trunc('week', COALESCE(created_at, now()) AT TIME ZONE 'Asia/Seoul')::date
)
WHERE week_monday IS NULL;

-- 3) 기존 (member_id, content_name) 단일 유니크 제거
ALTER TABLE scores DROP CONSTRAINT IF EXISTS scores_member_id_content_name_key;

-- 4) (member_id, content_name, week_monday) 유니크 인덱스 — upsert에 필수
CREATE UNIQUE INDEX IF NOT EXISTS scores_member_content_week_uidx
  ON scores (member_id, content_name, week_monday);

-- 5) updated_at 자동 갱신 트리거 (선택)
CREATE OR REPLACE FUNCTION set_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS scores_set_updated_at ON scores;
CREATE TRIGGER scores_set_updated_at
  BEFORE UPDATE ON scores
  FOR EACH ROW
  EXECUTE FUNCTION set_scores_updated_at();

-- 6) PostgREST 스키마 캐시 즉시 리로드 (Supabase 권장)
NOTIFY pgrst, 'reload schema';
