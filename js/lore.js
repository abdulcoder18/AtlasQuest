// AtlasQuest — Lore: Atlas (country explorer) and Empires & Kingdoms timelines.
import { el, icon, icons, fmtInt, fmtCompact, openModal } from "./ui.js";
import { data, flagUrl, loreOf, religionOf, territoryOf } from "./data.js";

/* ================= Atlas ================= */
export function atlasPage(prefill = "") {
  const view = document.getElementById("view");
  view.innerHTML = "";
  view.append(
    el("div", { class: "center", style: { paddingTop: "8px" } },
      el("h1", { class: "h1" }, "The ", el("span", { class: "grad-text" }, "Atlas")),
      el("p", { class: "sub" }, "Every nation's story — what it's famous for, its culture, beliefs, and how its kingdoms rose and fell.")
    )
  );

  const search = el("input", { class: "input", placeholder: "Search country, capital, or region…", value: prefill });
  const regionSel = el("select", { class: "input", style: { maxWidth: "170px" } },
    el("option", { value: "" }, "All regions"),
    ...["Europe", "Asia", "Africa", "Americas", "Oceania"].map(r => el("option", { value: r }, r))
  );
  const grid = el("div", { class: "country-grid mt-2" });
  const countLabel = el("p", { class: "faint small" });

  const tools = el("div", { class: "atlas-tools" }, search, regionSel);
  view.append(tools, countLabel, grid);

  function render() {
    const q = search.value.trim().toLowerCase();
    const region = regionSel.value;
    const list = data.countries.filter(c => {
      if (region && c.region !== region) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || c.capital.toLowerCase().includes(q) || c.region.toLowerCase().includes(q);
    });
    countLabel.textContent = `${list.length} countries`;
    grid.innerHTML = "";
    for (const c of list) {
      grid.append(el("button", { class: "ccard", onclick: () => openLore(c.cca3) },
        el("img", { src: flagUrl(c.cca2), alt: "", loading: "lazy" }),
        el("div", { class: "cc-name" }, c.name),
        el("div", { class: "cc-meta" }, `${c.capital} · ${c.region}`)
      ));
    }
  }
  search.addEventListener("input", render);
  regionSel.addEventListener("change", render);
  render();
  setTimeout(() => search.focus(), 80);
}

/* ---------- country lore modal ---------- */
export function openLore(cca3) {
  const c = data.byCca3.get(cca3);
  if (!c) return;
  const lore = loreOf(cca3);
  const rel = religionOf(cca3);
  const terr = territoryOf(cca3);
  const empires = data.empires.filter(e => e.modernCountries?.includes(cca3));

  const body = el("div", { class: "lore-body" });
  body.append(el("div", { class: "lore-flag-band" },
    el("img", { class: "big", src: flagUrl(c.cca2), alt: `Flag of ${c.name}` })
  ));
  body.append(el("div", { class: "center mt-2" },
    el("h2", { class: "h2" }, c.name),
    el("p", { class: "muted small" }, c.official)
  ));

  const facts = el("div", { class: "lore-facts" });
  const fact = (k, v) => facts.append(el("div", { class: "lf-box" }, el("div", { class: "lf-k" }, k), el("div", { class: "lf-v" }, v)));
  fact("Capital", c.capital + (c.capitalAlt?.length ? ` (+${c.capitalAlt.length})` : ""));
  fact("Population", fmtCompact(c.population));
  fact("Area", `${fmtInt(Math.round(c.area))} km²`);
  fact("Region", `${c.region}${c.subregion ? " · " + c.subregion : ""}`);
  fact("Languages", c.languages.slice(0, 3).join(", ") || "—");
  fact("Currency", c.currency || "—");
  if (rel) fact("Beliefs", `${rel.majority}${rel.pct ? ` ~${rel.pct}%` : ""}`);
  fact("Driving", c.carSide === "left" ? "Left side" : "Right side");
  if (terr) fact("Status", terr.type + (terr.sovereign ? ` of ${terr.sovereign}` : ""));
  body.append(facts);

  if (lore?.famous?.length) {
    body.append(el("div", { class: "lore-section" },
      el("h4", {}, icon("star"), "Famous for"),
      el("div", { class: "reveal-chips" }, lore.famous.map(f => el("span", { class: "chip-tag gold" }, f)))
    ));
  }
  if (lore?.culture) body.append(el("div", { class: "lore-section" }, el("h4", {}, icon("palette"), "Culture & life"), el("p", {}, lore.culture)));
  if (rel?.note) body.append(el("div", { class: "lore-section" }, el("h4", {}, icon("moon"), "Faith"), el("p", {}, rel.note)));
  if (lore?.history) body.append(el("div", { class: "lore-section" }, el("h4", {}, icon("scroll"), "History & lore"), el("p", {}, lore.history)));
  if (lore?.funFact) body.append(el("div", { class: "lore-section" }, el("h4", {}, icon("lightbulb"), "Did you know"), el("p", {}, lore.funFact)));

  if (empires.length) {
    const row = el("div", { class: "modern-flags" });
    for (const e of empires) {
      row.append(el("span", { class: "mf", title: e.name },
        el("button", { class: "iconbtn", style: { width: "40px", height: "30px", borderRadius: "6px", fontSize: "1rem" },
          onclick: () => { modal.close(); openEmpire(e.slug); } }, e.emoji)
      ));
    }
    body.append(el("div", { class: "lore-section" },
      el("h4", {}, icon("swords"), "Empires that ruled these lands"), row
    ));
  }

  const modal = openModal({ title: null, body, wide: true });
  return modal;
}

