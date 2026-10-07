// AtlasQuest — local store: profile, settings, stats, friends. Persisted in localStorage.
const KEY = "atlasquest_v1";

export const AVATAR_COLORS = ["#58a93c", "#d8432f", "#3aa6f7", "#a78bfa", "#f5d920", "#e2794f", "#2bb5a0", "#edeae2"];
export const LEVEL_TITLES = [
  [1,"Backpacker"],[3,"Wanderer"],[5,"Explorer"],[7,"Navigator"],[9,"Pathfinder"],
  [12,"Cartographer"],[15,"Globetrotter"],[18,"Trailblazer"],[22,"GeoMaster"],[27,"Atlas Legend"]
];

export function levelFromXp(xp) {
  // each level costs 60 * level XP cumulatively-ish (quadratic-ish curve)
  let lvl = 1, need = 100, acc = 0;
  while (xp >= acc + need) { acc += need; lvl++; need = Math.round(need * 1.25); }
  return { level: lvl, into: xp - acc, need, title: titleFor(lvl) };
}
function titleFor(l) {
  let t = LEVEL_TITLES[0][1];
  for (const [min, name] of LEVEL_TITLES) if (l >= min) t = name;
  return t;
}

const DEFAULTS = {
  profile: null, // { name, avatar, code, createdAt }
  settings: { theme: null, sound: true },
  stats: {
    xp: 0,
    gamesPlayed: 0,
    answers: 0, correct: 0,
    bestStreak: 0,
    perGame: {}, // key -> {played, best, answers, correct}
    daily: { lastDate: null, streak: 0, bestStreak: 0, results: [] },
  },
  friends: [], // { code, name, avatar, level, xp, addedAt, lastResult? }
  sentRequests: [],     // friend requests we sent, awaiting their accept
  incomingRequests: [], // friend requests we received, awaiting our decision
  challenges: [],       // live challenge invites (either direction)
};

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const saved = JSON.parse(raw);
    return {
      ...structuredClone(DEFAULTS), ...saved,
      settings: { ...DEFAULTS.settings, ...(saved.settings || {}) },
      stats: { ...DEFAULTS.stats, ...(saved.stats || {}), perGame: (saved.stats?.perGame || {}), daily: { ...DEFAULTS.stats.daily, ...(saved.stats?.daily || {}) } },
      friends: saved.friends || [],
      sentRequests: saved.sentRequests || [],
      incomingRequests: saved.incomingRequests || [],
      challenges: saved.challenges || [],
    };
  } catch { return structuredClone(DEFAULTS); }
}

let saveTimer = null;
export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full */ }
  }, 120);
}
export const getState = () => state;

export function ensureProfile() {
  if (!state.profile) {
    state.profile = {
      name: "Explorer",
      avatar: "#2dd4a8",
      code: makeCode(),
      createdAt: Date.now(),
    };
    save();
  }
  return state.profile;
}

/* ---------- friend codes ----------
   A code carries the player's name with it: NAME-CODE, e.g. POTATO-4W2J.
   That way whoever pastes a code always gets the exact name that belongs to
   it — there is no separate "their name (optional)" box to get wrong. */
