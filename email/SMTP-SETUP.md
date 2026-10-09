# Custom SMTP setup — AtlasQuest

Supabase's built-in email service only sends to a handful of staff addresses per
hour. Turning on custom SMTP lifts that restriction, so real players can
actually receive sign-in codes.

Recommended provider: **Resend** (3,000 emails/month, 100/day free — plenty for
a side project).

## Before you start: you need your own domain

This is the part that blocks most people. You **cannot** send from
`abdulcoder18.github.io`. That domain belongs to GitHub — you don't control its
DNS, and email providers require verifiable SPF/DKIM records on whatever domain
you send from. Gmail ignores or rejects such mail.

So: buy one cheap domain (Cloudflare Registrar and Namecheap both sell `.app` /
`.dev` for roughly $10/yr), point it wherever you like, and use a subdomain for
mail — e.g. `atlasquest.app` with mail going out from `no-reply@atlasquest.app`.

If you do not want to buy a domain yet, skip to [Option B](#option-b-gmail-no-domain).

---

## Option A: Resend (recommended)

### 1. Create the Resend account and verify your domain

1. Sign up at [resend.com](https://resend.com).
2. **Domains → Add Domain** → enter your mail domain, e.g. `atlasquest.app`.
3. Resend shows three DNS records to add at your registrar (or in Cloudflare DNS):
   - a **TXT** record for SPF
   - a **TXT** (or CNAME) record for DKIM
   - an **MX** record, plus a `send.` subdomain
4. Wait for the status to turn **Verified** — usually under a minute, occasionally
   up to an hour while DNS propagates.

Do not skip this. Unverified sending addresses silently fail.

### 2. Create an API key

**API Keys → Create API Key**, name it `atlasquest-supabase`, permission
**Sending access**.

Copy it — it looks like `re_xxxxxxxxxxxxxxxx`. It is shown once.

> This key goes **only** into the Supabase dashboard. Never into a file in this
> repo, never into a commit. `.gitignore` already blocks `*.key` and `.env`.

### 3. Fill in the Supabase SMTP form

Supabase Dashboard → **Authentication → Emails → SMTP**, enable
**Enable custom SMTP**, then:

| Field | Value |
|---|---|
| Enable custom SMTP | **on** |
| Sender email address | `no-reply@atlasquest.app` (must be on the verified domain) |
| Sender name | `AtlasQuest` |
| Host | `smtp.resend.com` |
| Port number | `465` |
| Minimum interval per user | `60` (seconds — leave as is) |
| Username | `resend` |
| Password | your `re_...` API key |

Save. The red "required" borders in the screenshot clear once the sender address
and host are filled in.

### 4. Check the rate limits

Supabase → **Authentication → Rate Limits**. With custom SMTP the
built-in mailer's tight quota no longer applies the same way, but the caps stay
and are worth reviewing — keep the defaults unless you expect abuse, and for a
public game consider a lower global cap to stop someone burning your quota.

---

## Option B: Gmail (no domain needed)

Works today with no purchase, but expect ~500/day, spam-folder risk, and "via
gmail" on the sender.

1. Turn on 2-Step Verification on the Gmail account, then create an
   **App Password** at <https://myaccount.google.com/apppasswords>.
2. Supabase → **Authentication → Emails → SMTP**:

| Field | Value |
|---|---|
| Sender email address | your Gmail address |
| Sender name | `AtlasQuest` |
| Host | `smtp.gmail.com` |
| Port number | `587` |
| Username | your full Gmail address |
| Password | the 16-character app password (no spaces) |

The confirmation email will land in the **spam folder** on the first send — mark
it not-spam or it keeps going there.

---

## After SMTP works

Two things still need doing, and neither is code:

1. **Paste the email templates.** Supabase → **Authentication → Emails →
   Templates**. With custom SMTP the mails send from your domain, but the body
   is still Supabase's default until you paste. See [`README.md`](README.md) for
   both templates.

2. **Set the Site URL.** Supabase → **Authentication → URL Configuration** →
   **Site URL** = `https://abdulcoder18.github.io/AtlasQuest`. Without this,
   clicking the link in an email lands on Supabase's default page instead of
   AtlasQuest.

## Quick diagnosis

| Symptom | Likely cause |
|---|---|
| Sender address rejected in the form | domain not verified in Resend yet |
| Nothing arrives at all | check the Supabase Auth logs, then Resend's email log |
| Lands in spam | DNS records not added yet, or not verified |
| Link goes to the wrong site | **Site URL** not set |
| "Error sending magic link" | wrong port, or API key is not `Sending access` |
| Works in preview, fails for users | still on built-in SMTP (check the toggle is on) |