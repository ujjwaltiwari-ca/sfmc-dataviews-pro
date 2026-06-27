-- Saved named queries for authenticated users (DataViews.pro SQL Sandbox).
-- Apply in Supabase SQL editor or via db:migrate tooling.

CREATE TABLE IF NOT EXISTS public.saved_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Query',
  sql_text TEXT NOT NULL,
  table_selection TEXT[] NOT NULL DEFAULT '{}',
  segment TEXT NOT NULL DEFAULT 'core',
  filter_state JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS saved_queries_user_id_updated_at_idx
  ON public.saved_queries (user_id, updated_at DESC);

ALTER TABLE public.saved_queries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own queries" ON public.saved_queries;
CREATE POLICY "Users can manage own queries"
  ON public.saved_queries
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_queries TO authenticated;
GRANT ALL ON public.saved_queries TO service_role;
