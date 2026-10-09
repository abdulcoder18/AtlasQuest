# Supabase email templates — AtlasQuest

> ⚠️ **Currently unused.** AtlasQuest no longer sends any email. Sign-in is
> Google-only, so the *Confirm signup* and *Magic Link* templates below are
> never sent. They are kept in case email sign-in is ever brought back —
> delete this whole folder if not.

## Just this, to customise the email

No SMTP setup, no domain, no provider. The built-in Supabase mailer renders
whatever you paste, exactly as before — only the design changes.

1. **Authentication → Emails → Templates → Confirm signup**
   Paste all of `email/supabase-confirm-signup.html`.
   Subject: `Confirm your AtlasQuest account`
2. **Authentication → Emails → Templates → Magic Link**
   Paste all of `email/supabase-magic-link.html`.
   Subject: `Sign in to AtlasQuest`
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

There are also **no HTML comments** in them. Supabase's template editor mangles
multi-line comments and leaks them as visible garbage text in the preview, so
keep the instructions in this file rather than inside the markup.

Copy the **whole file** — there is nothing to trim.

### What the dashboard preview will and won't show

| In the preview | Meaning |
|---|---|
| Two copies side by side | Normal. Supabase shows desktop **and** mobile widths. |
| Broken image icons | The preview blocks remote images. The logo URL is fine. |
| Literal `{{ .Email }}` | The preview does not substitute variables. |
| Everything else | Accurate. |

Variables and images only resolve on a real send. Test by triggering the actual
flow on the live site.

## Which template, if you ever turn it back on

Sign-in by link (no code, no password): the player enters their address, clicks
the link in their inbox, and lands back on the site already signed in. One call
covers both cases — Supabase registers the address if it is new, otherwise it
just sends a sign-in link.

| Address | Email sent | Template |
|---|---|---|
| new | **Confirm signup** link — this also verifies the address | `supabase-confirm-signup.html` |
| already registered | **Magic Link** sign-in | `supabase-magic-link.html` |

So **style both** — otherwise half your players see an unstyled email.

> If reinstated, **"Confirm email" must be ON**. The confirmation link is what
> verifies a new address; with it off, a new player's verification email never
> arrives.
>
> There is deliberately **no password anywhere**, and no `signUp` call —
> Supabase rejects creating an account without one (`Signup requires a valid
> password`). Everything goes through the passwordless magic-link path.

## Files

| Path | What it is |
|---|---|
| `email/supabase-confirm-signup.html` | confirmation link for new addresses. Fragment, paste this. |
| `email/supabase-magic-link.html` | sign-in link for returning players. Fragment, paste this. |
| `email/preview.html` | the magic-link fragment wrapped in a document, for local viewing only |
| `email/preview-confirm-signup.html` | same for the confirmation |
| `assets/email/atlasquest-mascot.png` | 160×160 logo, 25 KB (downscaled from `assets/gen/mascot-web.png`) |

## Apply them

## Applying them (only if you turn email back on)

For **each** template:
   Supabase Dashboard → **Authentication → Emails → Templates** → pick the
   template → paste the matching file into the body, then set its subject.

| Template | Subject to use |
|---|---|
| Confirm signup | `Confirm your AtlasQuest account` |
| Magic Link | `Sign in to AtlasQuest` |

### "Confirm email" would need to be ON

**Authentication → Email → Confirm email**. It is what sends the confirmation
link that verifies a brand-new address; with it off, new players would never
receive a verification email.

Because the flow is link-based, the game would ask for nothing else — no password,
no code to type. One click in the inbox finishes it.

### Sender name

**Authentication → Emails → SMTP** shows the sender. Supabase's built-in SMTP only
sends from a fixed address, so for a branded sender like
`AtlasQuest <no-reply@yourdomain.com>` you need your own SMTP provider (Resend,
Postmark, etc.).

## Variables used

| Variable | Where | Notes |
|---|---|---|
| `{{ .Email }}` | "Hello …!" greeting | the address they typed |
| `{{ .ConfirmationURL }}` | CTA button, footer link | the link that signs them in |
| `{{ .SiteUrl }}` | footer link | set in **URL Configuration** |
| `{{ .RedirectTo }}` | footer Unsubscribe | falls back to Site URL |

`{{ .Token }}` is unused by the game now, but the magic-link template still
tolerates it if you want to reinstate a code later.

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
- The button is a real link styled as a button, so it still works when images
  are blocked or the whole email renders as plain text.
- A hidden preheader line sets the inbox preview text.
- Sized for a 320px phone: 28px side padding and a 30px headline.

## Testing

⚠️ The game sends no email today, so there is nothing to test end-to-end. If
you re-enable email sign-in, note that Supabase's built-in mailer is for
testing only: it sends from `noreply@mail.app.supabase.io` and is capped by the
**Rate limit for sending emails** figure in **Authentication → Rate Limits**
(30 emails/hour by default). There is no allow-list on that page — it only
holds numbers.

- If sends start failing with `Error sending confirmation email` after a burst
  of testing, you have simply used the hourly quota. Check the **Emails** page
  under *Notifications* in the sidebar for the actual send log, wait for the
  hour to roll over, or raise that number and press **Save changes**.
- To email addresses outside your organisation at all, you need custom SMTP.
  See [`SMTP-SETUP.md`](SMTP-SETUP.md).

Rendered output, if you ever send one, appears under **Logs → Auth → Emails**.

If an email still looks unstyled, check you edited the template the message
actually came from — the confirmation email comes from the *Confirm signup*
template, not *Magic Link*.

If the code arrives but the link 404s, check **URL Configuration → Redirect URLs**
includes your Pages origin (see `SUPABASE-SETUP.md`).

## Why SMTP exists

Nothing above requires it. It only matters once you want *real players*, not
just yourself, to receive sign-in links — the built-in mailer is capped at 30
emails per hour.

Sending branded mail from `abdulcoder18.github.io` is impossible (GitHub owns
that DNS), so this needs a domain you own plus a provider such as Resend.
See [`SMTP-SETUP.md`](SMTP-SETUP.md). Until then, keep **Enable custom SMTP**
switched off.