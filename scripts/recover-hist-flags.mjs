// Recover dropped historical-flag entries using each state's Wikipedia lead image.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import fsSync from "node:fs";

const UA = { "User-Agent": "AtlasQuest/1.0 (educational geography app; contact: local)" };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
await mkdir("assets/flags/hist", { recursive: true });

const PAGES = {
  "nazi-germany": "Nazi Germany",
  "teutonic-order": "Teutonic Order",
  "papal-states": "Papal States",
  "republic-of-genoa": "Republic of Genoa",
  "princes-flag": "Flag of the Netherlands",
  "south-africa-1928": "Union of South Africa",
  "congo-free-state-flag": "Congo Free State",
  "kingdom-of-italy": "Kingdom of Italy",
  "bogd-khanate": "Mongolia",
  "orange-free-state": "Orange Free State",
  "transvaal-republic": "South African Republic",
  "kingdom-of-two-sicilies": "Kingdom of the Two Sicilies",
  "first-mexican-empire": "First Mexican Empire",
  "sikh-empire": "Sikh Empire",
  "kingdom-of-mysore": "Kingdom of Mysore",
  "fatimid-caliphate": "Fatimid Caliphate",
  "ayyubid-dynasty": "Ayyubid dynasty",
  "mamluk-sultanate": "Mamluk Sultanate",
  "kingdom-of-jerusalem-flag2": "Kingdom of Jerusalem",
  "kingdom-of-hungary-medieval": "Kingdom of Hungary (1000\u20131538)",
  "duchy-of-burgundy": "Burgundian State",
  "republic-of-florence": "Republic of Florence",
  "ottoman-egypt": "Khedivate of Egypt",
  "mutawakkilite-yemen-keep": "Mutawakkilite Kingdom of Yemen",
};

const dataAll = JSON.parse(await readFile("data/historical-flags.json", "utf8"));
let ok = 0;
for (const [slug, page] of Object.entries(PAGES)) {
  if (dataAll.find(e => e.slug === slug && e.asset)) { console.log("have", slug); continue; }
  const entry = dataAll.find(e => e.slug === slug);
  if (!entry) { console.log("no entry for", slug); continue; }
  try {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(page)}`, { headers: UA });
    if (!res.ok) { console.log("PAGE FAIL", res.status, slug); await sleep(3500); continue; }
    const j = await res.json();
    let img = j.originalimage?.source || j.thumbnail?.source;
    // prefer higher-res thumbnail if only thumb available
    if (!j.originalimage?.source && j.thumbnail?.source) img = j.thumbnail.source.replace(/\/\d+px-/, "/640px-");
    if (!img) { console.log("NO IMAGE", slug); await sleep(3500); continue; }
    const bin = await fetch(img, { headers: UA });
    if (!bin.ok) { console.log("DL FAIL", bin.status, slug); await sleep(3500); continue; }
    const buf = Buffer.from(await bin.arrayBuffer());
    if (buf.length < 500) { console.log("TOO SMALL", slug); await sleep(3500); continue; }
    const ext = (img.split("?")[0].split(".").pop() || "png").toLowerCase().slice(0, 4);
    await writeFile(`assets/flags/hist/${slug}.${ext}`, buf);
    entry.asset = `${slug}.${ext}`;
    entry.file = entry.file || page;
    ok++;
    console.log("OK", slug, `(${(buf.length / 1024).toFixed(0)} KB)`);
  } catch (e) { console.log("ERR", slug, e.message); }
  await sleep(3500);
}

const keep = dataAll.filter(e => e.asset && fsSync.existsSync(`assets/flags/hist/${e.asset}`));
await writeFile("data/historical-flags.json", JSON.stringify(keep, null, 1));
console.log(`\nrecovered ${ok} | kept ${keep.length} / ${dataAll.length}`);
