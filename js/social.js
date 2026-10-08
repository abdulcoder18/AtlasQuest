// AtlasQuest — profile, friends, challenges, settings modal.
//
// Friend codes carry the player's name with them (POTATO-4W2J), so a pasted code
// always identifies its owner — there is no separate name box to get wrong.
// Adding a friend is mutual: the request lands on their side, they accept, and
// both lists update. Challenges arrive live and both players drop straight into
// the same seeded match.
import { el, icon, icons, toast, openModal, fmtInt } from "./ui.js";
import {
  getState as gs, ensureProfile, updateProfile, getFriends, removeFriend,
  AVATAR_COLORS, levelFromXp, makeCode, gameKeyToLabel, toggleTheme, save,
  friendCodeOf, parseFriendCode, slugName,
  getIncomingRequests, acceptFriendRequest, declineFriendRequest, pushIncomingRequest,
  getSentRequests, sendFriendRequest, cancelSentRequest, upsertFriend,
} from "./store.js";
import { initBus, listenOn, onSignal, sendSignal, busReady } from "./realtime.js";
import { requireAccount, isSignedIn } from "./supabase.js";

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
        style: { background: c, borderColor: c === selected ? "var(--ink)" : c },
        title: "Pick this color",
        onclick: () => { pendingAvatar = c; renderAvatars(c); },
      }));
    }
  }
  renderAvatars(p.avatar);
  nameInput.addEventListener("input", () => { pendingName = nameInput.value; });

  // the code preview updates live so renaming is visibly reflected
  const codePreview = el("div", { class: "code-box" }, friendCodeOf(pendingName, p.code));
  const refreshPreview = () => { codePreview.textContent = friendCodeOf(pendingName || "Explorer", p.code); };
  nameInput.addEventListener("input", refreshPreview);
  const saveBtn = el("button", { class: "btn primary", onclick: applyChanges }, icon("check"), "Save");
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
      saveBtn
    ),
    el("div", { class: "set-row", style: { flexDirection: "column", alignItems: "stretch", gap: "8px" } },
      el("div", { class: "sr-title" }, "Your friend code"),
      codePreview,
      el("p", { class: "faint small", style: { margin: 0 } }, "Your name is part of the code, so whoever adds you always sees the right name."),
      el("button", { class: "btn small", onclick: () => copy(friendCodeOf(ensureProfile().name, ensureProfile().code)) }, icon("clipboard"), "Copy code")
    ),
    statsBlock()
  );
  function applyChanges() {
    const name = nameInput.value.trim() || "Explorer";
    updateProfile({ name, avatar: pendingAvatar });
    nameInput.value = name;
    refreshTopbar();
    toast("Profile saved!", "check");
    modal.close();
    // friends see the new name on their next signal
    broadcastPresence();
  }
  let modal = null;
  modal = openModal({ title: "Your profile", body });
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

/* ---------------- realtime signalling ---------------- */
let signalWired = false;
function myCard() {
  const p = ensureProfile();
  const lvl = levelFromXp(gs().stats.xp);
  return { code: p.code, name: p.name, avatar: p.avatar, level: lvl.level, xp: gs().stats.xp };
}

/** Start listening for friend requests + challenges. Safe to call repeatedly. */
export function startSocialSignals() {
  if (signalWired) return;
  signalWired = true;
  const p = ensureProfile();
  listenOn(p.code);
  onSignal(handleSignal);
}

/** Tell friends the new name/level, so their list stays accurate. */
export function broadcastPresence() {
  if (!busReady()) return;
  for (const f of getFriends()) {
    sendSignal(f.code, { kind: "presence", from: myCard() });
  }
}

async function handleSignal(msg) {
  if (!msg || !msg.kind) return;
  const me = myCard();
  if (msg.from?.code === me.code) return; // our own echo

  if (msg.kind === "friend-request") {
    const known = getFriends().some(f => f.code === msg.from.code);
    if (!known && pushIncomingRequest(msg.from)) {
      toast(`${msg.from.name} wants to be friends!`, "users");
      renderIncomingBadge();
    }
    return;
  }
  if (msg.kind === "friend-accept") {
    // they accepted ours — add them straight away, no second step
    upsertFriend(msg.from);
    cancelSentRequest(msg.from.code);
    toast(`${msg.from.name} accepted — you're friends!`, "sparkles");
    if (location.hash === "#/friends") friendsPage();
    return;
  }
  if (msg.kind === "friend-decline") {
    cancelSentRequest(msg.from.code);
    toast(`${msg.from.name} declined your request.`, "alert");
    if (location.hash === "#/friends") friendsPage();
    return;
  }
  if (msg.kind === "challenge") {
    openChallengeInvite(msg);
    return;
  }
  if (msg.kind === "challenge-accept") {
    toast(`${msg.from.name} accepted your challenge!`, "swords");
    return;
  }
  if (msg.kind === "challenge-decline") {
    toast(`${msg.from.name} declined the challenge.`, "alert");
    return;
  }
  if (msg.kind === "presence") {
    // refresh that friend's cached name/level
    const f = getFriends().find(x => x.code === msg.from.code);
    if (f) {
      f.name = msg.from.name || f.name;
      f.avatar = msg.from.avatar ?? f.avatar;
      f.level = msg.from.level ?? f.level;
      f.xp = msg.from.xp ?? f.xp;
      save();
      if (location.hash === "#/friends") friendsPage();
    }
  }
}

