# AtlasQuest — "INK & PAPER" Manga Edition
### Design specification v1.0 — retro 2D black-and-white manga style

Reference DNA (from the supplied frames and images):
1. **VOYAGER "Explore the Space"** (preferred) — paper page inside a black rounded frame, giant
   organic ink blobs filled with stars, hand-inked manga spot illustrations, ultra-bold condensed
   display type with a hard offset shadow, tiny mono uppercase nav.
2. **Crypko** — warm cream paper, thick ink borders, one loud yellow accent, rotating circular
   badge stamp, white cards with hard borders.
3. **Samurai vs Godzilla poster** — screentone halftone, manga panel grids, speed lines,
   onomatopoeia bursts, strictly disciplined 2-color + accent palette.
4. **PixVision / pixel portfolio** — stat chips, monochrome squares, clean little UI labels.

---

## 1. Concept

The app becomes a **printed expedition manga**: the user is an explorer stamping their way
through a field guide of the world. Every screen is a manga page — paper, ink, screentone —
and the game itself (flags, maps) plays the role of the "printed photographs" pasted onto the page.

- Light theme = **PAPER EDITION** (warm off-white paper, ink).
- Dark theme = **NIGHT EDITION** (near-black paper, bone-white ink). Both stay strictly B/W + accent.
- The quiz flag stays in full color — it is *pasted artwork*, framed like a clipped photo.

## 2. Color tokens — v1.1 NATURE EDITION (user revision)

The palette moved from yellow/ink to a **nature green** system after user feedback:
sage paper, deep pine ink, leaf-green accent. Same structure, warmer world.

| Token | Paper (day) | Night (forest) | Role |
|---|---|---|---|
| `--paper` | `#ECEFDF` sage | `#131A12` forest floor | page background |
| `--paper-2` | `#F8FAF0` | `#1B251A` | raised panels/cards |
| `--paper-3` | `#E0E8D2` | `#243023` | wells, inputs |
| `--ink` | `#22301F` deep pine | `#E5F0DA` sage | text, borders, shadows |
| `--ink-soft` | `#55654E` | `#AFC2A6` | secondary text |
| `--ink-faint` | `#8B9883` | `#75856E` | meta text |
| `--accent` | `#58A93C` leaf (day) | `#7CC961` leaf (night) | CTAs, stamps, highlights |
| `--stamp` | `#D95D39` autumn | `#E2794F` | "wrong" stamp, danger only |

Type: display switched from Anton to **Lilita One** (chunky rounded) so it reads retro-2D
cartoon rather than brutalist; all corners rounded (radii 8-22px). Hero shadow is now a green
offset (`4px 4px 0 accent`). Doodles are nature-trail themed: smiling sun, hot-air balloon,
pine cluster, birds, cloud, paper plane (+ telescope, compass, globe, flags elsewhere).

## 3. Type

- **Display: Anton** (bundled woff2) — condensed caps with a hard offset shadow
  (`text-shadow: 4px 4px 0 var(--ink)` on paper / inverse on night). Used for hero, page titles,
  mode card titles, big numbers. Letter-spacing slightly tight, rotation ≤ -1deg on hero only.
- **UI/body: Space Mono** (bundled) — 400/700 + italic. Gives the field-guide, typewriter feel.
  Uppercase + letterspacing `.08em` for labels/badges/nav.

## 4. Page architecture

- `body` = ink black with faint paper grain (SVG noise) → the app lives inside
  **`.paper-frame`**: a rounded (26px) paper sheet with a 3px ink border and a hard
  `10px 10px 0` ink shadow, floating on the black. (The VOYAGER frame.)
- Topbar = paper strip with 3px ink bottom border; brand = ink swirl-stamp + "ATLASQUEST" in Anton;
  nav links in mono caps with ink "stamp" hover (underline block).
- Screens are **manga panels**: `.card` → white paper, 2.5px ink border, hard `6px 6px 0` shadow,
  optional corner "tape" or tab label. Panel headers get screentone strips.
- GeoGuesser stays fullscreen but framed: black surround, the game inside the same rounded frame.

## 5. Signature graphics (all hand-authored inline SVG, no AI)

- **Ink blobs** — 3–5 huge organic black shapes with white star specks, anchored at page corners,
  slow morph animation (`border-radius` keyframes). Used on home + page headers.
- **Spot doodles** (pen-sketch stroke style, 2.5px ink): globe-with-orbit, telescope, hot-air
  balloon, paper plane with dashed loop, pennant flag string, compass rose, magnifier over map,
  mountain ridge, postmark frame. Placed absolutely like printed illustrations.
- **Circular rotating stamp** on home ("ATLASQUEST · EXPEDITION SOCIETY · EST. 2026 ·" on a circle path).
- **Halftone screentone**: `radial-gradient(ink 1px, transparent 1.2px)` 8px grids for panel wells
  and hero backdrop areas.
- **Speed lines**: `repeating-conic-gradient` burst behind the flag photo on reveal and results.
- **Onomatopoeia stamps**: "ドン!" (correct) and "バツ!" (wrong) as tilted Anton/Yellow/Red splash
  badges + English caption ("CORRECT", "WRONG").
- **Postmark** on lore panels: rotated dashed circle with country code + "EXPLORER'S LOG".

## 6. Components

| Component | Treatment |
|---|---|
| Primary button | Yellow paper, 2.5px ink border, hard shadow `4px 4px 0 ink`; hover: translate(-2,-2) + bigger shadow; press: translate(2,2) + shadow 0 |
| Ghost button | Paper, same border/shadow, ink text |
| Choice (quiz) | Paper row, ink border, letter chip in ink square; correct = yellow wash + "CORRECT" stamp; wrong = red stamp |
| Mode card | Manga panel, huge index number "01", doodle icon top-right, Anton title, mono desc; hover lifts panel |
| XP chip | Yellow stamp, ink border, mono |
| Level badge | Circular postmark |
| Inputs | Paper-3 well, 2px ink border, mono text; focus = 3px accent border |
| Modal | Big manga panel, header strip with screentone, hard shadow |
| Toast | Small paper strip, ink border, slides up |
| Empty states | Doodle illustration + mono caption |
| Stats strip | Four ink-bordered boxes with huge Anton numbers |
| Recap grid | Flag thumbnails as taped photo cutouts |
| Maps (GeoGuesser) | Unchanged real maps — they are "the photographs"; HUD = paper chips with ink borders |

## 7. Motion

Keep the existing route/stagger/reveal system; retune curves to feel "printed":
- Panels: rise-in with a tiny rotation settle (0.4deg).
- Stamp hits: scale 1.6→1 with slight rotation (like stamping paper), 220ms.
- Blobs: 18–30s slow morph + drift; stars twinkle via opacity.
- Rotating circular badge: 24s linear.
- Confetti becomes ink splatter: ink/paper/yellow/red particles.
- `prefers-reduced-motion` fully honored (existing rule kept).

## 8. Implementation map

1. `assets/fonts/` — Anton + Space Mono (done, OFL licensed).
2. `css/styles.css` — full token + component rewrite (single file, both themes).
3. `js/manga-art.js` — new: SVG blob/screentone/doodle/stamp library.
4. `index.html` — paper-frame wrapper, fonts preload.
5. `js/main.js` — hero rebuild (blobs, doodles, circular stamp, index-numbered panels).
6. Views — class-level adjustments only (most work lives in CSS): quiz stamps, geo HUD chips,
   lore postmarks, social paper components.
7. Confetti palette swap in `ui.js`.
