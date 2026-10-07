// AtlasQuest — Versus: host/join real-time matches with friends over WebRTC (PeerJS).
// Host = authority: owns room, relays state. Everyone plays identical seeded questions.
// Also powers the "players met" leaderboard (level + XP of everyone you've played with).
import { el, icon, icons, sfx, confetti, toast } from "../ui.js";
import { data, flagQuestions, capitalQuestions, territoryQuestions, historyQuestions, rng } from "../data.js";
import { addXp, recordGame, getState as gs, levelFromXp, ensureProfile, upsertMetPlayer, getMetPlayers } from "../store.js";
import { openLore } from "../lore.js";

const PREFIX = "atlasquest-room-";
let session = null; // active p2p session

export function destroyActive() {
  if (!session) return;
  session.alive = false;
  try { session.peer?.destroy(); } catch {}
  try { session.conn?.close(); } catch {}
  if (session.timerId) clearInterval(session.timerId);
  if (session.joinTimeout) clearInterval(session.joinTimeout);
  if (session.keyHandler) document.removeEventListener("keydown", session.keyHandler);
  if (session.onUnload) window.removeEventListener("beforeunload", session.onUnload);
  if (session.wrap) session.wrap.remove();
  document.body.classList.remove("in-versus");
  session = null;
}

/* Every game that can be played head-to-head. `stage` picks the renderer:
   "mcq" = shared question card, "map" = shared clickable world map. */
export const VERSUS_GAMES = [
  { id: "flags", label: "Flags", stage: "mcq" },
  { id: "capitals", label: "Capitals", stage: "mcq" },
  { id: "territories", label: "Territories", stage: "mcq" },
  { id: "history", label: "History Flags", stage: "mcq" },
  { id: "mappoint", label: "Map Master", stage: "map" },
  { id: "geoguesser", label: "GeoGuesser", stage: "map" },
];
const gameById = (id) => VERSUS_GAMES.find(g => g.id === id) || VERSUS_GAMES[0];

const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const QUESTION_SECONDS = 20;
const makeCode = () => Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");

function myIdentity() {
  const p = ensureProfile();
  const lvl = levelFromXp(gs().stats.xp);
  return { pid: null, code: p.code, name: p.name, avatar: p.avatar, level: lvl.level, xp: gs().stats.xp };
}

function rememberPlayer(info) {
  if (!info || !info.code) return;
  upsertMetPlayer({ code: info.code, name: info.name, avatar: info.avatar, level: info.level, xp: info.xp, lastSeen: Date.now() });
}

/* ================= page ================= */
export function versusPage() {
  destroyActive();
  const view = document.getElementById("view");
  view.innerHTML = "";
  const met = getMetPlayers().slice().sort((a, b) => b.xp - a.xp || b.level - a.level);

  const board = el("div", { class: "met-board" });
  const renderBoard = (liveCodes = new Set()) => {
    board.innerHTML = "";
    board.append(el("div", { class: "spread mb-1" },
      el("h3", { class: "h3" }, "Players you have met"),
      el("span", { class: "faint small" }, met.length ? `${met.length} explorers` : "")));
    if (!met.length) {
      board.append(el("div", { class: "empty" }, el("span", { class: "e-ico", html: icons.users }),
        "No explorers yet — host or join a match and everyone you play with shows up here."));
      return;
    }
    met.forEach((p, i) => {
      const live = liveCodes.has(p.code);
      board.append(el("div", { class: `friend-row${live ? " live" : ""}` },
        el("span", { class: "rank" }, `#${i + 1}`),
        avatarMini(p.avatar, p.name),
        el("div", { class: "spread" },
          el("div", {},
            el("div", { class: "fr-name" }, p.name, live ? el("span", { class: "live-dot", title: "in this match" }) : null),
            el("div", { class: "fr-meta" }, `Lv ${p.level} · ${fmtXp(p.xp)} XP`)),
          el("span", { class: `podium-medal${i === 0 ? " gold" : ""}` }, i === 0 ? icon("crown") : "")),
        live ? el("span", { class: "live-tag" }, "LIVE") : null));
    });
  };
  renderBoard();

  const card = el("div", { class: "card pad versus-card" },
    el("div", { class: "game-head" }, el("span", { class: "gh-icon", html: icons.swords })),
    el("h1", { class: "h1" }, "Versus"),
    el("p", { class: "sub" }, "Host a match, share the room code, and race your friends through the same questions live — scores update after every answer."));

  const lobbyZone = el("div", { class: "mt-3", id: "lobbyZone" });
  view.append(card, lobbyZone, el("h2", { class: "h2 mt-4" }, "Leaderboard"), board);

  // host controls — every game mode is available
  const gameSeg = el("div", { class: "seg wrap" });
  let chosenGame = "flags";
  const drawGameSeg = () => {
    gameSeg.innerHTML = "";
    gameSeg.append(el("div", { class: "seg-label" }, "Match game"));
    for (const g of VERSUS_GAMES) {
      gameSeg.append(el("button", {
        class: g.id === chosenGame ? "on" : "",
        onclick: () => { chosenGame = g.id; sfx.click(); drawGameSeg(); },
      }, g.label));
    }
  };
  drawGameSeg();
  let matchCount = 10;
  const countStepper = makeStepper(10, 3, 20, v => { matchCount = v; });
  card.append(el("div", { class: "stack mt-3" }, gameSeg, countStepper));

  const hostBtn = el("button", { class: "btn primary big", onclick: () => hostMatch(chosenGame, matchCount, lobbyZone) }, icon("swords"), "Host a match");
  const codeInput = el("input", { class: "input", placeholder: "ROOM CODE", maxlength: "4", style: { maxWidth: "150px", textAlign: "center", fontWeight: "800", letterSpacing: ".3em", textTransform: "uppercase" } });
  const joinBtn = el("button", { class: "btn big", onclick: () => {
    const code = codeInput.value.trim().toUpperCase();
    if (code.length !== 4) { toast("Room codes are 4 characters.", "alert"); return; }
    joinMatch(code, lobbyZone);
  } }, icon("users"), "Join");
  codeInput.addEventListener("keydown", e => { if (e.key === "Enter") joinBtn.click(); });
  card.append(el("div", { class: "row wrap mt-3", style: { justifyContent: "center" } }, hostBtn, codeInput, joinBtn));
}

