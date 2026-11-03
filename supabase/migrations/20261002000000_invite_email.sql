alter table public.invites
  add column if not exists email text;

create index if not exists invites_email_lower_idx
  on public.invites (lower(email))
  where email is not null;