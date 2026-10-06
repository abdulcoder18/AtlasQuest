// AtlasQuest — GeoGuesser: drop into a random place, find it on the map, score by distance.
// Satellite mode works with zero keys (Esri World Imagery). Street View mode uses the
// player's own Google Maps JS API key (set in Settings), like WorldGuessr's BYO-key flow.
import { el, icon, icons, sfx, confetti, toast, fmtKm } from "../ui.js";
import { data, rng } from "../data.js";
import { getState as gs, recordGame, addXp } from "../store.js";
import { getMapillaryToken } from "../secure-tokens.js";

const EARTH_R = 6371;
function haversineKm(a, b) {
  const toR = (x) => x * Math.PI / 180;
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(s)));
}
const scoreFor = (km) => Math.round(5000 * Math.exp(-10 * km / 14916));

const OPT_KEY = "atlasgeo_opts";
function loadOpts() {
  return { rounds: 5, timer: 0, region: "World", mode: "satellite", ...(JSON.parse(localStorage.getItem(OPT_KEY) || "{}")) };
}
function saveOpts(patch) {
  localStorage.setItem(OPT_KEY, JSON.stringify({ ...loadOpts(), ...patch }));
}

let active = null; // current game instance {destroy()}
export function destroyActive() { active?.destroy(); active = null; }

function roundStepper(label, value, min, max, onChange) {
  const input = el("input", { class: "input", type: "number", min, max, value, style: { width: "86px", textAlign: "center", fontWeight: "700" } });
  const wrap = el("div", { class: "seg" });
  wrap.append(el("div", { class: "seg-label" }, label));
  const set = (v) => { v = Math.max(min, Math.min(max, Math.round(v) || min)); input.value = v; onChange(v); sfx.click(); };
  wrap.append(el("button", { onclick: () => set(+input.value - 1) }, "−"), input, el("button", { onclick: () => set(+input.value + 1) }, "+"));
  input.addEventListener("change", () => set(+input.value));
  return wrap;
}

/* ---------------- setup screen ---------------- */
export function geoguesserPage() {
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
    col.append(seg("View", o.mode, [
      { value: "satellite", label: "Satellite" },
      { value: "mapillary", label: "Street photos 360" },
    ], (v) => {
      saveOpts({ mode: v }); o.mode = v; render();
    }));
    if (o.mode === "mapillary") col.append(el("p", { class: "faint small" },
      "Street photos come from Mapillary, an open street-level photo network. Photos are densest in Europe and North America; spots without photos are skipped automatically."));
    col.append(seg("Rounds", [3, 5, 10, 15].includes(o.rounds) ? o.rounds : null, [3, 5, 10, 15].map(r => ({ value: r, label: String(r) })), (v) => { saveOpts({ rounds: v }); o.rounds = v; render(); }));
    col.append(roundStepper("Or set your own round count", o.rounds, 1, 20, (v) => { saveOpts({ rounds: v }); o.rounds = v; }));
    col.append(seg("Region", o.region, ["World", "Europe", "Asia", "Africa", "Americas", "Oceania"], (v) => { saveOpts({ region: v }); o.region = v; render(); }));
    col.append(seg("Timer per round", o.timer, [
      { value: 0, label: "No limit" }, { value: 120, label: "2 min" }, { value: 60, label: "1 min" }, { value: 30, label: "30s" },
    ], (v) => { saveOpts({ timer: v }); o.timer = v; render(); }));
  }
  render();

  const stats = gs().stats.perGame.geoguesser;
  view.append(el("div", { class: "geo-setup" },
    el("div", { class: "card pad", style: { textAlign: "center" } },
      el("div", { class: "game-head" }, el("span", { class: "gh-icon", html: icons.compass })),
      el("h1", { class: "h1" }, "GeoGuesser"),
      el("p", { class: "sub" }, "You are dropped somewhere on Earth. Look around, read the clues — vegetation, roads, architecture — and drop your pin on the world map. The closer you are, the more points you score (max 5000/round)."),
      stats ? el("p", { class: "faint small mt-1" }, `Played ${stats.played}× · best ${stats.best} pts`) : null,
      el("div", { class: "mt-3" }, col),
      el("div", { class: "mt-3" },
        el("button", { class: "btn primary big", onclick: () => startGame(o) }, icon("play"), "Drop me somewhere!")
      )
    )
  ));
}