/* ---------- host a challenge against a friend (used by the Friends page) ----------
   Same engine as a public room, but scoped to one friend code and started the
   moment they accept — no room code to copy around. */
export async function hostChallenge(friend, opts = {}) {
  const code = makeCode();
  const zone = el("div", { class: "card pad lobby" });
  // mount next to whatever page asked for it, else fall back to the view
  const mount = document.getElementById("lobbyZone") || document.getElementById("view");
  if (mount.id === "view") { mount.innerHTML = ""; mount.append(zone); }
  else { zone.id = "lobbyZone"; mount.append(zone); }
  zone.append(el("p", { class: "lobby-status" }, "Opening a challenge room…"));

  let peer;
  try { peer = await newPeer(code); }
  catch (e) { zone.innerHTML = ""; zone.append(el("p", { class: "sub" }, "✗ " + e.message)); return null; }

  const me = myIdentity();
  session = {
    role: "host", code, peer, conns: new Map(), players: new Map(),
    game: opts.game || "flags", count: opts.count || 10,
    region: "World", seed: opts.seed ?? Math.floor(Math.random() * 1e9),
    qi: 0, started: false, timerId: null, me, alive: true, lobbyZone: zone,
    challenge: { friendCode: friend.code, friendName: friend.name },
  };
  session.players.set("me", { ...me, pid: "me", score: 0, correct: 0, answeredCur: false, connected: true });

  peer.on("connection", conn => {
    conn.on("data", msg => hostOnData(conn, msg));
    conn.on("close", () => hostOnLeave(conn));
    conn.on("error", () => hostOnLeave(conn));
  });
  peer.on("error", e => toast(peerErrorMessage(e), "alert"));

  renderLobby(zone);
  return { code, seed: session.seed, game: session.game, count: session.count };
}

function makeStepper(value, min, max, onChange) {
  const input = el("input", { class: "input", type: "number", min, max, value, style: { width: "86px", textAlign: "center", fontWeight: "700" } });
  const wrap = el("div", { class: "seg" });
  wrap.append(el("div", { class: "seg-label" }, "Questions"));
  const set = (v) => { v = Math.max(min, Math.min(max, Math.round(v) || min)); input.value = v; onChange(v); sfx.click(); };
  wrap.append(el("button", { onclick: () => set(+input.value - 1) }, "\u2212"), input, el("button", { onclick: () => set(+input.value + 1) }, "+"));
  input.addEventListener("change", () => set(+input.value));
  return wrap;
}
function fmtXp(n) { return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n); }
function labelForGame(id) { return gameById(id).label; }
function avatarMini(avatar, name) {
  const isColor = typeof avatar === "string" && avatar.startsWith("#");
  const initials = (name || "?").trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return el("span", { class: "avatar-circle", style: { width: "40px", height: "40px", fontSize: ".9rem", background: isColor ? avatar : "var(--accent)" }, "aria-hidden": "true" }, initials);
}

/* ================= networking ================= */
async function newPeer(id) {
  if (!window.Peer) throw new Error("PeerJS failed to load");
  const peer = id ? new Peer(PREFIX + id) : new Peer();
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Match broker timeout — check your internet and try again.")), 12000);
    peer.on("open", () => { clearTimeout(t); resolve(); });
    peer.on("error", e => {
      clearTimeout(t);
      reject(Object.assign(new Error(peerErrorMessage(e)), { type: e.type }));
    });
  });
  return peer;
}
function peerErrorMessage(e) {
  if (e.type === "peer-unavailable") return "That room is not open — check the code.";
  if (e.type === "unavailable-id") return "That room code is already in use.";
  if (e.type === "network" || e.type === "server-error") return "Match broker unreachable — check your internet.";
  return e.message || "Connection error";
}

/* ---------------- HOST ---------------- */
async function hostMatch(game, count, lobbyZone) {
  destroyActive();
  const code = makeCode();
  const zone = el("div", { class: "card pad lobby" });
  lobbyZone.innerHTML = "";
  lobbyZone.append(zone);
  zone.append(el("p", { class: "lobby-status" }, "Opening room…"));

  let peer;
  try { peer = await newPeer(code); }
  catch (e) { zone.innerHTML = ""; zone.append(el("p", { class: "sub" }, "✗ " + e.message)); return; }

  const me = myIdentity();
  session = {
    role: "host", code, peer, conns: new Map(), players: new Map(), game, count,
    region: "World", seed: Math.floor(Math.random() * 1e9), qi: 0, started: false,
    timerId: null, me, alive: true, lobbyZone,
  };
  session.players.set("me", { ...me, pid: "me", score: 0, correct: 0, answeredCur: false, connected: true });

  peer.on("connection", conn => {
    conn.on("data", msg => hostOnData(conn, msg));
    conn.on("close", () => hostOnLeave(conn));
    conn.on("error", () => hostOnLeave(conn));
  });
  peer.on("error", e => toast(peerErrorMessage(e), "alert"));

  renderLobby(lobbyZone);
}

