// AtlasQuest — local store: profile, settings, stats, friends. Persisted in localStorage.
const KEY = "atlasquest_v1";

export const AVATAR_COLORS = ["#f5d920", "#d8432f", "#8a857a", "#edeae2", "#f5d920", "#d8432f", "#8a857a", "#edeae2"];
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
  friends: [], // { code, name, avatar, addedAt, lastResult? }
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
export function getFriends() { return state.friends; }

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
  if (state.friends.some(f => f.code === code)) return false;
  state.friends.push({ code, name, avatar: avatar || "", addedAt: Date.now() });
  save(); return true;
}
export function removeFriend(code) {
  state.friends = state.friends.filter(f => f.code !== code);
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
