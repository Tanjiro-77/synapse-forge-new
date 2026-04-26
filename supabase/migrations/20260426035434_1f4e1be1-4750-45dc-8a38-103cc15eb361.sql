-- Memory patterns (long-term AI brain)
CREATE TABLE IF NOT EXISTS public.memory_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pattern text NOT NULL,
  category text NOT NULL,
  confidence integer NOT NULL DEFAULT 50,
  evidence text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.memory_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mp all" ON public.memory_patterns FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Predictions
CREATE TABLE IF NOT EXISTS public.predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  prediction text NOT NULL,
  risk_level text NOT NULL DEFAULT 'medium',
  reason text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pred all" ON public.predictions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Micro goals
CREATE TABLE IF NOT EXISTS public.micro_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  target_count integer NOT NULL DEFAULT 1,
  completed_count integer NOT NULL DEFAULT 0,
  goal_date date NOT NULL DEFAULT CURRENT_DATE,
  subject_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.micro_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mg all" ON public.micro_goals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Mock tests
CREATE TABLE IF NOT EXISTS public.mock_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  topic text NOT NULL,
  subject_id uuid,
  duration_minutes integer NOT NULL DEFAULT 15,
  questions jsonb NOT NULL,
  user_answers jsonb,
  score integer,
  total integer,
  analysis text,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mock_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mt all" ON public.mock_tests FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  kind text NOT NULL DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notif all" ON public.notifications FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Energy logs
CREATE TABLE IF NOT EXISTS public.energy_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  energy_level text NOT NULL,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, log_date)
);
ALTER TABLE public.energy_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own el all" ON public.energy_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Profile additions: identity & fail-safe
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS identity_label text NOT NULL DEFAULT 'Beginner',
  ADD COLUMN IF NOT EXISTS miss_streak integer NOT NULL DEFAULT 0;

-- Auto-update identity label based on streak/level
CREATE OR REPLACE FUNCTION public.update_identity_label()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.identity_label := CASE
    WHEN NEW.best_streak >= 30 OR NEW.level >= 15 THEN 'Exam Beast'
    WHEN NEW.best_streak >= 14 OR NEW.level >= 8 THEN 'Topper Mode'
    WHEN NEW.best_streak >= 7 OR NEW.level >= 4 THEN 'Consistent'
    ELSE 'Beginner'
  END;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_identity ON public.profiles;
CREATE TRIGGER trg_identity BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_identity_label();