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

## 5. Email sign-in links

The **Email** provider is on by default, and no SMTP setup is needed to use it.
Players type their address, click a link in their inbox, and land back on the
site already signed in.

| Situation | Email they get |
|---|---|
| address we have not seen | **Confirm signup** link — this also verifies the address |
| address already registered | **Magic Link** sign-in link |

### Keep "Confirm email" ON

**Authentication → Email → Confirm email** → leave this **on**. It is what sends
the confirmation link that verifies a new address. With it off, first-time
players never receive a verification email.

Because the flow is link-based, a signup sends exactly **one** email, not two.

### Brand the emails

Both templates are plain Supabase defaults until you paste your own. See
[`email/README.md`](email/README.md) — style both, or half your players see an
unstyled email. The built-in mailer renders your pasted template as-is.

*(Later, if you want to email real players rather than just yourself, the
built-in mailer is capped at 30 emails/hour — see
[`email/SMTP-SETUP.md`](email/SMTP-SETUP.md). Optional.)*

## What players get

- **Sign in with Google** or **an emailed link** (no password, no code to type) — one tap in the drawer
- **Progress everywhere**: XP, level, streaks and stats sync to their account and come back
  when they sign in on any device
- **World leaderboard**: top 50 explorers by XP, updating live as people play
- **Match history**: last 10 games per player, auto-pruned so the database never grows

Memory use stays tiny: the leaderboard reads one small table, and history is capped at
10 rows per player by a database trigger.
