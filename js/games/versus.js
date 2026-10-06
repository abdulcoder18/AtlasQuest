// AtlasQuest — Versus: host/join real-time matches with friends over WebRTC (PeerJS).
// Host = authority: owns room, relays state. Everyone plays identical seeded questions.
// Also powers the "players met" leaderboard (level + XP of everyone you've played with).
import { el, icon, icons, sfx, confetti, toast } from "../ui.js";
import { data, flagQuestions, capitalQuestions, territoryQuestions, rng } from "../data.js";
import { addXp, recordGame, getState as gs, save, levelFromXp, ensureProfile, upsertMetPlayer, getMetPlayers } from "../store.js";
import { openLore } from "../lore.js";

const PREFIX = "atlasquest-room-";
let session = null; // active p2p session

export function destroyActive() {
  if (!session) return;
  try { session.peer?.destroy(); } catch {}
  if (session.timerId) clearInterval(session.timerId);
  document.body.classList.remove("in-versus");
  session = null;
}

const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
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

  // host controls
  const gameSeg = el("div", { class: "seg" });
  const games = [
    ["flags", "Flags"], ["capitals", "Capitals"], ["territories", "Territories"],
  ];
  let chosenGame = "flags";
  const drawGameSeg = () => {
    gameSeg.innerHTML = "";
    gameSeg.append(el("div", { class: "seg-label" }, "Match game"));
    for (const [v, l] of games) gameSeg.append(el("button", { class: v === chosenGame ? "on" : "", onclick: () => { chosenGame = v; sfx.click(); drawGameSeg(); } }, l));
  };
  drawGameSeg();
  const countStepper = makeStepper(10, 3, 20, v => { matchCount = v; });
  let matchCount = 10;
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
    timerId: null, me, alive: true,
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
    rememberPlayer(msg);
    const player = { ...msg, pid: conn.peer, score: 0, correct: 0, answeredCur: false, connected: true };
    session.conns.set(conn.peer, conn);
    session.players.set(conn.peer, player);
    hostBroadcast({ type: "lobby", players: playersList(), host: session.me, settings: { game: session.game, count: session.count, region: session.region } });
    hostBroadcastMeta();
    renderLobby(document.getElementById("lobbyZone"));
    sfx.correct(2);
    toast(`${msg.name} joined the room!`, "users");
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
function playersList() { return [...session.players.values()].map(p => ({ ...p })); }
function answeredCount() { return [...session.players.values()].filter(p => p.connected && p.answeredCur).length; }
function hostBroadcast(msg) { for (const c of session.conns.values()) { try { c.send(msg); } catch {} } }

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
  hostBroadcast({ type: "next", qi: session.qi });
  enterQuestion();
  clearInterval(session.timerId);
  let left = 20;
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
  const allAnswered = connected.every(p => p.answeredCur);
  if (force || allAnswered) {
    clearInterval(session.timerId);
    if (session.qi + 1 >= session.count) {
      hostBroadcast({ type: "end", board: playersList() });
      showPodium(playersList());
    } else {
      session.qi++;
      startQuestion();
    }
  } else {
    const waiting = session.wrap?.querySelector(".vs-waiting");
    if (waiting) waiting.textContent = `Waiting for ${connected.length - answeredCount()} player(s)…`;
  }
}

/* ---------------- GUEST ---------------- */
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
  window.__vs = { hostMatch, joinMatch, getSession: () => session, vsPage: versusPage };
}

/* ================= shared match UI ================= */
function buildQuestions(game, count, region, seed) {
  const rand = rng(seed);
  if (game === "capitals") return capitalQuestions({ count, region, mode: "mcq", rand });
  if (game === "territories") return territoryQuestions({ count, rand });
  return flagQuestions({ count, region, mode: "mcq", rand });
}

