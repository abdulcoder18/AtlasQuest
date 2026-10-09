// AtlasQuest × Supabase — cloud layer: Google sign-in, profile sync,
// global leaderboard, match history. Everything degrades gracefully when unconfigured.
import { SUPABASE_URL, SUPABASE_ANON_KEY, cloudEnabled } from "./supabase-config.js";
import { el, icon, toast, confetti } from "./ui.js";
import { ensureProfile, levelFromXp, getState as gs, save, addXp } from "./store.js";

let client = null;
export const cloudReady = () => cloudEnabled() && client !== null;
export const getUser = () => client?.auth?.getUser ? null : null; // placeholder, real state below
let currentUser = null;
let syncTimer = null;
let subscribed = null;
let cameBackFromLink = false;   // set when we land back from the email link

export async function initCloud() {
  if (!cloudEnabled()) return null;
  // PKCE keeps the session out of the URL fragment, which this app uses for
  // routing - otherwise the token would land where #/flags is expected.
  client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    flowType: "pkce",
    detectSessionInUrl: true,
  });
  // detect before supabase-js consumes and strips the callback params
  cameBackFromLink = hasAuthCallbackParams();
  const { data } = await client.auth.getSession();
  currentUser = data?.session?.user || null;

  client.auth.onAuthStateChange((event, s) => {
    if (event === "SIGNED_IN" && s?.user) { currentUser = s.user; onSignedIn(); }
    if (event === "SIGNED_OUT") { currentUser = null; document.dispatchEvent(new CustomEvent("aq:auth")); }
    if (event === "USER_UPDATED") { currentUser = s?.user || currentUser; }
    if (event === "TOKEN_REFRESHED") return;
  });
  document.dispatchEvent(new CustomEvent("aq:auth"));
  return client;
}
export const cloudUser = () => currentUser;

/* ---------------- auth: Google + email confirmation link ---------------- */
export async function signInGoogle() {
  if (!cloudReady()) return;
  const { error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: backToSite() },
  });
  if (error) toast("Google sign-in failed: " + explainAuthError(error.message), "alert");
}

/* Where the emailed link should send them. Keeps the current route so someone
   who started hosting a match lands back on Versus instead of the home page.
   An auth callback is stripped rather than echoed, so a token can never be
   carried into a redirect URL. */
function backToSite() {
  const base = window.location.origin + window.location.pathname;
  const hash = window.location.hash || "";
  const isCallback = /access_token=|refresh_token=|error_description=|error_code=/.test(hash);
  return isCallback ? base : base + hash;
}

/* True when the page was opened from a Google sign-in redirect: a PKCE
   ?code= or legacy #access_token=. Must run before supabase-js cleans the URL.
   An error redirect is excluded so a cancelled or failed sign-in never claims
   success. */
function hasAuthCallbackParams() {
  try {
    const search = window.location.search || "";
    const hash = window.location.hash || "";
    const failed = /[?&]error(?:_description|_code)?=/.test(search) || /error_description=|error_code=/.test(hash);
    if (failed) return false;
    return /[?&]code=/.test(search) || /access_token=|refresh_token=/.test(hash);
  } catch { return false; }
}

/* Supabase's auth errors are terse and rarely name the fix. */
function explainAuthError(message) {
  const m = (message || "").toLowerCase();
  if (m.includes("provider is not enabled") || m.includes("provider not enabled")) {
    return "Google sign-in is switched off on this project. Turn it on under "
      + "Authentication → Sign In / Providers → Google.";
  }
  if (m.includes("access_denied") || m.includes("cancelled")) {
    return "Google sign-in was cancelled.";
  }
  if (m.includes("expired") || m.includes("invalid")) {
    return "That sign-in link has expired — try again.";
  }
  return message || "Something went wrong — try again.";
}

export async function signOutCloud() {
  if (cloudReady()) { await pushProfileNow(); await client.auth.signOut(); }
  currentUser = null;
}

/* ---------------- auth UI ----------------
   Google only. There is no email, code or password flow anywhere in the game. */
let activeAuthModal = null;

