# Decision log

Decisions made while building this app, newest last. Each entry: what we decided, why, and what it commits us to.

## 1. Host the code in a public repo under the NerdOutInc org
- **Decision:** `github.com/NerdOutInc/nerd-out-checkins`, public, `main` as the default branch.
- **Why:** Matches the other Nerd Out projects. Public was chosen explicitly over private.
- **Consequence:** Never commit secrets. `.env*` is gitignored (only `.env.example` is tracked). Only the publishable key ever goes in env vars.

## 2. Grow the HTML export into a Next.js app
- **Decision:** Next.js (App Router, TypeScript), deployed on Vercel, with Supabase (Postgres + Auth) as the backend.
- **Why:** Requested stack: GitHub, then Vercel for hosting, Supabase for the database.
- **Consequence:** The original export is kept as `legacy-prototype.html` for reference. The prototype's design (CSS) was carried over unchanged into `src/app/globals.css`.

## 3. Work on branches, merge by squash PR
- **Decision:** Every change goes on a branch and lands in `main` through a PR (squash merge, branch deleted).
- **Why:** Chosen at the start of each change. Gives a reviewable history.
- **PRs:** #1 Next.js scaffold, #2 publishable-key env var + single Supabase client, #3 email/password auth.

## 4. Supabase project lives in the user's personal org (free plan)
- **Decision:** The project is `hemlmotinftqbyxyiqno`, created by the user in their personal Supabase org.
- **Why:** Creating one in the "Nerd Out" org would cost $10/month; the user wanted a free one.
- **Consequence:** The Supabase connector Claude used can only see the Nerd Out org, so it cannot apply migrations to this project. **Migrations are applied by hand in the Supabase SQL editor**, in order, from `supabase/migrations/`.

## 5. Env var name: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- **Decision:** Use Supabase's newer publishable key. `NEXT_PUBLIC_SUPABASE_ANON_KEY` still works as a fallback.
- **Why:** That is the name the user's Supabase dashboard and setup used.

## 6. Authentication: email + password, no user picker
- **Decision:** Users sign up with name, role, email and password, and log in with email and password. The original "You are" dropdown and hard-coded roster were removed.
- **Why:** Requested: real accounts instead of selecting a user from a list.
- **How:** Supabase Auth; a `profiles` row is created by a database trigger on signup (`supabase/migrations/0002_auth.sql`).

## 7. Who can sign up: open to anyone
- **Decision:** Signup is open to anyone with the URL (not approval-gated or limited to an email domain).
- **Why:** Chosen explicitly by the owner, over the recommended approval-required option.
- **Risk we accepted:** Anyone who signs up can read all team check-ins.
- **Follow-up:** Turn off "Allow new users to sign up" in Supabase (Authentication → Sign In / Providers) once the team has joined, or add approval/domain restriction.

## 8. Roles: user picks at signup
- **Decision:** Roles are Developer, Researcher or Account admin, chosen on the signup form.
- **Why:** Simplest option, and the owner chose it over owner-assigned roles.
- **Consequence:** Users cannot edit their profile in the app. Role changes are made in the Supabase dashboard (profiles table).

## 9. The first account created is the owner
- **Decision:** The first signup gets role "Owner" (`is_owner = true`). Everyone after is a regular member.
- **Why:** Chosen over setting the flag by SQL. The owner signs up first, before sharing the URL.
- **Consequence:** The owner is not counted in the "expected to check in" team on the Report tab, but can post check-ins like anyone else.

## 10. Row-level security rules (after 0002)
- Signed-out users: no access to any table.
- Signed-in users can read all check-ins and profiles, post check-ins only as themselves, and reply to or resolve any check-in.
- Text-message threads are private to their owner; anyone signed in may insert (feed replies are delivered into the author's thread).
- Profiles cannot be inserted or changed from the app (trigger-only), which prevents anyone granting themselves the owner flag.
- **Known gap:** any signed-in user can update any check-in row, not just add a reply. Tighten with a trigger or an RPC if that matters.

## 11. Texting is simulated
- **Decision:** The "text message" mode is a keyword-based simulation (`src/lib/sms.ts`); no real SMS provider.
- **Why:** Carried over from the prototype. Real SMS (Twilio) and AI sorting are roadmap items.

## Open items
- Deploy to Vercel (env vars + Supabase Auth Site/Redirect URLs; steps in the README).
- Lock down signups after the team has joined.
- Delete the leftover test check-in ("Maya Chen") from `checkins`.
- Profile editing, real SMS, realtime updates.
