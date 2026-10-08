# Supabase email template — AtlasQuest

The sign-in email players receive is Supabase's **Magic Link** template (the game
calls `signInWithOtp`, so the email carries a 6-digit code, not just a link).

Everything here is dashboard-side. Supabase does not expose email templates to SQL
or to the client SDK, so there is no code change to make — this file is the HTML you
paste in.

## Files

| Path | What it is |
|---|---|
| `email/supabase-magic-link.html` | the template to paste |
| `assets/email/atlasquest-mascot.png` | 160×160 logo, 25 KB (downscaled from `assets/gen/mascot-web.png`) |

## Apply it

1. Supabase Dashboard → **Authentication → Emails → Templates → Magic Link**
2. Paste the entire contents of `email/supabase-magic-link.html` into the body.
3. Set the subject to:
   ```
   Your AtlasQuest code: {{ .Token }}
   ```

### Optional: turn off the duplicate confirmation email

Under **Authentication → Email → Confirm email**, leave this **off**. The game
verifies the address with the code itself (`verifyOtp`), so enabling it makes new
players receive two emails for one sign-up.

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

Supabase's built-in SMTP is rate-limited to a handful of staff addresses per hour.
Add yours under **Authentication → Email → Email Rate Limits**, then use
**Logs → Auth → Emails** to see the rendered output, or just run the flow on the
live site: drawer's account row → *Save progress online*.

If the code arrives but the link 404s, check **URL Configuration → Redirect URLs**
includes your Pages origin (see `SUPABASE-SETUP.md`).