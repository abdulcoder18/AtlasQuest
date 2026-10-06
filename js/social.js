// AtlasQuest — profile, friends (offline friend codes + challenges), settings modal.
import { el, icon, icons, toast, openModal, fmtInt } from "./ui.js";
import {
  getState as gs, ensureProfile, updateProfile, getFriends, addFriend, removeFriend,
  AVATAR_COLORS, levelFromXp, makeCode, gameKeyToLabel, toggleTheme, save,
} from "./store.js";

/* monogram avatar node: legacy emoji avatars fall back to initials */
export function avatarCircle(name, avatar, size = 44, fontSize = null) {
  const isColor = typeof avatar === "string" && avatar.startsWith("#");
  const initials = (name || "?").trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return el("span", {
    class: "avatar-circle",
    style: {
      width: size + "px", height: size + "px",
      fontSize: (fontSize || Math.round(size * 0.38)) + "px",
      background: isColor ? avatar : "var(--accent)",
      color: "#07121f",
    },
    "aria-hidden": "true",
  }, initials);
}
import { data } from "./data.js";

/* ---------------- profile modal ---------------- */
export function openProfile() {
  const p = ensureProfile();
  const lvl = levelFromXp(gs().stats.xp);
  const body = el("div");

  const avaRow = el("div", { class: "avatar-pick" });
  const nameInput = el("input", { class: "input", value: p.name, maxlength: "18", placeholder: "Your explorer name" });
  let pendingName = p.name;
  let pendingAvatar = p.avatar;
  function renderAvatars(selected) {
    avaRow.innerHTML = "";
    for (const c of AVATAR_COLORS) {
      avaRow.append(el("button", {
        class: c === selected ? "on" : "",
        style: { background: c, borderColor: c === selected ? "var(--text)" : c },
        title: "Pick this color",
        onclick: (e) => { pendingAvatar = c; renderAvatars(c); },
      }));
    }
  }
  renderAvatars(p.avatar);
  nameInput.addEventListener("input", () => { pendingName = nameInput.value; });
  nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") saveBtn.click(); });

  body.append(
    el("div", { class: "row", style: { gap: "16px", marginBottom: "16px" } },
      avatarCircle(p.name, p.avatar, 64, "1.5rem"),
      el("div", {},
        el("div", { class: "h3" }, p.name),
        el("span", { class: "badge-lvl" }, `Lv ${lvl.level} · ${lvl.title}`)
      )
    ),
    el("div", { class: "set-row", style: { flexDirection: "column", alignItems: "stretch", gap: "8px" } },
      el("div", { class: "sr-title" }, "Name"), nameInput
    ),
    el("div", { class: "set-row", style: { flexDirection: "column", alignItems: "stretch", gap: "8px" } },
      el("div", { class: "sr-title" }, "Avatar color"), avaRow
    ),
    el("div", { class: "set-row", style: { flexDirection: "column", alignItems: "stretch", gap: "8px" } },
      el("div", { class: "sr-title" }, "Apply changes"),
      el("div", { class: "row" },
        el("button", { class: "btn primary", id: "profileSaveBtn", onclick: applyChanges }, icon("check"), "OK, save"),
        el("span", { class: "faint small" }, "or press Enter in the name field")
      )
    ),
    el("div", { class: "set-row", style: { flexDirection: "column", alignItems: "stretch", gap: "8px" } },
      el("div", { class: "sr-title" }, "Your friend code"),
      el("div", { class: "code-box" }, p.code),
      el("p", { class: "faint small", style: { margin: 0 } }, "Share this code so friends can add you. Friends & challenges live on this device for now."),
      el("button", { class: "btn small", onclick: () => copy(`${p.code}`) }, icon("clipboard"), "Copy code")
    ),
    statsBlock()
  );
  function applyChanges() {
    const name = nameInput.value.trim() || "Explorer";
    updateProfile({ name, avatar: pendingAvatar });
    renderAvatars(pendingAvatar);
    nameInput.value = name;
    refreshTopbar();
    toast("Profile saved!", "check");
  }
  const saveBtn = body.querySelector("#profileSaveBtn");
  saveBtn.addEventListener("click", () => { sfxClickSave(); applyChanges(); });
  function sfxClickSave() { import("./ui.js").then(m => m.sfx.click()); }
  openModal({ title: "Your profile", body });
}
function statsBlock() {
  const s = gs().stats;
  const box = el("div", { class: "stack mt-2" });
  box.append(el("h3", { class: "h3" }, "Career stats"));
  const grid = el("div", { class: "lore-facts" });
  const fact = (k, v) => grid.append(el("div", { class: "lf-box" }, el("div", { class: "lf-k" }, k), el("div", { class: "lf-v" }, v)));
  fact("Games", fmtInt(s.gamesPlayed));
  fact("Answers", fmtInt(s.answers));
  fact("Accuracy", s.answers ? Math.round((s.correct / s.answers) * 100) + "%" : "—");
  fact("Best streak", fmtInt(s.bestStreak));
  fact("Total XP", fmtInt(s.xp));
  fact("Daily streak", fmtInt(s.daily.streak));
  box.append(grid);
  const perGame = el("div", { class: "stack" });
  for (const [k, v] of Object.entries(s.perGame)) {
    if (!v.played) continue;
    perGame.append(el("div", { class: "spread small" },
      el("span", { class: "muted" }, gameKeyToLabel(k)),
      el("span", {}, `${v.played} plays · best ${fmtInt(v.best)}`)
    ));
  }
  if (perGame.children.length) box.append(perGame);
  return box;
}