function googleButton(label = "Continue with Google") {
  return el("button", {
    class: "btn big", style: { width: "100%" },
    onclick: () => signInGoogle(),
  }, icon("users"), label);
}

export function openAuthModal() {
  if (!cloudReady()) { toast("Cloud sign-in isn't configured yet.", "alert"); return; }
  if (currentUser) { openAccountBox(); return; }
  const body = el("div", { class: "stack" },
    el("p", { class: "sub", style: { margin: 0 } },
      "Sign in to keep your XP and levels on any device, and appear on the world leaderboard."),
    googleButton(),
    el("button", {
      class: "linklike", style: { alignSelf: "center" },
      onclick: () => {
        localStorage.setItem("aq_guest", "1");
        activeAuthModal.close();
        document.dispatchEvent(new CustomEvent("aq:gate-done"));
      },
    }, "Continue as guest for now")
  );
  activeAuthModal = openModal({ title: "Save your progress", body });
}

/* ---------------- multiplayer account gate ---------------- */
export const isSignedIn = () => cloudReady() && !!currentUser;

/**
 * Live multiplayer needs an account so the other player can actually reach you.
 * Google is the only way in. Resolves true once signed in; dismissing the popup
 * resolves false so the caller simply doesn't join.
 *
 * If the cloud isn't configured there is no account to activate, so we allow
 * play-through rather than locking the whole game behind a sign-in.
 */
export function requireAccount(feature = "live matches") {
  if (isSignedIn()) return Promise.resolve(true);
  if (!cloudEnabled()) {
    toast("Cloud is not configured — playing offline.", "alert");
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = (v) => { if (settled) return; settled = true; cleanup(); resolve(v); };
    const onAuth = () => { if (isSignedIn()) { gate.close(); finish(true); } };
    const cleanup = () => document.removeEventListener("aq:auth", onAuth);
    document.addEventListener("aq:auth", onAuth);

    const body = el("div", { class: "stack center" },
      el("img", { src: "assets/gen/mascot-web.png", alt: "", style: { width: "86px", margin: "0 auto", borderRadius: "12px", border: "2px solid var(--ink)", background: "var(--paper-2)" } }),
      el("p", { class: "h3" }, "Sign in to play"),
      el("p", { class: "sub" }, `${feature} connect you to another player in real time, so each side needs an account to reach the other.`),
      googleButton("Continue with Google"),
      el("button", { class: "btn ghost", style: { width: "100%" }, onclick: () => gate.close() }, "Not now")
    );
    const gate = openModal({ title: "Account required", body, onClose: () => finish(false) });
  });
}

function openAccountBox() {
  const u = currentUser;
  const st = gs();
  const body = el("div", { class: "stack" },
    el("div", { class: "row", style: { gap: "12px" } },
      el("span", { class: "avatar-circle", style: { width: "44px", height: "44px", background: "var(--accent)" } }, icon("check")),
      el("div", {},
        el("div", { class: "h3" }, "Cloud sync on"),
        el("div", { class: "faint small" }, u.email || ""))),
    el("p", { class: "sub", style: { margin: 0 } }, "Your XP, levels and match history live in the cloud — sign in anywhere and they're here."),
    el("button", { class: "btn danger", onclick: async () => { await signOutCloud(); modal.close(); toast("Signed out — progress stays on this device.", "check"); } }, "Sign out (keep local progress)")
  );
  openModal({ title: "Account", body });
}

/* ---------------- profile sync ---------------- */
export async function pushProfileNow() {
  if (!cloudReady() || !currentUser) return;
  const st = gs();
  const lvl = levelFromXp(st.stats.xp);
  const p = ensureProfile();
  try {
    await client.from("profiles").update({
      username: p.name,
      avatar: p.avatar,
      xp: st.stats.xp,
      level: lvl.level,
      games_played: st.stats.gamesPlayed,
      answers: st.stats.answers,
      correct: st.stats.correct,
      best_streak: st.stats.bestStreak,
      daily_streak: st.stats.daily.streak,
      daily_last: st.stats.daily.lastDate || null,
      updated_at: new Date().toISOString(),
    }).eq("id", currentUser.id);
  } catch (e) { console.warn("profile push failed", e); }
}