function hostOnData(conn, msg) {
  if (!session?.alive) return;
  if (msg.type === "hello") {
    // a challenge room only accepts the friend it was opened for
    if (session.challenge && msg.code !== session.challenge.friendCode) {
      conn.close();
      return;
    }
    rememberPlayer(msg);
    const player = { ...msg, pid: conn.peer, score: 0, correct: 0, answeredCur: false, connected: true };
    session.conns.set(conn.peer, conn);
    session.players.set(conn.peer, player);
    hostBroadcast({ type: "lobby", players: playersList(), host: session.me, settings: { game: session.game, count: session.count, region: session.region } });
    renderLobby(session.lobbyZone);
    sfx.correct(2);
    toast(`${msg.name} joined the room!`, "users");
    // a challenge starts the moment the invitee arrives — no room code needed
    if (session.challenge && !session.started) hostStart();
    return;
  }
  if (msg.type === "ans") {
    const p = session.players.get(conn.peer);
    if (!p || msg.qi !== session.qi || p.answeredCur) return;
    p.score += msg.gained; p.correct += msg.correct ? 1 : 0;
    p.answeredCur = true; p.lastCorrect = msg.correct;
    hostBroadcast({ type: "scores", board: playersList(), answered: answeredCount(), total: session.count });
    updateLiveBoard();
    maybeAdvance();
  }
}
function hostOnLeave(conn) {
  if (!session?.alive) return;
  const p = session.players.get(conn.peer);
  if (!p) return;
  p.connected = false;
  session.conns.delete(conn.peer);
  hostBroadcast({ type: "scores", board: playersList(), answered: answeredCount(), total: session.count });
  updateLiveBoard();
  toast(`${p.name} left the room`, "users");
}
function playersList() {
  if (session?.role === "host") return [...session.players.values()].map(p => ({ ...p }));
  // guests mirror the board the host sends
  return [...(session?.players?.values() || [])].map(p => ({ ...p }));
}
function answeredCount() {
  return [...(session?.players?.values() || [])].filter(p => p.connected && p.answeredCur).length;
}
/* Only the host relays. Guests have no conns map and must never broadcast. */
function hostBroadcast(msg) {
  if (session?.role !== "host" || !session.conns) return;
  for (const c of session.conns.values()) { try { c.send(msg); } catch {} }
}

function hostStart() {
  if (!session?.alive || session.started) return;
  session.started = true;
  session.qi = 0;
  session.match = { seed: session.seed, game: session.game, count: session.count, region: session.region };
  session.questions = buildQuestions(session.game, session.count, session.region, session.seed);
  for (const p of session.players.values()) { p.score = 0; p.correct = 0; p.answeredCur = false; }
  hostBroadcast({ type: "start", seed: session.seed, game: session.game, count: session.count, region: session.region });
  startQuestion();
}
function startQuestion() {
  if (!session.alive) return;
  for (const p of session.players.values()) p.answeredCur = false;
  if (session.role === "host") hostBroadcast({ type: "next", qi: session.qi });
  enterQuestion();
  clearInterval(session.timerId);
  let left = QUESTION_SECONDS;
  session.timerId = setInterval(() => {
    left--;
    const t = session.wrap?.querySelector(".vs-timer");
    if (t) t.textContent = `${left}s`;
    if (left <= 0) { clearInterval(session.timerId); maybeAdvance(true); }
  }, 1000);
}
function maybeAdvance(force = false) {
  if (!session?.alive || !session.started) return;
  const connected = [...session.players.values()].filter(p => p.connected);
  const allAnswered = connected.length > 0 && connected.every(p => p.answeredCur);
  if (force || allAnswered) {
    clearInterval(session.timerId);
    if (session.qi + 1 >= session.count) {
      finishMatch();
    } else {
      session.qi++;
      startQuestion();
    }
  } else {
    const waiting = session.wrap?.querySelector(".vs-waiting");
    const left = connected.length - answeredCount();
    if (waiting) waiting.textContent = `Waiting for ${left} player${left === 1 ? "" : "s"}…`;
  }
}

/* End of the last question. The host decides the result so both screens agree,
   and everyone sees the same podium at the same moment — no result codes. */
function finishMatch() {
  const board = playersList();
  hostBroadcast({ type: "end", board, seed: session.seed, game: session.game, count: session.count });
  showPodium(board);
}

/* ---------------- GUEST ----------------
   guestOnData used to be referenced here but never defined, so every message
   arriving after "open" threw and the lobby never rendered. */
function guestOnData(msg, lobbyZone) {
  const s = session;
  if (!s?.alive) return;

  if (msg.type === "lobby") {
    // the host is the authority on settings; adopt whatever it reports
    if (msg.settings) {
      s.game = msg.settings.game ?? s.game;
      s.count = msg.settings.count ?? s.count;
      s.region = msg.settings.region ?? s.region;
      s.match = { ...(s.match || {}), ...msg.settings };
    }
    if (msg.host) { s.host = msg.host; rememberPlayer(msg.host); }
    s.players = new Map((msg.players || []).map(p => [p.pid, p]));
    renderLobby(lobbyZone, msg);
    return;
  }

  if (msg.type === "scores") {
    s.players = new Map((msg.board || []).map(p => [p.pid, p]));
    updateLiveBoard();
    return;
  }

  if (msg.type === "start") {
    s.started = true;
    s.qi = 0;
    s.match = { seed: msg.seed, game: msg.game, count: msg.count, region: msg.region };
    // build the identical question set locally so the UI has something to show
    s.questions = buildQuestions(msg.game, msg.count, msg.region, msg.seed);
    destroyStage();
    const view = document.getElementById("view");
    if (view) view.innerHTML = "";
    toast("Match started — good luck!", "swords");
    startQuestion();
    return;
  }

  if (msg.type === "next") {
    s.qi = msg.qi;
    startQuestion();
    return;
  }

  if (msg.type === "end") {
    clearInterval(s.timerId);
    showPodium(msg.board || playersList());
    return;
  }
}