function copy(text) {
  navigator.clipboard?.writeText(text)
    .then(() => toast("Copied to clipboard!", "clipboard"))
    .catch(() => toast(text, "clipboard"));
}

/* ---------------- friends ---------------- */
export function friendsPage() {
  const view = document.getElementById("view");
  view.innerHTML = "";
  const p = ensureProfile();

  view.append(
    el("div", { class: "center", style: { paddingTop: "8px" } },
      el("h1", { class: "h1" }, "Friends & ", el("span", { class: "grad-text" }, "Challenges")),
      el("p", { class: "sub" }, "Add friends with their code, challenge them to the same seeded game, and compare scores by pasting result codes.")
    )
  );

  const myCode = el("div", { class: "card pad mt-3" },
    el("div", { class: "spread" },
      el("div", {},
        el("h3", { class: "h3" }, "Your friend code"),
        el("p", { class: "faint small" }, p.name)
      ),
      el("button", { class: "btn small", onclick: () => copy(p.code) }, "Copy")
    ),
    el("div", { class: "code-box mt-1" }, p.code)
  );
  view.append(myCode);

  // add friend
  const addCard = el("div", { class: "card pad mt-2" });
  const codeInput = el("input", { class: "input", placeholder: "Enter a friend's 6-letter code…", maxlength: "6", style: { textTransform: "uppercase" } });
  const nameInput = el("input", { class: "input", placeholder: "Their name (optional)" });
  const addBtn = el("button", { class: "btn primary", onclick: doAdd }, icon("users"), "Add friend");
  codeInput.addEventListener("keydown", e => { if (e.key === "Enter") doAdd(); });
  addCard.append(
    el("h3", { class: "h3" }, "Add a friend"),
    el("div", { class: "row wrap mt-1" }, codeInput, nameInput, addBtn),
    el("p", { class: "faint small mt-1", style: { margin: 0 } }, "Offline mode: friends are stored on this device. Swap codes in real life or over chat — challenge codes keep scores fair.")
  );
  view.append(addCard);

  // list
  const listCard = el("div", { class: "card pad mt-2" });
  const list = el("div", { class: "stack" });
  function renderList() {
    list.innerHTML = "";
    const friends = getFriends();
    if (!friends.length) {
      list.append(el("div", { class: "empty" }, el("span", { class: "e-ico", html: icons.users }), "No friends yet. Trade friend codes and add your rivals!"));
      return;
    }
    for (const f of friends) {
      const fr = el("div", { class: "friend-row" },
        avatarCircle(f.name, f.avatar, 44),
        el("div", { class: "spread" },
          el("div", {},
            el("div", { class: "fr-name" }, f.name),
            el("div", { class: "fr-meta" }, f.code + (f.lastResult ? ` · last: ${f.lastResult.score} pts in ${gameKeyToLabel(f.lastResult.game)}` : ""))
          ),
          el("div", { class: "row" },
            el("button", { class: "btn small", onclick: () => challengeFriend(f) }, icon("swords"), "Challenge"),
            el("button", { class: "btn small danger", onclick: () => { if (confirm(`Remove ${f.name}?`)) { removeFriend(f.code); renderList(); } } }, "✕")
          )
        )
      );
      list.append(fr);
    }
  }
  renderList();
  listCard.append(list);
  view.append(listCard);

  // challenge arena: paste result codes
  const arena = el("div", { class: "card pad mt-2" });
  const resInput = el("input", { class: "input", placeholder: "Paste a challenge or result code here…" });
  arena.append(
    el("h3", { class: "h3" }, "Challenge arena"),
    el("p", { class: "faint small" }, "Start a challenge, send the code to a friend — you'll both play the identical question sequence. Paste their result code to compare."),
    el("div", { class: "row wrap mt-1" },
      resInput,
      el("button", { class: "btn primary", onclick: handleCode }, "Go"),
      el("button", { class: "btn", onclick: makeChallenge }, icon("swords"), "New challenge")
    ),
    el("div", { id: "arenaOut", class: "mt-2" })
  );
  view.append(arena);

  function challengeFriend(f) {
    const ch = { seed: Math.floor(Math.random() * 1e9), game: "flags", count: 10, v: 1 };
    const code = encodeChallenge(ch);
    openModal({ title: `Challenge ${f.name}`, body: el("div", { class: "stack" },
      el("p", { class: "sub" }, "Send this code to the friend. You'll both play the identical 10 flag questions — highest score wins."),
      el("div", { class: "code-box" }, code),
      el("div", { class: "row" },
        el("button", { class: "btn primary", onclick: () => startChallenge(ch, code) }, icon("play"), "Play now"),
        el("button", { class: "btn", onclick: () => copy(code) }, "Copy code")
      )
    ) });
  }

  function doAdd() {
    const code = codeInput.value.trim().toUpperCase();
    if (code.length !== 6) { toast("Friend codes are 6 characters.", "alert"); return; }
    const ok = addFriend({ code, name: nameInput.value.trim() || "Friend " + code.slice(-2), avatar: "" });
    if (!ok) { toast("That friend is already in your list!", "users"); return; }
    codeInput.value = ""; nameInput.value = "";
    toast("Friend added to your list!", "sparkles");
    renderList();
  }

  function makeChallenge() {
    const ch = { seed: Math.floor(Math.random() * 1e9), game: "flags", count: 10, v: 1 };
    const code = encodeChallenge(ch);
    document.getElementById("arenaOut").innerHTML = "";
    document.getElementById("arenaOut").append(
      el("div", { class: "stack" },
        el("p", { class: "sub" }, "Send this challenge code to a friend:"),
        el("div", { class: "code-box" }, code),
        el("div", { class: "row" },
          el("button", { class: "btn primary", onclick: () => startChallenge(ch, code) }, icon("play"), "Play it now"),
          el("button", { class: "btn", onclick: () => copy(code) }, "Copy code")
        )
      )
    );
  }

  function handleCode() {
    const code = resInput.value.trim().toUpperCase();
    const ch = decodeChallenge(code);
    const out = document.getElementById("arenaOut");
    out.innerHTML = "";
    if (ch && !ch.result) {
      out.append(el("div", { class: "stack" },
        el("p", { class: "sub" }, `Challenge accepted — ${ch.game} × ${ch.count} questions, same sequence for everyone.`),
        el("button", { class: "btn primary", onclick: () => startChallenge(ch, code) }, icon("play"), "Start challenge")
      ));
    } else if (ch && ch.result) {
      compareResult(ch);
    } else {
      toast("Hmm, that code isn't valid.", "alert");
    }
  }

  function compareResult(ch) {
    const out = document.getElementById("arenaOut");
    const mine = gs().challengeResults?.[ch.hash];
    out.innerHTML = "";
    if (!mine) {
      out.append(el("div", { class: "stack" },
        el("p", { class: "sub" }, `A friend scored ${ch.result.score}/${ch.result.total}.`),
        el("button", { class: "btn primary", onclick: () => startChallenge(ch, ch.hash) }, "Beat their score →")
      ));
    } else {
      const win = mine.score > ch.result.score;
      out.append(el("div", { class: "center stack" },
        el("span", { style: { display: "inline-flex", color: win ? "var(--gold)" : "var(--text-faint)" }, html: win ? icons.trophy : icons.target, "aria-hidden": "true" }),
        el("p", { class: "h3" }, win ? "You win!" : mine.score === ch.result.score ? "It's a tie!" : "They got you this time!"),
        el("p", { class: "muted" }, `You ${mine.score}/${mine.total} — them ${ch.result.score}/${ch.result.total}`)
      ));
    }
  }

  function startChallenge(ch, code) {
    import("./main.js").then(m => m.playChallenge(ch, code));
  }
}