/* ---------------- game ---------------- */
async function startGame(o) {
  destroyActive();
  const cities = pickCities(o.region, o.mode, o.rounds);
  if (!cities.length) { toast("No locations for that region — try World.", "globe"); return; }

  const game = {
    o, cities, round: 0, total: 0, guess: null, marker: null,
    guessMap: null, guessMarker: null, pano: null, worldMap: null,
    timerId: null, timeLeft: 0, alive: true,
  };
  active = game;

  // fullscreen overlay
  const wrap = el("div", { class: "geo-wrap" });
  document.body.append(wrap);
  document.body.classList.add("in-geo");
  game.wrap = wrap;

  const hud = el("div", { class: "geo-hud" });
  const roundBadge = el("span", { class: "geo-badge geo-rounds" }, "Round 1/" + o.rounds);
  const timerBadge = el("span", { class: "geo-badge geo-timer", hidden: true },
    el("span", { html: icons.timer, style: { display: "inline-flex", width: "15px", height: "15px" }, "aria-hidden": "true" }),
    el("span", { class: "geo-timer-num" }));
  const modeLabel = o.mode === "satellite" ? "Satellite" : "Street photos";
  const modeBadge = el("span", { class: "geo-badge" }, el("span", { html: o.mode === "satellite" ? icons.satellite : icons.person, style: { display: "inline-flex", width: "15px", height: "15px" }, "aria-hidden": "true" }), modeLabel);
  hud.append(modeBadge, roundBadge, timerBadge,
    el("span", { style: { flex: "1" } }),
    el("button", { class: "geo-badge", style: { cursor: "pointer" }, onclick: () => confirmExit(game) }, "Quit")
  );
  wrap.append(hud);

  const panoEl = el("div", { id: "pano" });
  wrap.append(panoEl);

  const panel = el("div", { class: "guess-panel" });
  const sizeBtns = el("div", { class: "geo-size-btns" },
    el("button", { title: "small", onclick: () => setSize("small") }, "S"),
    el("button", { title: "medium", onclick: () => setSize("med") }, "M"),
    el("button", { title: "large", onclick: () => setSize("big") }, "L"),
  );
  const mapDiv = el("div", { class: "guess-map" });
  const guessBtn = el("button", { class: "btn primary geo-guess-btn", disabled: true, onclick: () => submitGuess(game) }, "Place your pin on the map to guess");
  panel.append(sizeBtns, mapDiv, guessBtn);
  wrap.append(panel);

  function setSize(sz) {
    mapDiv.classList.remove("small", "big");
    if (sz === "small") mapDiv.classList.add("small");
    if (sz === "big") mapDiv.classList.add("big");
    setTimeout(() => game.guessMap?.invalidateSize(), 260);
  }

  // guess map (Leaflet, OSM)
  game.guessMap = L.map(mapDiv, { worldCopyJump: true, zoomControl: true, attributionControl: true }).setView([25, 10], 1);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap contributors', maxZoom: 18,
  }).addTo(game.guessMap);
  game.guessMap.on("click", (e) => placeGuess(game, e.latlng));

  game.destroy = () => {
    game.alive = false;
    clearInterval(game.timerId);
    wrap.remove();
    document.body.classList.remove("in-geo");
    try { game.guessMap?.remove(); game.worldMap?.remove(); } catch {}
  };

  nextRound(game);
}