async function joinMatch(code, lobbyZone) {
  destroyActive();
  const zone = el("div", { class: "card pad lobby" });
  lobbyZone.innerHTML = "";
  lobbyZone.append(zone);
  zone.append(el("p", { class: "lobby-status" }, "Connecting to room " + code + "…"));

  let peer;
  try { peer = await newPeer(null); }
  catch (e) { zone.innerHTML = ""; zone.append(el("p", { class: "sub" }, "\u2717 " + e.message)); return; }

  // session first, then identity, then connection
  session = {
    role: "guest", code, peer, conn: null, me: myIdentity(), alive: true,
    started: false, qi: -1, score: 0, correct: 0, timerId: null, players: new Map(), connected: false,
  };
  session.me.pid = peer.id || null;

  const wireConn = (c) => {
    c.on("open", () => {
      session.connected = true;
      session.conn = c;
      clearInterval(session.joinTimeout);
      c.send({ type: "hello", ...session.me });
      renderLobby(lobbyZone);
    });
    c.on("data", msg => guestOnData(msg, lobbyZone));
    c.on("close", () => {
      if (!session.alive) return;
      destroyActive();
      toast("The host closed the room.", "alert");
      versusPage();
    });
    c.on("error", () => {});
  };

  let conn = peer.connect(PREFIX + code, { reliable: true });
  wireConn(conn);

  // broker hiccups happen: retry the connection up to 3 more times
  let attempts = 0;
  session.joinTimeout = setInterval(() => {
    if (!session?.alive || session.connected) { clearInterval(session.joinTimeout); return; }
    attempts++;
    if (attempts <= 3) {
      try { conn.close(); } catch {}
      conn = peer.connect(PREFIX + code, { reliable: true });
      wireConn(conn);
      return;
    }
    clearInterval(session.joinTimeout);
    zone.innerHTML = "";
    zone.append(el("p", { class: "sub" }, "\u2717 Room " + code + " is not open \u2014 check the code and try again."));
    try { peer.destroy(); } catch {}
    destroyActive();
  }, 4000);

  peer.on("error", e => {
    if (!session?.alive) return;
    if (session.connected) toast(peerErrorMessage(e), "alert");
  });
}

/* debug/testing handle (harmless in production) */
if (typeof window !== "undefined") {
  window.__vs = { hostMatch, joinMatch, hostChallenge, getSession: () => session, vsPage: versusPage };
}

/* ================= shared match UI ================= */
/** Every mode reduces to the same question shape so the stage stays generic. */
function buildQuestions(game, count, region, seed) {
  const rand = rng(seed);
  const spec = gameById(game);
  if (spec.stage === "map") return buildMapQuestions(game, count, region, rand);

  let qs;
  if (game === "capitals") qs = capitalQuestions({ count, region, mode: "mcq", rand });
  else if (game === "territories") qs = territoryQuestions({ count, mode: "mcq", rand });
  else if (game === "history") qs = historyQuestions({ count, rand });
  else qs = flagQuestions({ count, region, mode: "mcq", rand });
  return qs.map((q, i) => ({ ...q, qi: i, kind: "mcq" }));
}

/* Map Master and GeoGuesser are click-the-map games. They share one stage:
   a Leaflet world map, each player drops their own pin, the host scores by
   distance (GeoGuesser) or exact country hit (Map Master). */
function buildMapQuestions(game, count, region, rand) {
  const specs = game === "geoguesser"
    ? buildGeoSpots(count, region, rand)
    : shuffleCountries(region, count, rand).map(c => ({ cca3: c.cca3, kind: "country" }));
  return specs.map((sp, i) => ({ ...sp, qi: i, kind: "map", game }));
}

function shuffleCountries(region, count, rand) {
  const pool = data.countries.filter(c => (region === "World" || c.region === region) && c.unMember);
  const out = [];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return out.slice(0, count);
}

const EARTH_R = 6371;
function haversineKm(a, b) {
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.sqrt(s));
}
const geoScore = (km) => Math.round(5000 * Math.exp(-10 * km / 14916));

function buildGeoSpots(count, region, rand) {
  const spots = [];
  const seen = new Set();
  let guard = 0;
  while (spots.length < count && guard++ < 500) {
    const c = data.cities[Math.floor(rand() * data.cities.length)];
    if (!c) break;
    const country = data.byCca2.get(c.cc);
    if (!country) continue;
    if (region !== "World" && country.region !== region) continue;
    const key = `${c.n}-${c.lat}`;
    if (seen.has(key)) continue;
    // keep spots at least 60 km apart so rounds stay varied
    if (spots.some(p => haversineKm(p, c) < 60)) continue;
    seen.add(key);
    spots.push({ lat: c.lat, lng: c.lng, name: c.n, cca3: country.cca3, kind: "geo" });
  }
  return spots;
}

