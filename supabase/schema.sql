-- Paladior — run this once in the Supabase SQL editor.

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

-- Row Level Security: every statement is scoped to the signed-in user, so the
-- public anon key can never read or write someone else's deals.
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
