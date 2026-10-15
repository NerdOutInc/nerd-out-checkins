# Session log

A running summary of working sessions on this project. Add a dated entry per session.

## 2026-10-15: from HTML export to authenticated app

**Starting point:** a single exported file, `Nerd Out Check-ins.html`, on the Desktop (a daily team check-in tool: form or simulated text, feed with blockers and replies, Today/Week reports).

**Goal:** turn it into a full app on GitHub, then Vercel (hosting) and Supabase (database).

**What happened**
1. Put the file in a new public repo, `NerdOutInc/nerd-out-checkins`, with a README and `.gitignore`.
2. Scaffolded it as a Next.js + TypeScript app, keeping the design (PR #1). Added a Supabase data layer and the first migration (`0001_init.sql`).
3. Tried to create a Supabase project through the connector: the only visible org was "Nerd Out" ($10/month). The user chose to make a free project in their personal org instead, so migrations are run by hand in the SQL editor.
4. First migration didn't apply on the first or second try (tables missing); the third run, with a schema-cache reload line, worked. The app was verified against the live database.
5. The user's env var was `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, so the code now reads that, plus a shared Supabase client (PR #2).
6. Added email/password auth (PR #3): signup with name and role, login, a `profiles` table, per-user RLS, and removal of the user picker. Verified that signed-out requests can no longer read or write. The user signed up as the first account (owner) and confirmed it works.
7. Walked through the Vercel deploy and Supabase Auth URL settings (see README).

**Decisions:** see [decisions.md](decisions.md).

**Next:** deploy to Vercel, set Auth URLs, then restrict signups once the team has joined.
