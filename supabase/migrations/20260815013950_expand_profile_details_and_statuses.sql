alter table public.profiles
  add column job_title text,
  add column market text,
  add column preferences text;

alter table public.profiles
  drop constraint profiles_account_status_check,
  add constraint profiles_account_status_check
    check (account_status in ('pending', 'active', 'needs_information', 'rejected', 'suspended'));