function enterQuestion() {
  if (!session?.alive || !session.started) return;
  const s = session;
  s.answered = false;
  // full-screen match stage
  destroyStage();
  const wrap = el("div", { class: "geo-wrap vs-stage" });
  document.body.append(wrap);
  document.body.classList.add("in-versus");
  s.wrap = wrap;

  const hud = el("div", { class: "geo-hud" },
    el("span", { class: "geo-badge" }, `Q${s.qi + 1}/${s.match.count}`),
    el("span", { class: "geo-badge" }, icon("target"), el("span", { class: "vs-score" }, String(s.score))),
    el("span", { class: "geo-badge vs-timer" }, "20s"),
    el("span", { style: { flex: "1" } }),
    el("button", { class: "geo-badge", style: { cursor: "pointer" }, onclick: () => { destroyActive(); versusPage(); } }, "Quit"));
  wrap.append(hud);

  const board = el("div", { class: "vs-board" });
  const qzone = el("div", { class: "vs-qzone" });
  board.append(qzone);
  wrap.append(board);

  const standings = el("div", { class: "vs-standings" });
  wrap.append(standings);

  const questions = s.role === "host" ? s.questions : (s.questions ||= buildQuestions(s.match.game, s.match.count, s.match.region, s.match.seed));
  const q = questions[s.qi];
  s.questions = questions;

  sfx.click();
  qzone.append(
    el("p", { class: "quiz-q" }, q.prompt),
    q.flag ? (() => { const i = el("img", { class: "quiz-flagsvg", src: q.flag, alt: "" }); i.addEventListener("error", () => i.style.display = "none"); return i; })() : null
  );

  if (q.kind === "mcq") {
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
  updateLiveBoard();
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
  if (session?.wrap) { session.wrap.remove(); session.wrap = null; }
  if (session?.keyHandler) { document.removeEventListener("keydown", session.keyHandler); session.keyHandler = null; }
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
  lobby.append(
    el("div", { class: "spread" },
      el("div", {},
        el("h2", { class: "h2" }, isHost ? "Your room is open" : "Joined room " + session.code),
        el("p", { class: "faint small" }, isHost ? "Share the code — friends join from the Versus page." : "Waiting for the host to start…")),
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
    el("p", { class: "faint small mt-1" }, `Match: ${settings.game} · ${settings.count} questions · ${settings.region}`)
  );
  if (isHost) lobby.append(el("div", { class: "mt-2" },
    el("button", { class: "btn primary big", onclick: hostStart, disabled: players.length < 1 }, icon("play"), "Start match")));
  zone.append(lobby);
}

/* ================= podium ================= */
function makePodiumScore(p) {
  const span = el("span", { class: "vs-row-score" });
  span.textContent = String(Math.round(Number(p.score) || 0));
  return span;
}

function makePodiumRow(p, i) {
  const medals = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];
  const row = el("div", { class: "friend-row podium-row" + (i === 0 ? " gold" : "") });
  row.append(
    el("span", { class: "podium-medal" }, medals[i] || "#" + (i + 1)),
    avatarMini(p.avatar, p.name)
  );
  const info = el("div", { class: "spread" });
  const left = el("div", {});
  left.append(
    el("div", { class: "fr-name" }, p.name),
    el("div", { class: "fr-meta" }, "Lv " + p.level + " \u00b7 " + (Number(p.correct) || 0) + " correct")
  );
  info.append(left, makePodiumScore(p));
  row.append(info);
  return row;
}

function showPodium(board) {
  if (!session?.alive) return;
  const sorted = [...board]
    .map(p => ({ ...p, score: Number(p.score) || 0, correct: Number(p.correct) || 0 }))
    .sort((a, b) => b.score - a.score || b.correct - a.correct);
  const myPid = session.me?.pid || "me";
  const myRow = sorted.find(p => p.pid === myPid);
  const total = session.match?.count || session.count || sorted.length;
  const iWon = sorted.length > 0 && sorted[0].pid === myPid;

  recordGame("versus", {
    score: myRow ? myRow.score : 0,
    correct: myRow ? myRow.correct : 0,
    total,
    bestStreak: 0,
  });
  sfx.fanfare();
  if (iWon) confetti(innerWidth / 2, innerHeight / 2.4, 220);
  destroyStage();

  const view = document.getElementById("view");
  view.innerHTML = "";
  const hero = el("div", { class: "score-hero" });
  hero.append(
    el("div", { class: "faint small", style: { letterSpacing: ".12em", textTransform: "uppercase", fontWeight: "800" } }, "Match over"),
    el("div", { class: "sh-num grad-text", style: { margin: "10px 0 4px" } }, iWon ? "VICTORY" : "#" + (myRow ? sorted.indexOf(myRow) + 1 : "-")),
    el("div", { class: "muted" }, (myRow ? myRow.score.toLocaleString() : "0") + " points \u00b7 " + (myRow ? myRow.correct : 0) + " correct \u00b7 +" + (myRow ? myRow.correct * 8 : 0) + " XP")
  );
  const standingsBox = el("div", { class: "mt-2 stack", style: { gap: "8px" } });
  sorted.slice(0, 8).forEach((p, i) => standingsBox.append(makePodiumRow(p, i)));
  hero.append(standingsBox);

  const actions = el("div", { class: "row", style: { justifyContent: "center", flexWrap: "wrap", gap: "10px" } });
  actions.append(
    el("button", { class: "btn primary big", onclick: () => versusPage() }, icon("refresh"), "Back to Versus"),
    el("button", { class: "btn ghost", onclick: () => location.hash = "#/" }, "Home")
  );
  view.append(el("div", { class: "result-wrap" }, hero, actions));
  document.body.classList.remove("in-versus");
  // let the "end" message flush to guests before tearing down the peer
  setTimeout(() => destroyActive(), 1200);
}
