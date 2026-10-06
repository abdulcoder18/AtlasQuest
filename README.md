# 🌍 AtlasQuest — Ink & Paper Manga Edition

**Explore the world. Learn its lore.** A free, offline-first geography playground dressed as a
retro 2D black-and-white manga: paper pages in an ink frame, halftone screentone, ink blobs full
of stars, hand-drawn expedition doodles, and one loud manga-yellow accent.

Design spec: [`design/MANGA-DESIGN.md`](design/MANGA-DESIGN.md) · previous stylesheet backup: `design/styles-backup-neomorphism.css`

![style](https://img.shields.io/badge/style-ink%20%26%20paper%20manga-black) ![fonts](https://img.shields.io/badge/fonts-Lilita%20One%20%2B%20Space%20Mono-green)

## Games & features

| Mode | What it is |
|---|---|
| 🧭 **GeoGuesser** | Dropped somewhere on Earth — look around and pin the world map. Up to 5,000 pts/round. **Satellite mode works with zero API keys** (Esri World Imagery). Street View mode uses your own Google Maps key. |
| 🚩 **Flag Guesser** | 245 flags. Multiple choice, type-the-name, or reversed (name → flag). Region filters, timers, streak bonuses. |
| 🏛️ **Capital Hunt** | Country → capital and capital → country, MCQ or typing. |
| 🏝️ **Territory Quiz** | 72 dependencies, crown lands, microstates and disputed regions — *who governs them*, flag-to-name, name-to-flag. |
| ⚔️ **Versus (live matches)** | Host a room, share the 4-letter code, and race friends through identical questions in real time — live standings after every answer, final podium. Peer-to-peer via WebRTC (PeerJS), no server needed. Also keeps a "players met" leaderboard (level + XP of everyone you've played with). |
| 🗺️ **Map Master** | A blank world map of 196 countries: name the highlighted nation or find it yourself. 1000 pts per pin, works offline. |
| 📜 **Historical Flags** | Flags of fallen empires and vanished kingdoms, every answer with the story of how they rose and fell. |
| 📖 **The Atlas** | Every nation's famous-for, culture, religion and history — the lore. |
| 👑 **Empires & Kingdoms** | 39 great powers (Rome to the Zulu), with rise → peak → fall → legacy timelines mapped to modern countries. |
| 🎯 **Daily Challenge** | 5 seeded questions a day, same for everyone, with streaks. |
| 👥 **Friends & Challenges** | Add friends by 6-letter code, generate mirrored challenge codes, compare by result codes. XP, levels and career stats included. |

## Run it

```bash
node server.js        # then open http://localhost:5173
```

or just double-click **`Start AtlasQuest.bat`** (Windows).

No build step, no npm install, no accounts. Everything runs locally in your browser.

## Street-level photos (built-in, zero setup)

Street Photos mode uses **Mapillary** (open street-level imagery) and works out of the box —
no account, no keys, nothing to configure. The access token ships obfuscated inside the app
(3 layers: XOR → reversed Base64 → hex; see `js/secure-tokens.js`).

> Security note: client-side obfuscation is not true encryption — the app must decode the token
> at runtime, so a determined user could recover it. Rotate anytime:
> `node scripts/encode-token.cjs "MLY|your-new-token"`.

Photos are densest in Europe and North America; spots without coverage are skipped automatically.

## GeoGuesser view modes

- **Satellite** — Esri World Imagery, no keys, global coverage.
- **Street photos 360** — Mapillary, built-in token, real street-level panoramas.

## AI asset generation (GMI Cloud)

Generate posters, banners, buttons and illustrations with GMI Cloud's image models
(default `hy-image-v3.5-preview`) via the `/asset-gen` skill or directly:

```bash
node scripts/gmi-image.mjs --prompt "retro 2D game icon of a smiling compass ..." --out assets/gen/compass.png --size 512x512
node scripts/gmi-image.mjs --from scripts/asset-jobs.example.json   # 5 ready-made assets
```

Setup: get an API key at console.gmicloud.ai → API Keys, then either
`setx GMI_API_KEY "your-key"` or write it to a `gmi.key` file in the project root.
Prompts follow the game's nature-manga house style (see `.agents/skills/asset-gen/SKILL.md`).

## Data & assets (all local)

- Countries & geography: [mledoze/countries](https://github.com/mledoze/countries) (ODbL) + World Bank population
- Flags: [FlagCDN](https://flagpedia.net) SVGs, downloaded to `assets/flags/`
- Locations: [GeoNames](https://www.geonames.org/) cities ≥ 50k (CC-BY), in `data/cities.json`
- Historical flags: Wikimedia Commons (loaded via Special:FilePath)
- Lore, religions, territories, empires: curated in `data/`

## Project structure

```
index.html          app shell
css/styles.css      dark/light theme system
js/
  main.js           router + home
  store.js          profile, XP, friends (localStorage)
  data.js           datasets + quiz question generators
  ui.js             DOM kit, toasts, confetti, sounds
  games/quiz.js     shared quiz engine
  games/quizgames.js  flag/capital/territory/history setups
  games/geoguesser.js GeoGuesser (Leaflet + optional Google SV)
  lore.js           Atlas + Empires
  social.js         profile, friends, settings
server.js           zero-dependency static server
scripts/            data fetch utilities
```

Progress (XP, stats, friends) lives in your browser's localStorage — clear site data to reset.
