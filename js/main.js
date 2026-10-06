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
import { friendsPage, openProfile, openSettings, setRefreshTopbar, challengeResultCode, avatarCircle } from "./social.js";

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
    nav.append(el("a", { class: "navlink", href, dataset: { href } }, icon(ic), label));
  }
}
function toggleDrawer(open) {
  const d = $("drawer"), sc = $("drawerScrim"), b = $("drawerBtn");
  const willOpen = open !== undefined ? open : !d.classList.contains("open");
  d.classList.toggle("open", willOpen);
  sc.classList.toggle("open", willOpen);
  b.setAttribute("aria-expanded", String(willOpen));
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
}
setRefreshTopbar(refreshTopbar);

function wireTopbar() {
  $("settingsBtn").innerHTML = icons.gear + '<span class="btn-label">Settings</span>';
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
function route() {
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
export function playChallenge(ch, code) {
  location.hash = "#/"; // reset route visuals
  let qs;
  const rand = rng(ch.seed);
  if (ch.game === "capitals") qs = capitalQuestions({ count: ch.count, mode: "mcq", rand });
  else if (ch.game === "territories") qs = territoryQuestions({ count: ch.count, mode: "mcq", rand });
  else if (ch.game === "history") qs = historyQuestions({ count: ch.count, rand });
  else qs = flagQuestions({ count: ch.count, mode: "mcq", rand });
  // import runQuiz lazily to avoid cycles
  import("./games/quiz.js").then(({ runQuiz }) => {
    runQuiz({
      title: "Challenge", gameKey: "flags", questions: qs, timerSec: null,
      shareTitle: "AtlasQuest Challenge",
      onOpenLore: (c) => openLore(c),
      onReplay: () => playChallenge(ch, code),
      onFinish: ({ score, correct, total }) => {
        const st = gs();
        st.challengeResults = st.challengeResults || {};
        st.challengeResults[code] = { score, total, at: Date.now() };
        save();
        setTimeout(() => {
          const rc = challengeResultCode(code, score, total);
          toast("Send your result code to your friend!", "share");
          // surface the code via a small modal
          import("./ui.js").then(({ openModal }) => {
            openModal({ title: "Your result", body: el("div", { class: "stack" },
              el("p", { class: "sub" }, `You scored ${score}/${total}. Send this result code to whoever challenged you (or to your friend):`),
              el("div", { class: "code-box" }, rc),
              el("button", { class: "btn primary", onclick: () => { navigator.clipboard?.writeText(rc); toast("Copied!", "clipboard"); } }, "Copy result code")
            ) });
          });
        }, 400);
      },
    });
  });
}
setLoreOpener((c) => openLore(c));
// social.js needs playChallenge via dynamic import of this module (circular-safe)

/* ---------------- boot ---------------- */
async function boot() {
  applyTheme(); // restore saved paper/night edition before first paint
  view.innerHTML = "";
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
  // first visit: gently prompt for a profile name
  const st = gs();
  if (st.profile?.name === "Explorer" && !st.profile.named) {
    setTimeout(() => {
      openProfile();
      st.profile.named = true; save();
    }, 900);
  }
}
boot();
