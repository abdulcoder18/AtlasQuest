// AtlasQuest — Map Master: find countries on a real world map (click) or name the highlighted one.
// Uses the vendored world-atlas TopoJSON (50m) rendered as vector GeoJSON through Leaflet — no tiles, works offline.
import { el, icon, icons, sfx, confetti, toast, confirmDialog } from "../ui.js";
import { data, rng, dateSeed, shuffle, pickDistinct, flagUrl, revealFor } from "../data.js";
import { addXp, recordGame, getState } from "../store.js";
import { openLore } from "../lore.js";

const OPT_KEY = "atlasmap_opts";
function loadOpts() {
  return { mode: "mixed", count: 10, timer: 0, region: "World", ...(JSON.parse(localStorage.getItem(OPT_KEY) || "{}")) };
}
function saveOpts(patch) {
  localStorage.setItem(OPT_KEY, JSON.stringify({ ...loadOpts(), ...patch }));
}

const NAME_FIXES = { "Kosovo": "UNK", "Somaliland": null, "N. Cyprus": null }; // features with no ISO id

let worldCache = null;
async function loadWorld() {
  if (worldCache) return worldCache;
  const topo = await (await fetch("data/world-50m.json")).json();
  const feats = topojson.feature(topo, topo.objects.countries).features
    .map(f => {
      let cca3 = null;
      if (f.id && data.isoByNum?.get(f.id)) cca3 = data.isoByNum.get(f.id).cca3;
      if (!cca3 && NAME_FIXES[f.properties?.name]) cca3 = NAME_FIXES[f.properties.name];
      return { ...f, cca3 };
    })
    .filter(f => f.cca3 && data.byCca3.has(f.cca3));
  worldCache = feats;
  return feats;
}

/* ---------------- setup ---------------- */
export function mappointPage() {
  destroyActive();
  const view = document.getElementById("view");
  view.innerHTML = "";
  const o = loadOpts();

  const col = el("div", { class: "stack" });
  function seg(label, value, options, onPick) {
    const s = el("div", { class: "seg" });
    if (label) s.append(el("div", { class: "seg-label" }, label));
    for (const opt of options) s.append(el("button", {
      class: opt.value === value ? "on" : "",
      onclick: () => { sfx.click(); onPick(opt.value); },
    }, opt.label));
    return s;
  }
  function render() {
    col.innerHTML = "";
    col.append(seg("Game style", o.mode, [
      { value: "mixed", label: "Mixed" },
      { value: "find", label: "Find it: name → click the map" },
      { value: "name", label: "Name it: highlighted → choose name" },
    ], (v) => { saveOpts({ mode: v }); o.mode = v; render(); }));
    col.append(seg("Region", o.region, ["World", "Europe", "Asia", "Africa", "Americas", "Oceania"], (v) => { saveOpts({ region: v }); o.region = v; render(); }));
    col.append(countStepper("Questions per round", o.count, 3, 25, (v) => { saveOpts({ count: v }); o.count = v; }));
    col.append(seg("Timer", o.timer, [
      { value: 0, label: "No limit" }, { value: 30, label: "30s" }, { value: 15, label: "15s" }, { value: 8, label: "8s" },
    ], (v) => { saveOpts({ timer: v }); o.timer = v; render(); }));
  }
  render();

  const stats = getState().stats.perGame.mappoint;
  view.append(el("div", { class: "geo-setup" },
    el("div", { class: "card pad", style: { textAlign: "center" } },
      el("div", { class: "game-head" }, el("span", { class: "gh-icon", html: icons.map })),
      el("h1", { class: "h1" }, "Map Master"),
      el("p", { class: "sub" }, "A blank world map, an atlas of every nation. Either the map lights up a country and you name it, or you get a name and find it yourself. Every correct pin is 1000 points."),
      stats ? el("p", { class: "faint small mt-1" }, `Played ${stats.played}x · best ${stats.best} pts`) : null,
      el("div", { class: "mt-3" }, col),
      el("div", { class: "mt-3" },
        el("button", { class: "btn primary big", onclick: () => startGame(o) }, icon("play"), "Unfold the map")
      )
    )
  ));
}

