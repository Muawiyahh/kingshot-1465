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
   - `0006_application_reapply.sql`
   - `0007_homepage_content.sql`

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

- **King and server open date:** **Admin → Kingdom → Current King** and **Server**
- **Alliance event times, Hall of Fame, and the Transfer section** (pitch, kingdom facts, transfer managers): **Admin → Homepage** (see **Homepage** below)
- **Kingdom number and Discord link:** `lib/site.ts`
- **Colours and fonts:** `app/globals.css`, documented in `design-system/MASTER.md`

## Languages

The site is in English, German, Simplified and Traditional Chinese, French, Spanish, Indonesian, Tagalog, Brazilian Portuguese and Korean. Each language has its own address, for example `/de/positions` or `/zh-tw/apply`.

- **Choosing a language:** visitors get their browser's language automatically. On their first visit a language picker opens, with every language written in its own script, so nobody has to read English to find their language. They can switch later with the globe menu in the header. Players also pick a language when they sign up, and the site opens in it when they sign in.
- **Editing translations:** each language is one file in `lib/i18n/messages/`, and `en.ts` is the source. Keep every `{placeholder}` exactly as written, but move it wherever the sentence needs it. TypeScript reports any key that's missing or added by mistake.
- **What stays untranslated:** text that leaders or players type (event titles, custom position names, names, notes) is shown as entered. The five standard positions (Construction, Research, Training, Chief Minister, Noble Advisor) are translated automatically when stored in English.

## Homepage

The homepage is short and aimed at two kinds of visitor: members checking their alliance's times, and players from other kingdoms thinking of transferring. Applying for castle positions isn't on it; that lives in the account area.

1. **Hero:** the kingdom's key facts (King, alliances, players, next KvK, server time and age), with buttons to the Transfer and Alliance events sections.
2. **Languages:** a single row with one link per language.
3. **Alliance events:** each alliance's Bear Trap 1 and 2, Swordland, Tri-Alliance, Sanctuary and Vikings times. Times are stored in UTC; visitors can switch to their own time zone, and the weekdays shift with it when a time crosses midnight. Phones show one alliance at a time.
4. **Hall of Fame:** one player from each alliance for the week, with their quote. The latest week up to today is shown.
5. **Transfer to 1465:** a short pitch, kingdom facts, three steps for contacting the kingdom, and the transfer managers. Each manager has a **Message** button (see **Transfer accounts** below) and a button that copies their game ID.
6. **FAQ** and a sign-up box.

Leaders set everything specific in **Admin → Homepage**:

- **Alliance events:** pick an alliance, then set each event's time (UTC), days of the week and an optional short note. Clearing a row removes it from the homepage.
- **Hall of Fame:** pick a week, then type a player and a quote for each alliance. A blank name leaves that alliance out for the week.
- **Transfers:** the pitch, kingdom facts, and which leaders and admins are transfer managers (tick them in the list, with an optional note such as the languages they speak). With the pitch left empty, the site's own pitch is shown, translated into every language; anything leaders type is shown as written.

### Transfer accounts

Players still in another kingdom can sign up at **/transfer** (the homepage's **Message a transfer manager** and **Message** buttons lead there) with their game ID, name, current kingdom and a password. The account is approved straight away and opens in **Messages**:

- they can message only the transfer managers, or a leader who has written to them first;
- they can't apply for castle positions, and the Governors count on the homepage leaves them out;
- leaders see them under **Admin → Accounts → Transfers**, and their messages carry a "Transfer · #1234" tag. Once a player has moved to 1465, **Joined 1465** turns the account into a normal member account.

The database enforces all of this (`0007_homepage_content.sql`), not just the pages.

## How the KvK position flow works

1. **Players sign up** with their game ID, in-game name and a password. New accounts are *pending*.
2. **Leaders approve accounts** in **Admin → Accounts**, after checking the game ID in-game.
3. **Leaders create an event** in **Admin → KvK events**: the Day 1 date, slot length, and one row per day and position (e.g. Day 1 · Construction). The site generates the time slots, which are UTC.
4. **Leaders open applications.** Approved players apply in **Account → Castle appointments** (see **The KvK grid** below): tap a time, pick every slot that works (or "any time"), add speedups and a note.
5. **Leaders review and assign** in the event's workspace (**Admin → KvK events → the event**):
   - tap a day's header to review its applications: Accept, Reject, or Undo a decision;
   - tap a slot to assign it. Accepted players who asked for that time come first (★), then the highest speedups;
   - press **Auto-fill** for one day, or **Auto-fill all days**. The highest speedups get their earliest free preferred slot, "any time" players fill the gaps, and the report names anyone who couldn't be placed;
   - lock a slot to protect it from auto-fill and changes. A player holding a locked slot can't be rejected until it's unlocked.
6. **Leaders publish.** The schedule appears on **/positions** and updates live for everyone viewing it. Signed-in players see their own slot ringed in gold there and under **Account → Castle appointments**.

Each event moves through four stages: Draft → Applications open → Applications closed → Published. Leaders can move it back to an earlier stage at any time.

### The KvK grid

Players, leaders and the public schedule all share one layout: a grid with a column for each day and position and a row for each UTC slot. The current time is highlighted while the event runs. Tapping a cell or a column header opens a side panel (a bottom sheet on phones), and the browser's back button closes it. On phones the grid shows one column at a time; the strip of chips above it switches between them.

- **Players:** amber cells are pending times, green accepted, red rejected. A pending or rejected application can be changed or withdrawn; changing a rejected one re-applies, sending it back to leaders as pending. Accepted applications are locked.
- **Leaders:** each cell shows who holds the slot, or how many applicants want it (the deeper the red, the more demand). Column headers count the applications still to review and the slots filled. Everything updates live, so several leaders can work at once.
- **Links:** `?day=…&slot=…` in the address opens that panel directly. Old **Assign slots** links (`/admin/days/…`) redirect to the workspace with that day open.

## Player account

Signed-in players have four sections under **Account**:

- **Overview:** account status and a card for each section.
- **Castle appointments:** the KvK grid. Apply for open positions, follow each application's status, and see your slot once it's published.
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
  - players can change or withdraw only their own pending or rejected applications, and can't accept their own;
  - only leaders can assign slots;
  - only admins can grant roles;
  - nothing is public until it's published.
- Every leader action is written to `audit_log`.
- Logins use the game ID with a site-specific password. Players should never reuse their game account password.

## Deploy (Vercel)

1. Push the repo to GitHub and import it in Vercel.
2. Add the three environment variables from `.env.local` to the Vercel project.
3. Deploy.