let incomingModalOpen = false;
function renderIncomingBadge() {
  const n = getIncomingRequests().length;
  const badge = document.getElementById("friendReqBadge");
  if (!badge) return;
  badge.hidden = n === 0;
  badge.textContent = String(n);
}

/** A friend just challenged us — accept and we both drop into the match. */
function openChallengeInvite(msg) {
  if (incomingModalOpen) return;
  incomingModalOpen = true;
  const { game = "flags", count = 10, seed, room, friend } = msg;
  const label = gameKeyToLabel(game);
  let decided = false;
  let accepting = false;
  const decide = (accepted) => {
    if (decided) return;
    decided = true;
    sendSignal(msg.from.code, {
      kind: accepted ? "challenge-accept" : "challenge-decline",
      from: myCard(),
    });
  };
  // Gate BEFORE telling the challenger we accepted — otherwise they think the
  // match is starting while we're still asking for an account.
  async function onAccept() {
    accepting = true;                    // stop the dismiss handler declining for us
    const allowed = await requireAccount("Challenges");
    if (!allowed) { modal.close(); return; }   // onClose now sends the decline
    decide(true);
    modal.close();
    acceptChallenge(msg);
  }
  const body = el("div", { class: "stack center" },
    el("img", { src: "assets/gen/mascot-web.png", alt: "", style: { width: "92px", margin: "0 auto", borderRadius: "12px", border: "2px solid var(--ink)" } }),
    el("p", { class: "h3" }, `${friend?.name || msg.from?.name || "A friend"} challenges you!`),
    el("p", { class: "sub" }, `${label} · ${count} questions · identical questions for both of you.`),
    el("div", { class: "row", style: { justifyContent: "center", flexWrap: "wrap", gap: "10px" } },
      el("button", { class: "btn primary big", onclick: onAccept }, icon("swords"), "Accept & play"),
      el("button", { class: "btn", onclick: () => { decide(false); modal.close(); } }, "Decline")
    )
  );
  // dismissing counts as declining, so the challenger isn't left hanging
  const modal = openModal({ title: "Challenge incoming", body, onClose: () => { if (!accepting) decide(false); incomingModalOpen = false; } });
}

async function acceptChallenge(msg) {
  // joinMatch opens its own activation popup if needed
  if (location.hash === "#/versus") (await import("./main.js")).route();
  else location.hash = "#/versus";
  const vs = await import("./games/versus.js");
  setTimeout(() => {
    const zone = document.getElementById("lobbyZone");
    vs.joinMatch(String(msg.room).toUpperCase(), zone || document.getElementById("view"));
  }, 300);
}

/* ---------------- in-app confirm (no native confirm) ---------------- */
export function confirmDialog({ title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", danger = true }) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (v) => { if (settled) return; settled = true; resolve(v); };
    const body = el("div", { class: "stack" },
      el("p", { class: "sub", style: { margin: 0 } }, message),
      el("div", { class: "row", style: { justifyContent: "flex-end", gap: "10px", marginTop: "6px" } },
        el("button", { class: "btn ghost", onclick: () => { done(false); modal.close(); } }, cancelLabel),
        el("button", {
          class: `btn ${danger ? "danger" : "primary"}`,
          onclick: () => { done(true); modal.close(); },
        }, confirmLabel)
      )
    );
    const modal = openModal({ title, body, onClose: () => done(false) });
  });
}

