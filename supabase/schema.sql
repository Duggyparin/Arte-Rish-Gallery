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

create table if not exists public.price_options (
  id text primary key default gen_random_uuid()::text,
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  details text not null default '',
  price integer check (price is null or price > 0),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (category_id, name)
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  title text not null default 'Untitled' check (length(btrim(title)) > 0),
  caption text not null default '',
  category_id uuid references public.categories(id) on delete restrict,
  price_tier_id text references public.price_options(id) on delete set null,
  custom_price integer,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.photos
  add column if not exists price_tier_id text,
  add column if not exists custom_price integer;

alter table public.price_options
  add column if not exists details text not null default '',
  add column if not exists price integer,
  add column if not exists position integer not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'photos_custom_price_positive'
      and conrelid = 'public.photos'::regclass
  ) then
    alter table public.photos
      add constraint photos_custom_price_positive
      check (custom_price is null or custom_price > 0);
  end if;
end;
$$;

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
alter table public.price_options enable row level security;
alter table public.photos enable row level security;

grant select, insert, update, delete on public.categories to anon, authenticated;
grant select on public.gallery_admins to authenticated;
grant select, insert, update, delete on public.price_options to anon, authenticated;
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

drop policy if exists "Anyone can read price options" on public.price_options;
create policy "Anyone can read price options"
  on public.price_options for select to anon, authenticated
  using (true);

drop policy if exists "Gallery admins manage price options" on public.price_options;
create policy "Gallery admins manage price options"
  on public.price_options for all to authenticated
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
values
  ('Nails Extension', 1),
  ('Lashes Extension', 2),
  ('Facial Care', 3),
  ('Gluta Drip', 4),
  ('Slimming Services', 5),
  ('Foot Care', 6),
  ('Profilo', 7),
  ('Botox', 8),
  ('GLP1 Terzipatide', 9),
  ('Other Services', 10)
on conflict (name) do nothing;

update public.photos as photo
set category_id = replacement.id
from public.categories as legacy
join public.categories as replacement on replacement.name = 'Nails Extension'
where photo.category_id = legacy.id and legacy.name = 'Nails';

update public.photos as photo
set category_id = replacement.id
from public.categories as legacy
join public.categories as replacement on replacement.name = 'Lashes Extension'
where photo.category_id = legacy.id and legacy.name = 'Lash';

update public.photos as photo
set category_id = replacement.id
from public.categories as legacy
join public.categories as replacement on replacement.name = 'Facial Care'
where photo.category_id = legacy.id and legacy.name = 'Skin';

update public.photos as photo
set category_id = null
from public.categories as legacy
where photo.category_id = legacy.id and legacy.name = 'Body';

delete from public.categories as legacy
where legacy.name in ('Nails', 'Lash', 'Skin', 'Body')
  and not exists (
    select 1
    from public.photos as photo
    where photo.category_id = legacy.id
  );

