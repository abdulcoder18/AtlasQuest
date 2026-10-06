// Full dataset validation for AtlasQuest.
const fs = require("fs");
const path = require("path");
const R = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
let fails = 0;
const fail = (m) => { console.log("  ✗", m); fails++; };

// countries
const countries = R("data/countries.json");
console.log("countries:", countries.length);
if (countries.length < 240) fail("countries count low");
const cca3s = new Set(countries.map(c => c.cca3));
const cca2s = new Set(countries.map(c => c.cca2));
for (const c of countries) {
  for (const k of ["cca2","cca3","name","capital","region","latlng","area"]) if (c[k] == null || c[k] === "") fail(`${c.cca3}: bad ${k}`);
}

// flags on disk
let flagMissing = [];
for (const c of countries) if (!fs.existsSync(`assets/flags/${c.cca2.toLowerCase()}.svg`)) flagMissing.push(c.cca2);
console.log("flag svgs missing:", flagMissing.length ? flagMissing.join(",") : "none");
if (flagMissing.length) fail("missing flag svgs");

// religions
const rel = R("data/religions.json");
const relMissing = countries.filter(c => !rel[c.cca3]).map(c => c.cca3);
console.log("religions:", Object.keys(rel).length, "entries | missing:", relMissing.join(",") || "none");
if (relMissing.length) fail("religions incomplete");

// lore
const lore = {};
for (const r of ["europe","asia","africa","americas","oceania"]) {
  try { lore[r] = R(`data/lore/${r}.json`); console.log(`lore/${r}:`, Object.keys(lore[r]).length, "entries"); }
  catch { console.log(`lore/${r}: MISSING`); fail(`lore/${r} missing`); }
}
const loreMap = new Map();
for (const r of Object.keys(lore)) for (const [k, v] of Object.entries(lore[r])) {
  if (loreMap.has(k)) fail(`lore duplicate ${k} in ${r}`);
  loreMap.set(k, v);
  for (const f of ["famous","culture","history","funFact"]) if (v[f] == null || v[f] === "") fail(`lore ${k}: bad ${f}`);
  if (!Array.isArray(v.famous) || v.famous.length !== 3) fail(`lore ${k}: famous must be 3 items`);
}

// territories
const terr = R("data/territories.json");
console.log("territories:", terr.length);
const terrBad = terr.filter(t => !cca3s.has(t.cca3));
if (terrBad.length) fail("territories bad codes: " + terrBad.map(t=>t.cca3));
const nonUN = countries.filter(c => !c.unMember).map(c => c.cca3);
const terrMissing = nonUN.filter(c => !terr.find(t => t.cca3 === c));
if (terrMissing.length) fail("non-UN not covered: " + terrMissing.join(","));

// historical flags
const hf = R("data/historical-flags.json");
console.log("historical-flags:", hf.length);
for (const e of hf) {
  if (!e.asset || !fs.existsSync(`assets/flags/hist/${e.asset}`)) fail(`hist ${e.slug}: asset missing`);
  for (const k of ["slug","name","era","region","file","story","quizFact"]) if (!e[k]) fail(`hist ${e.slug}: bad ${k}`);
}

// empires
const emp = R("data/empires.json");
console.log("empires:", emp.length);
const empBad = emp.flatMap(e => e.modernCountries.filter(c => !cca3s.has(c)));
if (empBad.length) fail("empires bad codes: " + empBad.join(","));
for (const e of emp) for (const k of ["slug","name","emoji","years","capital","peak","rise","fall","legacy","quizFact"]) if (!e[k]) fail(`empire ${e.slug}: bad ${k}`);

// cities
const cities = R("data/cities.json");
console.log("cities:", cities.length);
if (cities.length < 5000) fail("cities count low");
const cityCcBad = new Set(cities.filter(c => !cca2s.has(c.cc)).map(c => c.cc));
if (cityCcBad.size) fail("cities with unknown cc: " + [...cityCcBad].join(","));

console.log(fails ? `\n${fails} PROBLEMS` : "\nALL VALID ✓");
process.exit(fails ? 1 : 0);
