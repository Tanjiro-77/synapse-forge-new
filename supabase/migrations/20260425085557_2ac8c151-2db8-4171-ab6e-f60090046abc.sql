-- =========================================
-- SYNAPSE FORGE SCHEMA
-- =========================================

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  xp integer not null default 0,
  level integer not null default 1,
  current_streak integer not null default 0,
  best_streak integer not null default 0,
  last_study_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

-- handle_new_user trigger
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- update_updated_at helper
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- SUBJECTS
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#8b5cf6',
  icon text default 'BookOpen',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.subjects enable row level security;
create policy "own subjects all" on public.subjects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger subjects_touch before update on public.subjects for each row execute function public.touch_updated_at();

-- CHAPTERS
create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  name text not null,
  status text not null default 'not_started' check (status in ('not_started','in_progress','completed','needs_revision')),
  notes text,
  is_weak boolean not null default false,
  last_revised_at timestamptz,
  next_revision_at timestamptz,
  revision_stage integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.chapters enable row level security;
create policy "own chapters all" on public.chapters for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger chapters_touch before update on public.chapters for each row execute function public.touch_updated_at();

-- HOMEWORK
create table public.homework (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  description text,
  due_date date,
  completed boolean not null default false,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.homework enable row level security;
create policy "own homework all" on public.homework for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger homework_touch before update on public.homework for each row execute function public.touch_updated_at();

-- EXAMS
create table public.exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  exam_date date not null,
  syllabus_completion integer not null default 0 check (syllabus_completion between 0 and 100),
  status text not null default 'preparing' check (status in ('preparing','ready','done')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.exams enable row level security;
create policy "own exams all" on public.exams for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger exams_touch before update on public.exams for each row execute function public.touch_updated_at();

-- GOALS
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period text not null check (period in ('daily','weekly','monthly')),
  metric text not null check (metric in ('study_hours','chapters','questions')),
  target numeric not null,
  progress numeric not null default 0,
  start_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.goals enable row level security;
create policy "own goals all" on public.goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger goals_touch before update on public.goals for each row execute function public.touch_updated_at();

-- TIMETABLE BLOCKS
create table public.timetable_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  label text,
  created_at timestamptz not null default now()
);
alter table public.timetable_blocks enable row level security;
create policy "own tt all" on public.timetable_blocks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- PLANNER TASKS
create table public.planner_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  chapter_id uuid references public.chapters(id) on delete set null,
  title text not null,
  task_date date not null default current_date,
  completed boolean not null default false,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.planner_tasks enable row level security;
create policy "own pt all" on public.planner_tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger pt_touch before update on public.planner_tasks for each row execute function public.touch_updated_at();

-- FOCUS SESSIONS
create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  duration_minutes integer not null,
  session_date date not null default current_date,
  created_at timestamptz not null default now()
);
alter table public.focus_sessions enable row level security;
create policy "own fs all" on public.focus_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- streak + XP trigger
create or replace function public.update_streak_xp()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  prof public.profiles;
  new_streak integer;
  earned_xp integer;
begin
  earned_xp := greatest(new.duration_minutes, 1);
  select * into prof from public.profiles where id = new.user_id;
  if prof.last_study_date is null then
    new_streak := 1;
  elsif prof.last_study_date = new.session_date then
    new_streak := prof.current_streak;
  elsif prof.last_study_date = new.session_date - 1 then
    new_streak := prof.current_streak + 1;
  else
    new_streak := 1;
  end if;
  update public.profiles set
    xp = xp + earned_xp,
    level = greatest(1, ((xp + earned_xp) / 500) + 1),
    current_streak = new_streak,
    best_streak = greatest(best_streak, new_streak),
    last_study_date = new.session_date,
    updated_at = now()
  where id = new.user_id;
  return new;
end;
$$;
create trigger fs_streak after insert on public.focus_sessions for each row execute function public.update_streak_xp();

-- TEST SCORES
create table public.test_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  score numeric not null,
  max_score numeric not null default 100,
  test_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.test_scores enable row level security;
create policy "own ts all" on public.test_scores for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- DOUBTS
create table public.doubts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  chapter_id uuid references public.chapters(id) on delete set null,
  question text not null,
  resolved boolean not null default false,
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.doubts enable row level security;
create policy "own d all" on public.doubts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger d_touch before update on public.doubts for each row execute function public.touch_updated_at();

-- REFLECTIONS
create table public.reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reflection_date date not null default current_date,
  studied text,
  understood text,
  improve text,
  mood integer check (mood between 1 and 5),
  created_at timestamptz not null default now(),
  unique (user_id, reflection_date)
);
alter table public.reflections enable row level security;
create policy "own r all" on public.reflections for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- BADGES
create table public.badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  earned_at timestamptz not null default now(),
  unique (user_id, code)
);
alter table public.badges enable row level security;
create policy "own b all" on public.badges for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