function countStepper(label, value, min, max, onChange) {
  const input = el("input", { class: "input", type: "number", min, max, value, style: { width: "86px", textAlign: "center", fontWeight: "700" } });
  const wrap = el("div", { class: "seg" });
  wrap.append(el("div", { class: "seg-label" }, label));
  const dec = el("button", { onclick: () => set(+input.value - 1) }, "−");
  const inc = el("button", { onclick: () => set(+input.value + 1) }, "+");
  function set(v) {
    v = Math.max(min, Math.min(max, v || min));
    input.value = v; onChange(v); sfx.click();
  }
  input.addEventListener("change", () => set(+input.value));
  wrap.append(dec, input, inc);
  return wrap;
}

/* ---------------- game ---------------- */
let active = null;
export function destroyActive() {
  if (active) { active.alive = false; clearInterval(active.timerId); active.wrap?.remove(); document.body.classList.remove("in-mapgame"); try { active.map?.remove(); } catch {} active = null; }
}

async function startGame(o) {
  destroyActive();
  toast("Unfolding the world map…", "map");
  const feats = await loadWorld();

  // pool: playable countries with a region match
  let pool = feats.filter(f => {
    const c = data.byCca3.get(f.cca3);
    return c && (c.unMember || ["XKX", "TWN", "PSE"].includes(c.cca3)) && (o.region === "World" || c.region === o.region);
  });
  if (pool.length < 4) { toast("Not enough countries in that region for the map.", "globe"); return; }

  const game = {
    o, pool, round: 0, score: 0, correct: 0, results: [], alive: true,
    questions: buildQuestions(o, pool),
  };
  active = game;

  const wrap = el("div", { class: "geo-wrap mapgame-wrap" });
  document.body.append(wrap);
  document.body.classList.add("in-mapgame");
  game.wrap = wrap;

  const hud = el("div", { class: "geo-hud" });
  const roundBadge = el("span", { class: "geo-badge geo-rounds" }, `Round 1/${game.questions.length}`);
  const scoreBadge = el("span", { class: "geo-badge" }, el("span", { html: icons.target, style: { display: "inline-flex", width: "15px", height: "15px" }, "aria-hidden": "true" }), el("span", { class: "mapgame-score" }, "0"));
  const timerBadge = el("span", { class: "geo-badge geo-timer", hidden: true },
    el("span", { html: icons.timer, style: { display: "inline-flex", width: "15px", height: "15px" }, "aria-hidden": "true" }),
    el("span", { class: "geo-timer-num" }));
  hud.append(roundBadge, scoreBadge, timerBadge, el("span", { style: { flex: "1" } }),
    el("button", { class: "geo-badge", style: { cursor: "pointer" }, onclick: () => confirmExit(game) }, "Quit"));
  wrap.append(hud);

  const board = el("div", { class: "mapgame-board" });
  const mapEl = el("div", { class: "mapgame-map" });
  board.append(mapEl);
  wrap.append(board);

  const panel = el("div", { class: "mapgame-panel" });
  wrap.append(panel);

  // base map
  game.map = L.map(mapEl, {
    zoomControl: false, attributionControl: true, minZoom: 1.6, maxZoom: 8,
    zoomSnap: 0.25, worldCopyJump: true,
    center: [24, 10], zoom: 1.6,
  });
  const cs = getComputedStyle(document.documentElement);
  const cv = (n) => cs.getPropertyValue(n).trim() || "#888";
  game.colors = { ink: cv("--ink"), paper3: cv("--paper-3"), accent: cv("--accent"), stamp: cv("--stamp"), paper2: cv("--paper-2") };
  game.map.attributionControl.setPrefix(false);
  game.map.attributionControl.addAttribution('Geometry © <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a> via world-atlas');
  game.layers = L.geoJSON({ type: "FeatureCollection", features: pool }, {
    style: () => ({ color: game.colors.ink, weight: 1, fillColor: game.colors.paper3, fillOpacity: 1, className: "mapgame-country" }),
    interactive: true,
    onEachFeature: (f, layer) => {
      layer.on("click", () => handleCountryClick(game, f, layer));
    },
  }).addTo(game.map);

  game.destroy = () => {
    game.alive = false;
    clearInterval(game.timerId);
    if (game.keyHandler) document.removeEventListener("keydown", game.keyHandler);
    game.keyHandler = null;
    wrap.remove();
    document.body.classList.remove("in-mapgame");
    try { game.map.remove(); } catch {}
  };

  // Escape is the safety net: the topbar and drawer are hidden during a run,
  // so the HUD Quit button is otherwise the only way out.
  game.keyHandler = (e) => { if (e.key === "Escape") confirmExit(game); };
  document.addEventListener("keydown", game.keyHandler);

  nextRound(game);
}