export function queueProfilePush() {
  if (!cloudReady() || !currentUser) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(pushProfileNow, 4000);
}

async function onSignedIn() {
  // merge: adopt the cloud profile if it's further along, otherwise push local up
  const { data: row } = await client.from("profiles").select("*").eq("id", currentUser.id).maybeSingle();
  const st = gs();
  const p = ensureProfile();
  if (row && (Number(row.xp) || 0) > st.stats.xp) {
    st.stats.xp = Number(row.xp) || 0;
    st.stats.gamesPlayed = Number(row.games_played) || 0;
    st.stats.answers = Number(row.answers) || 0;
    st.stats.correct = Number(row.correct) || 0;
    st.stats.bestStreak = Number(row.best_streak) || 0;
    st.stats.daily.streak = Number(row.daily_streak) || 0;
    st.stats.daily.lastDate = row.daily_last || null;
    if (row.username) p.name = row.username;
    if (row.avatar) p.avatar = row.avatar;
    save();
  }
  await pushProfileNow();
  document.dispatchEvent(new CustomEvent("aq:auth"));
  refreshDrawerIfPossible();
  celebrateSignIn();
}

/* They came back from Google — confirm it plainly. */
let celebrating = false;
function celebrateSignIn() {
  if (!cameBackFromLink || celebrating) return;
  celebrating = true;
  cameBackFromLink = false;
  // the name the player chose in their profile beats whatever Google sent
  const local = ensureProfile()?.name;
  const who = (local && local !== "Explorer")
    ? local
    : (currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name);

  let modal;
  const body = el("div", { class: "stack center" },
    el("img", { src: "assets/gen/mascot-web.png", alt: "", style: { width: "86px", margin: "0 auto", borderRadius: "12px", border: "2px solid var(--ink)" } }),
    el("p", { class: "h3" }, "You're signed in!"),
    el("p", { class: "sub", style: { margin: 0 } }, who ? `Welcome, ${who}.` : "Welcome back to AtlasQuest."),
    el("p", { class: "faint small", style: { margin: 0 } },
      "Your XP, levels and Versus scores now sync to the cloud on every device."),
    el("button", { class: "btn primary big", style: { width: "100%" }, onclick: () => modal.close() }, icon("check"), "Start exploring")
  );
  modal = openModal({ title: "Signed in", body, onClose: () => { celebrating = false; } });
  confetti(innerWidth / 2, innerHeight / 2.4, 120);
}
function refreshDrawerIfPossible() {
  import("./main.js").then(m => m.refreshTopbar?.()).catch(() => {});
}

/* ---------------- global leaderboard ---------------- */
export async function fetchGlobalLeaderboard() {
  if (!cloudReady()) return [];
  const { data, error } = await client
    .from("profiles")
    .select("id, username, avatar, xp, level, updated_at")
    .order("xp", { ascending: false })
    .limit(50);
  return error ? [] : (data || []);
}

export function subscribeLeaderboard(onChange) {
  if (!cloudReady() || subscribed) return;
  client.channel("aq-leaderboard")
    .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => onChange?.())
    .subscribe();
  subscribed = true;
}

/* ---------------- match history (auto-pruned to 10/player) ---------------- */
export async function recordMatchHistory(game, score, correct, total) {
  if (!cloudReady() || !currentUser) return;
  try {
    const { data: row } = await client.from("profiles").select("id").eq("id", currentUser.id).maybeSingle();
    if (!row) return;
    await client.from("match_results").insert({ player: currentUser.id, game, score, correct, total });
  } catch (e) { console.warn("history insert failed", e); }
}

/* hooks for the local store — the store dispatches these events */
if (typeof window !== "undefined") {
  window.addEventListener("aq:xp", () => queueProfilePush());
  window.addEventListener("aq:game-recorded", (e) => {
    const d = e.detail || {};
    recordMatchHistory(d.game, d.score, d.correct, d.total);
    queueProfilePush();
  });
}

/* modal re-export to avoid circular import weight */
import { openModal } from "./ui.js";