/* ================= Empires ================= */
export function empiresPage() {
  const view = document.getElementById("view");
  view.innerHTML = "";
  view.append(el("div", { class: "empire-page-head center", style: { paddingTop: "8px" } },
    el("h1", { class: "h1" }, "Empires & ", el("span", { class: "grad-text" }, "Kingdoms")),
    el("p", { class: "sub" }, "How the great powers of history rose, ruled, and fell — and which modern countries sit on their old lands.")
  ));
  view.append(el("div", { class: "page-bg", "aria-hidden": "true",
    style: { backgroundImage: "url(assets/gen/poster-empires-web.jpg)", opacity: document.documentElement.dataset.theme === "dark" ? "0.05" : "0.07" } }));
  const grid = el("div", { class: "empire-grid mt-3" });
  const sorted = [...data.empires].sort((a, b) => a.name.localeCompare(b.name));
  for (const e of sorted) {
    grid.append(el("button", { class: "empire-card", onclick: () => openEmpire(e.slug) },
      el("div", { class: "ec-icon" }, e.name[0]),
      el("div", { style: { minWidth: 0 } },
        el("div", { class: "row", style: { gap: "8px", flexWrap: "wrap" } },
          el("h3", {}, e.name), el("span", { class: "ec-years" }, e.years)),
        el("p", {}, e.fall.split(/(?<=[.!?])\s+/)[0])
      )
    ));
  }
  view.append(grid);
}

export function openEmpire(slug) {
  const e = data.empires.find(x => x.slug === slug);
  if (!e) return;
  const body = el("div", { class: "empire-detail" });
  body.append(el("div", { class: "row", style: { gap: "14px", marginBottom: "14px" } },
    el("div", { class: "ed-icon" }, e.name[0]),
    el("div", {},
      el("h2", { class: "h2", style: { margin: 0 } }, e.name),
      el("div", { class: "ec-years" }, `${e.years} · capital ${e.capital}`),
      e.builder ? el("div", { class: "faint small mt-1" }, `Built by: ${e.builder}`) : null
    )
  ));

  const phase = (ic, title, text) => el("div", { class: "phase" }, el("h4", {}, icon(ic), title), el("p", {}, text));
  body.append(
    phase("trendUp", "Rise", e.rise),
    phase("mountain", "Peak", e.peak),
    e.reach ? phase("target", "Conquest scale", e.reach) : null,
    phase("trendDown", "The fall", e.fall),
    phase("globe", "Legacy", e.legacy),
    e.darkSide ? el("div", { class: "lore-section" },
      el("h4", {}, icon("alert"), "The dark side"),
      el("p", {}, e.darkSide)) : null,
    e.deepLore ? el("div", { class: "lore-section" },
      el("h4", {}, icon("book"), "Deep lore"),
      el("p", {}, e.deepLore)) : null,
    el("div", { class: "lore-section" },
      el("h4", {}, icon("lightbulb"), "Quiz fact"),
      el("p", {}, e.quizFact)
    ),
    el("div", { class: "lore-section" },
      el("h4", {}, icon("map"), "Modern lands"),
      el("div", { class: "row wrap", style: { marginTop: "6px" } },
        ...e.modernCountries.map(cc3 => {
          const c = data.byCca3.get(cc3);
          if (!c) return null;
          return el("button", { class: "chip", onclick: () => { modal.close(); openLore(cc3); }, title: c.name },
            el("img", { src: flagUrl(c.cca2), alt: "", style: { width: "22px", height: "15px", objectFit: "cover", borderRadius: "3px" } }),
            c.name);
        })
      )
    )
  );
  const modal = openModal({ title: null, body, wide: true });
}
