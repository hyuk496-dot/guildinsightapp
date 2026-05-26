-- 점수 주차(월요일) 단위 저장 — Supabase SQL Editor에서 실행
ALTER TABLE scores ADD COLUMN IF NOT EXISTS week_monday DATE;

-- 기존 행: created_at 기준 해당 주 월요일로 채움 (PostgreSQL)
UPDATE scores
SET week_monday = (
  date_trunc('week', COALESCE(created_at, now()) AT TIME ZONE 'Asia/Seoul')::date
)
WHERE week_monday IS NULL;

-- 기존 (member_id, content_name) 단일 유니크 제거 후 주차별 유니크 추가
-- 제약 이름은 프로젝트마다 다를 수 있음. 오류 시 Table Editor에서 기존 unique 확인 후 수정.
ALTER TABLE scores DROP CONSTRAINT IF EXISTS scores_member_id_content_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS scores_member_content_week_uidx
  ON scores (member_id, content_name, week_monday);
