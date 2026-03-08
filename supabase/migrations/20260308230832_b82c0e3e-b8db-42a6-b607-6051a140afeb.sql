
-- Bulk jobs table
CREATE TABLE public.bulk_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','complete','failed','cancelled')),
  total_items integer NOT NULL DEFAULT 0,
  completed_items integer NOT NULL DEFAULT 0,
  failed_items integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Bulk job items table
CREATE TABLE public.bulk_job_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.bulk_jobs(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  zipcode text DEFAULT '',
  original_row jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','done','error','credits_exhausted','not_processed')),
  result jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bulk_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_job_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for bulk_jobs
CREATE POLICY "Users can read own jobs" ON public.bulk_jobs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own jobs" ON public.bulk_jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own jobs" ON public.bulk_jobs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can read all jobs" ON public.bulk_jobs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- RLS policies for bulk_job_items
CREATE POLICY "Users can read own job items" ON public.bulk_job_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bulk_jobs WHERE id = bulk_job_items.job_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert own job items" ON public.bulk_job_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.bulk_jobs WHERE id = bulk_job_items.job_id AND user_id = auth.uid()));
CREATE POLICY "Users can update own job items" ON public.bulk_job_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bulk_jobs WHERE id = bulk_job_items.job_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.bulk_jobs WHERE id = bulk_job_items.job_id AND user_id = auth.uid()));

-- Enable realtime for job status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.bulk_jobs;

-- Index for faster lookups
CREATE INDEX idx_bulk_job_items_job_id ON public.bulk_job_items(job_id);
CREATE INDEX idx_bulk_jobs_user_id ON public.bulk_jobs(user_id);
