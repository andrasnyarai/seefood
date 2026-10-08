create table if not exists public.classifications (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  verdict text not null check (verdict in ('hot_dog', 'not_hot_dog')),
  label text not null,
  confidence double precision not null,
  created_at timestamptz not null default now()
);

alter table public.classifications enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('scans', 'scans', true, 2097152, array['image/jpeg'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