function enterQuestion() {
  if (!session?.alive || !session.started) return;
  const s = session;
  s.answered = false;
  destroyStage();
  const wrap = el("div", { class: "geo-wrap vs-stage" });
  document.body.append(wrap);
  document.body.classList.add("in-versus");
  s.wrap = wrap;

  const hud = el("div", { class: "geo-hud" },
    el("span", { class: "geo-badge" }, `Q${s.qi + 1}/${s.match.count}`),
    el("span", { class: "geo-badge" }, icon("target"), el("span", { class: "vs-score" }, String(s.score))),
    el("span", { class: "geo-badge vs-timer" }, `${QUESTION_SECONDS}s`),
    el("span", { style: { flex: "1" } }),
    el("button", { class: "geo-badge", style: { cursor: "pointer" }, onclick: () => quitMatch() }, "Quit"));
  wrap.append(hud);

  const board = el("div", { class: "vs-board" });
  const qzone = el("div", { class: "vs-qzone" });
  board.append(qzone);
  wrap.append(board);

  const standings = el("div", { class: "vs-standings" });
  wrap.append(standings);

  const questions = s.questions || (s.questions = buildQuestions(s.match.game, s.match.count, s.match.region, s.match.seed));
  const q = questions[s.qi];
  if (!q) { destroyActive(); versusPage(); return; }

  sfx.click();
  if (q.kind === "map") renderMapQuestion(s, q, qzone, wrap);
  else renderMcqQuestion(s, q, qzone);

  updateLiveBoard();
}

function quitMatch() {
  destroyActive();
  versusPage();
}

function renderMcqQuestion(s, q, qzone) {
  qzone.append(
    el("p", { class: "quiz-q" }, q.prompt),
    q.flag ? (() => { const i = el("img", { class: "quiz-flagsvg", src: q.flag, alt: "" }); i.addEventListener("error", () => i.style.display = "none"); return i; })() : null
  );
  const grid = el("div", { class: "choices" });
  q.choices.forEach((c, idx) => {
    const b = el("button", { class: "choice", onclick: () => answerVs(s, idx, b) },
      el("span", { class: "ckey" }, String(idx + 1)),
      c.flag ? el("img", { class: "cflag", src: c.flag, alt: "" }) : null,
      el("span", {}, c.label));
    grid.append(b);
  });
  qzone.append(grid);
  const onKey = (e) => { const n = parseInt(e.key); if (n >= 1 && n <= q.choices.length && !s.answered) answerVs(s, n - 1); };
  document.addEventListener("keydown", onKey);
  s.keyHandler = onKey;
}

/* ---------- map stage (Map Master + GeoGuesser) ---------- */
async function renderMapQuestion(s, q, qzone, wrap) {
  const isGeo = q.kind === "geo";
  qzone.append(
    el("p", { class: "quiz-q" }, isGeo ? "Drop your pin as close as you can" : "Find the highlighted country"),
    el("p", { class: "quiz-qsub" }, isGeo ? `${q.name} · ${data.byCca3.get(q.cca3)?.name || ""}` : "")
  );

  const mapEl = el("div", { class: "vs-map" });
  wrap.append(mapEl);

  const map = L.map(mapEl, {
    zoomControl: true, attributionControl: false,
    minZoom: 1.4, maxZoom: isGeo ? 10 : 7, zoomSnap: 0.25,
    worldCopyJump: true, center: isGeo ? [q.lat, q.lng] : [24, 10], zoom: isGeo ? 4 : 1.6,
  });
  s.map = map;

  const feats = await loadVersusWorld();
  if (!s.alive || !feats) { try { map.remove(); } catch {} return; }

  const cs = getComputedStyle(document.documentElement);
  const cv = (n) => cs.getPropertyValue(n).trim() || "#888";
  const colors = { ink: cv("--ink"), paper3: cv("--paper-3"), accent: cv("--accent") };

  s.layers = L.geoJSON({ type: "FeatureCollection", features: feats }, {
    style: () => ({ color: colors.ink, weight: 1, fillColor: colors.paper3, fillOpacity: 1 }),
    interactive: true,
    onEachFeature: (f, layer) => layer.on("click", (e) => onMapClick(s, q, f, e.latlng)),
  }).addTo(map);

  if (!isGeo) {
    // highlight the target, but only for the guest once the round is live
    s.layers.eachLayer(l => { if (l.feature.cca3 === q.cca3) l.setStyle({ fillColor: colors.accent }); });
  }
  s.pin = null;
  s.answerBtn = el("button", { class: "btn primary", disabled: true, onclick: () => submitMapAnswer(s, q) }, isGeo ? "Drop pin here" : "Lock in country");
  qzone.append(el("div", { class: "row", style: { justifyContent: "center" } }, s.answerBtn));
  updateLiveBoard();
}

let worldPromise = null;
async function loadVersusWorld() {
  if (worldPromise) return worldPromise;
  worldPromise = (async () => {
    try {
      const topo = await (await fetch("data/world-50m.json")).json();
      const fixes = { "Kosovo": "UNK", "Somaliland": null, "N. Cyprus": null };
      return topojson.feature(topo, topo.objects.countries).features
        .map(f => {
          let cca3 = null;
          if (f.id && data.isoByNum?.get(f.id)) cca3 = data.isoByNum.get(f.id).cca3;
          if (!cca3 && fixes[f.properties?.name] !== undefined) cca3 = fixes[f.properties.name];
          return { ...f, cca3 };
        })
        .filter(f => f.cca3 && data.byCca3.has(f.cca3));
    } catch (e) {
      console.warn("versus world map failed:", e);
      return null;
    }
  })();
  return worldPromise;
}

