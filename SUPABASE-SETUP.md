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

**Site URL is where Google sign-in returns people.** If it is blank or pointing
somewhere else, finishing Google sign-in lands on Supabase's default page
instead of AtlasQuest — the game then looks like sign-in silently failed.

## 4. Google sign-in (optional but recommended)

Supabase Dashboard → **Authentication → Providers → Google** → enable, and paste a Google
OAuth client ID/secret (create free at [console.cloud.google.com](https://console.cloud.google.com/apis/credentials)
→ OAuth client ID → Web application → authorized redirect URI:
`https://<your-project-ref>.supabase.co/auth/v1/callback`).

## 5. Email is not used

The game sends **no email at all**. Sign-in is Google-only, so the *Confirm
signup* and *Magic Link* templates never fire and no SMTP configuration is
needed — the built-in mailer can stay exactly as it is.

Turning **Confirm email** off or on makes no difference to the game. If email
sign-in is ever brought back, the templates in [`email/README.md`](email/README.md)
already exist and only need pasting.

## What players get

- **Sign in with Google** (or play as a guest, no account at all) — one tap in the drawer
- **Progress everywhere**: XP, level, streaks and stats sync to their account and come back
  when they sign in on any device
- **World leaderboard**: top 50 explorers by XP, updating live as people play
- **Match history**: last 10 games per player, auto-pruned so the database never grows

Memory use stays tiny: the leaderboard reads one small table, and history is capped at
10 rows per player by a database trigger.
