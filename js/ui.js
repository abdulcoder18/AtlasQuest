// AtlasQuest — UI toolkit: DOM builder, icons, modals, toasts, confetti, sounds, formatting.

/* ---------- DOM builder ---------- */
export function el(tag, attrs = {}, ...children) {
  const node = tag === "fragment" ? document.createDocumentFragment() : document.createElement(tag);
  if (tag !== "fragment") {
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else if (k === "dataset") Object.assign(node.dataset, v);
      else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === "style" && typeof v === "object") {
        for (const [prop, val] of Object.entries(v)) {
          if (prop.startsWith("--")) node.style.setProperty(prop, val);
          else node.style[prop] = val;
        }
      }
      else if (v === true) node.setAttribute(k, "");
      else node.setAttribute(k, v);
    }
  }
  const append = (c) => {
    if (c == null || c === false) return;
    if (Array.isArray(c)) return c.forEach(append);
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  };
  children.flat(9).forEach(append);
  return node;
}

/* ---------- Icons (inline SVG, stroke style, 24px grid, stroke-width 2) ---------- */
const I = (paths, vb = "0 0 24 24") =>
  `<svg class="ico" viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
export const icons = {
  home: I('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>'),
  flag: I('<path d="M5 21V4"/><path d="M5 4h11l-1.5 4L16 12H5"/>'),
  capital: I('<path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/><path d="M9 21v-4h6v4"/><path d="M12 8v3"/>'),
  pin: I('<path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z"/><circle cx="12" cy="10" r="2.6"/>'),
  scroll: I('<path d="M6 3h12v14a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z"/><path d="M9 8h6M9 12h6"/>'),
  users: I('<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16.5 5.5a3 3 0 0 1 0 5"/><path d="M18.5 14.6c1.9.7 3 2.2 3 4.4"/>'),
  gear: I('<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v2.6M12 18.9v2.6M4.9 4.9l1.9 1.9M17.2 17.2l1.9 1.9M2.5 12h2.6M18.9 12h2.6M4.9 19.1l1.9-1.9M17.2 6.8l1.9-1.9"/>'),
  sun: I('<circle cx="12" cy="12" r="4.2"/><path d="M12 2.8v2M12 19.2v2M4.4 4.4l1.5 1.5M18.1 18.1l1.5 1.5M2.8 12h2M19.2 12h2M4.4 19.6l1.5-1.5M18.1 5.9l1.5-1.5"/>'),
  moon: I('<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/>'),
  play: I('<path d="M7 4.8v14.4L19 12 7 4.8z"/>'),
  trophy: I('<path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M8 5H5a3 3 0 0 0 3 4M16 5h3a3 3 0 0 1-3 4"/><path d="M12 13v3M8.5 21h7M10 21l.5-5h3l.5 5"/>'),
  target: I('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/>'),
  share: I('<circle cx="6" cy="12" r="2.4"/><circle cx="17.5" cy="5.5" r="2.4"/><circle cx="17.5" cy="18.5" r="2.4"/><path d="M8.2 10.9l7.1-4.1M8.2 13.1l7.1 4.1"/>'),
  x: I('<path d="M5 5l14 14M19 5L5 19"/>'),
  compass: I('<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5 13.4 13.4 8.5 15.5l2.1-4.9z"/>'),
  book: I('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 5.5v15"/>'),
  fire: I('<path d="M12 3s5 4.5 5 9.5a5 5 0 0 1-10 0c0-2 1-3.6 2-5 0 1.5.7 2.5 1.8 3C10.6 8.5 11 5.5 12 3z"/>'),
  zap: I('<path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2z"/>'),
  check: I('<path d="M4.5 12.5 10 18 19.5 6.5"/>'),
  chevR: I('<path d="M9 5l7 7-7 7"/>'),
  chevD: I('<path d="M5 9l7 7 7-7"/>'),
  crown: I('<path d="M3 17 4.5 7l4.5 4L12 5l3 6 4.5-4L21 17z"/><path d="M3 17h18v3H3z"/>'),
  timer: I('<path d="M9.5 2h5"/><circle cx="12" cy="13.5" r="7.5"/><path d="M12 10v3.5l2.3 2.3"/>'),
  lightbulb: I('<path d="M9.5 18h5"/><path d="M10.5 21h3"/><path d="M12 3a6 6 0 0 0-3.9 10.6c.7.6 1.4 1.4 1.4 2.4v.5h5v-.5c0-1 .7-1.8 1.4-2.4A6 6 0 0 0 12 3z"/>'),
  star: I('<path d="M12 3.5l2.5 5.2 5.7.7-4.2 4 1.1 5.6-5.1-2.8-5.1 2.8 1.1-5.6-4.2-4 5.7-.7z"/>'),
  palette: I('<path d="M12 3a9 9 0 1 0 .5 18c1.6 0 2.2-1.1 1.6-2.2-.7-1.3.2-2.8 1.7-2.8H18a4 4 0 0 0 3-4c0-5-4-9-9-9z"/><circle cx="7.8" cy="10.5" r="1"/><circle cx="12" cy="7.5" r="1"/><circle cx="16.2" cy="10.5" r="1"/>'),
  swords: I('<path d="M4 4l9.5 9.5"/><path d="M20 4l-9.5 9.5"/><path d="M13.5 13.5 11 16"/><path d="M10.5 13.5 13 16"/><path d="M6.5 14.5 3 18l1.5 1.5L8 16"/><path d="M17.5 14.5 21 18l-1.5 1.5L16 16"/>'),
  map: I('<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>'),
  clipboard: I('<path d="M9 4h6"/><path d="M9 4a2 2 0 0 0-2 2v0H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h0a2 2 0 0 0-2-2"/><rect x="9" y="2.5" width="6" height="3.5" rx="1"/><path d="M9 12h6M9 16h4"/>'),
  sparkles: I('<path d="M12 4l1.6 4.6L18 10l-4.4 1.4L12 16l-1.6-4.6L6 10l4.4-1.4z"/><path d="M18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>'),
  trendUp: I('<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>'),
  trendDown: I('<path d="M3 7l6 6 4-4 8 8"/><path d="M15 17h6v-6"/>'),
  mountain: I('<path d="M3 20 10 6l4 7 3-4 4 11z"/>'),
  globe: I('<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a13.5 13.5 0 0 1 0 18 13.5 13.5 0 0 1 0-18z"/>'),
  refresh: I('<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.5 3.5V9H9"/>'),
  checkCircle: I('<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>'),
  xCircle: I('<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>'),
  alert: I('<path d="M12 4 21 20H3z"/><path d="M12 10v4.5"/><path d="M12 17.2v.3"/>'),
  person: I('<circle cx="12" cy="7.5" r="3.5"/><path d="M5 20c.8-3.6 3.5-5.5 7-5.5s6.2 1.9 7 5.5"/>'),
  satellite: I('<circle cx="12" cy="12" r="3"/><path d="M14.8 9.2 19 5"/><path d="M19 8V5h-3"/><path d="M9.2 14.8 5 19"/><path d="M5 16v3h3"/><path d="M17 17a7 7 0 0 1-10 0"/>'),
  calendar: I('<rect x="4" y="5.5" width="16" height="15" rx="2"/><path d="M4 10.5h16"/><path d="M8 3v4M16 3v4"/>'),
  menu: I('<path d="M4 7h16M4 12h16M4 17h16"/>'),
};
export const icon = (name, cls = "") => el("span", { class: `icowrap ${cls}`, html: icons[name] || "", "aria-hidden": "true" });

/* ---------- formatting ---------- */
export function fmtInt(n) { return n == null ? "—" : Number(n).toLocaleString("en-US"); }
export function fmtCompact(n) {
  if (n == null) return "—";
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}
export function fmtKm(km) {
  if (km < 1) return "0 km";
  if (km < 10) return km.toFixed(1) + " km";
  return Math.round(km).toLocaleString("en-US") + " km";
}

/* ---------- Toasts ---------- */
export function toast(msg, icoName) {
  const root = document.getElementById("toastRoot");
  const t = el("div", { class: "toast" },
    icoName && icons[icoName] ? el("span", { class: "t-ico", html: icons[icoName], "aria-hidden": "true" }) : null,
    msg
  );
  root.append(t);
  setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 260); }, 2600);
}

/* ---------- Number count-up ---------- */
export function animateNumber(node, to, { dur = 900, from = 0, format = (n) => String(n) } = {}) {
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - t, 3);
    node.textContent = format(Math.round(from + (to - from) * eased));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ---------- Modal ---------- */
export function openModal({ title, body, wide = false, onClose }) {
  const root = document.getElementById("modalRoot");
  const scrim = el("div", { class: "modal-scrim" });
  const close = () => { scrim.remove(); document.removeEventListener("keydown", onKey); onClose && onClose(); };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  const box = el("div", { class: `modal${wide ? " wide" : ""}`, role: "dialog", "aria-modal": "true" },
    el("div", { class: "modal-head" },
      typeof title === "string" ? el("h3", { class: "h3" }, title) : title,
      el("button", { class: "iconbtn", "aria-label": "Close", onclick: close, html: icons.x })
    ),
    el("div", { class: "modal-body" }, body)
  );
  scrim.append(box);
  scrim.addEventListener("mousedown", (e) => { if (e.target === scrim) close(); });
  document.addEventListener("keydown", onKey);
  root.append(scrim);
  return { close, box };
}

/* ---------- Confetti ---------- */
let confettiParticles = [], confettiRunning = false;
export function confetti(cx = innerWidth / 2, cy = innerHeight / 2.6, count = 90, spread = 1) {
  const canvas = document.getElementById("confetti");
  const ctx = canvas.getContext("2d");
  canvas.width = innerWidth; canvas.height = innerHeight;
  const colors = ["#171410", "#edeae2", "#f5d920", "#171410", "#edeae2", "#d8432f"];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const speed = (3 + Math.random() * 7) * spread;
    confettiParticles.push({
      x: cx, y: cy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 3,
      size: 4 + Math.random() * 6, color: colors[(Math.random() * colors.length) | 0],
      rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3, life: 1,
    });
  }
  if (!confettiRunning) { confettiRunning = true; requestAnimationFrame(confettiTick); }
}
function confettiTick() {
  const canvas = document.getElementById("confetti");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  confettiParticles = confettiParticles.filter(p => p.life > 0);
  for (const p of confettiParticles) {
    p.vy += 0.22; p.vx *= 0.985; p.vy *= 0.985;
    p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 0.011;
    ctx.save(); ctx.globalAlpha = Math.max(0, p.life);
    ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.62);
    ctx.restore();
  }
  if (confettiParticles.length) requestAnimationFrame(confettiTick);
  else { confettiRunning = false; ctx.clearRect(0, 0, canvas.width, canvas.height); }
}

/* ---------- Sounds (tiny WebAudio synth, no assets) ---------- */
let actx = null;
function ctx() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } }
  if (actx.state === "suspended") actx.resume();
  return actx;
}
function beep(freq, dur = 0.12, type = "sine", gain = 0.06, when = 0) {
  const a = ctx(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, a.currentTime + when);
  g.gain.linearRampToValueAtTime(gain, a.currentTime + when + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + when + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + when); o.stop(a.currentTime + when + dur + 0.05);
}
export const sfx = {
  get enabled() { return (JSON.parse(localStorage.getItem("atlasquest_v1") || "{}").settings || {}).sound !== false; },
  correct(streak = 0) {
    if (!this.enabled) return;
    const base = 440 * Math.pow(2, Math.min(streak, 8) / 12);
    beep(base, 0.14, "sine", 0.07);
    beep(base * 1.5, 0.16, "sine", 0.06, 0.08);
  },
  wrong() { if (!this.enabled) return; beep(196, 0.2, "sawtooth", 0.045); beep(147, 0.25, "sawtooth", 0.04, 0.09); },
  click() { if (!this.enabled) return; beep(720, 0.05, "triangle", 0.03); },
  tick() { if (!this.enabled) return; beep(980, 0.04, "square", 0.02); },
  fanfare() {
    if (!this.enabled) return;
    [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.22, "triangle", 0.07, i * 0.13));
  },
};
