-- 회원별 tasks 격리: user_id + RLS
-- Supabase SQL Editor에서 순서대로 실행하세요.

-- 1) user_id 컬럼 추가 (기존 행은 NULL)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2) 기존 공용 데이터: 전부 삭제하거나 특정 사용자 UUID로 UPDATE 후 NOT NULL 적용
--    (개발 중이면 아래 DELETE로 비우는 것이 단순합니다)
DELETE FROM public.tasks WHERE user_id IS NULL;

-- 3) 기본값 및 NOT NULL (JWT 컨텍스트에서 INSERT 시 auth.uid() 사용)
ALTER TABLE public.tasks
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.tasks
  ALTER COLUMN user_id SET NOT NULL;

-- 4) 인덱스
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);

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
