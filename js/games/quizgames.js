// AtlasQuest — setup screens + launchers for the four quiz games.
import { el, icon, icons, sfx } from "../ui.js";
import { runQuiz } from "./quiz.js";
import { flagQuestions, capitalQuestions, territoryQuestions, historyQuestions, REGIONS } from "../data.js";
import { getState, save } from "../store.js";

const optsKey = "atlasquiz_opts";
function loadOpts(game) {
  const all = JSON.parse(localStorage.getItem(optsKey) || "{}");
  return { mode: "mcq", region: "World", count: 10, timer: 0, direction: "toCapital", ...(all[game] || {}) };
}
function saveOpts(game, patch) {
  const all = JSON.parse(localStorage.getItem(optsKey) || "{}");
  all[game] = { ...loadOpts(game), ...patch };
  localStorage.setItem(optsKey, JSON.stringify(all));
}

function segControl(label, value, options, onPick) {
  const seg = el("div", { class: "seg" });
  if (label) seg.append(el("div", { class: "seg-label" }, label));
  for (const o of options) {
    seg.append(el("button", {
      class: o.value === value ? "on" : "", onclick: () => { sfx.click(); onPick(o.value); }
    }, o.label));
  }
  return seg;
}

function stepperControl(label, value, min, max, onChange) {
  const input = el("input", { class: "input", type: "number", min, max, value, style: { width: "86px", textAlign: "center", fontWeight: "700" } });
  const wrap = el("div", { class: "seg" });
  wrap.append(el("div", { class: "seg-label" }, label));
  const set = (v) => { v = Math.max(min, Math.min(max, Math.round(v) || min)); input.value = v; onChange(v); sfx.click(); };
  wrap.append(
    el("button", { onclick: () => set(+input.value - 1) }, "\u2212"),
    input,
    el("button", { onclick: () => set(+input.value + 1) }, "+")
  );
  input.addEventListener("change", () => set(+input.value));
  return wrap;
}

function setupScreen({ title, iconName, blurb, game, allowRegion = true, allowMode = true, counts = [5, 10, 15, 20], maxCount = 40, extra = null, launch }) {
  const view = document.getElementById("view");
  view.innerHTML = "";
  const o = loadOpts(game);

  const settingsCol = el("div", { class: "stack" });
  function rerender() { settingsCol.innerHTML = ""; build(); }
  function build() {
    if (allowMode) {
      settingsCol.append(segControl("Answer style", o.mode, [
        { value: "mcq", label: "Multiple choice" },
        { value: "input", label: "Type the name" },
        { value: "reverse", label: "Name → flag" },
      ], (v) => { saveOpts(game, { mode: v }); o.mode = v; rerender(); }));
    }
    if (allowRegion) {
      settingsCol.append(segControl("Region", o.region, REGIONS.map(r => ({ value: r, label: r })),
        (v) => { saveOpts(game, { region: v }); o.region = v; rerender(); }));
    }
    settingsCol.append(segControl("Questions", counts.includes(o.count) ? o.count : null, counts.map(c => ({ value: c, label: String(c) })),
      (v) => { saveOpts(game, { count: v }); o.count = v; rerender(); }));
    settingsCol.append(stepperControl("Or set your own count", o.count, 3, maxCount, (v) => { saveOpts(game, { count: v }); o.count = v; }));
    settingsCol.append(segControl("Timer per question", o.timer, [
      { value: 0, label: "Relaxed" }, { value: 30, label: "30s" }, { value: 15, label: "15s" }, { value: 8, label: "8s" },
    ], (v) => { saveOpts(game, { timer: v }); o.timer = v; rerender(); }));
    if (extra) extra(settingsCol, o, rerender);
  }
  build();

  const stats = getState().stats.perGame[game];
  view.append(el("div", { class: "geo-setup" },
    el("div", { class: "card pad", style: { textAlign: "center" } },
      el("div", { class: "game-head" },
        el("span", { class: "gh-icon", html: icons[iconName] || "" })
      ),
      el("h1", { class: "h1" }, title),
      el("p", { class: "sub" }, blurb),
      stats ? el("p", { class: "faint small mt-1" }, `Played ${stats.played}× · best ${stats.best} pts · ${Math.round((stats.correct / Math.max(1, stats.answers)) * 100)}% lifetime accuracy`) : null,
      el("div", { class: "mt-3" }, settingsCol),
      el("div", { class: "mt-3" },
        el("button", { class: "btn primary big", onclick: launch(o) }, icon("play"), "Start quiz")
      )
    )
  ));
}

