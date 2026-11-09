create schema if not exists people_private;
revoke all on schema people_private from public, anon;
grant usage on schema people_private to authenticated;

create or replace function people_private.is_dartontarget_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users as auth_user
    where auth_user.id = (select auth.uid())
      and lower(coalesce(auth_user.email, '')) like '%@dartontarget.org'
  );
$$;

create or replace function people_private.is_people_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    people_private.is_dartontarget_user()
    and exists (
      select 1
      from public.profiles as profile
      left join public.roles as role_record
        on role_record.id::text = profile.role::text
      where profile.id = (select auth.uid())
        and lower(trim(coalesce(role_record.role::text, profile.role::text, ''))) in (
          'admin',
          'admin1',
          'role_admin',
          'system_admin',
          'system admin'
        )
    );
$$;

revoke all on function people_private.is_dartontarget_user() from public, anon;
revoke all on function people_private.is_people_admin() from public, anon;
grant execute on function people_private.is_dartontarget_user() to authenticated;
grant execute on function people_private.is_people_admin() to authenticated;

create or replace function public.is_people_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select people_private.is_people_admin();
$$;

revoke all on function public.is_people_admin() from public, anon;
grant execute on function public.is_people_admin() to authenticated;

create or replace function people_private.guard_people_updates()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
    and current_user not in ('postgres', 'service_role', 'supabase_admin')
    and (
      new.role is distinct from old.role
      or new.is_active is distinct from old.is_active
    )
    and not people_private.is_people_admin()
  then
    raise exception 'Only an organization admin can change a person role or active status'
      using errcode = '42501';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create or replace function people_private.touch_shirt_status()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function people_private.guard_people_updates() from public, anon;
revoke all on function people_private.touch_shirt_status() from public, anon;

drop trigger if exists people_guard_and_updated_at on public.people;
create trigger people_guard_and_updated_at
before insert or update on public.people
for each row execute function people_private.guard_people_updates();

drop trigger if exists people_photo_status_updated_at on public.people_photo_status;
create trigger people_photo_status_updated_at
before insert or update on public.people_photo_status
for each row execute function people_private.touch_shirt_status();

alter table public.people enable row level security;
alter table public.people_photo_status enable row level security;

alter view public.people_data_alerts set (security_invoker = true);
alter view public.people_needing_attention set (security_invoker = true);
alter view public.client_overview set (security_invoker = true);

revoke all on table public.people from public, anon;
revoke all on table public.people_photo_status from public, anon;
grant select, insert, update on table public.people to authenticated;
grant select, insert, update on table public.people_photo_status to authenticated;
grant select on table public.departments to authenticated;

drop policy if exists people_domain_select on public.people;
create policy people_domain_select
on public.people
for select
to authenticated
using ((select people_private.is_dartontarget_user()));

drop policy if exists people_domain_guard_select on public.people;
create policy people_domain_guard_select
on public.people
as restrictive
for select
to authenticated
using ((select people_private.is_dartontarget_user()));

drop policy if exists people_domain_insert on public.people;
create policy people_domain_insert
on public.people
for insert
to authenticated
with check ((select people_private.is_dartontarget_user()));

drop policy if exists people_domain_guard_insert on public.people;
create policy people_domain_guard_insert
on public.people
as restrictive
for insert
to authenticated
with check ((select people_private.is_dartontarget_user()));

drop policy if exists people_domain_update on public.people;
create policy people_domain_update
on public.people
for update
to authenticated
using ((select people_private.is_dartontarget_user()))
with check ((select people_private.is_dartontarget_user()));

drop policy if exists people_domain_guard_update on public.people;
create policy people_domain_guard_update
on public.people
as restrictive
for update
to authenticated
using ((select people_private.is_dartontarget_user()))
with check ((select people_private.is_dartontarget_user()));

drop policy if exists people_photo_status_domain_select on public.people_photo_status;
create policy people_photo_status_domain_select
on public.people_photo_status
for select
to authenticated
using ((select people_private.is_dartontarget_user()));

drop policy if exists people_photo_status_domain_guard_select on public.people_photo_status;
create policy people_photo_status_domain_guard_select
on public.people_photo_status
as restrictive
for select
to authenticated
using ((select people_private.is_dartontarget_user()));

drop policy if exists people_photo_status_domain_insert on public.people_photo_status;
create policy people_photo_status_domain_insert
on public.people_photo_status
for insert
to authenticated
with check ((select people_private.is_dartontarget_user()));

drop policy if exists people_photo_status_domain_guard_insert on public.people_photo_status;
create policy people_photo_status_domain_guard_insert
on public.people_photo_status
as restrictive
for insert
to authenticated
with check ((select people_private.is_dartontarget_user()));

drop policy if exists people_photo_status_domain_update on public.people_photo_status;
create policy people_photo_status_domain_update
on public.people_photo_status
for update
to authenticated
using ((select people_private.is_dartontarget_user()))
with check ((select people_private.is_dartontarget_user()));

drop policy if exists people_photo_status_domain_guard_update on public.people_photo_status;
create policy people_photo_status_domain_guard_update
on public.people_photo_status
as restrictive
for update
to authenticated
using ((select people_private.is_dartontarget_user()))
with check ((select people_private.is_dartontarget_user()));

