-- Paladior — run this once in the Supabase SQL editor (or via MCP apply_migration).

create table if not exists public.deals (
  id          text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists deals_user_id_updated_at_idx
  on public.deals (user_id, updated_at desc);

alter table public.deals enable row level security;

drop policy if exists "deals_select_own" on public.deals;
create policy "deals_select_own" on public.deals
  for select using (auth.uid() = user_id);

drop policy if exists "deals_insert_own" on public.deals;
create policy "deals_insert_own" on public.deals
  for insert with check (auth.uid() = user_id);

drop policy if exists "deals_update_own" on public.deals;
create policy "deals_update_own" on public.deals
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "deals_delete_own" on public.deals;
create policy "deals_delete_own" on public.deals
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on table public.deals to anon, authenticated;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists deals_set_updated_at on public.deals;
create trigger deals_set_updated_at
  before update on public.deals
  for each row execute function public.set_updated_at();

-- Per-user Overview / affordability inputs ("Your numbers")
create table if not exists public.user_settings (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  affordability jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "user_settings_select_own" on public.user_settings;
create policy "user_settings_select_own" on public.user_settings
  for select using (auth.uid() = user_id);

drop policy if exists "user_settings_insert_own" on public.user_settings;
create policy "user_settings_insert_own" on public.user_settings
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_settings_update_own" on public.user_settings;
create policy "user_settings_update_own" on public.user_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_settings_delete_own" on public.user_settings;
create policy "user_settings_delete_own" on public.user_settings
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on table public.user_settings to anon, authenticated;

create or replace function public.set_user_settings_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.set_user_settings_updated_at();
