# Supabase email templates — AtlasQuest

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
`verifyOtp`, so the confirmation click is redundant. See the second screenshot
problem in Testing below.

## Files

| Path | What it is |
|---|---|
| `email/supabase-magic-link.html` | sign-in code email — **always sent** |
| `email/supabase-confirm-signup.html` | address confirmation — only if Confirm email is ON |
| `email/preview.html` | local render of the magic link, sample values |
| `email/preview-confirm-signup.html` | local render of the confirmation |
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

Built to survive real inboxes, not just look right in a preview:

- Tables + inline CSS only; no external stylesheet, no web fonts, no JS.
- `color-scheme` / `supported-color-schemes` declared so Apple Mail and Outlook.com
  do not force-invert the dark background.
- The logo is a light rounded tile on purpose. The mascot artwork is drawn on the
  app's light sage background and has no transparent border, so on the dark canvas
  it reads as a badge — same position and weight as the Steam mark.
- 25 KB image, one request, no tracking pixels.
- The code is duplicated as text in the subject and in the body, so the most useful
  thing is readable with images blocked.

## Testing

Supabase's built-in SMTP is rate-limited to a handful of staff addresses per hour,
and that limit also blocks real players from signing up. Configure a proper
provider first — see [`SMTP-SETUP.md`](SMTP-SETUP.md).

Then add your own address under **Authentication → Email → Email Rate Limits**, and
use **Logs → Auth → Emails** to see the rendered output, or just run the flow on
the live site: drawer's account row → *Save progress online*.

If an email still looks unstyled, check you edited the template the message
actually came from — the confirmation email comes from the *Confirm signup*
template, not *Magic Link*.

If the code arrives but the link 404s, check **URL Configuration → Redirect URLs**
includes your Pages origin (see `SUPABASE-SETUP.md`).