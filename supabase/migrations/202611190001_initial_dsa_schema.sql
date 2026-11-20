-- CalibiAI DSA initial schema
-- This migration is intentionally not executed by the backend.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.dsa_problems (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  difficulty text not null default 'Easy'
    check (difficulty in ('Easy', 'Medium', 'Hard')),
  leetcode_url text,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.dsa_topics (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.problem_topics (
  problem_id uuid not null references public.dsa_problems(id) on delete cascade,
  topic_id uuid not null references public.dsa_topics(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (problem_id, topic_id)
);

create table if not exists public.problem_videos (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid not null references public.dsa_problems(id) on delete cascade,
  video_id text not null,
  title text not null,
  language text,
  channel_name text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_problem_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  problem_id uuid not null references public.dsa_problems(id) on delete cascade,
  status text not null check (status in ('Attempted', 'Completed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, problem_id)
);

create table if not exists public.user_bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  problem_id uuid not null references public.dsa_problems(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, problem_id)
);

create index if not exists dsa_problems_difficulty_idx
  on public.dsa_problems (difficulty);

create index if not exists dsa_problems_published_listing_idx
  on public.dsa_problems (sort_order, id)
  where is_published = true;

create index if not exists problem_topics_topic_lookup_idx
  on public.problem_topics (topic_id, problem_id);

create index if not exists problem_videos_problem_lookup_idx
  on public.problem_videos (problem_id, sort_order, id);

-- The composite primary keys already provide efficient user_id-leading indexes
-- for progress and bookmark lookups. Unique constraints already index slugs.

drop trigger if exists set_dsa_problems_updated_at on public.dsa_problems;
create trigger set_dsa_problems_updated_at
before update on public.dsa_problems
for each row execute function public.set_updated_at();

drop trigger if exists set_dsa_topics_updated_at on public.dsa_topics;
create trigger set_dsa_topics_updated_at
before update on public.dsa_topics
for each row execute function public.set_updated_at();

drop trigger if exists set_problem_videos_updated_at on public.problem_videos;
create trigger set_problem_videos_updated_at
before update on public.problem_videos
for each row execute function public.set_updated_at();

drop trigger if exists set_user_problem_progress_updated_at on public.user_problem_progress;
create trigger set_user_problem_progress_updated_at
before update on public.user_problem_progress
for each row execute function public.set_updated_at();

alter table public.dsa_problems enable row level security;
alter table public.dsa_topics enable row level security;
alter table public.problem_topics enable row level security;
alter table public.problem_videos enable row level security;
alter table public.user_problem_progress enable row level security;
alter table public.user_bookmarks enable row level security;

drop policy if exists "published problems are readable" on public.dsa_problems;
create policy "published problems are readable"
on public.dsa_problems for select
to anon, authenticated
using (is_published = true);

drop policy if exists "admins manage problems" on public.dsa_problems;
create policy "admins manage problems"
on public.dsa_problems for all
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "topics are readable" on public.dsa_topics;
create policy "topics are readable"
on public.dsa_topics for select
to anon, authenticated
using (true);

drop policy if exists "admins manage topics" on public.dsa_topics;
create policy "admins manage topics"
on public.dsa_topics for all
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "published problem topics are readable" on public.problem_topics;
create policy "published problem topics are readable"
on public.problem_topics for select
to anon, authenticated
using (exists (
  select 1
  from public.dsa_problems
  where dsa_problems.id = problem_topics.problem_id
    and dsa_problems.is_published = true
));

drop policy if exists "admins manage problem topics" on public.problem_topics;
create policy "admins manage problem topics"
on public.problem_topics for all
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "published problem videos are readable" on public.problem_videos;
create policy "published problem videos are readable"
on public.problem_videos for select
to anon, authenticated
using (exists (
  select 1
  from public.dsa_problems
  where dsa_problems.id = problem_videos.problem_id
    and dsa_problems.is_published = true
));

drop policy if exists "admins manage problem videos" on public.problem_videos;
create policy "admins manage problem videos"
on public.problem_videos for all
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "users read own progress" on public.user_problem_progress;
create policy "users read own progress"
on public.user_problem_progress for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "users insert own progress" on public.user_problem_progress;
create policy "users insert own progress"
on public.user_problem_progress for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users update own progress" on public.user_problem_progress;
create policy "users update own progress"
on public.user_problem_progress for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users delete own progress" on public.user_problem_progress;
create policy "users delete own progress"
on public.user_problem_progress for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "users read own bookmarks" on public.user_bookmarks;
create policy "users read own bookmarks"
on public.user_bookmarks for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "users insert own bookmarks" on public.user_bookmarks;
create policy "users insert own bookmarks"
on public.user_bookmarks for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users delete own bookmarks" on public.user_bookmarks;
create policy "users delete own bookmarks"
on public.user_bookmarks for delete
to authenticated
using (auth.uid() = user_id);

grant usage on schema public to anon, authenticated;

grant select on table
  public.dsa_problems,
  public.dsa_topics,
  public.problem_topics,
  public.problem_videos
to anon, authenticated;

grant insert, update, delete on table
  public.dsa_problems,
  public.dsa_topics,
  public.problem_topics,
  public.problem_videos
to authenticated;

grant select, insert, update, delete on table
  public.user_problem_progress
to authenticated;

grant select, insert, delete on table
  public.user_bookmarks
to authenticated;