function onMapClick(s, q, feature, latlng) {
  if (s.answered || !s.alive) return;
  if (q.kind === "geo") {
    // the pin is dragged from wherever the player first clicked
    if (!s.pin) {
      s.pin = L.marker(latlng, { draggable: true }).addTo(s.map);
      s.pin.on("dragend", e => { s.chosen = e.target.getLatLng(); });
    } else {
      s.pin.setLatLng(latlng);
    }
    s.chosen = s.pin.getLatLng();
  } else {
    s.chosen = { cca3: feature.cca3 };
    s.layers.eachLayer(l => l.setStyle({ fillColor: l.feature.cca3 === feature.cca3 ? colorsFor(s).accent : colorsFor(s).paper3, fillOpacity: 1 }));
  }
  if (s.answerBtn) s.answerBtn.disabled = false;
}

function colorsFor(s) {
  const cs = getComputedStyle(document.documentElement);
  return { ink: cs.getPropertyValue("--ink").trim(), paper3: cs.getPropertyValue("--paper-3").trim(), accent: cs.getPropertyValue("--accent").trim() };
}

function submitMapAnswer(s, q) {
  if (s.answered || !s.chosen) return;
  const correct = q.kind === "geo"
    ? geoScore(haversineKm(s.chosen, { lat: q.lat, lng: q.lng }))
    : (s.chosen.cca3 === q.cca3 ? 1000 : 0);
  const gained = Math.max(0, Math.round(correct));
  const isHit = q.kind === "geo" ? gained > 0 : s.chosen.cca3 === q.cca3;

  s.answered = true;
  if (s.answerBtn) { s.answerBtn.disabled = true; s.answerBtn.textContent = "Locked in"; }
  if (gained > 0) { s.score = (Number(s.score) || 0) + gained; s.correct = (Number(s.correct) || 0) + 1; sfx.correct(2); confetti(innerWidth / 2, innerHeight / 2.4, 40); addXp(8); }
  else sfx.wrong();

  // reveal the true location
  if (q.kind === "geo") L.circleMarker([q.lat, q.lng], { radius: 9, color: colorsFor(s).ink, weight: 3, fillColor: colorsFor(s).accent, fillOpacity: .9 }).addTo(s.map);
  if (q.kind === "country") {
    const c = colorsFor(s);
    s.layers.eachLayer(l => l.setStyle({ fillColor: l.feature.cca3 === q.cca3 ? c.accent : c.paper3, weight: l.feature.cca3 === q.cca3 ? 3 : 1 }));
  }

  if (s.role === "host") {
    const me = s.players.get("me");
    me.score = Number(s.score) || 0; me.correct = Number(s.correct) || 0; me.answeredCur = true;
    hostBroadcast({ type: "scores", board: playersList(), answered: answeredCount(), total: s.match.count });
    updateLiveBoard();
    maybeAdvance();
  } else {
    s.conn.send({ type: "ans", qi: s.qi, correct: isHit, gained, map: { cca3: s.chosen.cca3 ?? null, lat: s.chosen.lat, lng: s.chosen.lng } });
    const waiting = el("p", { class: "vs-waiting muted small" }, "Waiting for other players…");
    s.wrap?.querySelector(".vs-qzone").append(waiting);
    updateLiveBoard();
  }
}

function answerVs(s, idx, btn) {
  if (s.answered) return;
  s.answered = true;
  const q = s.questions[s.qi];
  const correct = idx === q.answerIdx;
  if (btn) {
    btn.classList.add(correct ? "correct" : "wrong");
    [...btn.parentElement.children].forEach(b => { if (b !== btn) b.classList.add("dim"); b.disabled = true; });
  }
  const gained = correct ? 1000 : 0;
  if (correct) { s.score = (Number(s.score) || 0) + gained; s.correct = (Number(s.correct) || 0) + 1; sfx.correct(2); confetti(innerWidth / 2, innerHeight / 2.4, 40); addXp(8); }
  else sfx.wrong();

  // reveal correct choice
  if (q.kind === "mcq") {
    const grid = s.wrap?.querySelector(".choices");
    if (grid) [...grid.children].forEach((b, i) => { if (i === q.answerIdx) b.classList.add("correct"); b.disabled = true; });
  }

  if (s.role === "host") {
    const me = s.players.get("me");
    me.score = Number(s.score) || 0; me.correct = Number(s.correct) || 0; me.answeredCur = true;
    hostBroadcast({ type: "scores", board: playersList(), answered: answeredCount(), total: s.match.count });
    updateLiveBoard();
    maybeAdvance();
  } else {
    s.conn.send({ type: "ans", qi: s.qi, correct, gained });
    const waiting = el("p", { class: "vs-waiting muted small" }, "Waiting for other players…");
    s.wrap?.querySelector(".vs-qzone").append(waiting);
    updateLiveBoard();
  }
}

function destroyStage() {
  const s = session;
  if (!s) return;
  try { s.map?.remove(); } catch {}
  if (s.wrap) { s.wrap.remove(); s.wrap = null; }
  if (s.keyHandler) { document.removeEventListener("keydown", s.keyHandler); s.keyHandler = null; }
  s.map = null; s.layers = null; s.pin = null; s.chosen = null;
  document.body.classList.remove("in-versus");
}

