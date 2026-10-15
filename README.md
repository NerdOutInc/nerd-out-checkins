# Nerd Out Check-ins

Daily team check-ins: a web form or simulated text message, a feed with blocker tracking and replies, and Today / This-week reports.

Stack: Next.js (App Router, TypeScript) → Vercel, with Supabase (Postgres) for data. The original HTML export is kept in `legacy-prototype.html` for reference.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

With no env vars set, the app runs in **demo mode** (data lives in memory and resets on reload).

## Connect Supabase

1. Create a Supabase project.
2. Run `supabase/migrations/0001_init.sql` in the SQL editor (or via the Supabase CLI).
3. Copy `.env.example` to `.env.local` and fill in the project URL and publishable key (a legacy anon key also works via `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

> The initial migration has **temporary open RLS policies** for the anon key because the app has no sign-in yet. Add Supabase Auth and tighten the policies before putting real data in.

## Deploy to Vercel

Import this repo in Vercel and add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` as environment variables.

## Layout

- `src/app` – layout, page, global styles (carried over from the prototype)
- `src/components` – `App` (state + actions), `Feed`, `CheckinTab`, `Report`
- `src/lib/db.ts` – data layer (Supabase, with in-memory fallback)
- `src/lib/sms.ts` – keyword sorter for simulated texts
- `supabase/migrations` – schema

## Roadmap

Auth, real SMS (Twilio) and AI sorting, realtime updates, per-user preferences.
