# Kingdom 1465 — Kingshot community site

Website for Kingshot kingdom **#1465**: kingdom info, plus a **KvK castle position** system where players apply for time slots and leaders assign them.

Fan-made. Not affiliated with Kingshot or Century Games. The game has no public API, so all data on the site is entered by players and leaders.

## Stack

Next.js 16 (App Router, Cache Components) · Tailwind CSS v4 · Motion · Supabase (Postgres, Auth, Row Level Security, Realtime) · Vercel.

## Setup

1. **Install:** `npm install`
2. **Create a Supabase project** (the free tier is fine) at <https://supabase.com>.
3. **Create the database:** open *SQL Editor* and run each file in `supabase/migrations/` once, in order:
   - `0001_init.sql`
   - `0002_kingdom_settings.sql`
   - `0003_profile_language.sql`
   - `0004_messages.sql`
   - `0005_message_translations.sql`

   Paste each one into a new query and click Run.
4. **Add the keys:** copy `.env.example` to `.env.local` and fill it in from *Project Settings → API*.
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the anon or publishable key)
   - `SUPABASE_SERVICE_ROLE_KEY` (secret, server-only; used to create player accounts)
   - `AZURE_TRANSLATOR_KEY` and `AZURE_TRANSLATOR_REGION` (optional; adds a Translate button to messages — see **Message translation** below)
5. **Run it:** `npm run dev`, open <http://localhost:3000>, then sign up with your own game ID.
6. **Make yourself admin** by running this in the SQL Editor:
   ```sql
   update public.profiles set role = 'admin', status = 'approved' where game_id = 'YOUR_GAME_ID';
   ```
   Admins can then promote other leaders from **Admin → Accounts**.

## Customise

- **Kingdom text, stats and council contacts:** `lib/site.ts`
- **King and server open date:** **Admin → Kingdom → Current King** and **Server**
- **Discord link:** `discordUrl` in `lib/site.ts`
- **Colours and fonts:** `app/globals.css`, documented in `design-system/MASTER.md`

## Languages

The site is in English, German, Simplified and Traditional Chinese, French, Spanish, Indonesian, Tagalog, Brazilian Portuguese and Korean. Each language has its own address, for example `/de/positions` or `/zh-tw/apply`.

- **Choosing a language:** visitors get their browser's language automatically and can switch with the globe menu in the header. Players also pick a language when they sign up, and the site opens in it when they sign in.
- **Editing translations:** each language is one file in `lib/i18n/messages/`, and `en.ts` is the source. Keep every `{placeholder}` exactly as written, but move it wherever the sentence needs it. TypeScript reports any key that's missing or added by mistake.
- **What stays untranslated:** text that leaders or players type (event titles, custom position names, names, notes) is shown as entered. The five standard positions (Construction, Research, Training, Chief Minister, Noble Advisor) are translated automatically when stored in English.

## How the KvK position flow works

1. **Players sign up** with their game ID, in-game name and a password. New accounts are *pending*.
2. **Leaders approve accounts** in **Admin → Accounts**, after checking the game ID in-game.
3. **Leaders create an event** in **Admin → KvK events**: the Day 1 date, slot length, and one row per day and position (e.g. Day 1 · Construction). The site generates the time slots, which are UTC.
4. **Leaders open applications.** Approved players then use **Account → Castle appointments** to pick positions, preferred UTC slots (or "any time") and their speedups.
5. **Leaders review and assign** on each day's page:
   - accept or reject applications;
   - assign slots from the dropdowns (★ marks players who asked for that time), or press **Auto-fill**, which gives the highest speedups their earliest free preferred slot;
   - lock slots to protect them from auto-fill and changes.
6. **Leaders publish.** The schedule appears on **/positions** and updates live for everyone viewing it. Players also see their slot under **Account → Castle appointments**.

Each event moves through four stages: Draft → Applications open → Applications closed → Published. Leaders can move it back to an earlier stage at any time.

## Player account

Signed-in players have four sections under **Account**:

- **Overview:** account status and a card for each section.
- **Castle appointments:** apply for open KvK positions and follow every application and assigned slot.
- **Messages:** a WhatsApp-style chat with the kingdom's leaders and admins. Every approved leader and admin is listed; new messages arrive live, and the header shows a red dot when something is unread.
- **Profile:** change in-game name and alliance. The game ID can't be changed.

Leaders and admins answer players from the same **Messages** page, also linked from **Admin → Players → Messages**. Messaging rules live in the database (`0004_messages.sql`):

- only the two people in a conversation can read it, and leaders can't read other people's chats;
- players can write only to approved leaders and admins, and rejected accounts can't write at all;
- messages can't be edited or deleted, and each sender is limited to 20 messages a minute.

### Message translation

If `AZURE_TRANSLATOR_KEY` is set, every incoming message gets a **Translate** link under it. The first tap calls [Azure AI Translator](https://azure.microsoft.com/products/ai-services/ai-translator) and saves the result on the message (`0005_message_translations.sql`), so it's translated only once no matter how many times either side opens the chat; a second tap just switches back to the original. Without the key, the link doesn't appear and nothing changes.

A **Free F0** Translator resource covers 2 million characters a month at no cost — far more than a kingdom's chat is likely to use. Regional resources (anything other than "Global") also need `AZURE_TRANSLATOR_REGION` set to the resource's region, lowercased with no spaces (e.g. "Central India" → `centralindia`); a Global resource can leave it empty.

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
