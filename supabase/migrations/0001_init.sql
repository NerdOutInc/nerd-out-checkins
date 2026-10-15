-- Nerd Out Check-ins: initial schema

create table public.team_members (
  name text primary key,
  role text not null,
  is_owner boolean not null default false,
  position int not null default 0
);

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  person text not null,
  date date not null,
  time text not null,                       -- 'HH:MM', local time of the person
  done text not null default '',
  plan text not null default '',
  blocked text not null default '',
  resolved boolean not null default false,
  replies jsonb not null default '[]',      -- [{by, date, time, text}]
  via text not null default 'web' check (via in ('web', 'text')),
  raw text,
  created_at timestamptz not null default now()
);
create index checkins_date_idx on public.checkins (date desc);

create table public.sms_messages (
  id bigint generated always as identity primary key,
  person text not null,
  date date not null,
  dir text not null check (dir in ('in', 'out')),
  time text not null,
  text text not null,
  created_at timestamptz not null default now()
);
create index sms_messages_person_date_idx on public.sms_messages (person, date);

insert into public.team_members (name, role, is_owner, position) values
  ('Nick', 'Owner', true, 0),
  ('Maya Chen', 'Developer', false, 1),
  ('Luis Ortega', 'Developer', false, 2),
  ('Sam Patel', 'Developer', false, 3),
  ('Priya Raman', 'Researcher', false, 4),
  ('Ben Holt', 'Researcher', false, 5),
  ('Jess Kowalski', 'Account admin', false, 6),
  ('Tom Reyes', 'Account admin', false, 7);

alter table public.team_members enable row level security;
alter table public.checkins enable row level security;
alter table public.sms_messages enable row level security;

-- TEMPORARY: the app has no sign-in yet, so the anon key can read and write.
-- Replace these with per-user policies once Supabase Auth is added.
create policy "anon read team" on public.team_members for select to anon using (true);
create policy "anon all checkins" on public.checkins for all to anon using (true) with check (true);
create policy "anon all sms" on public.sms_messages for all to anon using (true) with check (true);
