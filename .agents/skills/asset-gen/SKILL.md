---
name: asset-gen
description: Generate AI game assets, posters, banners, buttons and illustrations for AtlasQuest via the GMI Cloud image API (hy-image-v3.5-preview). Use when the user asks to generate, create, or make any image asset, art, poster, banner, button, icon or illustration for the game.
---

# Asset Gen — GMI Cloud image generation

Generate images with GMI Cloud's hosted image models (default: `hy-image-v3.5-preview`,
a HunyuanImage 3.5 preview) through their async request-queue API.

## Setup (one time)

The API key is read from (first match wins): `--key` argument → `GMI_API_KEY` env var → `gmi.key` file in the project root.
Get a key at https://console.gmicloud.ai (API Keys section). Never commit `gmi.key`.

If the key is missing, `node scripts/gmi-image.mjs` prints setup instructions — relay them to the user.

## How to generate

Run from the project root:

```bash
node scripts/gmi-image.mjs --prompt "PROMPT" --out assets/gen/NAME.png --size 1024x1024
```

- `--size` examples: `1024x1024` (icons/buttons), `1024x1536` (poster), `1920x1080` (banner/hero), `512x512` (small buttons)
- `--model` overrides the model if the user names a different one
- `--from scripts/asset-jobs.json` runs a batch (see `scripts/asset-jobs.example.json`)
- `--payload '{"n":2}'` passes extra API fields through
- Generation is async; the script submits, polls every 3s, downloads the PNG automatically. Typical wait 20-90s.

## House style (IMPORTANT — keep AtlasQuest coherent)

AtlasQuest is a retro-2D nature manga: sage paper (#ECEFDF), deep pine ink (#22301F),
leaf green (#58A93C), autumn orange-red (#D95D39) for warnings, chunky rounded shapes,
hand-drawn pen doodles, Lilita One display type. ALWAYS weave these into prompts, e.g.:

- Asset (icon/button): `"... flat vector illustration, thick rounded dark-green outline (color #22301F), sage-cream background (#ECEFDF), leaf-green (#58A93C) accents, retro 2D game asset style, centered, clean edges"`
- Poster/banner: `"... retro travel-manga poster, sage paper texture, deep pine ink linework, leaf-green and warm orange-red accents, bold rounded title lettering, hand-drawn doodle margins"`

For buttons/UI elements ask for the art centered on a flat background matching `#ECEFDF` (the model does not output transparency); crop or key it out later if needed.

## Workflow

1. Ask (or infer) what the asset is for: icon / button / poster / banner / illustration.
2. Pick a size that matches the use.
3. Compose the prompt with the house style above + the subject. Show the user the prompt first if it's for anything user-facing.
4. Run the CLI, then confirm the saved file path to the user. If generation fails with 401, the key is missing/invalid — print the setup instructions. If it times out, retry once (`--wait 300`).
5. Assets live in `assets/gen/`. To ship one into the game UI, add it under `assets/` and reference it in CSS/JS (the game serves everything under the project root).
