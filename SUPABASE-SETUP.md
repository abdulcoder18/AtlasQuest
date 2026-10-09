# Supabase setup — global leaderboard + cloud accounts

Takes ~5 minutes. Everything else is already built.

## 1. Create the tables

Open your Supabase project → **SQL Editor** → New query → paste the entire contents of
[`sql/schema.sql`](sql/schema.sql) → **Run**. This creates the `profiles` and `match_results`
tables with security rules, auto-created profiles on signup, and auto-pruning of old match
history (only the last 10 games per player are kept — the database stays tiny).

## 2. Connect the game

Supabase Dashboard → **Project Settings → API**. Copy two values into
`js/supabase-config.js`:

```js
export const SUPABASE_URL = "https://xxxxx.supabase.co";
export const SUPABASE_ANON_KEY = "eyJ...";   // the anon/public key
```

The anon key is designed to be public — database access is controlled by the row-security
rules from step 1. Then commit + push.

## 3. URL Configuration — do this or email links break

Supabase → **Authentication → URL Configuration**

| Field | Value |
|---|---|
| **Site URL** | `https://abdulcoder18.github.io/AtlasQuest` |
| **Redirect URLs** | `https://abdulcoder18.github.io/AtlasQuest` and `http://localhost:5173` |

**Site URL is where email links send people.** If it is left blank or pointing
somewhere else, clicking "Confirm email address" (or the sign-in button in the
email) lands on Supabase's default page instead of AtlasQuest. This is the
single most common reason email links seem to go nowhere.

## 4. Google sign-in (optional but recommended)

Supabase Dashboard → **Authentication → Providers → Google** → enable, and paste a Google
OAuth client ID/secret (create free at [console.cloud.google.com](https://console.cloud.google.com/apis/credentials)
→ OAuth client ID → Web application → authorized redirect URI:
`https://<your-project-ref>.supabase.co/auth/v1/callback`).

## 5. Email codes

The **Email** provider is on by default — the game uses Supabase's built-in
"sign in with email OTP", which emails a 6-digit code. No SMTP setup needed.

### Turn OFF "Confirm email"

**Authentication → Email → Confirm email** → leave this **off**. The game verifies
the address with the code itself, so leaving it on makes new players receive two
emails for one sign-up.

### Set up SMTP so real players get email

The built-in Supabase mailer only sends to a few staff addresses per hour. To
send to actual players, configure a provider — see
[`email/SMTP-SETUP.md`](email/SMTP-SETUP.md) for the exact fields
(Resend is free and recommended).

Note you cannot send from `abdulcoder18.github.io`; a branded sender needs a
domain you own.

### Brand the emails

Both templates are plain Supabase defaults until you paste your own. See
[`email/README.md`](email/README.md) — there are two templates and which one gets
sent depends on the Confirm email setting above.

## What players get

- **Sign in with Google** or **email + 6-digit code** (no password) — one tap in the drawer
- **Progress everywhere**: XP, level, streaks and stats sync to their account and come back
  when they sign in on any device
- **World leaderboard**: top 50 explorers by XP, updating live as people play
- **Match history**: last 10 games per player, auto-pruned so the database never grows

Memory use stays tiny: the leaderboard reads one small table, and history is capped at
10 rows per player by a database trigger.