/* challenge code encoding: CH.<seed>.<game>.<count> / result: RS.<hash>.<score>.<total> */
function encodeChallenge(ch) {
  return `CH-${ch.seed.toString(36).toUpperCase()}-${ch.game.toUpperCase()}-${ch.count}`;
}
function decodeChallenge(code) {
  const m = /^CH-([A-Z0-9]+)-(FLAGS|CAPITALS|TERRITORIES|HISTORY)-(\d+)$/.exec(code.trim().toUpperCase());
  if (!m) {
    const r = /^RS-([A-Z0-9-]+)-(\d+)-(\d+)$/.exec(code.trim().toUpperCase());
    if (r) return { hash: r[1], result: { score: +r[2], total: +r[3] } };
    return null;
  }
  return { seed: parseInt(m[1], 36), game: m[2].toLowerCase(), count: +m[3] };
}
export function challengeResultCode(hash, score, total) {
  return `RS-${hash}-${score}-${total}`;
}

/* ---------------- settings modal ---------------- */
export function openSettings() {
  const s = gs();
  const body = el("div");

  // theme
  const themeSeg = el("div", { class: "seg" },
    el("button", { class: document.documentElement.dataset.theme === "dark" ? "on" : "", onclick: () => { toggleTheme(); refreshTopbar(); markSeg(); } }, icon("moon"), "Dark"),
    el("button", { class: document.documentElement.dataset.theme === "light" ? "on" : "", onclick: () => { toggleTheme(); refreshTopbar(); markSeg(); } }, icon("sun"), "Light"),
  );
  function markSeg() {
    [...themeSeg.querySelectorAll("button")].forEach(b => {
      const isDark = !!b.querySelector('svg[class*="moon"]') || b.textContent.includes("Dark");
      b.classList.toggle("on", (isDark && document.documentElement.dataset.theme === "dark") || (!isDark && document.documentElement.dataset.theme === "light"));
    });
  }

  // sound
  const soundSw = el("label", { class: "switch" },
    Object.assign(el("input", { type: "checkbox" }), { checked: s.settings.sound }),
    el("span", { class: "track" }), el("span", { class: "knob" })
  );
  soundSw.querySelector("input").addEventListener("change", (e) => {
    gs().settings.sound = e.target.checked; save();
  });

  body.append(
    el("div", { class: "set-row" },
      el("div", {}, el("div", { class: "sr-title" }, "Theme"), el("div", { class: "sr-sub" }, "Dark space or bright daylight.")),
      themeSeg
    ),
    el("div", { class: "set-row" },
      el("div", {}, el("div", { class: "sr-title" }, "Sound effects"), el("div", { class: "sr-sub" }, "Tiny beeps for wins and streaks.")),
      soundSw
    ),
    el("div", { class: "set-row", style: { flexDirection: "column", alignItems: "stretch", gap: "8px" } },
      el("div", { class: "sr-title" }, "Reset progress"),
      el("div", { class: "sr-sub" }, "Wipes profile, XP, stats and friends on this device."),
      el("button", { class: "btn small danger", style: { alignSelf: "flex-start" }, onclick: () => {
        if (confirm("Really wipe ALL your AtlasQuest progress?")) { localStorage.removeItem("atlasquest_v1"); location.reload(); }
      } }, "Reset everything")
    )
  );

  openModal({ title: "Settings", body });
}

/* ---------------- topbar refresh helper (set by main.js) ---------------- */
let refreshTopbar = () => {};
export function setRefreshTopbar(fn) { refreshTopbar = fn; }