function updateLiveBoard() {
  const box = session?.wrap?.querySelector(".vs-standings");
  if (!box) return;
  const rows = [...session.players.values()]
    .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0))
    .map((p, i) => makeStandingsRow(p, i));
  box.innerHTML = "";
  box.append(el("h3", { class: "h3" }, "Live standings"), ...rows);
}

function makeStandingsRow(p, i) {
  const score = Math.round(Number(p.score) || 0);
  const isMe = p.pid === (session.me?.pid || "me");
  const row = el("div", { class: "vs-row" + (isMe ? " me" : "") });
  row.append(
    el("span", { class: "vs-rank" }, "#" + (i + 1)),
    avatarMini(p.avatar, p.name),
    el("div", { class: "vs-row-info" },
      el("div", { class: "vs-row-name" }, p.name + (p.connected === false ? " (left)" : "")),
      el("div", { class: "vs-row-meta" }, "Lv " + p.level)),
    el("span", { class: "vs-row-score" }, String(score))
  );
  return row;
}

/* ================= lobby ================= */
function renderLobby(lobbyZone, guestMsg = null) {
  if (!session?.alive) return;
  const zone = lobbyZone || document.getElementById("lobbyZone");
  const players = playersList();
  const isHost = session.role === "host";
  const settings = guestMsg?.settings || { game: session.game, count: session.count, region: session.region };
  zone.innerHTML = "";
  const lobby = el("div", { class: "card pad lobby" });
  const challenger = session.challenge;
  lobby.append(
    el("div", { class: "spread" },
      el("div", {},
        el("h2", { class: "h2" }, isHost
          ? (challenger ? `Challenging ${challenger.friendName}` : "Your room is open")
          : "Joined room " + session.code),
        el("p", { class: "faint small" }, isHost
          ? (challenger ? "Waiting for them to accept — the match starts the moment they join." : "Share the code — friends join from the Versus page.")
          : (challenger ? `${challenger.friendName} challenged you — get ready!` : "Waiting for the host to start…"))),
      el("div", { class: "code-badge" }, session.code)
    ),
    el("div", { class: "row mt-1" },
      el("button", { class: "btn small", onclick: () => { navigator.clipboard?.writeText(session.code); toast("Room code copied!", "clipboard"); } }, icon("clipboard"), "Copy code")),
    el("h3", { class: "h3 mt-2" }, `Players (${players.length})`),
    el("div", { class: "stack" },
      players.map((p, i) => el("div", { class: `friend-row${p.connected === false ? " left" : ""}` },
        el("span", { class: "rank" }, `#${i + 1}`),
        avatarMini(p.avatar, p.name),
        el("div", { class: "spread" },
          el("div", {},
            el("div", { class: "fr-name" }, p.name),
            el("div", { class: "fr-meta" }, `Lv ${p.level} · ${fmtXp(p.xp)} XP`)),
          el("span", { class: isHost && p.pid === "me" ? "live-tag" : "faint small" }, isHost && p.pid === "me" ? "HOST" : (p.connected === false ? "left" : "ready")))))),
    el("p", { class: "faint small mt-1" },
      `Match: ${labelForGame(settings.game)} · ${settings.count} questions · ${settings.region}`)
  );
  if (isHost) {
    const others = players.filter(p => p.pid !== "me" && p.connected !== false).length;
    lobby.append(el("div", { class: "mt-2" },
      el("button", { class: "btn primary big", onclick: hostStart, disabled: others < 1 }, icon("play"), "Start match"),
      others < 1 ? el("p", { class: "faint small", style: { margin: "8px 0 0" } }, "Waiting for someone to join the room…") : null));
  }
  zone.append(lobby);
}

/* ================= podium ================= */
function makePodiumScore(p) {
  const span = el("span", { class: "vs-row-score" });
  span.textContent = String(Math.round(Number(p.score) || 0));
  return span;
}

function makePodiumRow(p, i, total) {
  const medals = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];
  const isMe = p.pid === (session?.me?.pid || "me");
  const row = el("div", { class: "friend-row podium-row" + (i === 0 ? " gold" : "") + (isMe ? " me" : "") });
  row.append(
    el("span", { class: "podium-medal" }, medals[i] || "#" + (i + 1)),
    avatarMini(p.avatar, p.name)
  );
  const info = el("div", { class: "spread" });
  const left = el("div", {});
  left.append(
    el("div", { class: "fr-name" }, p.name + (isMe ? el("span", { class: "live-tag" }, " YOU") : null)),
    el("div", { class: "fr-meta" }, "Lv " + p.level + " · " + (Number(p.correct) || 0) + "/" + (total || "?") + " correct")
  );
  info.append(left, makePodiumScore(p));
  row.append(info);
  return row;
}

