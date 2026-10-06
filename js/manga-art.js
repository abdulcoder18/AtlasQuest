// AtlasQuest — "Ink & Paper" manga art library.
// Hand-drawn SVG doodles, blobs and stamps in pen-sketch style.
// All drawings inherit currentColor (ink) and use the theme's paper color for fills.

const P = (d, extra = "") => `<path d="${d}" ${extra}/>`;

/* pen-sketch globe with orbit ring + stars */
const globe = `<svg viewBox="0 0 200 160" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="92" cy="84" r="46"/>
  <ellipse cx="92" cy="84" rx="46" ry="17"/>
  <ellipse cx="92" cy="84" rx="18" ry="46"/>
  <path d="M56 62c14 10 60 10 72 0M58 108c12-10 58-10 70 0" stroke-width="2.4"/>
  <path d="M150 34c22 26 26 66 4 96" stroke-dasharray="7 8" stroke-width="2.4"/>
  <path d="M172 22l2.4 7 7 2.4-7 2.4-2.4 7-2.4-7-7-2.4 7-2.4z" fill="currentColor" stroke="none"/>
  <path d="M28 138l1.7 5 5 1.7-5 1.7-1.7 5-1.7-5-5-1.7 5-1.7z" fill="currentColor" stroke="none"/>
  <path d="M20 44c8-14 24-22 40-20" stroke-width="2.4" stroke-dasharray="3 7"/>
</svg>`;

/* telescope on tripod */
const telescope = `<svg viewBox="0 0 200 160" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
  <path d="M46 96 128 44l14 22-82 52z"/>
  <path d="M128 44l10-6 14 22-10 6"/>
  <circle cx="141" cy="37" r="3" fill="currentColor" stroke="none"/>
  <path d="M96 96l-8 46M112 90l20 52M120 88l-38 54" stroke-width="2.6"/>
  <path d="M78 150h64" stroke-width="2.6"/>
  <path d="M52 30l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="currentColor" stroke="none"/>
  <path d="M172 96l1.7 5 5 1.7-5 1.7-1.7 5-1.7-5-5-1.7 5-1.7z" fill="currentColor" stroke="none"/>
</svg>`;

/* hot-air balloon */
const balloon = `<svg viewBox="0 0 200 160" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
  <path d="M100 14c30 0 50 22 50 48 0 26-28 46-42 60h-16C78 108 50 88 50 62c0-26 20-48 50-48z"/>
  <path d="M100 14c-14 10-20 34-14 60 4 18 10 34 14 48M100 14c14 10 20 34 14 60-4 18-10 34-14 48" stroke-width="2.4"/>
  <path d="M84 122h32l-6 16h-20z"/>
  <path d="M88 122l4-8M112 122l-4-8" stroke-width="2.4"/>
  <path d="M156 34l1.7 5 5 1.7-5 1.7-1.7 5-1.7-5-5-1.7 5-1.7z" fill="currentColor" stroke="none"/>
  <path d="M34 70l1.5 4.5 4.5 1.5-4.5 1.5-1.5 4.5-1.5-4.5-4.5-1.5 4.5-1.5z" fill="currentColor" stroke="none"/>
</svg>`;

/* paper plane with dashed loop */
const plane = `<svg viewBox="0 0 200 160" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
  <path d="M28 96 168 34l-36 84-32-28z"/>
  <path d="M132 118l-32-28-4-42" stroke-width="2.6"/>
  <path d="M14 40c26-18 48-18 60-4M18 130c30 10 52 6 66-8" stroke-width="2.2" stroke-dasharray="6 8"/>
  <path d="M46 66l1.7 5 5 1.7-5 1.7-1.7 5-1.7-5-5-1.7 5-1.7z" fill="currentColor" stroke="none"/>
</svg>`;

/* pennant flag string */
const flags = `<svg viewBox="0 0 200 160" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
  <path d="M10 30c60 26 120 26 180 0" stroke-width="2.6"/>
  <path d="M34 37v34l20-6v-32z" fill="currentColor" stroke="none"/>
  <path d="M74 44v34l20-5v-33z"/>
  <path d="M116 47v33l20-4v-32z" fill="currentColor" stroke="none"/>
  <path d="M156 45v32l18-4v-30z"/>
  <path d="M60 130c8-18 24-18 32 0M120 124c6-14 18-14 24 0" stroke-width="2.4"/>
  <path d="M96 108l2 7 7 2-7 2-2 7-2-7-7-2 7-2z" fill="currentColor" stroke="none"/>
</svg>`;

/* compass rose */
const compass = `<svg viewBox="0 0 200 160" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="100" cy="80" r="58"/>
  <circle cx="100" cy="80" r="44" stroke-width="2.2" stroke-dasharray="4 8"/>
  <path d="M100 36l12 32-12 60-12-60z" fill="currentColor" stroke="none"/>
  <path d="M56 80l32-10 60 10-60 12z" stroke-width="2.6"/>
  <path d="M100 10v12M100 138v12M30 80h12M158 80h12" stroke-width="2.6"/>
  <path d="M156 22l1.7 5 5 1.7-5 1.7-1.7 5-1.7-5-5-1.7 5-1.7z" fill="currentColor" stroke="none"/>
</svg>`;

