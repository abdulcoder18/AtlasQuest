-- ============================================================
-- AtlasQuest × Supabase — database schema
-- Paste this whole file into: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- 1) Profiles: one row per account (auto-created on signup)
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text not null default 'Explorer',
  avatar        text not null default '#58a93c',
  xp            int  not null default 0,
  level         int  not null default 1,
  games_played  int  not null default 0,
  answers       int  not null default 0,
  correct       int  not null default 0,
  best_streak   int  not null default 0,
  daily_streak  int  not null default 0,
  daily_last    text,
  updated_at    timestamptz not null default now()
);

-- 2) Match history: last 10 games per player (auto-pruned, keeps DB small)
create table if not exists public.match_results (
  id          bigint generated always as identity primary key,
  player      uuid not null references public.profiles(id) on delete cascade,
  game        text not null,
  score       int  not null default 0,
  correct     int  not null default 0,
  total       int  not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists match_results_player_idx on public.match_results (player, created_at desc);

-- 3) Row Level Security
alter table public.profiles enable row level security;
alter table public.match_results enable row level security;

drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select using (true);

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update using (auth.uid() = id);

drop policy if exists "results read" on public.match_results;
create policy "results read" on public.match_results for select using (true);

drop policy if exists "results insert own" on public.match_results;
create policy "results insert own" on public.match_results for insert with check (auth.uid() = id);

-- 4) Auto-create a profile whenever someone signs up
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, username, avatar)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'username', ''), coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), 'Explorer')),
    coalesce(nullif(new.raw_user_meta_data->>'avatar', ''), '#58a93c')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5) Keep history small: only the 10 most recent matches per player survive
create or replace function public.prune_match_results() returns trigger as $$
begin
  delete from public.match_results
  where player = new.player
    and id not in (
      select id from public.match_results
      where player = new.player
      order by created_at desc
      limit 10
    );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists prune_after_insert on public.match_results;
create trigger prune_after_insert
  after insert on public.match_results
  for each row execute function public.prune_match_results();