/* ---------------- friends page ---------------- */
export function friendsPage() {
  const view = document.getElementById("view");
  view.innerHTML = "";
  const p = ensureProfile();
  startSocialSignals();

  view.append(
    el("div", { class: "center", style: { paddingTop: "8px" } },
      el("h1", { class: "h1" }, "Friends & ", el("span", { class: "grad-text" }, "Challenges")),
      el("p", { class: "sub" }, "Add a friend with their code, challenge them to a live match, and see both scores the moment you finish.")
    )
  );

  /* my code — name travels with it */
  const myCode = friendCodeOf(p.name, p.code);
  view.append(el("div", { class: "card pad mt-3" },
    el("div", { class: "spread" },
      el("div", {},
        el("h3", { class: "h3" }, "Your friend code"),
        el("p", { class: "faint small" }, `${p.name} · Lv ${levelFromXp(gs().stats.xp).level}`)
      ),
      el("button", { class: "btn small", onclick: () => copy(myCode) }, icon("clipboard"), "Copy")
    ),
    el("div", { class: "code-box mt-1" }, myCode)
  ));

  /* incoming requests */
  const reqCard = el("div", { class: "card pad mt-2" });
  const reqList = el("div", { class: "stack" });
  function renderRequests() {
    reqList.innerHTML = "";
    const reqs = getIncomingRequests();
    if (!reqs.length) {
      reqCard.hidden = true;
      renderIncomingBadge();
      return;
    }
    reqCard.hidden = false;
    reqCard.append(el("h3", { class: "h3" }, "Friend requests"), reqList);
    for (const r of reqs) {
      reqList.append(el("div", { class: "friend-row" },
        avatarCircle(r.name, r.avatar, 44),
        el("div", { class: "spread" },
          el("div", {},
            el("div", { class: "fr-name" }, r.name),
            el("div", { class: "fr-meta" }, `Lv ${r.level || 1} · ${r.code}`)
          ),
          el("div", { class: "row" },
            el("button", { class: "btn small primary", onclick: () => doAccept(r) }, icon("check"), "Accept"),
            el("button", { class: "btn small danger", onclick: () => { declineFriendRequest(r.code); sendSignal(r.code, { kind: "friend-decline", from: myCard() }); renderRequests(); } }, "✕")
          )
        )
      ));
    }
    renderIncomingBadge();
  }
  async function doAccept(r) {
    acceptFriendRequest(r.code);
    // tell them so their side adds us back immediately
    const ok = await sendSignal(r.code, { kind: "friend-accept", from: myCard() });
    toast(ok ? `You're friends with ${r.name}!` : `${r.name} added — they'll see it when they're back online.`, "sparkles");
    renderRequests();
    renderList();
  }
  renderRequests();
  view.append(reqCard);

  /* add friend — code only, the name comes from the code */
  const addCard = el("div", { class: "card pad mt-2" });
  const codeInput = el("input", { class: "input", placeholder: "POTATO-4W2J", style: { textTransform: "uppercase" } });
  const addBtn = el("button", { class: "btn primary", onclick: doAdd }, icon("users"), "Send request");
  const hintText = () => isSignedIn()
    ? "Requests arrive live — they accept and you both get each other instantly."
    : "You'll be asked to activate a free account before sending — live requests need both sides signed in.";
  const parsedHint = el("p", { class: "faint small mt-1", style: { margin: 0 } }, "Paste a friend's code. It looks like NAME-CODE, and the name comes with it.");
  const busHint = el("p", { class: "faint small", style: { margin: "8px 0 0" } }, busReady()
    ? "Requests arrive live — they accept and you both get each other instantly."
    : "You're offline, so requests are queued. They'll see it once you're both back online.");
  codeInput.addEventListener("input", () => {
    const parsed = parseFriendCode(codeInput.value);
    parsedHint.textContent = parsed.name
      ? `Adding ${parsed.name} — they'll get a request to accept.`
      : "Paste a friend's code. It looks like NAME-CODE, and the name comes with it.";
  });
  codeInput.addEventListener("keydown", e => { if (e.key === "Enter") doAdd(); });
  addCard.append(
    el("h3", { class: "h3" }, "Add a friend"),
    el("div", { class: "row wrap mt-1" }, codeInput, addBtn),
    parsedHint,
    isSignedIn() ? busHint : null
  );
  view.append(addCard);

  /* friend list */
  const listCard = el("div", { class: "card pad mt-2" });
  const list = el("div", { class: "stack" });
  function renderList() {
    list.innerHTML = "";
    const friends = getFriends();
    const sent = getSentRequests();
    if (!friends.length && !sent.length) {
      list.append(el("div", { class: "empty" }, el("span", { class: "e-ico", html: icons.users }),
        "No friends yet — send someone their code and ask for theirs."));
      return;
    }
    for (const f of friends) {
      list.append(el("div", { class: "friend-row" },
        avatarCircle(f.name, f.avatar, 44),
        el("div", { class: "spread" },
          el("div", {},
            el("div", { class: "fr-name" }, f.name),
            el("div", { class: "fr-meta" },
              f.code + (f.lastResult ? ` · last: ${f.lastResult.score} pts in ${gameKeyToLabel(f.lastResult.game)}` : ""))
          ),
          el("div", { class: "row" },
            el("button", { class: "btn small", onclick: () => challengeFriend(f) }, icon("swords"), "Challenge"),
            el("button", { class: "btn small danger", onclick: () => askRemove(f) }, "✕")
          )
        )
      ));
    }
    for (const r of sent) {
      list.append(el("div", { class: "friend-row" },
        avatarCircle(r.name, r.avatar, 44),
        el("div", { class: "spread" },
          el("div", {},
            el("div", { class: "fr-name" }, r.name),
            el("div", { class: "fr-meta" }, "Waiting for them to accept…")
          ),
          el("button", { class: "btn small danger", onclick: () => { cancelSentRequest(r.code); renderList(); } }, "Cancel")
        )
      ));
    }
  }
  async function askRemove(f) {
    const ok = await confirmDialog({
      title: "Remove friend",
      message: `Remove ${f.name} from your friends list? You'll both lose each other from your lists.`,
      confirmLabel: "Remove friend",
    });
    if (!ok) return;
    removeFriend(f.code);
    renderList();
    toast(`${f.name} removed.`, "users");
  }
  renderList();
  listCard.append(list);
  view.append(listCard);

  async function doAdd() {
    const parsed = parseFriendCode(codeInput.value);
    if (!parsed.valid) { toast("That doesn't look like a friend code.", "alert"); return; }
    // requests travel over the realtime bus, so both sides need an account
    if (!(await requireAccount("Friend requests"))) return;
    const me = myCard();
    if (parsed.code === me.code) { toast("That's your own code!", "alert"); return; }
    if (getFriends().some(f => f.code === parsed.code)) { toast("They're already your friend.", "users"); return; }

    const name = parsed.name || "Friend " + parsed.code.slice(-2);
    const target = { code: parsed.code, name, avatar: "", level: 1, xp: 0 };
    sendFriendRequest(target);
    const ok = await sendSignal(parsed.code, { kind: "friend-request", from: me });
    codeInput.value = "";
    parsedHint.textContent = "Paste a friend's code. It looks like NAME-CODE, and the name comes with it.";
    if (ok) toast(`Request sent to ${name}!`, "sparkles");
    else toast(`Saved. ${name} will get the request when they're online.`, "clipboard");
    renderList();
  }

  /* start a live challenge — both players land in the same match */
  async function challengeFriend(f) {
    const vs = await import("./games/versus.js");
    // hostChallenge opens its own activation popup if needed
    const match = await vs.hostChallenge(f, { game: pickGame(), count: 10 });
    if (!match) return;                       // player backed out of activation
    const me = myCard();
    const ok = await sendSignal(f.code, {
      kind: "challenge", from: me,
      room: match.code, seed: match.seed, game: match.game, count: match.count,
      friend: { code: me.code, name: me.name },
    });
    toast(ok
      ? `Challenge sent to ${f.name} — the match starts when they accept.`
      : `${f.name} isn't online right now. Room code ${match.code} — send it to them.`, "swords");
  }

  function pickGame() {
    return ["flags", "capitals", "territories", "history", "mappoint", "geoguesser"][Math.floor(Math.random() * 6)];
  }
}

/* hook called by main.js: wire up the bus + drawer badge */
export async function initSocial() {
  await initBus().catch(() => false);
  startSocialSignals();
  renderIncomingBadge();
}

/* ---------------- settings modal ---------------- */
export function openSettings() {
  const s = gs();
  const body = el("div");

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
      el("button", { class: "btn small danger", style: { alignSelf: "flex-start" }, onclick: async () => {
        const ok = await confirmDialog({
          title: "Reset everything",
          message: "This wipes your profile, XP, stats and friends on this device. It can't be undone.",
          confirmLabel: "Wipe it all",
        });
        if (ok) { localStorage.removeItem("atlasquest_v1"); location.reload(); }
      } }, "Reset everything")
    )
  );

  openModal({ title: "Settings", body });
}

/* ---------------- topbar refresh helper (set by main.js) ---------------- */
let refreshTopbar = () => {};
export function setRefreshTopbar(fn) { refreshTopbar = fn; }