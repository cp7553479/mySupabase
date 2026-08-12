create table public.product_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index product_favorites_user_created_idx
  on public.product_favorites (user_id, created_at desc);

alter table public.product_favorites enable row level security;

grant select, insert, delete on public.product_favorites to authenticated;

create policy product_favorites_select_own
on public.product_favorites for select to authenticated
using ((select auth.uid()) = user_id);

create policy product_favorites_insert_own
on public.product_favorites for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy product_favorites_delete_own
on public.product_favorites for delete to authenticated
using ((select auth.uid()) = user_id);