const CODE_PART = /^[A-Z0-9]{4,6}$/;
const NAME_PART = /^[A-Z0-9][A-Z0-9 _.'-]{0,23}$/;

export function slugName(name) {
  const s = String(name || "")
    .trim().toUpperCase()
    .replace(/[^A-Z0-9 _.'-]/g, "")
    .replace(/[\s_.'-]+/g, "");
  return s.slice(0, 8) || "EXPLORER";
}

/** The display form, and what gets copied to the clipboard. */
export function friendCodeOf(name, code) {
  return `${slugName(name)}-${String(code).toUpperCase()}`;
}

/** Parse "POTATO-4W2J" (or a bare code) into { name, code, valid }. */
export function parseFriendCode(input) {
  const raw = String(input || "").trim().toUpperCase().replace(/\s+/g, "");
  if (!raw) return { name: null, code: null, valid: false };
  const i = raw.lastIndexOf("-");
  if (i > 0) {
    const name = raw.slice(0, i).replace(/[^A-Z0-9]/g, "");
    const code = raw.slice(i + 1);
    if (CODE_PART.test(code) && (!name || NAME_PART.test(raw.slice(0, i)))) {
      return { name: name || null, code, valid: true };
    }
  }
  if (CODE_PART.test(raw)) return { name: null, code: raw, valid: true };
  return { name: null, code: null, valid: false };
}
export function updateProfile(patch) { Object.assign(ensureProfile(), patch); save(); }

export function makeCode() {
  const A = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = ""; for (let i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)];
  return s;
}

// ---- stats ----
export function gameKeyToLabel(key) {
  return ({ flags: "Flag Guesser", capitals: "Capital Hunt", territories: "Territory Quiz", history: "History Flags", geoguesser: "GeoGuesser", daily: "Daily Challenge", mappoint: "Map Master", versus: "Versus" })[key] || key;
}

export function recordGame(key, { score, correct, total, bestStreak }) {
  const s = state.stats;
  s.gamesPlayed++;
  s.answers += total;
  s.correct += correct;
  s.bestStreak = Math.max(s.bestStreak, bestStreak || 0);
  const pg = s.perGame[key] || { played: 0, best: 0, answers: 0, correct: 0 };
  pg.played++;
  pg.answers += total;
  pg.correct += correct;
  pg.best = Math.max(pg.best, score);
  s.perGame[key] = pg;
  save();
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("aq:game-recorded", { detail: { game: key, score, correct, total } }));
}

export function addXp(amount) {
  const before = levelFromXp(state.stats.xp).level;
  state.stats.xp = Math.max(0, state.stats.xp + amount);
  const after = levelFromXp(state.stats.xp).level;
  save();
  return { leveledUp: after > before, level: after };
}

export function recordDaily(dateStr, result) {
  const d = state.stats.daily;
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  d.streak = d.lastDate === yesterday ? d.streak + 1 : 1;
  d.lastDate = dateStr;
  d.bestStreak = Math.max(d.bestStreak, d.streak);
  d.results = [{ date: dateStr, ...result }, ...d.results].slice(0, 30);
  save();
}

// ---- friends ----
/* Friends are mutual: a request has to be accepted, and accepting adds both sides.
   Requests live in state while they are pending; Supabase Realtime delivers them. */
export function getFriends() {
  // legacy entries may lack the fields added later
  state.friends = (state.friends || []).map(f => ({
    code: f.code, name: f.name, avatar: f.avatar || "",
    level: f.level || 1, xp: f.xp || 0,
    addedAt: f.addedAt || 0, lastResult: f.lastResult || null,
  }));
  return state.friends;
}

export function isFriend(code) { return getFriends().some(f => f.code === code); }
export function friendByCode(code) { return getFriends().find(f => f.code === code) || null; }

/* ---- outgoing requests (we asked, waiting on them) ---- */
export function getSentRequests() { return (state.sentRequests ||= []); }
export function sendFriendRequest(profile) {
  const list = getSentRequests();
  const fresh = list.filter(r => r.code !== profile.code);
  if (isFriend(profile.code)) return false;
  fresh.push({ ...profile, sentAt: Date.now() });
  state.sentRequests = fresh.slice(-30);
  save(); return true;
}
export function cancelSentRequest(code) {
  state.sentRequests = getSentRequests().filter(r => r.code !== code);
  save();
}

/* ---- incoming requests (they asked, we decide) ---- */
export function getIncomingRequests() { return (state.incomingRequests ||= []); }
export function pushIncomingRequest(profile) {
  if (!profile?.code || isFriend(profile.code)) return false;
  // already pending: a re-send is not new news, so report false
  if (getIncomingRequests().some(r => r.code === profile.code)) return false;
  const list = getIncomingRequests();
  list.push({ ...profile, receivedAt: Date.now() });
  state.incomingRequests = list.slice(-30);
  save(); return true;
}
export function clearIncomingRequest(code) {
  state.incomingRequests = getIncomingRequests().filter(r => r.code !== code);
  save();
}

/* Accepting adds the requester to our list AND tells them we accepted. */
export function acceptFriendRequest(code) {
  const req = getIncomingRequests().find(r => r.code === code);
  if (!req) return null;
  clearIncomingRequest(code);
  upsertFriend({ code: req.code, name: req.name, avatar: req.avatar, level: req.level, xp: req.xp });
  return req;
}
export function declineFriendRequest(code) { clearIncomingRequest(code); }

export function upsertFriend(p) {
  const list = state.friends;
  const existing = list.find(f => f.code === p.code);
  if (existing) {
    Object.assign(existing, {
      name: p.name || existing.name,
      avatar: p.avatar || existing.avatar,
      level: Math.max(existing.level || 1, p.level || 1),
      xp: Math.max(existing.xp || 0, p.xp || 0),
    });
  } else {
    list.push({
      code: p.code, name: p.name, avatar: p.avatar || "",
      level: p.level || 1, xp: p.xp || 0,
      addedAt: Date.now(), lastResult: null,
    });
  }
  state.sentRequests = getSentRequests().filter(r => r.code !== p.code);
  save();
}

/* players met (leaderboard) — everyone you've shared a Versus room with */
export function getMetPlayers() { return state.metPlayers || []; }
export function upsertMetPlayer(p) {
  const list = (state.metPlayers = state.metPlayers || []);
  const existing = list.find(m => m.code === p.code);
  if (existing) {
    Object.assign(existing, p, { lastSeen: Date.now() });
    // keep their best stats
    existing.level = Math.max(existing.level, p.level);
    existing.xp = Math.max(existing.xp, p.xp);
  } else list.push({ ...p, lastSeen: Date.now() });
  if (list.length > 60) list.sort((a, b) => b.lastSeen - a.lastSeen).splice(60);
  save();
}
export function addFriend({ code, name, avatar }) {
  if (isFriend(code)) return false;
  upsertFriend({ code, name, avatar });
  return true;
}
export function removeFriend(code) {
  state.friends = state.friends.filter(f => f.code !== code);
  getSentRequests(); // ensure the bucket exists before we touch it
  state.sentRequests = getSentRequests().filter(r => r.code !== code);
  save();
}
export function noteFriendResult(code, result) {
  const f = state.friends.find(f => f.code === code);
  if (f) { f.lastResult = result; save(); }
}

// ---- theme ----
export function applyTheme(theme) {
  const t = theme || localStorage.getItem("atlasquest_theme") || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  document.documentElement.dataset.theme = t;
  localStorage.setItem("atlasquest_theme", t);
  return t;
}
export function toggleTheme() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("atlasquest_theme", next);
  document.documentElement.dataset.theme = next;
  return next;
}