function pickCities(region, mode, n) {
  const regionByCc = new Map(data.countries.map(c => [c.cca2, c.region]));
  const minPop = mode === "mapillary" ? 150000 : 80000;
  let pool = data.cities.filter(c => regionByCc.get(c.cc) && (c.pop >= minPop));
  if (region !== "World") pool = pool.filter(c => regionByCc.get(c.cc) === region);
  if (pool.length < n * 2) pool = data.cities.filter(c => regionByCc.get(c.cc) && (region === "World" || regionByCc.get(c.cc) === region));
  // weight towards bigger cities: sort-by-pop weighted sampling
  const picks = [];
  const used = new Set();
  let guard = 0;
  while (picks.length < n && guard++ < 400) {
    // biased random: pick 3 random, take most populous
    const cands = [];
    for (let i = 0; i < 3; i++) cands.push(pool[Math.floor(Math.random() * pool.length)]);
    cands.sort((a, b) => b.pop - a.pop);
    const c = cands[0];
    if (!c || used.has(`${c.n}-${c.lat}`)) continue;
    // avoid same-city repeats (within 60km)
    if (picks.some(p => haversineKm(p, c) < 60)) continue;
    used.add(`${c.n}-${c.lat}`);
    picks.push({ lat: c.lat + (Math.random() - 0.5) * 0.014, lng: c.lng + (Math.random() - 0.5) * 0.014, name: c.n, cc: c.cc });
  }
  return picks;
}

function countryName(cc) {
  const c = data.byCca2.get(cc);
  return c ? c.name : cc;
}

function nextRound(game) {
  const spot = game.cities[game.round];
  game.guess = null;
  game.guessMarker?.remove(); game.guessMarker = null;
  const btn = game.wrap.querySelector(".geo-guess-btn");
  btn.disabled = true; btn.textContent = "Place your pin on the map to guess";
  game.wrap.querySelector(".geo-rounds").textContent = `Round ${game.round + 1}/${game.o.rounds}`;
  startRoundTimer(game);

  if (game.o.mode === "mapillary") {
    loadMapillary(game, spot);
  } else {
    const zoom = 14 + Math.floor(Math.random() * 3);
    game.worldMap = L.map(game.wrap.querySelector("#pano"), {
      zoomControl: true, attributionControl: true, center: [spot.lat, spot.lng], zoom,
      minZoom: 3,
    });
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Imagery &copy; Esri, Maxar, Earthstar Geographics",
      maxZoom: 18,
    }).addTo(game.worldMap);
    game.spot = spot;
  }
}

/* ---------- Mapillary street photos ---------- */
async function loadMapillary(game, spot) {
  const panoEl = game.wrap.querySelector("#pano");
  panoEl.innerHTML = "";
  const token = getMapillaryToken();
  if (!token) { toast("Street photos are unavailable right now.", "alert"); game.destroy(); geoguesserPage(); return; }

  // find street photos near the city center (bbox must stay under 0.01deg)
  const d = 0.0045;
  const bbox = `${(spot.lng - d).toFixed(5)},${(spot.lat - d).toFixed(5)},${(spot.lng + d).toFixed(5)},${(spot.lat + d).toFixed(5)}`;
  const fields = "id,geometry,computed_geometry,is_pano,captured_at,compass_angle";
  const q = async (extra) => {
    const url = `https://graph.mapillary.com/images?access_token=${encodeURIComponent(token)}&fields=${fields}&bbox=${bbox}&limit=30${extra}`;
    const res = await fetch(url);
    if (res.status === 400 || res.status === 401 || res.status === 403) throw Object.assign(new Error("AUTH"), { auth: true });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return (await res.json()).data || [];
  };

  let images = [];
  try {
    images = await q("&is_pano=true");
    if (!images.length) images = await q("");
    if (!images.length) images = await q("&is_pano=false");
  } catch (e) {
    if (!game.alive) return;
    if (e.auth) {
      game.destroy();
      toast("Mapillary token issue — please report this bug.", "alert");
      geoguesserPage();
      return;
    }
    toast("Mapillary hiccup (" + e.message + ") — skipping spot…", "alert");
    skipSpot(game);
    return;
  }
  if (!game.alive) return;
  if (!images.length) {
    toast("No street photos here, skipping spot…", "person");
    skipSpot(game);
    return;
  }

  // pick a pano if we have one, else a recent image
  const pick = images.find(i => i.is_pano) || images[Math.floor(Math.random() * images.length)];
  const geom = pick.computed_geometry || pick.geometry || {};
  const lat = geom.coordinates ? geom.coordinates[1] : spot.lat;
  const lng = geom.coordinates ? geom.coordinates[0] : spot.lng;
  game.spot = { lat, lng, name: spot.name, cc: spot.cc };
  renderMapillaryViewer(game, pick.id);
}

