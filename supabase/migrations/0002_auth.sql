-- Email/password auth: profiles, ownership, and per-user row-level security.
-- Run after 0001_init.sql.

-- 1. Profiles: one row per auth user. Created by a trigger on signup.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  role text not null check (role in ('Owner', 'Developer', 'Researcher', 'Account admin')),
  is_owner boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "signed-in users read profiles" on public.profiles
  for select to authenticated using (true);
-- No insert/update/delete policies on purpose: rows are created by the trigger below,
-- and the owner flag can only be changed from the Supabase dashboard / SQL.

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  first_user boolean;
  picked text := new.raw_user_meta_data ->> 'role';
begin
  lock table public.profiles in share row exclusive mode;
  select not exists (select 1 from public.profiles) into first_user;  -- first signup is the owner
  insert into public.profiles (id, name, role, is_owner)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)),
    case when first_user then 'Owner'
         when picked in ('Developer', 'Researcher', 'Account admin') then picked
         else 'Developer' end,
    first_user
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. The old hard-coded roster is replaced by profiles.
drop table public.team_members;

-- 3. Check-ins and texts belong to a user.
alter table public.checkins add column user_id uuid references public.profiles (id) on delete cascade;
alter table public.sms_messages add column user_id uuid references public.profiles (id) on delete cascade;
alter table public.sms_messages alter column person drop not null;
drop index public.sms_messages_person_date_idx;
create index sms_messages_user_date_idx on public.sms_messages (user_id, date);

-- 4. Replace the temporary open policies.
drop policy "anon all checkins" on public.checkins;
drop policy "anon all sms" on public.sms_messages;

create policy "team reads checkins" on public.checkins
  for select to authenticated using (true);
create policy "post own checkins" on public.checkins
  for insert to authenticated with check (user_id = auth.uid());
-- Any signed-in teammate can reply to or resolve a check-in (replies live on the row).
create policy "team updates checkins" on public.checkins
  for update to authenticated using (true) with check (true);

create policy "read own texts" on public.sms_messages
  for select to authenticated using (user_id = auth.uid());
-- Replies from the feed are written into the author's thread, so any signed-in user may insert.
create policy "add texts" on public.sms_messages
  for insert to authenticated with check (true);

notify pgrst, 'reload schema';