create or replace function public.save_person_with_shirt(p_person jsonb, p_shirt jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_person_id uuid;
  shirt_notes text;
  size_needs_confirmation boolean;
begin
  v_person_id := nullif(p_person ->> 'id', '')::uuid;
  size_needs_confirmation := coalesce((p_shirt ->> 'size_needs_confirmation')::boolean, false);
  shirt_notes := nullif(trim(coalesce(p_shirt ->> 'notes', '')), '');

  if size_needs_confirmation
    and position('size not confirmed (other / ask)' in lower(coalesce(shirt_notes, ''))) = 0
  then
    shirt_notes := concat_ws(E'\n', shirt_notes, 'Size not confirmed (Other / Ask).');
  elsif nullif(p_shirt ->> 'shirt_size', '') is not null then
    shirt_notes := nullif(trim(both E'\n' from replace(
      coalesce(shirt_notes, ''),
      'Size not confirmed (Other / Ask).',
      ''
    )), '');
  end if;

  if v_person_id is null then
    insert into public.people (
      full_name,
      role,
      email,
      phone,
      notes,
      is_active,
      call_number,
      department_id,
      work_location,
      additional_contacts,
      updated_at
    )
    values (
      p_person ->> 'full_name',
      p_person ->> 'role',
      nullif(p_person ->> 'email', ''),
      nullif(p_person ->> 'phone', ''),
      nullif(p_person ->> 'notes', ''),
      coalesce((p_person ->> 'is_active')::boolean, true),
      coalesce(p_person ->> 'call_number', ''),
      nullif(p_person ->> 'department_id', '')::uuid,
      nullif(p_person ->> 'work_location', ''),
      coalesce(p_person -> 'additional_contacts', '[]'::jsonb),
      now()
    )
    returning id into v_person_id;
  else
    update public.people
    set
      full_name = p_person ->> 'full_name',
      role = p_person ->> 'role',
      email = nullif(p_person ->> 'email', ''),
      phone = nullif(p_person ->> 'phone', ''),
      notes = nullif(p_person ->> 'notes', ''),
      is_active = coalesce((p_person ->> 'is_active')::boolean, true),
      call_number = coalesce(p_person ->> 'call_number', ''),
      department_id = nullif(p_person ->> 'department_id', '')::uuid,
      work_location = nullif(p_person ->> 'work_location', ''),
      additional_contacts = coalesce(p_person -> 'additional_contacts', '[]'::jsonb),
      updated_at = now()
    where id = v_person_id;

    if not found then
      raise exception 'Person not found' using errcode = 'P0002';
    end if;
  end if;

  update public.people_photo_status
  set
    shirt_size = nullif(p_shirt ->> 'shirt_size', ''),
    preferred_color = nullif(p_shirt ->> 'preferred_color', ''),
    shirt_received = coalesce((p_shirt ->> 'shirt_received')::boolean, false),
    photo_done = coalesce((p_shirt ->> 'photo_done')::boolean, false),
    notes = shirt_notes,
    updated_at = now()
  where people_photo_status.person_id = v_person_id;

  if not found then
    insert into public.people_photo_status (
      person_id,
      shirt_size,
      preferred_color,
      shirt_received,
      photo_done,
      notes,
      updated_at
    )
    values (
      v_person_id,
      nullif(p_shirt ->> 'shirt_size', ''),
      nullif(p_shirt ->> 'preferred_color', ''),
      coalesce((p_shirt ->> 'shirt_received')::boolean, false),
      coalesce((p_shirt ->> 'photo_done')::boolean, false),
      shirt_notes,
      now()
    );
  end if;

  return v_person_id;
end;
$$;

revoke all on function public.save_person_with_shirt(jsonb, jsonb) from public, anon;
grant execute on function public.save_person_with_shirt(jsonb, jsonb) to authenticated;

create or replace function public.save_shirt_updates(p_changes jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  shirt_change jsonb;
  changed_count integer := 0;
  shirt_notes text;
  size_needs_confirmation boolean;
begin
  if p_changes is null or jsonb_typeof(p_changes) <> 'array' then
    raise exception 'Shirt changes must be an array' using errcode = '22023';
  end if;

  for shirt_change in select value from jsonb_array_elements(p_changes)
  loop
    size_needs_confirmation := coalesce((shirt_change ->> 'size_needs_confirmation')::boolean, false);

    update public.people_photo_status
    set
      shirt_size = nullif(shirt_change ->> 'shirt_size', ''),
      shirt_received = coalesce((shirt_change ->> 'shirt_received')::boolean, false),
      notes = case
        when size_needs_confirmation
          and position('size not confirmed (other / ask)' in lower(coalesce(notes, ''))) = 0
          then concat_ws(E'\n', nullif(notes, ''), 'Size not confirmed (Other / Ask).')
        when nullif(shirt_change ->> 'shirt_size', '') is not null
          then nullif(trim(both E'\n' from replace(coalesce(notes, ''), 'Size not confirmed (Other / Ask).', '')), '')
        else notes
      end,
      updated_at = now()
    where person_id = (shirt_change ->> 'person_id')::uuid;

    if not found then
      shirt_notes := case
        when size_needs_confirmation then 'Size not confirmed (Other / Ask).'
        else null
      end;
      insert into public.people_photo_status (
        person_id,
        shirt_size,
        shirt_received,
        notes,
        updated_at
      )
      values (
        (shirt_change ->> 'person_id')::uuid,
        nullif(shirt_change ->> 'shirt_size', ''),
        coalesce((shirt_change ->> 'shirt_received')::boolean, false),
        shirt_notes,
        now()
      );
    end if;

    changed_count := changed_count + 1;
  end loop;

  return changed_count;
end;
$$;

revoke all on function public.save_shirt_updates(jsonb) from public, anon;
grant execute on function public.save_shirt_updates(jsonb) to authenticated;
