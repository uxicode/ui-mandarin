-- 회원별 tasks 격리: user_id + RLS
-- Supabase SQL Editor에서 순서대로 실행하세요.
--
-- ⚠️ Git의 SQL은 Supabase와 자동 동기화되지 않습니다. 적용 후에만 사용자별 tasks/RLS가 동작합니다.
--    신규 프로젝트(테이블 없음)는 상위 폴더의 supabase-schema.sql 을 사용하세요.

-- 1) user_id 컬럼 추가 (기존 행은 NULL)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2) 기존 행을 한 계정으로 귀속 (데이터 삭제 없음)
--    - auth.users 에 사용자가 최소 1명 있어야 합니다. (대시보드에서 한 번 가입해 두세요.)
--    - 기본: 가입 시각이 가장 이른 계정 1명에게 전부 몹니다.
--    - 특정 사람에게만 몰고 싶으면 아래 UPDATE 를 주석 처리하고, 맨 아래 [대안] 블록을 사용하세요.
UPDATE public.tasks AS t
SET user_id = u.id
FROM (
  SELECT id
  FROM auth.users
  ORDER BY created_at ASC NULLS LAST
  LIMIT 1
) AS u
WHERE t.user_id IS NULL;

-- [대안] 위 UPDATE 대신, 직접 UUID 지정 (Authentication → Users 에서 복사)
-- UPDATE public.tasks
-- SET user_id = '여기에-uuid-붙여넣기'::uuid
-- WHERE user_id IS NULL;

-- 남은 NULL 이 있으면 NOT NULL 단계에서 실패합니다. (사용자 0명이거나 위 UPDATE 가 맞지 않은 경우)
-- SELECT id, title FROM public.tasks WHERE user_id IS NULL;

-- 3) 기본값 및 NOT NULL (JWT 컨텍스트에서 INSERT 시 auth.uid() 사용)
ALTER TABLE public.tasks
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.tasks
  ALTER COLUMN user_id SET NOT NULL;

-- 4) 인덱스
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 5) 기존 개방 정책 제거 후 사용자별 정책
DROP POLICY IF EXISTS "Allow all operations" ON public.tasks;
DROP POLICY IF EXISTS "tasks_select_own" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_own" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_own" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_own" ON public.tasks;

CREATE POLICY "tasks_select_own"
  ON public.tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "tasks_insert_own"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tasks_update_own"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tasks_delete_own"
  ON public.tasks FOR DELETE
  USING (auth.uid() = user_id);

-- INSERT 시 user_id 생략하면 DEFAULT auth.uid()가 적용됩니다.
-- WITH CHECK (auth.uid() = user_id) 는 DEFAULT와 일치합니다.
