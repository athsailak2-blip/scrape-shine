
CREATE TABLE public.search_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  search_first text NOT NULL,
  search_last text NOT NULL,
  search_city text NOT NULL,
  search_state text NOT NULL,
  search_zipcode text DEFAULT '',
  search_url text NOT NULL,
  total_results integer NOT NULL DEFAULT 0,
  people jsonb NOT NULL DEFAULT '[]'::jsonb,
  source text NOT NULL DEFAULT 'single',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.search_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own results"
  ON public.search_results FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own results"
  ON public.search_results FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own results"
  ON public.search_results FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_search_results_user_created ON public.search_results (user_id, created_at DESC);