function showPodium(board) {
  if (!session?.alive) return;
  const s = session;
  const sorted = [...board]
    .map(p => ({ ...p, score: Number(p.score) || 0, correct: Number(p.correct) || 0 }))
    .sort((a, b) => b.score - a.score || b.correct - a.correct);
  const myPid = s.me?.pid || "me";
  const myRow = sorted.find(p => p.pid === myPid);
  const total = s.match?.count || s.count || sorted.length;
  const gameLabel = labelForGame(s.match?.game || s.game);
  const iWon = sorted.length > 0 && sorted[0].pid === myPid;

  recordGame("versus", { score: myRow ? myRow.score : 0, correct: myRow ? myRow.correct : 0, total, bestStreak: 0 });
  sfx.fanfare();
  if (iWon) confetti(innerWidth / 2, innerHeight / 2.4, 220);
  destroyStage();

  const view = document.getElementById("view");
  view.innerHTML = "";
  const hero = el("div", { class: "score-hero" });
  hero.append(
    el("div", { class: "faint small", style: { letterSpacing: ".12em", textTransform: "uppercase", fontWeight: "800" } }, "Match over · " + gameLabel),
    el("div", { class: "sh-num grad-text", style: { margin: "10px 0 4px" } }, iWon ? "VICTORY" : "#" + (myRow ? sorted.indexOf(myRow) + 1 : "-")),
    el("div", { class: "muted" }, (myRow ? myRow.score.toLocaleString() : "0") + " points · " + (myRow ? myRow.correct : 0) + "/" + total + " correct · +" + (myRow ? myRow.correct * 8 : 0) + " XP")
  );
  const standingsBox = el("div", { class: "mt-2 stack", style: { gap: "8px" } });
  sorted.slice(0, 8).forEach((p, i) => standingsBox.append(makePodiumRow(p, i, total)));
  hero.append(standingsBox);

  // share card: renders names + stats to a canvas the player can download
  let shareCanvas = null;
  const shareBtn = el("button", { class: "btn", onclick: () => downloadShareCard(sorted, total, gameLabel) }, icon("share"), "Share result");
  const actions = el("div", { class: "row", style: { justifyContent: "center", flexWrap: "wrap", gap: "10px" } });
  actions.append(
    el("button", { class: "btn primary big", onclick: () => versusPage() }, icon("refresh"), "Back to Versus"),
    shareBtn,
    el("button", { class: "btn ghost", onclick: goHomeFromResult }, icon("home"), "Home")
  );
  view.append(el("div", { class: "result-wrap" }, hero, actions));
  document.body.classList.remove("in-versus");

  // let the "end" broadcast flush to everyone before tearing down the peer
  setTimeout(() => destroyActive(), 1500);
}

/* Home must work even when the hash is already "#/" (no hashchange fires),
   so force the router to re-run instead of assigning the same hash. */
function goHomeFromResult() {
  destroyActive();
  if (location.hash === "#/" || location.hash === "") {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    location.hash = "#/";
  }
}

/* ---------- downloadable share card ---------- */
function downloadShareCard(sorted, total, gameLabel) {
  const W = 1000, rowH = 96, headH = 250, footH = 96;
  const H = headH + rowH * Math.max(1, sorted.length) + footH;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const g = cv.getContext("2d");

  const cs = getComputedStyle(document.documentElement);
  const cv2 = (n, fallback) => (cs.getPropertyValue(n).trim() || fallback);
  const ink = cv2("--ink", "#e5f0da");
  const accent = cv2("--accent", "#7cc961");
  const paper = cv2("--paper", "#131a12");

  g.fillStyle = paper; g.fillRect(0, 0, W, H);
  // header band
  g.fillStyle = accent;
  g.fillRect(0, 0, W, 16);
  g.fillStyle = ink;
  g.font = "700 62px Lilita One, Arial Black, sans-serif";
  g.textBaseline = "top";
  g.fillText("AtlasQuest", 48, 48);
  g.font = "700 30px Space Mono, monospace";
  g.fillStyle = accent;
  g.fillText("VERSUS · " + gameLabel.toUpperCase(), 48, 126);
  g.fillStyle = ink;
  g.font = "400 26px Space Mono, monospace";
  g.fillText(`${sorted.length} players · ${total} questions`, 48, 174);

  sorted.forEach((p, i) => {
    const y = headH + i * rowH;
    const isMe = p.pid === (session?.me?.pid || "me");
    if (isMe) {
      g.fillStyle = accent + "22";
      g.fillRect(28, y, W - 56, rowH - 12);
    }
    // avatar disc with initials
    const initials = (p.name || "?").trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
    g.beginPath(); g.arc(76, y + (rowH - 12) / 2, 30, 0, Math.PI * 2);
    g.fillStyle = (typeof p.avatar === "string" && p.avatar.startsWith("#")) ? p.avatar : accent;
    g.fill();
    g.fillStyle = "#07121f";
    g.font = "700 28px Lilita One, Arial Black, sans-serif";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(initials, 76, y + (rowH - 12) / 2 + 2);
    g.textAlign = "left"; g.textBaseline = "top";

    g.fillStyle = ink;
    g.font = "700 34px Lilita One, Arial Black, sans-serif";
    g.fillText(`${i + 1}. ${p.name || "Explorer"}`, 128, y + 10);
    g.fillStyle = accent;
    g.font = "400 22px Space Mono, monospace";
    g.fillText(`Lv ${p.level || 1} · ${p.correct || 0}/${total} correct`, 128, y + 50);
    // score, right aligned
    g.fillStyle = ink;
    g.font = "700 44px Lilita One, Arial Black, sans-serif";
    g.textAlign = "right";
    g.fillText(Math.round(Number(p.score) || 0).toLocaleString(), W - 48, y + 22);
    g.textAlign = "left";
    g.strokeStyle = ink + "33"; g.lineWidth = 2;
    g.beginPath(); g.moveTo(48, y + rowH - 14); g.lineTo(W - 48, y + rowH - 14); g.stroke();
  });

  g.fillStyle = ink + "aa";
  g.font = "400 22px Space Mono, monospace";
  g.fillText("atlasquest — explore the world", 48, H - 62);

  const a = document.createElement("a");
  a.download = `atlasquest-versus-${gameLabel.toLowerCase()}.png`;
  a.href = cv.toDataURL("image/png");
  a.click();
  toast("Share card downloaded!", "share");
}
