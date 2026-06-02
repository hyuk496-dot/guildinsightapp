# Supabase 마이그레이션

Guild Insight는 Supabase Postgres를 사용합니다. 다음 SQL 파일을 **Supabase Dashboard → SQL Editor**에서 한 번씩 실행하세요.

## 실행 순서

| 파일 | 목적 | 필수/선택 |
|---|---|---|
| `003_scores_full_schema.sql` | `scores` 테이블 통합 — `week_monday`, `created_at`, `updated_at`, `prev_score`, `job` 컬럼 + 주차 단위 유니크 인덱스 | **필수** |
| `002_contributions.sql` | `contributions` 테이블 (기여도 분석 페이지) | 선택 — 기여도 편집 사용 시 |
| `004_gpt_reports.sql` | `gpt_reports` 테이블 (GPT 리포트 저장) | 선택 — GPT 리포트 페이지 사용 시 |
| `005_user_isolation_rls.sql` | profiles 테이블 + guilds.owner_id + RLS 정책 (멀티유저 보안) | **필수** (멀티유저 운영) |
| `009_contributions_rls_fix.sql` | `contributions` INSERT RLS·GRANT 보강 (기여도 첫 저장 오류 수정) | **필수** — 기여도 편집 사용 시 |
| `001_scores_week_monday.sql` | (구) `week_monday` 컬럼만 추가하는 부분 마이그레이션 — `003`에 포함됨 | **건너뛰기** |

## 멀티유저 보안 셋업 (005)

이 단계 이후로는 **모든 사용자가 본인 소유 길드의 데이터만** 조회/수정할 수 있도록 RLS가 강제됩니다.

### 사전 준비 — admin 계정 생성

기존 시스템에 누적된 테스트 데이터(길드/멤버/점수 등)는 `admin@guildinsight.local` 계정 소유로 백필됩니다. **반드시 마이그레이션 실행 전**에 다음 절차로 admin 사용자를 만들어 주세요.

1. Supabase Dashboard → **Authentication → Users → Add user → Create new user**
2. 입력:
   - Email: `admin@guildinsight.local`
   - Password: **반드시 길고 강력한 임의의 비밀번호로 직접 설정** (이 값은 .env / 코드에 절대 노출하지 말 것)
   - **Auto Confirm User** 체크 (이메일 인증 단계 스킵)
3. 생성 직후 Users 목록에 보이면 OK.

### 마이그레이션 실행

1. SQL Editor → `New query`
2. `005_user_isolation_rls.sql` 전체 복사/붙여넣기 → **Run**
3. 출력의 NOTICE 메시지에서 `[ok] guilds N rows backfilled to admin (UUID).` 가 보이면 성공.
4. admin 사용자를 마이그레이션 후에 만들었다면, 005 의 PART B(DO 블록) 만 다시 실행하면 됩니다.

### 환경 변수 정비 (.env.local)

기존에 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 자리에 `sb_secret_…` 가 들어 있었다면 **반드시** 아래처럼 분리하세요. (RLS 가 보호하는 모델 자체가 무력화됩니다.)

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable / anon key (sb_publishable_… 또는 eyJ…)>

# 서버 전용 (NEXT_PUBLIC_ 접두사 X) — OCR 등 service-role 가 필요한 곳에서만 사용
SUPABASE_SERVICE_ROLE_KEY=<sb_secret_… 또는 service_role JWT>

OPENAI_API_KEY=…
GOOGLE_APPLICATION_CREDENTIALS=google-vision-key.json
```

설정 위치: Supabase Dashboard → **Project Settings → API Keys**
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon` / `publishable` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` / `sb_secret_` 키 → `SUPABASE_SERVICE_ROLE_KEY` (절대 클라이언트 노출 금지)

### 정책 확인 (선택)

```sql
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname='public'
ORDER BY tablename;
```

`guilds`, `members`, `scores`, `contributions`, `gpt_reports`, `profiles` 6개 테이블에 정책이 등록되어 있어야 합니다.

## 003 실행 방법 (기존)

1. https://supabase.com/dashboard 접속 → 프로젝트 선택
2. 좌측 사이드바 **SQL Editor** 클릭 → `New query`
3. `supabase/migrations/003_scores_full_schema.sql` 내용 전체 복사 → 붙여넣기 → **Run**
4. 마지막 줄의 `NOTIFY pgrst, 'reload schema';` 가 PostgREST 스키마 캐시를 즉시 갱신합니다.
5. 앱 dev 서버를 재시작하세요 (`npm run dev`).

## 실행 후 확인

```sql
-- 컬럼 존재 확인
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'scores'
ORDER BY ordinal_position;

-- 유니크 인덱스 존재 확인
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'scores';
```

다음 결과가 나오면 정상:
- 컬럼: `id, member_id, guild_id, nick, job, content_name, score, prev_score, week_monday, created_at, updated_at`
- 인덱스: `scores_member_content_week_uidx (member_id, content_name, week_monday)` 가 UNIQUE

## 트러블슈팅

### "column scores.week_monday does not exist" / PGRST204
마이그레이션이 안 돌아간 상태. `003_scores_full_schema.sql` 실행 후 dev 서버 재시작.

### upsert 시 "no unique or exclusion constraint matching"
`scores_member_content_week_uidx` 인덱스가 없음. `003`의 4번 단계만 다시 실행:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS scores_member_content_week_uidx
  ON scores (member_id, content_name, week_monday);
NOTIFY pgrst, 'reload schema';
```

### 마이그레이션을 아직 못 돌렸는데 앱은 돌리고 싶다
앱은 컬럼이 없어도 자동으로 레거시 경로(`SELECT → UPDATE/INSERT`)로 폴백합니다. 단, 같은 주차에 같은 행을 여러 번 저장하면 마지막 값으로 덮어쓰기되며, 대시보드 주간 차트는 `created_at` 기반 추정치가 됩니다.

### 005 실행 후 admin 계정으로 로그인했더니 "Invalid login credentials"
- `admin@guildinsight.local` 사용자가 생성되지 않았거나, 비밀번호 입력이 틀렸습니다.
- Authentication → Users 에서 사용자 클릭 → `Reset password` 로 새 비밀번호를 재설정.
- 또는 `Update user` 에서 `Email Confirmed` ON 여부 확인.

### 005 실행 후 기존 데이터가 사라진 것처럼 보임
- 본인 계정이 admin 이 아니라서 RLS 가 가렸을 가능성. admin 계정으로 로그인해 확인.
- 그래도 안 보이면 SQL Editor 에서 직접 확인:
  ```sql
  SELECT id, name, owner_id FROM public.guilds;
  ```
  `owner_id` 가 NULL 이면 admin UUID 백필이 안 된 상태 → 005 의 PART B 만 다시 실행.

### 새로 가입한 OAuth(Google/Discord) 사용자가 admin 의 길드를 보고 있음
- 005 가 안 돌았거나, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 자리에 아직 secret 키가 박혀 있어 RLS 가 우회되는 중. 두 가지를 모두 점검.
