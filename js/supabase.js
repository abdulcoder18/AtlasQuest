// AtlasQuest × Supabase — cloud layer: auth (Google + email code), profile sync,
// global leaderboard, match history. Everything degrades gracefully when unconfigured.
import { SUPABASE_URL, SUPABASE_ANON_KEY, cloudEnabled } from "./supabase-config.js";
import { el, icon, toast, confetti } from "./ui.js";
import { ensureProfile, levelFromXp, getState as gs, save, addXp } from "./store.js";

let client = null;
export const cloudReady = () => cloudEnabled() && client !== null;
export const getUser = () => client?.auth?.getUser ? null : null; // placeholder, real state below
let currentUser = null;
let syncTimer = null;
let subscribed = false;

export async function initCloud() {
  if (!cloudEnabled()) return null;
  client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data } = await client.auth.getSession();
  currentUser = data?.session?.user || null;

  client.auth.onAuthStateChange((event, s) => {
    if (event === "SIGNED_IN" && s?.user) { currentUser = s.user; onSignedIn(); }
    if (event === "SIGNED_OUT") { currentUser = null; document.dispatchEvent(new CustomEvent("aq:auth")); }
    if (event === "USER_UPDATED") { currentUser = s?.user || currentUser; }
  });
  document.dispatchEvent(new CustomEvent("aq:auth"));
  return client;
}
export const cloudUser = () => currentUser;

/* ---------------- auth: Google + email code ---------------- */
export async function signInGoogle() {
  if (!cloudReady()) return;
  const { error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin + window.location.pathname },
  });
  if (error) toast("Google sign-in failed: " + error.message, "alert");
}

let otpEmail = null;

/* Supabase's auth errors are terse and rarely name the fix. Turn the ones a
   player can actually act on into something actionable. */
function explainAuthError(message) {
  const m = (message || "").toLowerCase();
  if (m.includes("sending confirmation email") || m.includes("sending magic link")) {
    return "Supabase refused to send the email. The built-in mailer is capped at "
      + "30 emails/hour (Authentication → Rate Limits) and only serves test addresses. "
      + "Wait for the quota to reset, raise that limit, or turn OFF "
      + "Authentication → Email → \"Confirm email\" to halve how many emails each signup needs.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Too many emails requested. Wait a moment and try again.";
  }
  if (m.includes("signups not allowed") || m.includes("not allowed to create")) {
    return "New sign-ups are disabled on this project.";
  }
  if (m.includes("already registered") || m.includes("already been registered")) {
    return "An account already uses that address — just request a new code.";
  }
  if (m.includes("expired") || m.includes("invalid")) {
    return "That code has expired or is wrong. Request a new one.";
  }
  return message || "Something went wrong — try again.";
}

export async function sendEmailCode(email) {
  if (!cloudReady()) return false;
  otpEmail = email;
  const { error } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) { toast(explainAuthError(error.message), "alert"); return false; }
  return true;
}
export async function verifyEmailCode(code) {
  if (!cloudReady() || !otpEmail) return false;
  const { error } = await client.auth.verifyOtp({ email: otpEmail, token: code, type: "email" });
  if (error) { toast(explainAuthError(error.message), "alert"); return false; }
  return true;
}
export async function signOutCloud() {
  if (cloudReady()) { await pushProfileNow(); await client.auth.signOut(); }
  currentUser = null;
}

/* ---------------- auth UI ---------------- */
let activeAuthModal = null;

/* Shared sign-in form: Google button + email OTP. */
function buildSignInBody({ lead = null, withGoogle = true } = {}) {
  const emailInput = el("input", { class: "input", type: "email", placeholder: "you@example.com", autocomplete: "email" });
  // NOTE: no display:none here — only the wrapper row is hidden until a code is sent
  const codeInput = el("input", {
    class: "input", type: "text", inputmode: "numeric", autocomplete: "one-time-code",
    placeholder: "6-digit code", maxlength: "6",
    style: { letterSpacing: ".35em", textAlign: "center", fontWeight: "800" },
  });
  const status = el("p", { class: "small muted", style: { margin: "6px 0 0", minHeight: "1.2em" } });
  const step1 = el("div", { class: "row" }, emailInput,
    el("button", { class: "btn primary", onclick: sendCode }, icon("zap"), "Send code"));
  const step2 = el("div", { class: "row", style: { display: "none" } }, codeInput,
    el("button", { class: "btn primary", onclick: verify }, icon("check"), "Verify"));

  async function sendCode() {
    const email = emailInput.value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { status.textContent = "That doesn't look like a valid email."; return; }
    status.textContent = "Sending the code…";
    const ok = await sendEmailCode(email);
    if (ok) {
      status.textContent = "Code sent to " + email + " — check your inbox (and spam).";
      step1.style.display = "none"; step2.style.display = "flex";
      codeInput.focus?.();
    }
  }
  async function verify() {
    // tolerate pasted codes with spaces or a trailing newline
    const code = codeInput.value.replace(/\D/g, "").slice(0, 6);
    codeInput.value = code;
    if (code.length < 6) { status.textContent = "That code looks too short — it should be 6 digits."; return; }
    status.textContent = "Verifying…";
    const ok = await verifyEmailCode(code);
    if (ok) {
      // first-time accounts: push the local profile so progress isn't lost
      await pushProfileNow();
      document.dispatchEvent(new CustomEvent("aq:auth"));
      activeAuthModal?.close();
      toast("Signed in — your progress now syncs to the cloud!", "checkCircle");
      confetti(innerWidth / 2, innerHeight / 2.4, 90);
    }
  }

  return el("div", { class: "stack" },
    lead,
    withGoogle ? el("button", { class: "btn big", style: { width: "100%" }, onclick: () => signInGoogle() }, icon("users"), "Continue with Google") : null,
    el("div", { class: "divider" }),
    step1, step2, status,
    el("p", { class: "faint small", style: { margin: 0 } }, "No password needed — we email you a verification code.")
  );
}

export function openAuthModal() {
  if (!cloudReady()) { toast("Cloud sign-in isn't configured yet.", "alert"); return; }
  if (currentUser) { openAccountBox(); return; }
  const body = el("div", { class: "stack" },
    buildSignInBody({
      lead: el("p", { class: "sub", style: { margin: 0 } }, "Create a free account to keep your XP and levels on any device, and appear on the world leaderboard."),
    }),
    el("button", { class: "linklike", style: { alignSelf: "center" }, onclick: () => { localStorage.setItem("aq_guest", "1"); activeAuthModal.close(); document.dispatchEvent(new CustomEvent("aq:gate-done")); } }, "Continue as guest for now")
  );
  activeAuthModal = openModal({ title: "Save your progress", body });
}

/* ---------------- multiplayer account gate ---------------- */
export const isSignedIn = () => cloudReady() && !!currentUser;

/**
 * Live multiplayer needs an account so the other player can actually reach you.
 * Resolves true once signed in; dismissing the popup resolves false so the
 * caller simply doesn't join.
 *
 * If the cloud isn't configured there is no account to activate, so we allow
 * play-through rather than locking the whole game behind a signup.
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
      el("p", { class: "h3" }, "Activate your account to play"),
      el("p", { class: "sub" }, `${feature} connect you to another player in real time, so each side needs an account to reach the other.`),
      buildSignInBody(),
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
