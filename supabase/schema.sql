-- COMIC RUGS COD + email notifications starter. Run in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.products (
  id text primary key,
  name text not null,
  description text not null default '',
  category text not null default 'Statement',
  price_paise integer not null check (price_paise > 0),
  image_url text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('CR-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  customer_name text not null,
  email text not null,
  phone text not null,
  address_line text not null,
  city text not null,
  state text not null,
  postal_code text not null,
  items jsonb not null,
  amount_paise integer not null check (amount_paise > 0),
  payment_method text not null default 'COD' check (payment_method = 'COD'),
  status text not null default 'cod_pending' check (status in ('cod_pending','confirmed','processing','shipped','delivered','cancelled')),
  notification_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.custom_requests (
  id uuid primary key default gen_random_uuid(),
  request_number text not null unique default ('CUSTOM-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  customer_name text not null,
  email text not null,
  phone text not null,
  width_cm integer not null check (width_cm between 30 and 500),
  height_cm integer not null check (height_cm between 30 and 500),
  shape text not null check (shape in ('rectangle','circle','oval','custom')),
  style text not null,
  colors text not null,
  notes text not null default '',
  reference_image_url text not null default '',
  status text not null default 'new' check (status in ('new','reviewing','quoted','approved','declined','completed')),
  quoted_price_paise integer,
  created_at timestamptz not null default now()
);

create table if not exists public.store_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.custom_requests enable row level security;
alter table public.store_admins enable row level security;

drop policy if exists "active products are public" on public.products;
create policy "active products are public" on public.products for select using (active = true);
drop policy if exists "admins read orders" on public.orders;
create policy "admins read orders" on public.orders for select to authenticated using (exists(select 1 from public.store_admins a where a.user_id = auth.uid()));
drop policy if exists "admins update orders" on public.orders;
create policy "admins update orders" on public.orders for update to authenticated using (exists(select 1 from public.store_admins a where a.user_id = auth.uid())) with check (exists(select 1 from public.store_admins a where a.user_id = auth.uid()));
drop policy if exists "admins read custom requests" on public.custom_requests;
create policy "admins read custom requests" on public.custom_requests for select to authenticated using (exists(select 1 from public.store_admins a where a.user_id = auth.uid()));
drop policy if exists "admins update custom requests" on public.custom_requests;
create policy "admins update custom requests" on public.custom_requests for update to authenticated using (exists(select 1 from public.store_admins a where a.user_id = auth.uid())) with check (exists(select 1 from public.store_admins a where a.user_id = auth.uid()));
drop policy if exists "admins read admin list" on public.store_admins;
create policy "admins read admin list" on public.store_admins for select to authenticated using (user_id = auth.uid());

insert into public.products (id,name,description,category,price_paise,image_url) values
('pow-power-play','POW! POWER PLAY','Punchy pop-art colour and comic-book energy.','Pop Art',649900,'https://images.unsplash.com/photo-1600166898405-da9535204843?auto=format&fit=crop&w=900&q=85'),
('blue-screen','BLUE SCREEN','Electric blue abstract shapes for a bold room.','Abstract',729900,'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=85'),
('chaos-theory','CHAOS THEORY','A graphic statement rug concept with movement.','Statement',589900,'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=900&q=85'),
('offbeat-check','OFFBEAT CHECK','Playful checks and offbeat pattern.','Abstract',499900,'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=85'),
('main-character','MAIN CHARACTER','The hero piece for a room that likes colour.','Statement',949900,'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=85')
on conflict (id) do nothing;

