-- Basecamp — Supabase schema (Postgres + RLS)
-- Run this in the Supabase SQL editor once, after creating your project.
--
-- Design note: Basecamp stores only MUTABLE user state in the database
-- (profile, daily logs, weekly check-ins). The training programs, habit
-- definitions, warm-up protocol, and weekly-template defaults are STATIC
-- content bundled into the app (parsed from program2.pdf), so they are not
-- duplicated here. Each row is a small JSONB document keyed to the signed-in
-- user, protected by Row Level Security tied to auth.uid().

-- ── profile (one row per user) ───────────────────────────────────────────────
create table if not exists public.profile (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ── daily_log (one row per user per local day) ───────────────────────────────
create table if not exists public.daily_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, log_date)
);
create index if not exists daily_log_user_date_idx on public.daily_log (user_id, log_date);

-- ── weekly_checkin (one row per user per ISO week) ───────────────────────────
create table if not exists public.weekly_checkin (
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

-- ── Row Level Security ───────────────────────────────────────────────────────
alter table public.profile enable row level security;
alter table public.daily_log enable row level security;
alter table public.weekly_checkin enable row level security;

-- Each user can only see and modify their own rows.
do $$
declare
  t text;
begin
  foreach t in array array['profile', 'daily_log', 'weekly_checkin'] loop
    execute format('drop policy if exists "own rows select" on public.%I;', t);
    execute format('drop policy if exists "own rows insert" on public.%I;', t);
    execute format('drop policy if exists "own rows update" on public.%I;', t);
    execute format('drop policy if exists "own rows delete" on public.%I;', t);
    execute format('create policy "own rows select" on public.%I for select using (auth.uid() = user_id);', t);
    execute format('create policy "own rows insert" on public.%I for insert with check (auth.uid() = user_id);', t);
    execute format('create policy "own rows update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
    execute format('create policy "own rows delete" on public.%I for delete using (auth.uid() = user_id);', t);
  end loop;
end $$;
