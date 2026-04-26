-- Session quality tracking
ALTER TABLE public.focus_sessions
  ADD COLUMN IF NOT EXISTS focus_level integer,
  ADD COLUMN IF NOT EXISTS distraction_level integer,
  ADD COLUMN IF NOT EXISTS notes text;

-- Adaptive revision strength (0=weak, 100=strong)
ALTER TABLE public.chapters
  ADD COLUMN IF NOT EXISTS strength integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS skip_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revision_count integer NOT NULL DEFAULT 0;

-- Challenges
CREATE TABLE IF NOT EXISTS public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  goal_type text NOT NULL,
  goal_value numeric NOT NULL,
  progress numeric NOT NULL DEFAULT 0,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  reward_xp integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ch all" ON public.challenges FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- AI insights cache (so we don't re-call AI every render)
CREATE TABLE IF NOT EXISTS public.ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ai all" ON public.ai_insights FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS ai_insights_user_kind_idx ON public.ai_insights (user_id, kind, created_at DESC);

-- Auto-flag weak chapter when test score < 60%
CREATE OR REPLACE FUNCTION public.auto_weak_from_score()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pct numeric;
BEGIN
  IF NEW.subject_id IS NULL OR NEW.max_score = 0 THEN RETURN NEW; END IF;
  pct := (NEW.score / NEW.max_score) * 100;
  IF pct < 60 THEN
    UPDATE public.chapters
      SET is_weak = true, strength = greatest(0, strength - 20), updated_at = now()
      WHERE user_id = NEW.user_id AND subject_id = NEW.subject_id;
  ELSIF pct >= 85 THEN
    UPDATE public.chapters
      SET strength = least(100, strength + 10), updated_at = now()
      WHERE user_id = NEW.user_id AND subject_id = NEW.subject_id;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_auto_weak ON public.test_scores;
CREATE TRIGGER trg_auto_weak AFTER INSERT ON public.test_scores
  FOR EACH ROW EXECUTE FUNCTION public.auto_weak_from_score();

-- Adaptive revision schedule on chapter revise
CREATE OR REPLACE FUNCTION public.adaptive_revision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE base_days integer;
BEGIN
  IF NEW.last_revised_at IS DISTINCT FROM OLD.last_revised_at AND NEW.last_revised_at IS NOT NULL THEN
    -- Adaptive interval: weak topics (low strength) revised more often
    base_days := CASE
      WHEN NEW.strength < 30 THEN 1
      WHEN NEW.strength < 60 THEN 3
      WHEN NEW.strength < 85 THEN 7
      ELSE 15
    END;
    NEW.next_revision_at := NEW.last_revised_at + (base_days || ' days')::interval;
    NEW.revision_count := COALESCE(OLD.revision_count, 0) + 1;
    NEW.strength := least(100, COALESCE(NEW.strength, 50) + 5);
    IF NEW.strength >= 70 THEN NEW.is_weak := false; END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_adaptive_rev ON public.chapters;
CREATE TRIGGER trg_adaptive_rev BEFORE UPDATE ON public.chapters
  FOR EACH ROW EXECUTE FUNCTION public.adaptive_revision();

-- Challenge progress auto-update on focus session
CREATE OR REPLACE FUNCTION public.update_challenge_progress()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.challenges
    SET progress = progress + (NEW.duration_minutes::numeric / 60),
        completed = (progress + (NEW.duration_minutes::numeric / 60)) >= goal_value,
        updated_at = now()
    WHERE user_id = NEW.user_id AND goal_type = 'study_hours'
      AND completed = false AND CURRENT_DATE BETWEEN start_date AND end_date;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_chal_progress ON public.focus_sessions;
CREATE TRIGGER trg_chal_progress AFTER INSERT ON public.focus_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_challenge_progress();