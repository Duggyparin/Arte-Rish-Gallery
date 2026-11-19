create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(btrim(name)) > 0),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.gallery_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  title text not null default 'Untitled' check (length(btrim(title)) > 0),
  caption text not null default '',
  category_id uuid references public.categories(id) on delete restrict,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_gallery_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.gallery_admins
    where user_id = (select auth.uid())
  );
$$;

grant execute on function public.is_gallery_admin() to anon, authenticated;

alter table public.categories enable row level security;
alter table public.gallery_admins enable row level security;
alter table public.photos enable row level security;

grant select, insert, update, delete on public.categories to anon, authenticated;
grant select on public.gallery_admins to authenticated;
grant select, insert, update, delete on public.photos to anon, authenticated;

drop policy if exists "Anyone can read categories" on public.categories;
create policy "Anyone can read categories"
  on public.categories for select to anon, authenticated
  using (true);

drop policy if exists "Gallery admins manage categories" on public.categories;
create policy "Gallery admins manage categories"
  on public.categories for all to authenticated
  using ((select public.is_gallery_admin()))
  with check ((select public.is_gallery_admin()));

drop policy if exists "Gallery admins can confirm own access" on public.gallery_admins;
create policy "Gallery admins can confirm own access"
  on public.gallery_admins for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Anyone can read published photos" on public.photos;
create policy "Anyone can read published photos"
  on public.photos for select to anon, authenticated
  using (is_published or (select public.is_gallery_admin()));

drop policy if exists "Gallery admins manage photos" on public.photos;
create policy "Gallery admins manage photos"
  on public.photos for all to authenticated
  using ((select public.is_gallery_admin()))
  with check ((select public.is_gallery_admin()));

insert into public.categories (name, position)
values ('Nails', 1), ('Lash', 2), ('Skin', 3), ('Body', 4)
on conflict (name) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gallery',
  'gallery',
  false,
  20971520,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Published photos and admins can read images" on storage.objects;
create policy "Published photos and admins can read images"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'gallery'
    and (
      (select public.is_gallery_admin())
      or exists (
        select 1
        from public.photos
        where photos.storage_path = storage.objects.name
          and photos.is_published
      )
    )
  );

drop policy if exists "Gallery admins upload images" on storage.objects;
create policy "Gallery admins upload images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'gallery' and (select public.is_gallery_admin()));

drop policy if exists "Gallery admins update images" on storage.objects;
create policy "Gallery admins update images"
  on storage.objects for update to authenticated
  using (bucket_id = 'gallery' and (select public.is_gallery_admin()))
  with check (bucket_id = 'gallery' and (select public.is_gallery_admin()));

drop policy if exists "Gallery admins delete images" on storage.objects;
create policy "Gallery admins delete images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'gallery' and (select public.is_gallery_admin()));
