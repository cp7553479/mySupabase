-- Historical migration reconstructed from the linked project's migration log.
-- Private-by-policy cache for short-lived Feishu tenant access tokens.
create table if not exists public.feishu_token_cache (
  cache_key text primary key,
  tenant_access_token text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.feishu_token_cache enable row level security;
revoke all on table public.feishu_token_cache from public;
revoke all on table public.feishu_token_cache from anon;
revoke all on table public.feishu_token_cache from authenticated;
grant select, insert, update, delete on table public.feishu_token_cache to service_role;
