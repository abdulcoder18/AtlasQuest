// AtlasQuest — data layer: loads datasets, builds indexes, generates quiz questions.
import { el } from "./ui.js";

export const data = {
  countries: [], byCca3: new Map(), byCca2: new Map(),
  lore: new Map(),        // cca3 -> lore entry
  religions: new Map(),   // cca3 -> {majority, pct, note}
  territories: [],        // [{cca3, sovereign, sovereignCca3, type, famous, note}]
  territoriesByCca3: new Map(),
  histFlags: [],          // [{slug, name, era, region, file, story, quizFact}]
  empires: [],            // [{slug, name, emoji, years, capital, peak, rise, fall, legacy, modernCountries, quizFact}]
  cities: [],             // [{n, cc, lat, lng, pop}]
  ready: false,
};

const JSON_PATHS = {
  countries: "data/countries.json",
  isoMap: "data/iso-map.json",
  religions: "data/religions.json",
  territories: "data/territories.json",
  histFlags: "data/historical-flags.json",
  empires: "data/empires.json",
  cities: "data/cities.json",
};
const LORE_REGIONS = ["europe", "asia", "africa", "americas", "oceania"];

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

export async function loadData() {
  const FALLBACK = { countries: [], religions: {}, territories: [], histFlags: [], empires: [], cities: [] };
  const jobs = Object.entries(JSON_PATHS).map(async ([k, url]) =>
    [k, await fetchJson(url).catch(err => { console.warn("data: failed to load", url, err.message); return FALLBACK[k]; })]
  );
  const loreJobs = LORE_REGIONS.map((r) =>
    fetchJson(`data/lore/${r}.json`).then(v => [r, v]).catch(() => [r, null])
  );
  const all = await Promise.all([...jobs, ...loreJobs]);
  for (const [k, v] of all) {
    if (!v) continue;
    if (LORE_REGIONS.includes(k)) { for (const [k3, entry] of Object.entries(v)) data.lore.set(k3, entry); }
    else data[k] = v;
  }
  if (!(data.religions instanceof Map)) data.religions = new Map(Object.entries(data.religions || {}));
  data.byCca3 = new Map(data.countries.map(c => [c.cca3, c]));
  data.isoByNum = new Map(Object.entries(data.isoMap || {}).map(([num, v]) => [num, v]));
  data.byCca2 = new Map(data.countries.map(c => [c.cca2, c]));
  data.territoriesByCca3 = new Map(data.territories.map(t => [t.cca3, t]));
  data.ready = true;
  return data;
}

export const flagUrl = (cca2) => `assets/flags/${cca2.toLowerCase()}.svg`;
export const country = (cca3) => data.byCca3.get(cca3);
export const loreOf = (cca3) => data.lore.get(cca3) || null;
export const religionOf = (cca3) => data.religions.get(cca3) || null;
export const territoryOf = (cca3) => data.territoriesByCca3.get(cca3) || null;

/* ---------- RNG (seeded for daily/challenges) ---------- */
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const dateSeed = (d = new Date()) =>
  d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();

