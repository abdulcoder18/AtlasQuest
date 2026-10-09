# AtlasQuest — working notes for AI agents

## Git

Commit and push to `origin main` **without asking**, once a change is verified.
Do not push broken work — run whatever checks exist first.

- Never commit secrets. `gmi.key`, `*.key` and `.env` are gitignored; keep it
  that way. The Supabase anon key in `js/supabase-config.js` is intentionally
  public and is safe to commit.
- Check `git diff` for keys/tokens before staging.
- Commit messages: what changed and why, in the imperative. No "fixed bugs".

## Verifying changes

There is no test runner and no build step — it's a static ES-module site.
Verify with `node --check <file>` for syntax, and by exercising modules under a
hand-rolled DOM shim when behaviour needs proving (see below).

Modules import each other by relative path with no bundler, so a missing or
renamed export only fails at runtime in the browser. When adding or renaming an
export, grep the importing modules.

## Gotchas found the hard way

- `js/games/versus.js` uses `PeerJS` for live matches. Host is the authority.
- Versus questions are seeded, so host and guest build identical question sets
  locally — never ship the answer key over the wire.
- Players advance at their own pace; only the match **end** waits. Scoring is
  per-player (`nextExpected`), not against one shared question index.
- `session.finished` means "my run is over"; `session.ended` means the result
  has been published. Do not merge these — it locks the match out of ending.
- Dark mode: theme text colours (`--ink*`) must never be used on the fixed
  white flag plates (`--plate`). Use `--ink-on-white*` there instead.
- Supabase email templates are dashboard-only, but they need no SMTP setup —
  the built-in mailer renders a pasted template as-is. See `email/README.md`;
  there are two templates and which one is sent depends on the Confirm email
  setting. Neither is reachable from code, so never claim a fix landed in the
  app for these — they need dashboard changes.