/* ---------------- Flag Guesser ---------------- */
export function flagsPage() {
  setupScreen({
    title: "Flag Guesser", iconName: "flag", game: "flags", counts: [5, 10, 15, 20, 30], maxCount: 40,
    blurb: "Flags of the world — recognize them all, from Algeria to Zimbabwe.",
    launch: (o) => () => {
      let qs;
      if (o.mode === "reverse") qs = flagQuestions({ count: o.count, region: o.region, mode: "reverse" });
      else if (o.mode === "input") qs = flagQuestions({ count: o.count, region: o.region, mode: "input" });
      else qs = flagQuestions({ count: o.count, region: o.region, mode: "mcq" });
      runQuiz({ title: "Flag Guesser", gameKey: "flags", questions: qs, timerSec: o.timer || null, shareTitle: "Flag Guesser", onOpenLore: (c) => openLoreEvent(c), onReplay: () => flagsPage() });
    },
  });
}

/* ---------------- Capital Hunt ---------------- */
export function capitalsPage() {
  setupScreen({
    title: "Capital Hunt", iconName: "capital", game: "capitals", counts: [5, 10, 15, 20, 30], maxCount: 40,
    blurb: "Do you know the capitals? Country to capital, or capital to country.",
    launch: (o) => () => {
      const qs = capitalQuestions({ count: o.count, region: o.region, mode: o.mode === "reverse" ? "mcq" : o.mode, direction: o.direction });
      runQuiz({ title: "Capital Hunt", gameKey: "capitals", questions: qs, timerSec: o.timer || null, shareTitle: "Capital Hunt", onOpenLore: openLoreEvent, onReplay: () => capitalsPage() });
    },
    extra: (col, o, rerender) => {
      col.append(segControl("Direction", o.direction, [
        { value: "toCapital", label: "Country → Capital" },
        { value: "toCountry", label: "Capital → Country" },
      ], (v) => { saveOpts("capitals", { direction: v }); o.direction = v; rerender(); }));
    },
  });
}

/* ---------------- Territory Quiz ---------------- */
export function territoriesPage() {
  setupScreen({
    title: "Territory Quiz", iconName: "pin", game: "territories",
    blurb: "Greenland, Puerto Rico, Hong Kong… who do they belong to? Dependencies, crown lands and microstates.",
    allowRegion: false,
    counts: [5, 10, 15, 20], maxCount: 25,
    launch: (o) => () => {
      const qs = territoryQuestions({ count: o.count, mode: o.mode });
      runQuiz({ title: "Territory Quiz", gameKey: "territories", questions: qs, timerSec: o.timer || null, shareTitle: "Territory Quiz", onOpenLore: openLoreEvent, onReplay: () => territoriesPage() });
    },
  });
}

/* ---------------- Historical Flags ---------------- */
export function historyPage() {
  setupScreen({
    title: "Historical Flags", iconName: "scroll", game: "history",
    blurb: "Flags of fallen empires and vanished kingdoms — the USSR, the Ottomans, the Raj and more. Every answer comes with the story.",
    allowRegion: false, allowMode: false,
    counts: [5, 10, 15, 20], maxCount: 30,
    launch: (o) => () => {
      const qs = historyQuestions({ count: o.count });
      runQuiz({ title: "Historical Flags", gameKey: "history", questions: qs, timerSec: o.timer || null, shareTitle: "History Flags", onReplay: () => historyPage() });
    },
  });
}

/* ---------------- Daily Challenge ---------------- */
export function dailyPage() {
  const state = getState();
  const today = new Date().toISOString().slice(0, 10);
  const done = state.stats.daily.lastDate === today;
  const view = document.getElementById("view");
  view.innerHTML = "";
  view.append(el("div", { class: "geo-setup" },
    el("div", { class: "card pad", style: { textAlign: "center" } },
      el("div", { class: "game-head" }, el("span", { class: "gh-icon", html: icons.target })),
      el("h1", { class: "h1" }, "Daily Challenge"),
      el("p", { class: "sub" }, "Five questions a day — 3 flags, 2 capitals. Same for everyone, 15 seconds each. Keep your streak alive!"),
      el("p", { class: "muted mt-1" }, `Current streak: ${state.stats.daily.streak} · Best: ${state.stats.daily.bestStreak}`),
      el("div", { class: "mt-3" },
        done
          ? el("div", { class: "stack" },
              el("p", { class: "sub" }, "You already played today — come back tomorrow!"),
              el("button", { class: "btn", onclick: () => location.hash = "#/" }, "Back home"))
          : el("button", { class: "btn royal big", onclick: start }, icon("play"), "Play today's challenge")
      )
    )
  ));

  function start() {
    import("../data.js").then(({ dailyQuestions, dateSeed, rng }) => {
      const qs = dailyQuestions(rng(dateSeed()));
      runQuiz({
        title: "Daily Challenge", gameKey: "daily", questions: qs, timerSec: 15,
        shareTitle: `AtlasQuest Daily ${today.slice(5)}`, onOpenLore: openLoreEvent, onReplay: () => { location.hash = "#/"; },
      });
    });
  }
}

/* hook: main.js sets this so the quiz can open lore modals without circular imports */
let loreOpener = null;
export function setLoreOpener(fn) { loreOpener = fn; }
function openLoreEvent(cca3) { loreOpener?.(cca3); }