function renderMapillaryViewer(game, imageId) {
  const panoEl = game.wrap.querySelector("#pano");
  panoEl.innerHTML = "";
  if (!window.mapillary?.Viewer) {
    toast("Mapillary viewer failed to load — check your connection.", "alert");
    game.destroy(); geoguesserPage();
    return;
  }
  try {
    game.mlyViewer = new window.mapillary.Viewer({
      accessToken: getMapillaryToken(),
      container: panoEl,
      imageId,
      component: { cover: false, attribution: true, bearing: true, zoom: false },
    });
  } catch (e) {
    toast("Mapillary viewer error — skipping spot…", "alert");
    skipSpot(game);
  }
}

function skipSpot(game) {
  if (!game.alive) return;
  game.cities.push(pickCities("World", game.o.mode, 1)[0]);
  game.round++;
  if (game.round >= game.o.rounds + 8) { // runaway guard: too many empty spots
    toast("Not enough street photos in this region — try another region or Satellite mode.", "globe");
    game.destroy(); geoguesserPage();
    return;
  }
  game.wrap.querySelector(".geo-rounds").textContent = `Round ${game.round + 1}/${game.o.rounds}`;
  const next = game.cities[game.round];
  loadMapillary(game, next);
}

function placeGuess(game, latlng) {
  game.guess = latlng;
  if (!game.guessMarker) {
    game.guessMarker = L.marker(latlng, { draggable: true }).addTo(game.guessMap);
    game.guessMarker.on("dragend", (e) => game.guess = e.target.getLatLng());
  } else game.guessMarker.setLatLng(latlng);
  const btn = game.wrap.querySelector(".geo-guess-btn");
  btn.disabled = false; btn.textContent = "Guess this spot";
}

function startRoundTimer(game) {
  clearInterval(game.timerId);
  const badge = game.wrap.querySelector(".geo-timer");
  if (!game.o.timer) { badge.hidden = true; return; }
  badge.hidden = false;
  game.timeLeft = game.o.timer;
  const tick = () => {
    badge.querySelector(".geo-timer-num").textContent = `${Math.ceil(game.timeLeft)}s`;
    badge.classList.toggle("low", game.timeLeft <= 10);
    if (game.timeLeft <= 0) {
      clearInterval(game.timerId);
      submitGuess(game, true);
      return;
    }
    game.timeLeft -= 0.25;
  };
  tick();
  game.timerId = setInterval(tick, 250);
}

function submitGuess(game, timedOut = false) {
  clearInterval(game.timerId);
  const spot = game.spot;
  const btn = game.wrap.querySelector(".geo-guess-btn");
  btn.disabled = true;
  const guess = timedOut && !game.guess ? null : game.guess;
  const km = guess ? haversineKm(guess, spot) : 20015;
  const pts = guess ? scoreFor(km) : 0;
  game.total += pts;
  sfx.correct(game.round + 1);
  if (pts >= 4500) { confetti(innerWidth / 2, innerHeight / 2, 70); }

  showRoundResult(game, { guess, km, pts, spot });
}

