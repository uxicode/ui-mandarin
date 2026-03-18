-- tasks 테이블 생성 IF NOT EXISTS -- 중복 생성 방지를 위해 추가
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  importance NUMERIC(3,1) NOT NULL CHECK (importance >= 1 AND importance <= 5),
  urgency NUMERIC(3,1) NOT NULL CHECK (urgency >= 1 AND urgency <= 5),
  start_date TIMESTAMPTZ,
  deadline TIMESTAMPTZ,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- updated_at 자동 업데이트를 위한 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at 트리거 생성
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);

-- RLS (Row Level Security) 활성화 (선택사항)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기/쓰기 가능하도록 정책 설정 (개발용)
-- 프로덕션에서는 더 엄격한 정책을 설정하세요
CREATE POLICY "Allow all operations" ON tasks
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- [마이그레이션] 기존 테이블이 있는 경우, 아래 SQL을 Supabase SQL Editor에서 실행하여
-- importance/urgency 컬럼 타입을 INTEGER → NUMERIC(3,1)으로 변경하세요.
--
ALTER TABLE public.tasks
  ALTER COLUMN importance TYPE NUMERIC(3,1),
  ALTER COLUMN urgency TYPE NUMERIC(3,1);
--
-- DROP INDEX IF EXISTS idx_tasks_completed;
-- DROP INDEX IF EXISTS idx_tasks_created_at;
-- CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
-- CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