/* magnifier over a map scrap */
const magnifier = `<svg viewBox="0 0 200 160" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
  <path d="M18 46l44-16 40 14 46-16 34 14v78l-38 12-42-14-44 14-40-12z" stroke-width="2.6"/>
  <path d="M40 60l20 22 26-16 22 26" stroke-width="2.2" stroke-dasharray="5 7"/>
  <circle cx="122" cy="78" r="30"/>
  <path d="M144 100l26 28" stroke-width="5"/>
  <path d="M112 70c4-6 12-8 18-4" stroke-width="2.4"/>
  <path d="M32 24l1.7 5 5 1.7-5 1.7-1.7 5-1.7-5-5-1.7 5-1.7z" fill="currentColor" stroke="none"/>
</svg>`;

/* mountain ridge with birds */
const mountains = `<svg viewBox="0 0 200 160" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
  <path d="M10 138l44-70 30 44 26-38 44 64h-84z" />
  <path d="M120 138l32-50 38 50" stroke-width="2.6"/>
  <path d="M54 68l10 14 10-12" stroke-width="2.4"/>
  <path d="M84 44c4-6 10-6 14 0M104 38c3-5 9-5 12 0" stroke-width="2.4"/>
  <path d="M170 26l1.7 5 5 1.7-5 1.7-1.7 5-1.7-5-5-1.7 5-1.7z" fill="currentColor" stroke="none"/>
</svg>`;

/* pine tree cluster */
const pines = `<svg viewBox="0 0 200 160" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
  <path d="M60 138V118M60 118 38 122l16-20-12 2 18-24 18 24-12-2 16 20zM132 138v-26M132 112l-26 4 18-24-12 2 20-28 20 28-12-2 18 24zM84 140v-12"/>
  <path d="M20 140h164" stroke-width="2.6"/>
  <path d="M36 40l1.7 5 5 1.7-5 1.7-1.7 5-1.7-5-5-1.7 5-1.7z" fill="currentColor" stroke="none"/>
  <path d="M168 52l1.5 4.5 4.5 1.5-4.5 1.5-1.5 4.5-1.5-4.5-4.5-1.5 4.5-1.5z" fill="currentColor" stroke="none"/>
</svg>`;

/* two birds */
const birds = `<svg viewBox="0 0 200 160" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M46 74c8-12 20-12 26 0M72 74c8-12 20-12 26 0" transform="translate(-8,-6)"/>
  <path d="M118 96c7-10 17-10 22 0M140 96c7-10 17-10 22 0" transform="translate(-4,4)"/>
  <path d="M30 120c4-6 10-6 14 0M60 132c3-5 8-5 11 0" stroke-width="2.4"/>
</svg>`;

/* smiling sun with rays */
const sun = `<svg viewBox="0 0 200 160" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="100" cy="80" r="34"/>
  <path d="M100 20v14M100 126v14M40 80h14M146 80h14M59 39l10 10M141 121l-10-10M141 39l-10 10M59 121l10-10"/>
  <path d="M88 74c2-3 6-3 8 0M104 74c2-3 6-3 8 0" stroke-width="2.6"/>
  <path d="M90 88c6 5 14 5 20 0" stroke-width="2.6"/>
  <path d="M26 26l1.7 5 5 1.7-5 1.7-1.7 5-1.7-5-5-1.7 5-1.7z" fill="currentColor" stroke="none"/>
</svg>`;

/* puffy cloud */
const cloud = `<svg viewBox="0 0 200 160" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
  <path d="M52 106a24 24 0 0 1 6-47 30 30 0 0 1 56-8 24 24 0 0 1 34 22 20 20 0 0 1-8 33z"/>
  <path d="M148 118l1.7 5 5 1.7-5 1.7-1.7 5-1.7-5-5-1.7 5-1.7z" fill="currentColor" stroke="none"/>
  <path d="M40 128c8-4 16-4 24 0" stroke-width="2.4"/>
</svg>`;

/* tent */
const tent = `<svg viewBox="0 0 200 160" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
  <path d="M40 124 100 36l60 88z"/>
  <path d="M100 36v88M100 124l-22-30M100 124l22-30" stroke-width="2.6"/>
  <path d="M28 124h144" stroke-width="2.6"/>
  <path d="M162 60l1.7 5 5 1.7-5 1.7-1.7 5-1.7-5-5-1.7 5-1.7z" fill="currentColor" stroke="none"/>
  <path d="M34 84c4-6 10-6 14 0" stroke-width="2.4"/>
</svg>`;

export const DOODLES = { globe, telescope, balloon, plane, flags, compass, magnifier, mountains, pines, birds, sun, cloud, tent };

export function doodle(name, cls = "") {
  return `<span class="doodle ${cls}" aria-hidden="true">${DOODLES[name] || ""}</span>`;
}

/* rotating circular expedition stamp (text on a circle path) */
export function circleStamp(coreText = "PLAY\nTHE LORE") {
  const text = "ATLASQUEST EXPEDITION SOCIETY · EST. 2026 · ATLASQUEST EXPEDITION SOCIETY · EST. 2026 · ";
  return `<span class="circle-stamp" aria-hidden="true">
    <svg viewBox="0 0 128 128">
      <defs><path id="csPath" d="M64,64 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0"/></defs>
      <circle cx="64" cy="64" r="58" fill="none" stroke="currentColor" stroke-width="2.5"/>
      <circle cx="64" cy="64" r="34" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="3 5"/>
      <text font-family="'Space Mono', monospace" font-size="10.2" font-weight="700" letter-spacing="1.5" fill="currentColor">
        <textPath href="#csPath">${text}</textPath>
      </text>
    </svg>
    <span class="cs-core">${coreText.replace("\n", "<br>")}</span>
  </span>`;
}

/* ink splatter burst with onomatopoeia */
export function ono(text, kind = "ok") {
  return `<span class="stamp-hit ${kind}" aria-hidden="true">${text}</span>`;
}