let exiting = false;
async function confirmExit(game) {
  if (!game || !game.alive || exiting) return;
  exiting = true;
  const ok = await confirmDialog({
    title: "Leave Map Master?",
    message: "Progress on this run is lost.",
    confirmLabel: "Leave run",
  });
  exiting = false;
  if (!ok) return;
  game.destroy(); active = null; mappointPage();
}

function buildQuestions(o, pool) {
  const rand = rng(dateSeed() + Math.floor(Math.random() * 1e6));
  const picks = shuffle(pool, rand).slice(0, o.count);
  return picks.map((f, i) => {
    const mode = o.mode === "mixed" ? (i % 2 === 0 ? "find" : "name") : o.mode;
    const country = data.byCca3.get(f.cca3);
    let choices = null;
    if (mode === "name") {
      const sameRegion = data.countries.filter(c => c.region === country.region && c.unMember && c.cca3 !== country.cca3);
      const others = pickDistinct(sameRegion, 3, rand);
      choices = shuffle([country, ...others], rand);
    }
    return { feature: f, country, mode, choices, answerIdx: choices ? choices.findIndex(c => c.cca3 === country.cca3) : -1 };
  });
}

function nextRound(game) {
  if (game.round >= game.questions.length) return finishGame(game);
  const q = game.questions[game.round];
  game.locked = false; // re-enable input for the new round
  game.clickedCca3 = null;
  game.wrap.querySelector(".geo-rounds").textContent = `Round ${game.round + 1}/${game.questions.length}`;
  game.wrap.querySelector(".mapgame-score").textContent = String(game.score);

  // reset styling
  game.layers.resetStyle();
  const panel = game.wrap.querySelector(".mapgame-panel");
  panel.innerHTML = "";

  if (q.mode === "find") {
    game.findMode = true;
    panel.append(el("p", { class: "mapgame-prompt" }, "Find this country on the map:"),
      el("div", { class: "mapgame-target" },
        el("img", { src: flagUrl(q.country.cca2), alt: "" }),
        el("span", { class: "mapgame-target-name" }, q.country.name)));
    game.map.setView([24, 10], 1.6);
    startRoundTimer(game);
  } else {
    game.findMode = false;
    game.layers.eachLayer(l => { if (l.feature.cca3 === q.country.cca3) { l.setStyle({ fillColor: game.colors.accent }); } });
    try { game.map.fitBounds(game.layers.getLayers().find(l => l.feature.cca3 === q.country.cca3).getBounds(), { padding: [40, 40], maxZoom: 6 }); } catch {}
    const grid = el("div", { class: "choices" });
    q.choices.forEach((c, idx) => {
      grid.append(el("button", { class: "choice", onclick: () => answerName(game, idx) },
        el("span", { class: "ckey" }, String(idx + 1)),
        el("span", {}, c.name)));
    });
    panel.append(el("p", { class: "mapgame-prompt" }, "Which country is highlighted?"), grid);
    startRoundTimer(game);
    const onKey = (e) => {
      const n = parseInt(e.key);
      if (n >= 1 && n <= q.choices.length && !game.locked) answerName(game, n - 1);
    };
    document.addEventListener("keydown", onKey);
    game.keyHandler = onKey;
  }
}

function startRoundTimer(game) {
  clearInterval(game.timerId);
  const badge = game.wrap.querySelector(".geo-timer");
  if (!game.o.timer) { badge.hidden = true; return; }
  badge.hidden = false;
  game.timeLeft = game.o.timer;
  const tick = () => {
    badge.querySelector(".geo-timer-num").textContent = `${Math.ceil(game.timeLeft)}s`;
    badge.classList.toggle("low", game.timeLeft <= 5);
    if (game.timeLeft <= 0) { clearInterval(game.timerId); timeUp(game); return; }
    game.timeLeft -= 0.25;
  };
  tick();
  game.timerId = setInterval(tick, 250);
}

function timeUp(game) {
  const q = game.questions[game.round];
  settle(game, false, q.mode === "find" ? "no click" : null, true);
}

function handleCountryClick(game, feature, layer) {
  if (!game.alive || game.locked || !game.findMode) return;
  const q = game.questions[game.round];
  const isHit = feature.cca3 === q.country.cca3;
  game.clickedCca3 = feature.cca3;
  settle(game, isHit, feature);
}

