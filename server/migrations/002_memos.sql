-- User-scoped memos table + RLS (apply in Supabase SQL Editor for existing projects)

CREATE TABLE IF NOT EXISTS public.memos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_memos_updated_at ON public.memos;
CREATE TRIGGER update_memos_updated_at
  BEFORE UPDATE ON public.memos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_memos_user_id ON public.memos(user_id);
CREATE INDEX IF NOT EXISTS idx_memos_updated_at ON public.memos(updated_at DESC);

ALTER TABLE public.memos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "memos_select_own" ON public.memos;
DROP POLICY IF EXISTS "memos_insert_own" ON public.memos;
DROP POLICY IF EXISTS "memos_update_own" ON public.memos;
DROP POLICY IF EXISTS "memos_delete_own" ON public.memos;

CREATE POLICY "memos_select_own"
  ON public.memos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "memos_insert_own"
  ON public.memos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "memos_update_own"
  ON public.memos FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "memos_delete_own"
  ON public.memos FOR DELETE
  USING (auth.uid() = user_id);
