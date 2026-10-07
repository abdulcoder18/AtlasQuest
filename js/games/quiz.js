// AtlasQuest — shared quiz engine used by flags / capitals / territories / history / daily.
import { el, icon, icons, sfx, confetti, toast, openModal, animateNumber } from "../ui.js";
import { addXp, recordGame, levelFromXp, getState } from "../store.js";

/**
 * @param {object} cfg
 *  title, gameKey, questions[], timerSec?, seedless rand already applied,
 *  onOpenLore(cca3), exitHash (where "Home" goes), shareTitle
 */
export function runQuiz(cfg) {
  const view = document.getElementById("view");
  view.innerHTML = "";
  if (!cfg.questions.length) {
    view.append(el("div", { class: "empty" },
      el("span", { class: "e-ico", html: icons.alert }),
      el("p", { class: "sub" }, "No questions available for this combination yet — try a different region."),
      el("button", { class: "btn mt-2", onclick: () => location.hash = cfg.exitHash || "#/" }, "Back")
    ));
    return { destroy: () => {} };
  }
  const state = {
    i: 0, score: 0, streak: 0, bestStreak: 0,
    correct: 0, results: [], locked: false, timerId: null, timeLeft: cfg.timerSec || 0,
  };

  const shell = el("div", { class: "quiz-shell" });
  view.append(shell);

  const topbar = el("div", { class: "quiz-topbar" });
  const progressFill = el("div", { class: "qp-fill" });
  topbar.append(
    el("button", { class: "iconbtn", title: "Quit quiz", html: icon("x").innerHTML, onclick: confirmQuit }),
    el("div", { class: "q-progress" }, progressFill),
    el("div", { class: "q-score" }, icon("target"), el("span", { class: "score-num" }, "0")),
    el("div", { class: "q-streak", hidden: true }, icon("fire"), el("span", { class: "streak-num" }, "0"))
  );
  shell.append(topbar);

  let cardEl = null;
  function setProgress() {
    progressFill.style.width = `${(state.i / cfg.questions.length) * 100}%`;
  }
  function updateHud() {
    shell.querySelector(".score-num").textContent = String(state.score);
    const st = shell.querySelector(".q-streak");
    st.hidden = state.streak < 2;
    if (!st.hidden) {
      st.querySelector(".streak-num").textContent = String(state.streak);
      st.classList.remove("pop"); void st.offsetWidth; st.classList.add("pop");
    }
  }

  function confirmQuit() {
    if (state.i > 0 && state.i < cfg.questions.length) {
      if (confirm("Quit this quiz? Your progress will be lost.")) finish(true);
    } else goHome();
  }
  /* Assigning the same hash fires no hashchange, so the router would never
     re-run and the button would look dead. cfg.onExit lets the caller handle
     that case (challenges run while already on #/). */
  function goHome() {
    if (cfg.onExit) { cfg.onExit(); return; }
    const target = cfg.exitHash || "#/";
    if (location.hash === target || location.hash === "") {
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    } else {
      location.hash = target;
    }
  }

  /* ---------- question rendering ---------- */
  function showQuestion() {
    setProgress(); updateHud();
    state.locked = false;
    const q = cfg.questions[state.i];
    cardEl?.remove();
    cardEl = el("div", { class: "card quiz-card" });
    shell.append(cardEl);

    cardEl.append(
      el("p", { class: "quiz-q" }, q.prompt),
      q.qsub ? el("p", { class: "quiz-qsub" }, q.qsub) : el("p", { class: "quiz-qsub" }, `Question ${state.i + 1} of ${cfg.questions.length}`)
    );
    if (q.flag) {
      const img = el("img", { class: "quiz-flagsvg", src: q.flag, alt: "flag to guess" });
      img.addEventListener("error", () => { img.style.display = "none"; });
      cardEl.append(img);
    }

    if (q.kind === "mcq") renderMcq(q);
    else renderInput(q);

    startTimer();
  }

  function startTimer() {
    stopTimer();
    if (!cfg.timerSec) return;
    state.timeLeft = cfg.timerSec;
    const ringWrap = el("div", { class: "timer-ring" });
    ringWrap.innerHTML = `<svg width="44" height="44"><circle cx="22" cy="22" r="19" fill="none" stroke="var(--border)" stroke-width="4"/>
      <circle class="ring" cx="22" cy="22" r="19" fill="none" stroke="var(--a2)" stroke-width="4" stroke-linecap="round" stroke-dasharray="119.4" stroke-dashoffset="0"/></svg>
      <span class="t-num"></span>`;
    cardEl.prepend(ringWrap);
    const ring = ringWrap.querySelector(".ring"), num = ringWrap.querySelector(".t-num");
    const C = 2 * Math.PI * 19;
    const tick = () => {
      num.textContent = Math.ceil(state.timeLeft);
      ring.style.strokeDashoffset = String(C * (1 - state.timeLeft / cfg.timerSec));
      if (state.timeLeft <= 5) { ringWrap.classList.add("warn"); ring.setAttribute("stroke", "var(--bad)"); sfx.tick(); }
      if (state.timeLeft <= 0) { answer(null); return; }
      state.timeLeft -= 0.1;
    };
    tick();
    state.timerId = setInterval(tick, 100);
  }
  function stopTimer() { if (state.timerId) { clearInterval(state.timerId); state.timerId = null; } }

  /* ---------- MCQ ---------- */
  function renderMcq(q) {
    const grid = el("div", { class: "choices" });
    const buttons = q.choices.map((c, idx) => {
      const b = el("button", { class: "choice", onclick: () => answer(idx) },
        el("span", { class: "ckey" }, String(idx + 1)),
        c.flag ? el("img", { class: "cflag", src: c.flag, alt: c.name || "" }) : null,
        el("span", {}, c.label)
      );
      grid.append(b); return b;
    });
    cardEl.append(grid);
    const onKey = (e) => {
      const n = parseInt(e.key);
      if (n >= 1 && n <= q.choices.length && !state.locked) { sfx.click(); answer(n - 1); }
    };
    document.addEventListener("keydown", onKey);
    cleanupFns.push(() => document.removeEventListener("keydown", onKey));
    state.buttons = buttons;
  }

  /* ---------- typed input ---------- */
  function renderInput(q) {
    const input = el("input", { class: "input", placeholder: q.placeholder || "Type your answer…", autocomplete: "off", spellcheck: "false" });
    const submit = el("button", { class: "btn primary", onclick: () => answer(input.value) }, "Answer");
    const row = el("div", { class: "quiz-type-row" }, input, submit);
    cardEl.append(row);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !state.locked) answer(input.value); });
    input.addEventListener("input", () => input.style.borderColor = "");
    setTimeout(() => input.focus(), 60);
    state.input = input;
  }

  /* ---------- answering ---------- */
  function answer(idxOrValue) {
    if (state.locked) return;
    state.locked = true;
    stopTimer();
    const q = cfg.questions[state.i];
    let isCorrect, givenLabel;
    if (q.kind === "mcq") {
      isCorrect = idxOrValue === q.answerIdx;
      givenLabel = idxOrValue == null ? "no answer" : q.choices[idxOrValue]?.label;
      state.buttons?.forEach((b, i) => {
        b.disabled = true;
        if (i === q.answerIdx) b.classList.add("correct");
        else if (i === idxOrValue) b.classList.add("wrong");
        else b.classList.add("dim");
      });
    } else {
      isCorrect = idxOrValue != null && q.validate(idxOrValue);
      givenLabel = idxOrValue || "no answer";
      if (state.input) {
        state.input.disabled = true;
        if (!isCorrect) { state.input.style.borderColor = "var(--bad)"; }
      }
    }

    if (isCorrect) {
      state.correct++; state.streak++;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
      const streakBonus = Math.min(10, (state.streak - 1) * 2);
      const gained = 10 + streakBonus;
      state.score += gained;
      sfx.correct(state.streak);
      const xpRes = addXp(gained);
      cardEl.append(el("div", { class: "xp-float" }, `+${gained} XP`));
      if (xpRes.leveledUp) { toast(`Level up! You are now a ${levelFromXp(levelNow()).title}`, "sparkles"); sfx.fanfare(); confetti(); }
      if (state.streak >= 5) confetti(innerWidth / 2, innerHeight / 3, 60);
    } else {
      state.streak = 0;
      sfx.wrong();
    }
    state.results.push({ q, correct: isCorrect, givenLabel });
    updateHud();
    showReveal(q, isCorrect, givenLabel);
  }

  function levelNow() { return getState().stats.xp; }

  /* ---------- reveal panel ---------- */
  function showReveal(q, isCorrect, givenLabel) {
    const reveal = q.reveal; // node (prebuilt) or {node}
    const node = reveal?.node || reveal;
    const panel = el("div", { class: "reveal" });
    const verdict = el("div", { class: "row", style: { padding: "14px 18px 0", gap: "12px" } },
      el("span", { class: `stamp-hit ${isCorrect ? "ok" : "no"}` }, isCorrect ? "Correct" : "Wrong"),
      isCorrect ? null : el("span", { class: "small muted", style: { fontWeight: "700" } },
        q.answerLabel ? `the answer was ${q.answerLabel}` : ""));
    panel.append(verdict, node);

    const nextLabel = state.i + 1 >= cfg.questions.length ? "See results" : "Next question";
    const nextBtn = el("button", { class: "btn primary", onclick: next }, nextLabel, icon("chevR"));
    const actions = el("div", { class: "reveal-actions" });
    if (q.reveal?.lore || q.reveal?.country) {
      actions.append(el("button", { class: "btn small ghost", onclick: () => cfg.onOpenLore?.(q.reveal.country.cca3) }, icon("book"), "Full lore"));
    }
    actions.append(nextBtn);
    panel.append(actions);
    cardEl.append(panel);
    const onKey = (e) => {
      if (e.key === "Enter" && state.locked) { e.preventDefault(); next(); }
    };
    document.addEventListener("keydown", onKey);
    cleanupFns.push(() => document.removeEventListener("keydown", onKey));
    nextBtn.focus();
    // scroll reveal into view on small screens
    setTimeout(() => panel.scrollIntoView({ behavior: "smooth", block: "nearest" }), 80);
  }

  function next() {
    state.i++;
    if (state.i >= cfg.questions.length) finish(false);
    else showQuestion();
  }

  /* ---------- finish / results ---------- */
  function finish(aborted) {
    stopTimer();
    cleanupFns.forEach(f => f()); cleanupFns.length = 0;
    if (!aborted) {
      const total = cfg.questions.length;
      recordGame(cfg.gameKey, {
        score: state.score, correct: state.correct, total, bestStreak: state.bestStreak,
      });
      addXp(25); // completion bonus
      cfg.onFinish?.({ score: state.score, correct: state.correct, total });
    }
    shell.innerHTML = "";
    const pct = Math.round((state.correct / cfg.questions.length) * 100);
    const shareText = `${cfg.shareTitle || "AtlasQuest"}: ${state.correct}/${cfg.questions.length} correct, ${state.score} pts`;

    const squares = el("div", { class: "result-squares", "aria-hidden": "true" },
      state.results.map(r => el("span", { class: `sq${r.correct ? "" : " bad"}` })));
    const result = el("div", { class: "result-wrap" });
    const scoreNumEl = el("div", { class: "sh-num grad-text", style: { margin: "10px 0 4px" } }, "0");
    result.append(
      el("div", { class: "score-hero" },
        el("div", { class: "faint small", style: { letterSpacing: ".12em", textTransform: "uppercase", fontWeight: "800" } }, aborted ? "Quiz ended" : "Quiz complete"),
        scoreNumEl,
        el("div", { class: "muted" }, `${pct}% accuracy · best streak ${state.bestStreak} · +${aborted ? 0 : 25} XP`),
        squares
      ),
      recapGrid(),
      el("div", { class: "row", style: { justifyContent: "center", flexWrap: "wrap", gap: "10px" } },
        el("button", { class: "btn primary big", onclick: () => (cfg.onReplay ? cfg.onReplay() : location.reload()) }, icon("refresh"), "Play again"),
        el("button", { class: "btn", onclick: () => { navigator.clipboard?.writeText(shareText).then(() => toast("Result copied — paste it to friends!", "clipboard")).catch(() => toast(shareText, "clipboard")); } }, icon("share"), "Share result"),
        el("button", { class: "btn ghost", onclick: goHome }, "Home")
      )
    );
    shell.append(result);
    animateNumber(scoreNumEl, state.correct, { dur: 900, format: (n) => `${n}/${cfg.questions.length}` });
    if (!aborted) {
      if (pct >= 80) confetti(innerWidth / 2, innerHeight / 3, 160);
      sfx.fanfare();
    }
  }

  function recapGrid() {
    const grid = el("div", { class: "recap-grid" });
    for (const r of state.results) {
      const img = r.q.flag || r.q.reveal?.country ? (r.q.flag || (r.q.reveal?.country ? `assets/flags/${r.q.reveal.country.cca2.toLowerCase()}.svg` : null)) : null;
      const name = r.q.reveal?.country?.name || r.q.answerLabel || r.q.reveal?.node?.querySelector?.(".reveal-title")?.textContent || r.givenLabel || "";
      const cell = el("div", { class: `recap-cell${r.correct ? "" : " bad"}`, title: `${name} — you said: ${r.givenLabel}` });
      if (img) cell.append(el("img", { src: img, alt: name, loading: "lazy" }));
      cell.append(el("div", { class: "rc-name" }, name || r.givenLabel));
      grid.append(cell);
    }
    return grid;
  }

  /* ---------- lifecycle ---------- */
  const cleanupFns = [];
  showQuestion();
  return { destroy: () => { stopTimer(); cleanupFns.forEach(f => f()); } };
}
