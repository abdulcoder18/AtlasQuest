-- Repair script: run this whole file in the Supabase SQL editor.
-- It finishes the parts that failed in the first run.

-- 1) the corrected security rule for match history
drop policy if exists "results insert own" on public.match_results;
create policy "results insert own" on public.match_results
  for insert with check (auth.uid() = player);

-- 2) auto-create a profile whenever someone signs up
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

-- 3) keep history small: only the 10 most recent matches per player
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