export function shuffle(arr, rand = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function pickDistinct(arr, n, rand = Math.random, exclude = new Set()) {
  const pool = arr.filter(x => !exclude.has(x));
  return shuffle(pool, rand).slice(0, n);
}

/* ---------- quiz question generators ---------- */
const REGIONS = ["World", "Europe", "Asia", "Africa", "Americas", "Oceania"];
export { REGIONS };

function filterCountries(region) {
  if (!region || region === "World") return data.countries.filter(c => c.unMember || ["XKX", "TWN", "PSE"].includes(c.cca3));
  return data.countries.filter(c => c.region === region && (c.unMember || ["XKX", "TWN", "PSE"].includes(c.cca3)));
}

/** MCQ distractors: prefer same region for challenge. */
function distractors(answerCountry, pool, rand, n = 3) {
  const sameRegion = pool.filter(c => c.cca3 !== answerCountry.cca3 && c.region === answerCountry.region && c.unMember);
  const others = pool.filter(c => c.cca3 !== answerCountry.cca3 && c.unMember);
  const chosen = pickDistinct(sameRegion, n, rand);
  if (chosen.length < n) chosen.push(...pickDistinct(others, n - chosen.length, rand, new Set(chosen.map(c => c.cca3))));
  return chosen.slice(0, n);
}

function stripDiacritics(s) { return s.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
export function nameAccepted(input, name) {
  const norm = (x) => stripDiacritics(String(x).toLowerCase().replace(/[.,'’\-]/g, "").replace(/\s+/g, " ").trim());
  const i = norm(input), t = norm(name);
  if (!i) return false;
  if (i === t) return true;
  // allow missing "the" and common suffixes
  const t2 = t.replace(/^the /, "");
  if (i === t2) return true;
  if (t.startsWith("st.") || t.startsWith("saint")) return i === norm(t.replace(/^st\.? /, "saint ")) || i === norm(t.replace(/^saint /, "st "));
  return false;
}

function loreBlocks(c) {
  const lore = loreOf(c.cca3), rel = religionOf(c.cca3);
  const chips = lore ? lore.famous.map(f => el("span", { class: "chip-tag gold" }, f)) : [];
  const relText = rel ? `${rel.majority}${rel.pct ? ` (~${rel.pct}%)` : ""}` : null;
  return { lore, chips, relText };
}

/** Standard reveal card for a country. */
export function revealFor(c, extra = {}) {
  const { lore, chips, relText } = loreBlocks(c);
  const reveal = el("div");
  const head = el("div", { class: "reveal-head" },
    el("img", { class: "reveal-flag", src: flagUrl(c.cca2), alt: "" }),
    el("div", {},
      el("div", { class: "reveal-title" }, c.name),
      el("div", { class: "reveal-sub" }, `${c.capital} · ${c.region}${relText ? " · " + relText : ""}`)
    )
  );
  const body = el("div", { class: "reveal-body" });
  if (chips.length) body.append(el("div", { class: "reveal-chips" }, chips));
  if (lore?.funFact) body.append(el("p", { class: "small", style: { margin: "0 0 8px" } }, lore.funFact));
  if (lore?.history) {
    const short = lore.history.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ");
    body.append(el("p", { style: { margin: "0" } }, short));
  }
  if (extra.note) body.append(el("p", { class: "small muted", style: { margin: "8px 0 0" } }, extra.note));
  reveal.append(head, body);
  return { node: reveal, lore, country: c };
}

/* --- game: flags --- */
export function flagQuestions({ count = 10, region = "World", mode = "mcq", rand = Math.random } = {}) {
  const pool = filterCountries(region);
  const picks = shuffle(pool, rand).slice(0, Math.min(count, pool.length));
  return picks.map(c => {
    const reveal = revealFor(c);
    if (mode === "input") {
      return {
        kind: "input", id: c.cca3,
        prompt: "Which country flies this flag?",
        flag: flagUrl(c.cca2),
        placeholder: "Type the country name…",
        validate: (v) => nameAccepted(v, c.name) || nameAccepted(v, c.official),
        answerLabel: c.name,
        reveal,
      };
    }
    if (mode === "reverse") { // country name -> pick the flag
      const others = distractors(c, pool, rand);
      const choices = shuffle([c, ...others], rand);
      return {
        kind: "mcq", id: c.cca3,
        prompt: `Which flag belongs to ${c.name}?`,
        choices: choices.map(x => ({ label: "", flag: flagUrl(x.cca2), name: x.name })),
        answerIdx: choices.findIndex(x => x.cca3 === c.cca3),
        reveal,
      };
    }
    const others = distractors(c, pool, rand);
    const choices = shuffle([c, ...others], rand);
    return {
      kind: "mcq", id: c.cca3,
      prompt: "Which country does this flag belong to?",
      flag: flagUrl(c.cca2),
      choices: choices.map(x => ({ label: x.name })),
      answerIdx: choices.findIndex(x => x.cca3 === c.cca3),
      reveal,
    };
  });
}

/* --- game: capitals --- */
export function capitalQuestions({ count = 10, region = "World", mode = "mcq", direction = "toCapital", rand = Math.random } = {}) {
  const pool = filterCountries(region).filter(c => c.capital);
  const picks = shuffle(pool, rand).slice(0, Math.min(count, pool.length));
  return picks.map(c => {
    const reveal = revealFor(c);
    if (direction === "toCountry") {
      // Given the capital, which country?
      if (mode === "input") {
        return {
          kind: "input", id: c.cca3,
          prompt: `${c.capital} is the capital of…?`,
          placeholder: "Type the country name…",
          validate: (v) => nameAccepted(v, c.name),
          answerLabel: c.name, reveal,
        };
      }
      const others = distractors(c, pool, rand);
      const choices = shuffle([c, ...others], rand);
      return {
        kind: "mcq", id: c.cca3,
        prompt: `${c.capital} is the capital of…?`,
        choices: choices.map(x => ({ label: x.name })),
        answerIdx: choices.findIndex(x => x.cca3 === c.cca3),
        reveal,
      };
    }
    // toCapital
    if (mode === "input") {
      return {
        kind: "input", id: c.cca3,
        prompt: `What is the capital of ${c.name}?`,
        placeholder: "Type the capital…",
        validate: (v) => nameAccepted(v, c.capital) || (c.capitalAlt || []).some(a => nameAccepted(v, a)),
        answerLabel: c.capital, reveal,
      };
    }
    const capPool = pool.filter(x => x.cca3 !== c.cca3 && x.capital && x.region === c.region);
    const allPool = pool.filter(x => x.cca3 !== c.cca3 && x.capital);
    let others = pickDistinct(capPool, 3, rand);
    if (others.length < 3) others.push(...pickDistinct(allPool, 3 - others.length, rand));
    const choices = shuffle([c, ...others.slice(0, 3)], rand);
    return {
      kind: "mcq", id: c.cca3,
      prompt: `What is the capital of ${c.name}?`,
      choices: choices.map(x => ({ label: x.capital })),
      answerIdx: choices.findIndex(x => x.cca3 === c.cca3),
      reveal,
    };
  });
}

/* --- game: territories --- */
export function territoryQuestions({ count = 10, mode = "mcq", rand = Math.random } = {}) {
  const terrs = data.territories.filter(t => country(t.cca3));
  const picks = shuffle(terrs, rand).slice(0, Math.min(count, terrs.length));
  const pool = terrs.map(t => country(t.cca3));
  return picks.map(t => {
    const c = country(t.cca3);
    const sov = t.sovereignCca3 ? country(t.sovereignCca3) : null;
    const note = t.sovereign ? `${t.type} of ${t.sovereign}. ` : `${t.type}. `;
    const reveal = revealFor(c, { note: note + t.note });
    const qType = rand() < 0.45 && t.sovereign ? "sovereign" : "name";
    if (qType === "sovereign") {
      // who controls it
      const others = pickDistinct(
        data.countries.filter(x => x.unMember && x.cca3 !== t.sovereignCca3),
        3, rand
      );
      const choices = shuffle([sov, ...others].filter(Boolean), rand);
      return {
        kind: "mcq", id: c.cca3,
        prompt: `${c.name} — who governs it?`,
        flag: flagUrl(c.cca2),
        choices: choices.map(x => ({ label: x.name })),
        answerIdx: choices.findIndex(x => x.cca3 === t.sovereignCca3),
        reveal,
      };
    }
    if (mode === "input") {
      return {
        kind: "input", id: c.cca3,
        prompt: "Which territory flies this flag?",
        flag: flagUrl(c.cca2),
        placeholder: "Type the territory name…",
        validate: (v) => nameAccepted(v, c.name),
        answerLabel: c.name, reveal,
      };
    }
    if (mode === "reverse") {
      // given the territory NAME, pick the right flag
      const others = distractors(c, pool, rand);
      const choices = shuffle([c, ...others], rand);
      return {
        kind: "mcq", id: c.cca3,
        prompt: `Which flag belongs to ${c.name}?`,
        qsub: "Pick the correct flag",
        choices: choices.map(x => ({ label: "", flag: flagUrl(x.cca2), name: x.name })),
        answerIdx: choices.findIndex(x => x.cca3 === c.cca3),
        reveal,
      };
    }
    const others = distractors(c, pool, rand);
    const choices = shuffle([c, ...others], rand);
    return {
      kind: "mcq", id: c.cca3,
      prompt: "Which territory does this flag belong to?",
      flag: flagUrl(c.cca2),
      choices: choices.map(x => ({ label: x.name })),
      answerIdx: choices.findIndex(x => x.cca3 === c.cca3),
      reveal,
    };
  });
}

/* --- game: historical flags --- */
export function historyQuestions({ count = 8, rand = Math.random } = {}) {
  const pool = data.histFlags;
  const picks = shuffle(pool, rand).slice(0, Math.min(count, pool.length));
  const commonsUrl = (hf) =>
    hf.asset ? `assets/flags/hist/${hf.asset}` : `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(hf.file)}?width=520`;
  return picks.map(hf => {
    const others = pickDistinct(pool.filter(x => x.slug !== hf.slug), 3, rand);
    const choices = shuffle([hf, ...others], rand);
    const reveal = el("div");
    reveal.append(
      el("div", { class: "reveal-head" },
        el("img", { class: "reveal-flag", src: commonsUrl(hf), alt: "" }),
        el("div", {},
          el("div", { class: "reveal-title" }, hf.name),
          el("div", { class: "reveal-sub" }, `${hf.era} · ${hf.region}`)
        )
      ),
      el("div", { class: "reveal-body" }, el("p", { style: { margin: 0 } }, hf.story))
    );
    return {
      kind: "mcq", id: hf.slug,
      prompt: "Which state flew this flag?",
      flag: commonsUrl(hf),
      choices: choices.map(x => ({ label: `${x.name}` })),
      answerIdx: choices.findIndex(x => x.slug === hf.slug),
      reveal,
      revealPlain: true,
    };
  });
}

/* --- daily challenge --- */
export function dailyQuestions(rand = Math.random) {
  const flags = flagQuestions({ count: 3, region: "World", mode: "mcq", rand });
  const caps = capitalQuestions({ count: 2, region: "World", mode: "mcq", rand });
  return [...flags, ...caps].map((q, i) => ({ ...q, id: `d${i}-${q.id}` }));
}