function showRoundResult(game, { guess, km, pts, spot }) {
  const overlay = el("div", { class: "geo-result" });
  const mapEl = el("div", { class: "gr-map" });
  const bar = el("div", { class: "gr-bar" });
  overlay.append(mapEl, bar);
  game.wrap.append(overlay);

  const map = L.map(mapEl, { worldCopyJump: true, zoomControl: true, attributionControl: true }).setView([20, 0], 2);
  game.worldMap = map;
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap contributors', maxZoom: 18,
  }).addTo(map);

  const actual = [spot.lat, spot.lng];
  const mkActual = L.circleMarker(actual, { radius: 8, color: "#2dd4a8", weight: 3, fillColor: "#0d9f7c", fillOpacity: .9 }).addTo(map).bindPopup(`${spot.name}, ${countryName(spot.cc)}`);
  let line = null;
  if (guess) {
    const g = [guess.lat, guess.lng];
    L.circleMarker(g, { radius: 8, color: "#f87171", weight: 3, fillColor: "#dc2626", fillOpacity: .9 }).addTo(map).bindPopup("Your guess");
    line = L.polyline([g, actual], { color: "#e9edf8", weight: 2, dashArray: "6 8", opacity: .8 }).addTo(map);
    map.fitBounds(L.latLngBounds([g, actual]).pad(0.35), { maxZoom: 6 });
  } else {
    map.setView(actual, 5);
  }
  mkActual.openPopup();
  setTimeout(() => map.invalidateSize(), 60);

  const isLast = game.round + 1 >= game.o.rounds;
  bar.append(
    el("div", { class: "gr-stat" }, el("div", { class: "grs-label" }, "Round score"), el("div", { class: "grs-num grad" }, String(pts))),
    el("div", { class: "gr-line" }),
    el("div", { class: "gr-stat" }, el("div", { class: "grs-label" }, "Distance"), el("div", { class: "grs-num" }, guess ? fmtKm(km) : "—")),
    el("div", { class: "gr-line" }),
    el("div", { class: "gr-stat" }, el("div", { class: "grs-label" }, "Total"), el("div", { class: "grs-num" }, String(game.total))),
    el("div", { class: "gr-line" }),
    el("div", { class: "gr-stat", style: { maxWidth: "260px" } },
      el("div", { class: "grs-label" }, "This was"),
      el("div", { class: "gr-locname" }, `${spot.name}, ${countryName(spot.cc)}`)
    ),
    el("button", { class: "btn primary", onclick: () => {
      overlay.remove();
      if (isLast) finishGame(game);
      else { game.round++; destroyWorldMap(game); nextRound(game); }
    } }, isLast ? "See final results" : "Next round →")
  );
}

function destroyWorldMap(game) {
  try { game.worldMap?.remove(); } catch {}
  game.worldMap = null;
  const panoEl = game.wrap.querySelector("#pano");
  if (panoEl && game.o.mode === "satellite") panoEl.innerHTML = "";
  if (game.pano) { game.pano = null; }
}

function confirmExit(game) {
  if (confirm("Quit this GeoGuesser game? Progress will be lost.")) {
    game.destroy(); active = null;
    geoguesserPage();
  }
}

async function finishGame(game) {
  const total = game.total;
  const maxPts = game.o.rounds * 5000;
  recordGame("geoguesser", { score: total, correct: game.o.rounds, total: game.o.rounds, bestStreak: 0 });
  const gainedXp = Math.round(total / 100);
  const xpRes = addXp(gainedXp);
  sfx.fanfare();
  if (total >= maxPts * 0.8) confetti(innerWidth / 2, innerHeight / 2.4, 200);

  game.wrap.remove();
  document.body.classList.remove("in-geo");
  try { game.guessMap?.remove(); } catch {}

  const view = document.getElementById("view");
  view.innerHTML = "";
  const share = `AtlasQuest GeoGuesser: ${total.toLocaleString()} / ${maxPts.toLocaleString()} pts`;
  view.append(el("div", { class: "result-wrap" },
    el("div", { class: "score-hero" },
      el("div", { class: "faint small", style: { letterSpacing: ".12em", textTransform: "uppercase", fontWeight: "800" } }, "GeoGuesser complete"),
      el("div", { class: "sh-num grad-text", style: { margin: "10px 0 4px" } }, total.toLocaleString()),
      el("div", { class: "muted" }, `pts out of ${maxPts.toLocaleString()} · ${game.o.rounds} rounds · +${gainedXp} XP`),
      el("div", { class: "muted mt-1", style: { fontWeight: "700" } },
        total >= maxPts * .9 ? "World-class explorer" :
        total >= maxPts * .7 ? "Cartographer material" :
        total >= maxPts * .4 ? "Decent navigator" : "Keep exploring")
    ),
    el("div", { class: "row", style: { justifyContent: "center", flexWrap: "wrap", gap: "10px" } },
      el("button", { class: "btn primary big", onclick: () => geoguesserPage() }, icon("refresh"), "Play again"),
      el("button", { class: "btn", onclick: () => { navigator.clipboard?.writeText(share).then(() => toast("Copied! Paste it to your friends.", "clipboard")); } }, icon("share"), "Share"),
      el("button", { class: "btn ghost", onclick: () => location.hash = "#/" }, "Home")
    )
  ));
  active = null;
}
