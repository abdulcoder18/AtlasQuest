# Supabase email templates — AtlasQuest

## Just this, to customise the email

No SMTP setup, no domain, no provider. The built-in Supabase mailer renders
whatever you paste, exactly as before — only the design changes.

1. **Authentication → Emails → Templates → Confirm signup**
   Paste all of `email/supabase-confirm-signup.html`.
   Subject: `Confirm your AtlasQuest account`
2. **Authentication → Emails → Templates → Magic Link**
   Paste all of `email/supabase-magic-link.html`.
   Subject: `Your AtlasQuest code: {{ .Token }}`
3. **Authentication → URL Configuration → Site URL**
   Set it to `https://abdulcoder18.github.io/AtlasQuest`.

That is the whole job. Ignore [SMTP-SETUP.md](SMTP-SETUP.md) unless you later
want to email *real* players — see [Why SMTP exists](#why-smtp-exists) below.

## The templates are FRAGMENTS, not full pages

The Supabase editor takes an HTML **fragment** — it wraps your body in its own
`<html>`/`<head>`/`<body>`. The default template it shows you is just:

```html
<h2>Confirm Your AtlasQuest Account</h2>
<p>Follow the link below to confirm this email address and finish signing up.</p>
<p><a href="{{ .ConfirmationURL }}">Confirm Your AtlasQuest Account</a></p>
```

So paste exactly what is in our files — no `<!DOCTYPE>`, `<html>`, `<head>` or
`<body>`, and no `<style>` block, since mail clients strip those. All styling in
our templates is **inline**, which is the only kind every client honours.

The `preview*.html` files add the missing wrapper locally so you can view them
in a browser. Never paste those.

## There are TWO templates, and which one arrives depends on a setting

The game calls `signInWithOtp`, so sign-in uses a 6-digit code — but a new
account can still receive **two** emails, because Supabase's *Confirm signup*
step is separate and is on by default.

| Setting | Emails a new player gets | Template to style |
|---|---|---|
| **Confirm email: OFF** | one — the sign-in code | `supabase-magic-link.html` |
| **Confirm email: ON** | two — confirmation link *and* the code | both files |

If you keep **Confirm email ON**, you must paste **both** templates or the
second email still arrives looking like Supabase. If you turn it **OFF**, only
the Magic Link one is ever sent.

Turning it off is the simpler setup: the game already verifies the address with
`verifyOtp`, so the confirmation click is redundant.

## Files

| Path | What it is |
|---|---|
| `email/supabase-magic-link.html` | sign-in code email — **always sent**. Fragment, paste this. |
| `email/supabase-confirm-signup.html` | address confirmation — only if Confirm email is ON. Fragment, paste this. |
| `email/preview.html` | the magic-link fragment wrapped in a document, for local viewing only |
| `email/preview-confirm-signup.html` | same for the confirmation |
| `assets/email/atlasquest-mascot.png` | 160×160 logo, 25 KB (downscaled from `assets/gen/mascot-web.png`) |

## Apply them

For **each** template you need:
   Supabase Dashboard → **Authentication → Emails → Templates** → pick the
   template → paste the matching file into the body, then set its subject.

| Template | Subject to use |
|---|---|
| Magic Link | `Your AtlasQuest code: {{ .Token }}` |
| Confirm signup | `Confirm your AtlasQuest account` |

### Turning off the duplicate email (recommended)

**Authentication → Email → Confirm email** → leave this **off**. The game
verifies the address with the code itself (`verifyOtp`), so leaving it on makes
new players receive two emails for one sign-up.

### Sender name

**Authentication → Emails → SMTP** shows the sender. Supabase's built-in SMTP only
sends from a fixed address, so for a branded sender like
`AtlasQuest <no-reply@yourdomain.com>` you need your own SMTP provider (Resend,
Postmark, etc.).

## Variables used

| Variable | Where | Notes |
|---|---|---|
| `{{ .Token }}` | subject, big code block | the 6-digit code |
| `{{ .Email }}` | "Hello …!" greeting | the address they typed |
| `{{ .ConfirmationURL }}` | CTA button, footer link | signs in on this device |
| `{{ .SiteUrl }}` | footer link | set in **URL Configuration** |
| `{{ .RedirectTo }}` | footer Unsubscribe | falls back to Site URL |

## If you fork the repo

The logo URL is absolute, because most email clients strip relative paths:

```
https://abdulcoder18.github.io/AtlasQuest/assets/email/atlasquest-mascot.png
```

Replace `abdulcoder18` with your own GitHub Pages origin, or drop your own file at
`assets/email/` and update both `src` attributes.

## Notes on the design

Built for real inboxes, not just a dashboard preview:

- Tables + **inline** CSS only — no `<style>` block, no web fonts, no JS, no
  flex/grid. That is the only combination Outlook, Gmail and Apple Mail all
  honour.
- Dark fills use both `bgcolor="…"` attributes and inline `background-color`,
  since Outlook ignores one or the other depending on version.
- The logo is a light rounded tile on purpose. The mascot artwork is drawn on
  the app's light sage background and has no transparent border, so on the dark
  canvas it reads as a badge — same position and weight as the Steam mark.
- 25 KB image, one request, no tracking pixels.
- The code is duplicated as text in the subject and in the body, so the most
  useful thing stays readable with images blocked.
- A hidden preheader line sets the inbox preview text.

## Testing

The built-in Supabase mailer only sends to staff addresses. Add yours under
**Authentication → Email → Email Rate Limits**, then run the flow on the live
site: drawer's account row → *Save progress online*. Rendered output is under
**Logs → Auth → Emails**.

If an email still looks unstyled, check you edited the template the message
actually came from — the confirmation email comes from the *Confirm signup*
template, not *Magic Link*.

If the code arrives but the link 404s, check **URL Configuration → Redirect URLs**
includes your Pages origin (see `SUPABASE-SETUP.md`).

## Why SMTP exists

Nothing above requires it. It only matters once you want *real players*, not
just yourself, to receive sign-in codes — the built-in mailer is capped at a
few staff addresses per hour.

Sending branded mail from `abdulcoder18.github.io` is impossible (GitHub owns
that DNS), so this needs a domain you own plus a provider such as Resend.
See [`SMTP-SETUP.md`](SMTP-SETUP.md). Until then, keep **Enable custom SMTP**
switched off.