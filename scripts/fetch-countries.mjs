// Builds data/countries.json from open datasets (no API keys needed):
// - mledoze/countries (GitHub) for geography
// - World Bank API for population
import { writeFile } from "node:fs/promises";

const COUNTRIES_URL = "https://raw.githubusercontent.com/mledoze/countries/master/countries.json";
const WB_URL = "https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&per_page=400&mrnev=1";

const res = await fetch(COUNTRIES_URL);
if (!res.ok) throw new Error(`mledoze HTTP ${res.status}`);
const all = await res.json();

const wbRes = await fetch(WB_URL);
const wb = await wbRes.json();
const popByIso3 = {};
if (Array.isArray(wb) && Array.isArray(wb[1])) {
  for (const row of wb[1]) {
    if (row?.countryiso3code && row?.value != null) popByIso3[row.countryiso3code] = row.value;
  }
}
console.log(`World Bank population entries: ${Object.keys(popByIso3).length}`);

const trimmed = all
  .filter(c => c.cca2 && c.capital?.length)
  .map(c => ({
    cca2: c.cca2,
    cca3: c.cca3,
    name: c.name.common,
    official: c.name.official,
    capital: c.capital[0],
    capitalAlt: c.capital.slice(1),
    region: c.region,
    subregion: c.subregion || "",
    population: popByIso3[c.cca3] ?? null,
    area: c.area,
    languages: Object.values(c.languages || {}),
    currency: Object.values(c.currencies || {})[0]?.name || "",
    latlng: c.latlng,
    borders: c.borders || [],
    demonym: c.demonyms?.eng?.f || c.demonyms?.eng?.m || "",
    unMember: !!c.unMember,
    independent: c.independent === true,
    status: c.status || "",
    landlocked: !!c.landlocked,
    carSide: c.car?.side || "right",
    idd: (c.idd?.root && c.idd?.suffixes?.[0]) ? c.idd.root + c.idd.suffixes[0] : ""
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

await writeFile("data/countries.json", JSON.stringify(trimmed, null, 1));
console.log(`Saved ${trimmed.length} countries.`);
const nonUn = trimmed.filter(c => !c.unMember);
console.log(`Non-UN entries: ${nonUn.length}`);
console.log(nonUn.map(c => `${c.cca2}:${c.name}(${c.status})`).join(", "));
console.log(`Missing population: ${trimmed.filter(c => c.population == null).map(c => c.cca2).join(", ") || "none"}`);