insert into public.price_options (id, category_id, name, details, price, position)
select seed.id, category.id, seed.name, seed.details, seed.price, seed.position
from (
  values
    ('builder-gel-plain', 'Nails Extension', 'Builder Gel Polish — Plain color', 'Includes 1 free glitter.', 349, 1),
    ('builder-gel-design', 'Nails Extension', 'Builder Gel Polish — French tip / Chrome / Cat''s eye / Minimal design', '', 399, 2),
    ('gel-x-plain', 'Nails Extension', 'Gel X Extension — Plain color', 'Includes 1 free glitter.', 499, 3),
    ('gel-x-classic', 'Nails Extension', 'Gel X Extension — Classic design', 'French tip / Chrome / Cat''s eye / Ombre.', 599, 4),
    ('gel-x-minimalist', 'Nails Extension', 'Gel X Extension — Minimalist design', 'Up to 3 color combinations, 2 embossed flowers or mermaid/Chrome details, and up to 15 rhinestones or gold/silver studs.', 699, 5),
    ('gel-x-luxurious', 'Nails Extension', 'Gel X Extension — Luxurious design', 'Up to 4 gel color combinations, 2 embossed or gold/silver 3D flowers, big stones, and up to 20 rhinestones or gold/silver studs.', 799, 6),
    ('gel-x-artistic', 'Nails Extension', 'Gel X Extension — Artistic design by Senior Technician', 'Includes hand-painted nail art.', 899, 7),
    ('lashes-classic-natural', 'Lashes Extension', 'Classic Natural Look', 'Available in sizes 8, 9, 10, 11, and 12 mm.', 249, 1),
    ('lashes-doll-eye', 'Lashes Extension', 'Doll Eye Look', 'Available in sizes 10, 11, 12, and 13 mm.', 299, 2),
    ('lashes-classic-cats-eye', 'Lashes Extension', 'Classic Cats Eye', 'Available in matching sizes: 9/10, 10/11, 11/12, or 12/13.', 299, 3),
    ('lashes-wipsy-russion', 'Lashes Extension', 'Wipsy Russion Look', 'Available in sizes 9, 10, 11, 12, and 13 mm.', 349, 4),
    ('lashes-korean-fairy', 'Lashes Extension', 'Korean Fairy Look', 'Available in matching sizes: 9/10, 9/11, 9/12, or 9/13.', 399, 5),
    ('lashes-hybrid-cats-eye', 'Lashes Extension', 'Hybrid Cats Eye Look', 'Available in matching sizes: 9/11, 9/12, 10/12, or 10/13.', 399, 6),
    ('lashes-wet-look', 'Lashes Extension', 'Wet Look Lash Set', 'Available in sizes 10–14 mm.', 499, 7),
    ('lashes-comic', 'Lashes Extension', 'Comic Lash', 'Mixed sizes, upper and lower lash set; available in sizes 10–15 mm.', 699, 8),
    ('lashes-anime', 'Lashes Extension', 'Anime Lash Look', 'Mixed sizes, upper and lower lash set; available in sizes 11–15 mm.', 799, 9),
    ('lashes-luxury-upper', 'Lashes Extension', 'Luxury Lash Set — Upper lashes only', '', 699, 10),
    ('lashes-luxury-upper-lower', 'Lashes Extension', 'Luxury Lash Set — Upper and lower lashes', 'Available in sizes 10–14 mm.', 799, 11),
    ('lashes-open-eye-luxury-upper', 'Lashes Extension', 'Open Eye Luxury Lash — Upper lashes only', '', 699, 12),
    ('lashes-open-eye-luxury-upper-lower', 'Lashes Extension', 'Open Eye Luxury Lash — Upper and lower lashes', 'Available in sizes 10–14 mm.', 799, 13),
    ('lashes-removal-from-here', 'Lashes Extension', 'Lash Extension Removal — From here', '', 70, 14),
    ('lashes-removal-not-from-here', 'Lashes Extension', 'Lash Extension Removal — Not from here', '', 150, 15),
    ('lashes-lower-lash-addon', 'Lashes Extension', 'Add-on — Lower lash', '', 199, 16),
    ('lashes-custom-look', 'Lashes Extension', 'Customize Lash Look — ₱599–₱799', 'Price depends on the selected design; enter the agreed amount as a custom price when assigning it to a photo.', null, 17),
    ('facial-care-facial', 'Facial Care', 'Facial', '', null, 1),
    ('facial-care-brow-lamination', 'Facial Care', 'Brow Lamination', '', null, 2),
    ('facial-scrub-led-combo', 'Facial Care', 'Facial Scrub & Mask — LED Light Therapy Combo', '', 699, 3),
    ('facial-charcoal-picosecond', 'Facial Care', 'Facial Charcoal Picosecond Laser', '', 599, 4),
    ('facial-derma-pen-microneedling', 'Facial Care', 'Derma Pen Microneedling', '', 759, 5),
    ('facial-korean-bb-glow-blush', 'Facial Care', 'Korean BB Glow with Blush', '', 899, 6),
    ('facial-acne-scar-microneedling', 'Facial Care', 'Acne Scar Removal — Microneedling', '', 799, 7),
    ('facial-stem-cell-collagen-microneedling', 'Facial Care', 'Stem Cell & Collagen — Microneedling', '', 599, 8),
    ('gluta-drip-service', 'Gluta Drip', 'Gluta Drip', '', null, 1),
    ('gluta-cindyrella-drip', 'Gluta Drip', 'Cindyrella Glow — 500 ml drip', '', 1299, 2),
    ('gluta-glutax-drip', 'Gluta Drip', 'GLUTAX Micro Advance — Drip', '', 699, 3),
    ('gluta-slimming-lcarn-drip', 'Gluta Drip', 'Gluta Slimming with L-Carnitine — Drip', '', 599, 4),
    ('gluta-aqua-diamond-vit-c-drip', 'Gluta Drip', 'Aqua Diamond Skin with Vitamin C — Drip', '', 649, 5),
    ('gluta-push-vit-c-drip', 'Gluta Drip', 'Gluta Push with Vitamin C — Drip', '', 450, 6),
    ('gluta-addon-collagen-c', 'Gluta Drip', 'Add-on — Collagen C', '', 250, 7),
    ('gluta-addon-placenta', 'Gluta Drip', 'Add-on — Placenta', '', 250, 8),
    ('gluta-addon-l-carnitine', 'Gluta Drip', 'Add-on — L-Carnitine', '', 300, 9),
    ('gluta-addon-b-complex-vitamins', 'Gluta Drip', 'Add-on — B Complex and B Vitamins', '', 180, 10),
    ('gluta-cindyrella-package-5', 'Gluta Drip', 'Cindyrella Glow — 5 sessions', 'Non-refundable package.', 5599, 11),
    ('gluta-glutax-package-10', 'Gluta Drip', 'GLUTAX Micro Advance — 10 sessions', 'Non-refundable package.', 5899, 12),
    ('gluta-slimming-package-10', 'Gluta Drip', 'Gluta Slimming Drip — 10 sessions', 'Non-refundable package.', 4999, 13),
    ('gluta-aqua-diamond-package-10', 'Gluta Drip', 'Aqua Diamond Skin — 10 sessions', 'Non-refundable package.', 5499, 14),
    ('gluta-push-vit-c-package-10', 'Gluta Drip', 'Gluta Push with Vitamin C — 10 sessions', 'Non-refundable package.', 3900, 15),
    ('slim-meso-lipo-vline', 'Slimming Services', 'Meso Lipo Fast Slim — V-Line', '', 299, 1),
    ('slim-meso-lipo-chin', 'Slimming Services', 'Meso Lipo Fast Slim — Chin', '', 299, 2),
    ('slim-meso-lipo-arms', 'Slimming Services', 'Meso Lipo Fast Slim — Both Arms', '', 850, 3),
    ('slim-meso-lipo-back', 'Slimming Services', 'Meso Lipo Fast Slim — Back', '', 499, 4),
    ('slim-meso-lipo-tummy', 'Slimming Services', 'Meso Lipo Fast Slim — Tummy', '', 599, 5),
    ('slim-rf-vline', 'Slimming Services', 'RF Cavitation & Skin Lifting — V-Line', '', 250, 6),
    ('slim-rf-chin', 'Slimming Services', 'RF Cavitation & Skin Lifting — Chin', '', 250, 7),
    ('slim-rf-arms', 'Slimming Services', 'RF Cavitation & Skin Lifting — Both Arms', '', 550, 8),
    ('slim-rf-back', 'Slimming Services', 'RF Cavitation & Skin Lifting — Back', '', 499, 9),
    ('slim-rf-tummy', 'Slimming Services', 'RF Cavitation & Skin Lifting — Tummy', '', 499, 10),
    ('slim-meso-rf-vline', 'Slimming Services', 'Meso + RF Combo — V-Line (5 sessions)', '', 1980, 11),
    ('slim-meso-rf-chin', 'Slimming Services', 'Meso + RF Combo — Chin (5 sessions)', '', 1980, 12),
    ('slim-meso-rf-arms', 'Slimming Services', 'Meso + RF Combo — Both Arms (5 sessions)', '', 5900, 13),
    ('slim-meso-rf-back', 'Slimming Services', 'Meso + RF Combo — Back (5 sessions)', '', 3990, 14),
    ('slim-meso-rf-tummy', 'Slimming Services', 'Meso + RF Combo — Tummy (5 sessions)', '', 4590, 15),
    ('slim-membership-bundle', 'Slimming Services', 'Slimming and Sculpting Glow Up Bundle — 3 months', '₱12,999 membership. Includes both arms, tummy, double chin, back fats, V-line/jaw, radiofrequency machine, and Meso Lipo Therapy.', 12999, 16),
    ('foot-pedi-gel-polish', 'Foot Care', 'Pedi Gel Polish', 'Up to 2 gel colors; free glitter.', 349, 1),
    ('foot-pedi-nail-extension', 'Foot Care', 'Pedi Nail Extension', 'Up to 2 gel colors; free glitter, French tip, or chrome.', 599, 2),
    ('foot-jelly-spa', 'Foot Care', 'Jelly Foot Spa', '', 399, 3),
    ('foot-cleaning-he', 'Foot Care', 'Pedi or Mani Cleaning Only — He', '', 180, 4),
    ('foot-cleaning-she', 'Foot Care', 'Pedi or Mani Cleaning Only — She', '', 150, 5),
    ('foot-nail-removal-from-here', 'Foot Care', 'Nail Extension Removal — From here', '', 70, 6),
    ('foot-nail-removal-not-from-here', 'Foot Care', 'Nail Extension Removal — Not from here', '', 150, 7),
    ('foot-pedi-gel-jelly-combo', 'Foot Care', 'Combo — Pedi Gel + Jelly Foot Spa', '', 699, 8),
    ('foot-pedi-extension-jelly-combo', 'Foot Care', 'Combo — Pedi Nail Extension + Jelly Foot Spa', '', 849, 9),
    ('nails-removal-from-here', 'Nails Extension', 'Nail Extension Removal — From here', '', 70, 8),
    ('nails-removal-not-from-here', 'Nails Extension', 'Nail Extension Removal — From another salon', '', 150, 9),
    ('profilo-service', 'Profilo', 'Profilo', '', null, 1),
    ('botox-service', 'Botox', 'Botox', 'Face Botox for fine lines / wrinkles.', 4299, 1),
    ('botox-jawtox', 'Botox', 'Jawtox', 'Jaw muscle / smaller jaw.', 3799, 2),
    ('botox-barbie-arms', 'Botox', 'Barbie Arms', 'Includes free Meso Lipo.', 5799, 3),
    ('glp1-shot', 'GLP1 Terzipatide', 'GLP-1 Terzipatide — 1 shot', '', 2199, 1),
    ('glp1-cycle', 'GLP1 Terzipatide', 'GLP-1 Terzipatide — 1 cycle (5 shots)', 'Includes monitoring and diet plan.', 8899, 2),
    ('other-meso', 'Other Services', 'Meso', '', null, 1),
    ('other-gluta', 'Other Services', 'Gluta', '', null, 2),
    ('other-meso-rf', 'Other Services', 'Meso RF', '', null, 3),
    ('other-back-rf', 'Other Services', 'Back RF', '', null, 4),
    ('other-tummy-rf', 'Other Services', 'Tummy RF', '', null, 5),
    ('other-arms-rf', 'Other Services', 'Arms RF', '', null, 6),
    ('other-facial', 'Other Services', 'Facial', '', null, 7),
    ('other-brow-lamination', 'Other Services', 'Brow Lamination', '', null, 8),
    ('other-jawtox', 'Other Services', 'Jawtox', 'Jaw muscle / smaller jaw.', 3799, 9),
    ('other-barbie-arms', 'Other Services', 'Barbie Arms', 'Includes free Meso Lipo.', 5799, 10),
    ('other-ipl-underarm', 'Other Services', 'IPL — Underarm Whitening & Hair Removal', '', 599, 11),
    ('other-ipl-half-leg', 'Other Services', 'IPL — Half Leg', '', 699, 12),
    ('other-ipl-mustache', 'Other Services', 'IPL — Mustache', '', 399, 13),
    ('other-ipl-mustache-beard', 'Other Services', 'IPL — Mustache and Beard', '', 499, 14),
    ('other-wax-underarm', 'Other Services', 'Cold Sugar Wax — Underarm', '', 299, 15),
    ('other-wax-both-arms', 'Other Services', 'Cold Sugar Wax — Both Arms', '', 499, 16),
    ('other-wax-half-leg', 'Other Services', 'Cold Sugar Wax — Half Leg', '', 699, 17),
    ('other-wax-full-leg', 'Other Services', 'Cold Sugar Wax — Full Leg', '', 899, 18),
    ('other-wart-removal-small', 'Other Services', 'Laser Warts Removal — Up to 3 mm', '', 499, 19),
    ('other-wart-removal-eye-area', 'Other Services', 'Laser Warts Removal — Eye Area', '', 899, 20),
    ('other-wart-removal-whole-face', 'Other Services', 'Laser Warts Removal — Whole Face', '', 1399, 21),
    ('other-wart-removal-whole-neck', 'Other Services', 'Laser Warts Removal — Whole Neck', '', 1399, 22),
    ('other-lip-filler', 'Other Services', 'Lip Filler', '', 4799, 23),
    ('other-chin-filler', 'Other Services', 'Chin Filler', '', 5699, 24)
) as seed(id, category_name, name, details, price, position)
join public.categories as category on category.name = seed.category_name
on conflict (category_id, name) do update
set category_id = excluded.category_id,
    details = excluded.details,
    price = excluded.price,
    position = excluded.position;

update public.photos
set price_tier_id = null
where price_tier_id is not null
  and not exists (
    select 1
    from public.price_options
    where price_options.id = photos.price_tier_id
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'photos_price_tier_id_fkey'
      and conrelid = 'public.photos'::regclass
  ) then
    alter table public.photos
      add constraint photos_price_tier_id_fkey
      foreign key (price_tier_id)
      references public.price_options(id)
      on delete set null;
  end if;
end;
$$;

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
