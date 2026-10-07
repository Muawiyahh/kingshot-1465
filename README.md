# Kingdom 1465 — Kingshot community site

Website for Kingshot kingdom **#1465**: kingdom info, plus a **KvK castle position** system where players apply for time slots and leaders assign them.

Fan-made. Not affiliated with Kingshot or Century Games. The game has no public API, so all data on the site is entered by players and leaders.

## Stack

Next.js 16 (App Router, Cache Components) · Tailwind CSS v4 · Motion · Supabase (Postgres, Auth, Row Level Security, Realtime) · Vercel.

## Setup

1. **Install:** `npm install`
2. **Create a Supabase project** (the free tier is fine) at <https://supabase.com>.
3. **Create the database:** open *SQL Editor*, paste the contents of `supabase/migrations/0001_init.sql`, then run it.
4. **Add the keys:** copy `.env.example` to `.env.local` and fill it in from *Project Settings → API*.
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the anon or publishable key)
   - `SUPABASE_SERVICE_ROLE_KEY` (secret, server-only; used to create player accounts)
5. **Run it:** `npm run dev`, open <http://localhost:3000>, then sign up with your own game ID.
6. **Make yourself admin** by running this in the SQL Editor:
   ```sql
   update public.profiles set role = 'admin', status = 'approved' where game_id = 'YOUR_GAME_ID';
   ```
   Admins can then promote other leaders from **Admin → Accounts**.

## Customise

- **Kingdom text, stats and council contacts:** `lib/site.ts`
- **Amadeus portrait:** put a transparent PNG/WebP in `public/` (for example `public/amadeus.webp`), then set `heroImage: "/amadeus.webp"` in `lib/site.ts`. Until then a placeholder silhouette is shown.
- **Discord link:** `discordUrl` in `lib/site.ts`
- **Colours and fonts:** `app/globals.css`, documented in `design-system/MASTER.md`

## How the KvK position flow works

1. **Players sign up** with their game ID, in-game name and a password. New accounts are *pending*.
2. **Leaders approve accounts** in **Admin → Accounts**, after checking the game ID in-game.
3. **Leaders create an event** in **Admin → KvK events**: the Day 1 date, slot length, and one row per day and position (e.g. Day 1 · Construction). The site generates the time slots, which are UTC.
4. **Leaders open applications.** Approved players then use **Apply** to pick positions, preferred UTC slots (or "any time") and their speedups.
5. **Leaders review and assign** on each day's page:
   - accept or reject applications;
   - assign slots from the dropdowns (★ marks players who asked for that time), or press **Auto-fill**, which gives the highest speedups their earliest free preferred slot;
   - lock slots to protect them from auto-fill and changes.
6. **Leaders publish.** The schedule appears on **/positions** and updates live for everyone viewing it. Players also see their slot on **Account**.

Each event moves through four stages: Draft → Applications open → Applications closed → Published. Leaders can move it back to an earlier stage at any time.

## Security

- Row Level Security enforces every rule in the database, not just in the UI:
  - players only see their own profile and applications;
  - only approved players can apply, and only to open events;
  - only leaders can assign slots;
  - only admins can grant roles;
  - nothing is public until it's published.
- Every leader action is written to `audit_log`.
- Logins use the game ID with a site-specific password. Players should never reuse their game account password.

## Deploy (Vercel)

1. Push the repo to GitHub and import it in Vercel.
2. Add the three environment variables from `.env.local` to the Vercel project.
3. Deploy.