function answerName(game, idx) {
  if (!game.alive || game.locked) return;
  const q = game.questions[game.round];
  settle(game, idx === q.answerIdx, null, false, idx);
}

function settle(game, isCorrect, clickedFeature, timedOut = false, choiceIdx = null) {
  game.locked = true;
  clearInterval(game.timerId);
  if (game.keyHandler) { document.removeEventListener("keydown", game.keyHandler); game.keyHandler = null; }
  const q = game.questions[game.round];

  if (isCorrect) {
    game.score += 1000; game.correct++;
    sfx.correct(game.correct); addXp(8);
    if (game.correct % 3 === 0) confetti(innerWidth / 2, innerHeight / 2.6, 50);
  } else sfx.wrong();

  // reveal: highlight actual, outline clicked (click handlers stay bound —
  // handleCountryClick guards on locked/findMode, so no stray clicks fire)
  game.layers.eachLayer(l => {
    if (l.feature.cca3 === q.country.cca3) l.setStyle({ fillColor: isCorrect ? game.colors.accent : game.colors.stamp });
    else if (clickedFeature && l.feature.cca3 === clickedFeature.cca3) l.setStyle({ fillColor: game.colors.paper3, color: game.colors.stamp, weight: 3 });
  });
  const actualLayer = game.layers.getLayers().find(l => l.feature.cca3 === q.country.cca3);
  try { actualLayer && game.map.fitBounds(actualLayer.getBounds(), { padding: [60, 60], maxZoom: 6.5 }); } catch {}

  const panel = game.wrap.querySelector(".mapgame-panel");
  panel.innerHTML = "";
  const verdict = el("div", { class: "row", style: { gap: "12px" } },
    el("span", { class: `stamp-hit ${isCorrect ? "ok" : "no"}` }, isCorrect ? "Correct +1000" : timedOut ? "Time up" : "Missed"));
  const reveal = revealFor(q.country);
  const nextBtn = el("button", { class: "btn primary", onclick: () => {
    game.round++;
    if (game.round >= game.questions.length) finishGame(game);
    else nextRound(game);
  } }, game.round + 1 >= game.questions.length ? "See results" : "Next country", icon("chevR"));

  panel.append(verdict, reveal.node, el("div", { class: "reveal-actions" },
    el("button", { class: "btn small ghost", onclick: () => openLore(q.country.cca3) }, icon("book"), "Full lore"),
    nextBtn));
  game.results.push({ country: q.country, correct: isCorrect });
}

async function finishGame(game) {
  const total = game.questions.length;
  recordGame("mappoint", { score: game.score, correct: game.correct, total, bestStreak: 0 });
  const xp = game.score / 100;
  const xpRes = addXp(xp);
  sfx.fanfare();
  if (game.correct === total) confetti(innerWidth / 2, innerHeight / 2.5, 200);
  const share = `AtlasQuest Map Master: ${game.correct}/${total} countries, ${game.score.toLocaleString()} pts`;
  game.destroy();
  active = null;

  const view = document.getElementById("view");
  view.innerHTML = "";
  view.append(el("div", { class: "result-wrap" },
    el("div", { class: "score-hero" },
      el("div", { class: "faint small", style: { letterSpacing: ".12em", textTransform: "uppercase", fontWeight: "800" } }, "Map Master complete"),
      el("div", { class: "sh-num grad-text", style: { margin: "10px 0 4px" } }, `${game.correct}/${total}`),
      el("div", { class: "muted" }, `${game.score.toLocaleString()} points · +${xp} XP`),
      el("div", { class: "result-squares", "aria-hidden": "true" },
        game.results.map(r => el("span", { class: `sq${r.correct ? "" : " bad"}` })))
    ),
    el("div", { class: "row", style: { justifyContent: "center", flexWrap: "wrap", gap: "10px" } },
      el("button", { class: "btn primary big", onclick: () => mappointPage() }, icon("refresh"), "Play again"),
      el("button", { class: "btn", onclick: () => { navigator.clipboard?.writeText(share).then(() => toast("Copied! Paste it to your friends.", "clipboard")); } }, icon("share"), "Share"),
      el("button", { class: "btn ghost", onclick: () => location.hash = "#/" }, "Home")
    )
  ));
}
