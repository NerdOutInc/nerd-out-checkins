# Nerd Out Check-ins

Daily team check-ins: a web form or simulated text message, a feed with blocker tracking and replies, and Today / This-week reports.

Stack: Next.js (App Router, TypeScript) → Vercel, with Supabase (Postgres) for data. The original HTML export is kept in `legacy-prototype.html` for reference.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

The app needs a Supabase project (below). Without the env vars it shows a setup notice.

## Connect Supabase

1. Create a Supabase project.
2. In the SQL editor, run `supabase/migrations/0001_init.sql`, then `supabase/migrations/0002_auth.sql`.
3. Copy `.env.example` to `.env.local` and fill in the project URL and publishable key (a legacy anon key also works via `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. In **Authentication → URL Configuration**, set **Site URL** to your deployed URL and add `http://localhost:3000` and your Vercel URL to **Redirect URLs** (needed for the email confirmation link).

## Accounts and access

Users sign up with name, role, email and password. **The first account created becomes the owner**; everyone after picks a role at signup. Anyone with the URL can sign up and then sees all check-ins. To lock this down, turn off signups in **Authentication → Sign In / Providers** after your team has joined.

Row-level security: signed-in users can read all check-ins and profiles, post only as themselves, and reply to or resolve any check-in; text threads are private to their owner. Profiles can't be edited from the app, so the owner flag and roles are changed from the Supabase dashboard.

## Deploy to Vercel

Import this repo in Vercel and add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` as environment variables.

## Project docs

- [docs/decisions.md](docs/decisions.md): decisions and the reasoning behind them
- [docs/session-log.md](docs/session-log.md): running log of working sessions

## Layout

- `src/app` – layout, page, global styles (carried over from the prototype)
- `src/components` – `App` (state + actions), `Feed`, `CheckinTab`, `Report`
- `src/lib/db.ts` – Supabase client and data access
- `src/lib/sms.ts` – keyword sorter for simulated texts
- `supabase/migrations` – schema

## Roadmap

Profile editing, real SMS (Twilio) and AI sorting, realtime updates, per-user preferences.
