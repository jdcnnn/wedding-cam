-- =============================================================
-- Wedding Cam — Supabase Setup
-- Run this entire file in the Supabase SQL Editor
-- =============================================================

-- 1. Shots table
create table public.shots (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  file_path text not null,
  created_at timestamptz default now()
);

-- 2. Enable RLS
alter table public.shots enable row level security;

-- 3. Anon: insert only (guests upload)
create policy "anon_insert"
  on public.shots
  for insert
  to anon
  with check (true);

-- 4. Authenticated (admin): read all
create policy "admin_select"
  on public.shots
  for select
  to authenticated
  using (true);

-- 5. Authenticated (admin): delete
create policy "admin_delete"
  on public.shots
  for delete
  to authenticated
  using (true);

-- 6. Index for fast per-session queries
create index shots_session_id_idx on public.shots (session_id);


-- =============================================================
-- Storage bucket policies (run AFTER creating the bucket in UI)
-- Go to Storage → wedding-shots → Policies → New policy
-- Or run these in SQL Editor
-- =============================================================

-- Anon: upload only
create policy "anon_upload"
  on storage.objects
  for insert
  to anon
  with check (bucket_id = 'wedding-shots');

-- Authenticated: full access
create policy "admin_all"
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'wedding-shots');
