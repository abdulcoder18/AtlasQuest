// AtlasQuest — app entry: data loading, hash router, topbar, home screen, challenge glue.
import { el, icon, icons, sfx, toast, confetti } from "./ui.js";
import { doodle, circleStamp } from "./manga-art.js";
import { loadData, flagQuestions, capitalQuestions, territoryQuestions, historyQuestions, rng } from "./data.js";
import { ensureProfile, levelFromXp, getState as gs, save, addXp, gameKeyToLabel, applyTheme } from "./store.js";
import { flagsPage, capitalsPage, territoriesPage, historyPage, dailyPage, setLoreOpener } from "./games/quizgames.js";
import { geoguesserPage, destroyActive as destroyGeo } from "./games/geoguesser.js";
import { mappointPage, destroyActive as destroyMap } from "./games/mappoint.js";
import { versusPage, destroyActive as destroyVersus } from "./games/versus.js";
import { atlasPage, empiresPage, openLore, openEmpire } from "./lore.js";
import { friendsPage, openProfile, openSettings, setRefreshTopbar, avatarCircle, initSocial } from "./social.js";
import { initCloud, cloudReady, cloudUser, openAuthModal } from "./supabase.js";

const view = document.getElementById("view");
const $ = (id) => document.getElementById(id);

/* ---------------- drawer + topbar ---------------- */
function buildNav() {
  const nav = $("mainnav");
  const links = [
    ["#/", "Home", "home"],
    ["#/geoguesser", "GeoGuesser", "compass"],
    ["#/flags", "Flags", "flag"],
    ["#/capitals", "Capitals", "capital"],
    ["#/territories", "Territories", "pin"],
    ["#/history", "History", "scroll"],
    ["#/mappoint", "Map Master", "map"],
    ["#/daily", "Daily", "target"],
    ["#/atlas", "Atlas", "book"],
    ["#/empires", "Empires", "crown"],
    ["#/versus", "Versus", "swords"],
    ["#/friends", "Friends", "users"],
  ];
  nav.innerHTML = "";
  for (const [href, label, ic] of links) {
    const a = el("a", { class: "navlink", href, dataset: { href } }, icon(ic), label);
    // pending friend requests get a count badge on the Friends link
    if (href === "#/friends") a.append(el("span", { class: "nav-badge", id: "friendReqBadge", hidden: true }, "0"));
    nav.append(a);
  }
}
let hoverOpened = false;
function toggleDrawer(open, byHover = false) {
  if (byHover) hoverOpened = true;
  const d = $("drawer"), sc = $("drawerScrim"), b = $("drawerBtn");
  const willOpen = open !== undefined ? open : !d.classList.contains("open");
  d.classList.toggle("open", willOpen);
  sc.classList.toggle("open", willOpen);
  b.setAttribute("aria-expanded", String(willOpen));
  if (!willOpen) hoverOpened = false;
}
function session2HoverOpened() { return hoverOpened; }
function toggleLbPanel() {
  const p = $("lbPanel");
  p.classList.toggle("open");
  if (p.classList.contains("open")) renderLbPanel();
}
async function renderLbPanel() {
  const p = $("lbPanel");
  p.innerHTML = "";
  p.append(el("div", { class: "spread" },
    el("h3", { class: "h3" }, "Leaderboard"),
    el("button", { class: "iconbtn", style: { width: "30px", height: "30px", minWidth: "30px" }, onclick: () => $("lbPanel").classList.remove("open"), html: icons.x }),
  ));
  p.append(el("div", { class: "faint small", style: { marginBottom: "8px" } }, "Top explorers · updates live"));

  const m = await import("./supabase.js").catch(() => null);
  const globalRows = (m && m.cloudReady()) ? await m.fetchGlobalLeaderboard() : [];
  const gb = el("div", { class: "stack" });
  gb.append(el("h3", { class: "h3", style: { fontSize: ".9rem" } }, "World top 10"));
  if (!globalRows.length) {
    gb.append(el("p", { class: "faint small" }, m && m.cloudReady() ? "No players yet — be the first!" : "World board needs the cloud connection (see Settings)."));
  } else {
    globalRows.slice(0, 10).forEach((pr, i) => {
      gb.append(el("div", { class: "friend-row" },
        el("span", { class: "rank" }, "#" + (i + 1)),
        el("div", { class: "spread" },
          el("div", {},
            el("div", { class: "fr-name" }, pr.username),
            el("div", { class: "fr-meta" }, "Lv " + pr.level + " · " + pr.xp + " XP")),
          el("span", { class: "faint small" }, String(pr.xp)))));
    });
  }
  p.append(gb);

  // friends section (local friends + met players)
  const { getFriends, getMetPlayers } = await import("./store.js");
  const friends = getFriends().map(f => ({ name: f.name, avatar: f.avatar, level: (f.level || 1), xp: (f.xp || 0) }));
  const met = getMetPlayers().map(p => ({ name: p.name, avatar: p.avatar, level: p.level, xp: p.xp }));
  const seen = new Set();
  const merged = [...friends, ...met].filter(p => { const k = p.name.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => (b.xp || 0) - (a.xp || 0)).slice(0, 10);
  p.append(el("h3", { class: "h3", style: { fontSize: ".9rem", marginTop: "12px" } }, "Your friends & met players"));
  if (!merged.length) p.append(el("p", { class: "faint small" }, "Add friends or play matches to fill this board."));
  merged.forEach((f, i) => {
    p.append(el("div", { class: "friend-row" },
      el("span", { class: "rank" }, "#" + (i + 1)),
      el("div", { class: "spread" },
        el("div", {},
          el("div", { class: "fr-name" }, f.name),
          el("div", { class: "fr-meta" }, "Lv " + f.level + " · " + f.xp + " XP")),
        el("span", { class: "faint small" }, String(f.xp)))));
  });
}


function markActiveNav() {
  const here = location.hash || "#/";
  document.querySelectorAll("#mainnav .navlink").forEach(a => {
    a.classList.toggle("active", a.dataset.href === here);
  });
}

function refreshTopbar() {
  const st = gs();
  const p = ensureProfile();
  const lvl = levelFromXp(st.stats.xp);
  const ava = $("profileAva");
  ava.innerHTML = "";
  ava.append(avatarCircle(p.name, p.avatar, 46, "1rem"));
  $("profileName").textContent = p.name;
  $("profileLvl").textContent = `Lv ${lvl.level} · ${lvl.title}`;
  $("xpChip").title = `${st.stats.xp} XP — ${lvl.need - lvl.into} to next level`;
  document.querySelector("#xpChip .xp-fill").style.width = `${Math.round((lvl.into / lvl.need) * 100)}%`;
  $("xpNum").textContent = `${st.stats.xp} XP`;
  // cloud account row (hidden when Supabase isn't configured)
  const acct = $("accountRow");
  if (acct) import("./supabase.js").then(m => {
    if (!m.cloudReady()) { acct.hidden = true; return; }
    acct.hidden = false;
    const u = m.cloudUser();
    acct.innerHTML = "";
    if (u) {
      acct.append(icon("checkCircle"), el("span", { class: "account-label" }, "Cloud sync on"), el("span", { class: "account-email muted" }, u.email || ""));
    } else {
      acct.append(icon("zap"), el("span", { class: "account-label" }, "Save progress online"), el("span", { class: "account-email muted" }, "free · email or Google"));
    }
  }).catch(() => {});
}
setRefreshTopbar(refreshTopbar);

function wireTopbar() {
  $("settingsBtn").innerHTML = icons.gear + '<span class="btn-label">Settings</span>';
  $("drawerBtn").classList.add("drawer-btn");
  $("lbBtn").innerHTML = icons.trophy;
  $("drawerClose").innerHTML = icons.x;
  // #4: hover opens the drawer live
  $("drawerBtn").addEventListener("mouseenter", () => { if (!$("drawer").classList.contains("open")) { sfx.click(); toggleDrawer(true, true); } });
  // close on leaving the drawer (only if it was hover-opened) with a small grace delay
  let hoverCloseTimer = null;
  $("drawer").addEventListener("mouseleave", () => {
    if (!hoverOpened) return;
    clearTimeout(hoverCloseTimer);
    hoverCloseTimer = setTimeout(() => toggleDrawer(false), 350);
  });
  $("drawer").addEventListener("mouseenter", () => clearTimeout(hoverCloseTimer));
  $("drawerBtn").addEventListener("mouseleave", () => {
    if (!hoverOpened) return;
    clearTimeout(hoverCloseTimer);
    hoverCloseTimer = setTimeout(() => {
      if (!$("drawer").matches(":hover")) toggleDrawer(false);
    }, 350);
  });
  // #5: leaderboard panel toggle
  $("lbBtn").innerHTML = icons.trophy;
  $("lbBtn").addEventListener("click", () => { sfx.click(); toggleLbPanel(); });
  $("accountRow").addEventListener("click", () => { sfx.click(); toggleDrawer(false); openAuthModal(); });
  // Home is a plain hash link, so clicking it while already on #/ fires no
  // hashchange and would look dead — same trap as the result-screen Home.
  $("homeBtn").addEventListener("click", (e) => {
    if (location.hash === "#/" || location.hash === "") { e.preventDefault(); route(); }
  });
  $("settingsBtn").classList.add("with-label");
  $("drawerBtn").innerHTML = icons.menu + '<span class="btn-label">Menu</span>';
  $("drawerBtn").classList.add("with-label");
  $("drawerClose").innerHTML = icons.menu + '<span class="btn-label">Close</span>';
  $("drawerClose").classList.add("with-label");
  $("settingsBtn").addEventListener("click", () => { sfx.click(); openSettings(); });
  $("drawerBtn").addEventListener("click", () => { sfx.click(); toggleDrawer(); });
  $("drawerClose").addEventListener("click", () => { sfx.click(); toggleDrawer(false); });
  $("drawerScrim").addEventListener("click", () => toggleDrawer(false));
  $("profileCard").addEventListener("click", () => { sfx.click(); toggleDrawer(false); openProfile(); });
  window.addEventListener("aq:xp", refreshTopbar);
}

/* ---------------- home ---------------- */
function homePage() {
  const st = gs();
  const lvl = levelFromXp(st.stats.xp);
  const view2 = view;
  view2.innerHTML = "";

  // nature-trail spot illustrations around the headline
  const deco = el("div", { class: "hero-deco", "aria-hidden": "true" });
  deco.innerHTML = `
    ${doodle("sun", "d1")}
    ${doodle("balloon", "d2")}
    ${doodle("pines", "d3")}
    ${doodle("plane", "d4")}
    ${doodle("birds", "d5")}
    ${doodle("cloud", "d6")}
  `;

  const heroBg = el("div", { class: "hero-bg", "aria-hidden": "true" });
  const mascot = el("img", { class: "hero-mascot", src: "assets/gen/mascot-web.png", alt: "", "aria-hidden": "true" });
  const hero = el("div", { class: "hero" }, deco, heroBg, mascot,
    el("span", { html: circleStamp("PLAY<br>THE LORE"), style: { color: "var(--ink)" } }),
    el("h1", { class: "h1" }, "Explore", el("br"), "the world."),
    el("p", { class: "hero-tag" }, "Guess flags, find capitals, survive GeoGuesser, decode territories and fallen empires — then read the real stories behind every nation: kingdoms, conquerors, and how it all fell into place."),
    el("div", { class: "hero-cta" },
      el("button", { class: "btn primary big", onclick: () => location.hash = "#/geoguesser" }, icon("compass"), "Play GeoGuesser"),
      el("button", { class: "btn big", onclick: () => location.hash = "#/flags" }, icon("flag"), "Flag Guesser"),
      el("button", { class: "daily-chip", onclick: () => location.hash = "#/daily" }, icon("target"), st.stats.daily.lastDate === new Date().toISOString().slice(0, 10) ? "Daily done — streak " + st.stats.daily.streak : "Daily Challenge")
    )
  );
  view2.append(hero);

  const modes = [
    ["#/geoguesser", "compass", "GeoGuesser", "Dropped somewhere on Earth — pin the map, score by distance.", ""],
    ["#/flags", "flag", "Flag Guesser", "245 flags, multiple choice or type-the-name. Name → flag too.", ""],
    ["#/capitals", "capital", "Capital Hunt", "Country to capital and back, both directions.", ""],
    ["#/territories", "pin", "Territory Quiz", "Greenland, Hong Kong, Puerto Rico — who governs what?", "Fan favorite"],
    ["#/history", "scroll", "Historical Flags", "Empires, fallen flags and the stories of how they fell.", "Lore inside"],
    ["#/mappoint", "map", "Map Master", "Name the highlighted country or find it on a blank world map.", "New"],
    ["#/atlas", "book", "The Atlas", "Every nation's culture, beliefs and history — the real lore.", ""],
    ["#/empires", "crown", "Empires & Kingdoms", "How the great powers rose and fell, mapped to today.", ""],
    ["#/friends", "users", "Friends", "Add friends by code, challenge them to mirrored games.", ""],
    ["#/versus", "swords", "Versus", "Host live matches with friends — real-time scores, one room code.", "Live"],
  ];
  const grid = el("div", { class: "mode-grid" });
  modes.forEach(([href, ic, title, desc, badge], i) => {
    grid.append(el("a", { class: "mode-card", href },
      el("span", { class: "mc-index", "aria-hidden": "true" }, String(i + 1).padStart(2, "0")),
      badge ? el("span", { class: "mc-badge" }, badge) : null,
      el("span", { class: "mc-icon", html: icons[ic] }),
      el("h3", {}, title),
      el("p", {}, desc),
      el("span", { class: "mc-arrow" }, "→")
    ));
  });
  view2.append(grid);

  // stats strip
  const s = st.stats;
  const strip = el("div", { class: "stat-strip" });
  const stat = (num, label) => strip.append(el("div", { class: "stat-box" },
    el("div", { class: "st-num" }, num), el("div", { class: "st-label" }, label)));
  stat(`${lvl.level}`, "Level · " + lvl.title);
  stat(String(s.gamesPlayed), "Games played");
  stat(s.answers ? Math.round((s.correct / s.answers) * 100) + "%" : "—", "Accuracy");
  stat(String(s.bestStreak), "Best streak");
  view2.append(strip);

  view2.append(el("p", { class: "center faint small mt-4" },
    `${gs().stats.xp} XP · every quiz answer teaches you the lore of the place.`));
}
let dataLoaded = false;

/* ---------------- router ---------------- */
const routes = {
  "#/": homePage,
  "#/geoguesser": geoguesserPage,
  "#/flags": flagsPage,
  "#/capitals": capitalsPage,
  "#/territories": territoriesPage,
  "#/history": historyPage,
  "#/mappoint": mappointPage,
  "#/daily": dailyPage,
  "#/atlas": () => atlasPage(),
  "#/empires": empiresPage,
  "#/versus": versusPage,
  "#/friends": friendsPage,
};
export function route() {
  destroyGeo();
  destroyMap();
  destroyVersus();
  toggleDrawer(false);
  const hash = location.hash || "#/";
  const fn = routes[hash] || homePage;
  markActiveNav();
  window.scrollTo(0, 0);
  fn();
  // replay the route entrance animation
  view.classList.remove("view-anim");
  void view.offsetWidth;
  view.classList.add("view-anim");
}
window.addEventListener("hashchange", route);

/* ---------------- challenges ---------------- */
/* Home has to work from a challenge result even though the hash is already
   "#/" — assigning the same hash fires no hashchange, so the router never
   re-ran and the button looked dead. Force the router either way. */
function goHome() {
  if (location.hash === "#/" || location.hash === "") {
    route();
  } else {
    location.hash = "#/";
  }
}

export function playChallenge(ch, code) {
  // reset route visuals without breaking Home later on
  if (location.hash !== "#/") location.hash = "#/";
  else route();

  const rand = rng(ch.seed);
  let qs;
  if (ch.game === "capitals") qs = capitalQuestions({ count: ch.count, mode: "mcq", rand });
  else if (ch.game === "territories") qs = territoryQuestions({ count: ch.count, mode: "mcq", rand });
  else if (ch.game === "history") qs = historyQuestions({ count: ch.count, rand });
  else qs = flagQuestions({ count: ch.count, mode: "mcq", rand });

  const gameKey = ["flags", "capitals", "territories", "history"].includes(ch.game) ? ch.game : "flags";

  // import runQuiz lazily to avoid cycles
  import("./games/quiz.js").then(({ runQuiz }) => {
    runQuiz({
      title: "Challenge", gameKey, questions: qs, timerSec: null,
      exitHash: "#/friends",
      shareTitle: "AtlasQuest Challenge",
      onOpenLore: (c) => openLore(c),
      onReplay: () => playChallenge(ch, code),
      onExit: goHome,
    });
  });
}
setLoreOpener((c) => openLore(c));
// social.js needs playChallenge via dynamic import of this module (circular-safe)

/* ---------------- auth gate (#1) ---------------- */
function gateCheck() {
  if (!cloudReady()) return;           // cloud not configured -> no gate
  if (cloudUser()) return;             // signed in -> no gate
  if (localStorage.getItem("aq_guest") === "1") return; // guest choice remembered
  setTimeout(openGateModal, 600);
}
function openGateModal() {
  import("./supabase.js").then(async (m) => {
    if (m.cloudUser() || localStorage.getItem("aq_guest") === "1") return;
    const { openModal } = await import("./ui.js");
    let modalHandle = null;
    const body = el("div", { class: "stack", style: { textAlign: "center" } },
      el("img", { src: "assets/gen/mascot-web.png", alt: "", style: { width: "110px", margin: "0 auto", borderRadius: "12px", border: "2px solid var(--ink)", background: "var(--paper-2)" } }),
      el("h2", { class: "h2", style: { margin: "10px 0 4px" } }, "Welcome, explorer"),
      el("p", { class: "sub", style: { margin: "0 auto", maxWidth: "400px" } }, "Play everything as a guest — or sign in to keep your XP, levels and leaderboard rank safe on every device."),
      el("button", { class: "btn primary big", style: { width: "100%" }, onclick: () => { modalHandle.close(); openAuthModal(); } }, icon("zap"), "Sign in with Google"),
      el("button", { class: "btn ghost", style: { width: "100%" }, onclick: () => { localStorage.setItem("aq_guest", "1"); modalHandle.close(); toast("Playing as guest — progress stays on this device.", "check"); document.dispatchEvent(new CustomEvent("aq:gate-done")); } }, "Continue as guest")
    );
    modalHandle = openModal({ title: null, body });
  });
}

/* ---------------- boot ---------------- */
async function boot() {
  applyTheme(); // restore saved paper/night edition before first paint
  initCloud();  // connect Supabase if configured (auth + global leaderboard)
  initSocial(); // realtime bus for friend requests + challenge invites
  view.innerHTML = "";
  document.addEventListener("aq:auth", gateCheck);
  view.append(el("div", { class: "empty" },
    el("img", { src: "assets/gen/mascot-web.png", alt: "", style: { width: "92px", margin: "0 auto 10px", display: "block", animation: "mascotBob 2s ease-in-out infinite alternate" } }),
    el("span", { class: "skel", style: { display: "block", width: "220px", height: "18px", margin: "0 auto 10px" } }),
    "Loading the world…"));
  buildNav();
  wireTopbar();
  refreshTopbar();
  try {
    await loadData();
    dataLoaded = true;
    route();
  } catch (err) {
    view.innerHTML = "";
    view.append(el("div", { class: "empty" },
      el("span", { class: "e-ico", html: icons.alert }),
      el("p", { class: "sub" }, "Couldn't load the world data: " + err.message),
      el("button", { class: "btn mt-2", onclick: () => location.reload() }, "Retry")
    ));
  }
  // after the welcome choice, first-time explorers customize their profile once
  document.addEventListener("aq:gate-done", () => {
    const st2 = gs();
    if (st2.profile?.name === "Explorer" && !st2.profile.named) {
      st2.profile.named = true; save();
      setTimeout(openProfile, 500);
    }
  });
}
boot();
