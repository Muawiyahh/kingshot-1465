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
   - `0008_transfer_contacts.sql`
   - `0009_next_kvk.sql`
   - `0010_notifications.sql`
   - `0011_appointments.sql`

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
- **Next KvK date** (the homepage's countdown): **Admin → KvK → Next KvK**
- **Alliance event times, Hall of Fame, and the Transfer section** (pitch, kingdom facts, transfer managers): **Admin → Homepage** (see **Homepage** below)
- **Kingdom number and Discord link:** `lib/site.ts`
- **Colours and fonts:** `app/globals.css`, documented in `design-system/MASTER.md`

## Languages

The site is in English, German, Simplified and Traditional Chinese, French, Spanish, Indonesian, Tagalog, Brazilian Portuguese and Korean. Each language has its own address, for example `/de/account/schedule` or `/zh-tw/transfer`.

- **Choosing a language:** visitors get their browser's language automatically. On their first visit a language picker opens, with every language written in its own script, so nobody has to read English to find their language. They can switch later with the language picker at the bottom of every page. Players also pick a language when they sign up, and the site opens in it when they sign in.
- **Editing translations:** each language is one file in `lib/i18n/messages/`, and `en.ts` is the source. Keep every `{placeholder}` exactly as written, but move it wherever the sentence needs it. TypeScript reports any key that's missing or added by mistake.
- **What stays untranslated:** text that leaders or players type (event titles, custom position names, names, notes) is shown as entered. The five standard positions (Construction, Research, Training, Chief Minister, Noble Advisor) are translated automatically when stored in English.

## Homepage

The homepage is short and aimed at two kinds of visitor: members checking their alliance's times, and players from other kingdoms thinking of transferring. Applying for castle positions isn't on it; that lives in the account area.

1. **Hero:** the kingdom's key facts (King, alliances, players, server time and age), with buttons to the Transfer and Alliance events sections. The Next KvK card counts down (days, hours, minutes, seconds) to the date leaders set in **Admin → KvK → Next KvK**; without one it counts down to the next KvK event, and while an event runs it shows the day.
2. **Alliance events:** each alliance's times, in this order: Bear Trap 1 and 2, Swordland (Legion 1 and 2), Tri-Alliance (Legion 1 and 2), Vikings (Day 1 and 2), Sanctuary 1 and 2, and Fortress last, for GGG, KNG, ERA and ALT only (set in `lib/alliance-events.ts`). Each alliance gets a card tinted with its banner colour: one row per event, with its two runs side by side (#1 and #2, Legion 1 and 2, Day 1 and 2) so the times line up. Times saved before the split count as Legion 1 / Day 1. Leaders enter them on a 24-hour UTC clock; they are stored in UTC; visitors can switch to their own time zone, and the weekdays shift with it when a time crosses midnight. Phones show one alliance at a time.
3. **Hall of Fame:** one player from each alliance for the week, with their quote. The latest week up to today is shown.
4. **Transfer to 1465:** a short pitch, the kingdom at a glance (leaders' facts plus live numbers: server age, alliances, governors, King, next KvK), three steps for contacting the kingdom, and the transfer managers as compact rows with a **Message** button (see **Transfer accounts** below) and a tap-to-copy game ID. Past five managers, the rest fold behind **Show all**.
5. **FAQ** and a sign-up box.

Leaders set everything specific in **Admin → Homepage**:

- **Alliance events:** pick an alliance, then set each event's time (UTC), days of the week and an optional short note. Clearing a row removes it from the homepage.
- **Hall of Fame:** pick a week, then type a player and a quote for each alliance. A blank name leaves that alliance out for the week.
- **Transfers:** the pitch, kingdom facts, and which leaders and admins are transfer managers (tick them in the list, with an optional note such as the languages they speak). With the pitch left empty, the site's own pitch is shown, translated into every language; anything leaders type is shown as written.

### Transfer accounts

Players still in another kingdom can sign up at **/transfer** (the homepage's **Message a transfer manager** and **Message** buttons lead there) with their game ID, name, current kingdom and a password. The account is approved straight away and opens in **Messages**:

- they can message only the transfer managers, or a leader who has written to them first. Until leaders pick any transfer managers, they can message every admin instead, so a new transfer account always has someone to talk to;
- they can't apply for castle positions, and the Governors count on the homepage leaves them out;
- leaders see them under **Admin → Accounts → Transfers**, and their messages carry a "Transfer · #1234" tag. Once a player has moved to 1465, **Joined 1465** turns the account into a normal member account.

The database enforces all of this (`0007_homepage_content.sql` and `0008_transfer_contacts.sql`), not just the pages.

## How the KvK position flow works

1. **Players sign up** with their game ID, in-game name and a password. New accounts are *pending*.
2. **Leaders approve accounts** in **Admin → Accounts**, after checking the game ID in-game.
3. **Leaders create an event** in **Admin → KvK events**: the Day 1 date and one row per day and position (e.g. Day 1 · Chief Minister). Every day has 48 appointments of 30 minutes, from 00:00 to 24:00 UTC.
4. **Leaders open applications.** Approved players apply in **Account → Castle appointments** (see **The KvK grid** below): tap a time, pick every slot that works (or "any time"), and add a note. Players can apply for as many positions as they like, including two on the same day (e.g. Chief Minister and Noble Advisor on day 4); the form then mentions the other one. Each position asks for the speedups that matter for it, in days:
   - **Chief Minister:** construction and research speedups;
   - **Noble Advisor:** troop training and general speedups;
   - **any other position:** one total.
5. **Leaders accept players into slots** in the event's workspace (**Admin → KvK events → the event**). Accepting puts the player's name in a time slot straight away, and the player gets a notification with their time:
   - tap a day's header to see its applications, with each kind of speedup. **Accept · 14:00** puts the player in their earliest free picked time (or the earliest free time for "any time"). When none of their times is free, the button reads **Pick a time** and opens their first one;
   - tap a time to see everyone who applied for that day, with every time they asked for. Picking a waiting applicant accepts them into that time (**Accept here**); picking an accepted player moves them there;
   - **same day:** each applicant also shows their other positions on that date: the time they hold (a link to that slot), or all the times they applied for if they haven't been placed yet. Accepting and auto-fill never put a player at a time they already hold in another position that day; picking such a time by hand shows a warning;
   - **Reject** or **Undo** takes the player off the schedule again;
   - **Auto-fill** places accepted players who don't have a time yet, highest speedups first;
   - lock a slot to protect it from auto-fill and changes. A player holding a locked slot can't be rejected until it's unlocked.
6. **Players check the schedule** under **Account → KvK schedule**, whether or not they applied or were accepted. Signed-in members see it, including accounts still waiting for approval; visitors, transfer accounts and rejected accounts can't. The old **/positions** address now leads there.

Each event moves through three stages: Draft (only leaders see it) → Applications open → Applications closed. Accepted players appear on the schedule from the moment applications open, so there's no separate publish step. Leaders can move an event back to an earlier stage at any time. Events published before this change count as closed.

### The KvK grid

Players, leaders and the KvK schedule all share one layout: a grid with a column for each day and position and a row for each UTC slot. It's kept plain: names sit in soft chips, empty times stay blank, and only full hours get a line. The current time is marked while the event runs. Tapping a cell or a column header opens a side panel (a bottom sheet on phones), and the browser's back button closes it. On phones the grid shows one column at a time; the strip of chips above it switches between them.

- **Players:** your own slot is ringed in gold, and times other players hold show their names. Amber cells are your pending times, green accepted, red rejected. A pending or rejected application can be changed or withdrawn; changing a rejected one re-applies, sending it back to leaders as pending. Accepted applications are locked.
- **Your slots:** above the grid on **Castle appointments** and **KvK schedule**, each of your slots has a **Show in table** button that scrolls straight to it (on phones it switches to that day first) and highlights it, so nobody has to scroll through 48 rows.
- **Leaders:** each cell shows who holds the slot, or how many applicants want it (the deeper the red, the more demand). Column headers count the applications still to review and the slots filled. Everything updates live, so several leaders can work at once.
- **Links:** `?day=…&slot=…` in the address opens that panel directly; on **KvK schedule** it jumps to that cell, which is where a notification about your slot takes you. Old **Assign slots** links (`/admin/days/…`) redirect to the workspace with that day open.

## Player account

Signed-in players have five sections under **Account**:

- **Overview:** account status and a card for each section.
- **Castle appointments:** the KvK grid. Apply for open positions, follow each application's status, and see your slot as soon as you're accepted.
- **KvK schedule:** the schedule on its own, read-only: who holds each slot, a search box, and your slots with a jump button. For members, including accounts still waiting for approval (`0011_appointments.sql`).
- **Messages:** a WhatsApp-style chat with the kingdom's leaders and admins. Every approved leader and admin is listed; new messages arrive live, and the header shows a red dot when something is unread.
- **Profile:** change in-game name and alliance. The game ID can't be changed.

Leaders and admins read their messages in the admin panel, in two inboxes: **Admin → Players → Messages** (members and other leaders) and **Transfer messages** (transfer accounts). Their own profile is under **Your account** in the same admin menu (`/admin/profile`, inside the admin panel so the menu stays put), and is the last card on the admin overview. Leaders and admins sign in to the admin overview. They don't apply for castle positions or need the players' pages, so they have no account overview, **Castle appointments** or **KvK schedule**: those addresses take them to the admin overview or **Admin → KvK events**. Messaging rules live in the database (`0004_messages.sql`):

- only the two people in a conversation can read it, and leaders can't read other people's chats;
- players can write only to approved leaders and admins, and rejected accounts can't write at all;
- messages can't be edited or deleted, and each sender is limited to 20 messages a minute.

### Message translation

If `AZURE_TRANSLATOR_KEY` is set, every incoming message gets a **Translate** link under it. The first tap calls [Azure AI Translator](https://azure.microsoft.com/products/ai-services/ai-translator) and saves the result on the message (`0005_message_translations.sql`), so it's translated only once no matter how many times either side opens the chat; a second tap just switches back to the original. Without the key, the link doesn't appear and nothing changes.

A **Free F0** Translator resource covers 2 million characters a month at no cost — far more than a kingdom's chat is likely to use. Regional resources (anything other than "Global") also need `AZURE_TRANSLATOR_REGION` set to the resource's region, lowercased with no spaces (e.g. "Central India" → `centralindia`); a Global resource can leave it empty.

## Notifications

Every signed-in account has a bell in the top bar. The red number counts what's new, and opening the bell marks it all read. Notifications arrive live, and each one links to the page it's about. They're written in the reader's own language.

| Who | When |
| --- | --- |
| The player concerned | their account is approved or not approved; their role changes; their transfer account becomes a member account; a castle application is accepted (with their time) or not accepted; they're moved to another time or taken off the schedule; they are picked for the Hall of Fame (when their account has the same name and alliance) |
| Members | applications open for a KvK event; the next KvK date is set or changed; their own alliance's event times change |
| Every approved account, transfer accounts included | a new Hall of Fame week; a new King |
| Leaders and admins | a new sign-up waiting for approval, or a new transfer account. A sign-up leaves the bell once it has been approved or rejected |

How it behaves:

- **The database writes them**, with triggers in `0010_notifications.sql`, so a change made anywhere (the site or the SQL Editor) notifies people. Nobody can write or edit notifications directly.
- **One per thing:** a later change to the same thing replaces its notification instead of adding another. For example, a rejected application that is later accepted leaves one notification. Undoing a decision removes it, and saving without changes doesn't notify again.
- **Who sees what:** leaders don't get notified about changes they made themselves. New accounts don't see kingdom news from before they signed up. The bell shows the newest 30, and notifications older than six months are deleted.
- **KvK slots:** being accepted into a slot is one notification with the time, and it opens the schedule at that slot. Nothing is sent while an event is still a draft.

## Security

- Row Level Security enforces every rule in the database, not just in the UI:
  - players only see their own profile and applications;
  - only approved players can apply, and only to open events;
  - players can change or withdraw only their own pending or rejected applications, and can't accept their own;
  - only leaders can assign slots;
  - only admins can grant roles;
  - the KvK schedule is for members (approved or waiting for approval) and leaders only, and drafts for leaders only.
- Every leader action is written to `audit_log`.
- Logins use the game ID with a site-specific password. Players should never reuse their game account password.
- **Forgotten passwords:** logins have no real email, so admins reset them in **Admin → Accounts → Reset a password**:
  1. Enter the player's game ID and check that the account shown is the right one.
  2. Reset. A random temporary password (like `K7QM-X4PD-2RHW`) is shown once, to send to the player in-game.
  3. The player signs in with it and must choose a new password at `/new-password` before using the site.

  Details:
  - Only admins can reset passwords, and not their own.
  - The reset signs the player out of other devices within the hour.
  - The audit log records the reset but never the password.
  - It needs `SUPABASE_SERVICE_ROLE_KEY`.

## Deploy (Vercel)

1. Push the repo to GitHub and import it in Vercel.
2. Add the three environment variables from `.env.local` to the Vercel project.
3. Deploy.
