// Throttle-aware Commons filename checker.
// Step 1: wait out the rate limit, then try ONE batched action-API request (50 titles per call).
// Step 2: if batched API unavailable, fall back to slow sequential core REST checks.
const primaries = [
  "Vexilloid of the Roman Empire.svg",
  "Byzantine imperial flag, 14th century.svg",
  "Banner of the Holy Roman Emperor (after 1400).svg",
  "Pavillon royal de la France.svg",
  "Imperial Standard of Napoléon I.svg",
  "Flag of Prussia (1892–1918).svg",
  "Flag of the German Empire.svg",
  "Flag of Austria-Hungary (1869–1918).svg",
  "Flag of the Russian Empire.svg",
  "Flag of the Soviet Union (1955–1980).svg",
  "Flag of SFR Yugoslavia.svg",
  "Flag of Czechoslovakia.svg",
  "Flag of East Germany.svg",
  "Flag of the Polish–Lithuanian Commonwealth.svg",
  "Flag of the Kalmar Union.svg",
  "Flag of Most Serene Republic of Venice.svg",
  "Flag of the Republic of Genoa.svg",
  "Flag of Florence.svg",
  "Flag of the Papal States.svg",
  "Flag of the Kingdom of Jerusalem.svg",
  "Flag of Kingdom of Italy (1861-1946).svg",
  "Flag of Serbia (1882–1918).svg",
  "Flag of the Kingdom of the Two Sicilies.svg",
  "Flag of the Ottoman Empire (1844–1922).svg",
  "Flag of the United Kingdom.svg",
  "Flag of the British Raj (1858–1947).svg",
  "Flag of Cross of Burgundy.svg",
  "Flag Portugal (1830–1910).svg",
  "Flag of the Dutch East India Company.svg",
  "Flag of the Dutch West India Company.svg",
  "Standard of Cyrus the Great.svg",
  "Flag of the Rashidun Caliphate.svg",
  "Flag of the Umayyad Caliphate.svg",
  "Flag of the Abbasid Caliphate.svg",
  "Flag of the Mughal Empire.svg",
  "Flag of the Maratha Empire.svg",
  "Flag of the Sikh Empire.svg",
  "Flag of the Safavid Dynasty.svg",
  "Flag of Qajar Iran.svg",
  "Flag of Afghanistan (1880–1901).svg",
  "Flag of the Qing dynasty (1889–1912).svg",
  "Flag of the Republic of China (1912–1928).svg",
  "Naval Ensign of Japan.svg",
  "Flag of Siam (1855–1916).svg",
  "Flag of Korea (1882).svg",
  "Flag of the Nguyễn dynasty (1885–1945).svg",
  "Flag of Tibet.svg",
  "Flag of Mongolia (1911–1921).svg",
  "Flag of the Ryukyu Kingdom.svg",
  "Flag of the Kingdom of Hejaz.svg",
  "Flag of the Mutawakkilite Kingdom of Yemen.svg",
  "Flag of Egypt (1922–1953).svg",
  "Flag of the Ethiopian Empire.svg",
  "Flag of Libya (1951–1969).svg",
  "Flag of Zanzibar (1895–1963).svg",
  "Flag of Rhodesia (1964–1968).svg",
  "Flag of the Orange Free State.svg",
  "Flag of the South African Republic.svg",
  "Flag of the Kingdom of Kongo.svg",
  "Flag of the Crimean Khanate.svg",
  "Flag of the Cossack Hetmanate.svg",
  "Flag of the Inca state.svg",
  "Flag of Mexico (1821-1823).svg",
  "Flag of Empire of Brazil (1870–1889).svg",
  "Flag of Gran Colombia.svg",
  "Flag of the Confederate States (1861–1863).svg",
  "Flag of Hawaii.svg",
  "Flag of Texas.svg",
  "Flag of California.svg",
  "Grand Union Flag.svg"
];
// alternates to try only if the primary is missing
const alternates = [
  "Flag of the First French Empire.svg",
  "Flag of Germany (1867–1918).svg",
  "Flag of Russia (1914–1917).svg",
  "Flag of the Soviet Union.svg",
  "Flag of Yugoslavia (1946–1992).svg",
  "Flag of the Polish-Lithuanian Commonwealth.svg",
  "Flag of the Republic of Venice.svg",
  "Flag of Genoa.svg",
  "Flag of the Papal States (1808–1870).svg",
  "Flag of Italy (1861–1946).svg",
  "Flag of the Kingdom of Serbia.svg",
  "Flag of the Kingdom of the Two Sicilies (1860).svg",
  "British Raj Red Ensign.svg",
  "Flag of Portugal (1830–1910).svg",
  "Flag of Achaemenid Empire.svg",
  "Flag of the Safavid Empire.svg",
  "Safavid Flag.svg",
  "State flag of Qajar Iran.svg",
  "Flag of the Emirate of Afghanistan.svg",
  "Flag of Afghanistan (1901–1919).svg",
  "Flag of the Nguyễn dynasty (1920–1945).svg",
  "Flag of Mongolia (1911–1924).svg",
  "Flag of Bogd Khanate.svg",
  "Flag of Hejaz (1920–1926).svg",
  "Flag of Yemen (1918–1962).svg",
  "Flag of Ethiopia (1897–1936).svg",
  "Flag of the Sultanate of Zanzibar.svg",
  "Flag of Zanzibar.svg",
  "Flag of Rhodesia (1968–1979).svg",
  "Flag of the Transvaal.svg",
  "Flag of Transvaal.svg",
  "Flag of the Inca Empire.svg",
  "Flag of Mexico (1821–1823).svg",
  "Flag of Empire of Brazil (1822–1870).svg",
  "Flag of Gran Colombia (1821–1831).svg",
  "Flag of the Confederate States of America (1861–1863).svg",
  "Stars and Bars (1861-1863).svg"
];

const fs = require("fs");
const sleep = ms => new Promise(r => setTimeout(r, ms));
const UA = { "User-Agent": "FlagGuesserDatasetCheck/1.0 (educational flag-guessing app; one-off verification)" };
const all = [...primaries, ...alternates];
const status = {};   // name -> status
const imgUrl = {};   // name -> servable image url

function encName(n) { return encodeURIComponent(n.replace(/ /g, "_")); }

async function actionBatch(names) {
  // batched action API via api.wikimedia.org proxy, targets Commons
  const titles = names.map(n => "File:" + n).join("|");
  const url = "https://api.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&prop=imageinfo&iiprop=url&titles=" +
    encodeURIComponent(titles);
  const res = await fetch(url, { headers: UA });
  if (res.status === 429) {
    const ra = parseInt(res.headers.get("retry-after") || "30", 10);
    console.log("batch 429, waiting " + ra + "s");
    await sleep((ra + 5) * 1000);
    return actionBatch(names);
  }
  if (!res.ok) throw new Error("batch HTTP " + res.status);
  const data = await res.json();
  for (const p of data.query.pages) {
    const raw = p.title.replace(/^File:/, "");
    if (p.missing) { status[raw] = "MISSING"; continue; }
    status[raw] = "OK";
    if (p.imageinfo && p.imageinfo[0] && p.imageinfo[0].url) imgUrl[raw] = p.imageinfo[0].url;
  }
  if (data.query.normalized) {
    // map normalized titles back (underscores etc.) - title came back as spaces, fine
  }
}

async function restOne(name) {
  const url = "https://api.wikimedia.org/core/v1/commons/file/File%3A" + encName(name);
  const res = await fetch(url, { headers: UA });
  if (res.status === 200) {
    const body = await res.json();
    status[name] = "OK";
    if (body.preferred && body.preferred.url) imgUrl[name] = body.preferred.url;
    return;
  }
  if (res.status === 404) { status[name] = "MISSING"; return; }
  if (res.status === 429) {
    const ra = parseInt(res.headers.get("retry-after") || "20", 10);
    console.log("rest 429 on " + name + ", waiting " + ra + "s");
    await sleep((ra + 3) * 1000);
    return restOne(name);
  }
  status[name] = "HTTP" + res.status;
}

async function main() {
  console.log("cooling down 75s before first request ...");
  await sleep(75000);
  // sanity probe first
  status["__probe__"] = "?";
  try {
    await restOne("Flag of Hawaii.svg");
    console.log("probe Flag of Hawaii.svg -> " + status["Flag of Hawaii.svg"]);
  } catch (e) { console.log("probe failed: " + e.message); }

  const useBatch = process.argv[2] !== "rest";
  let batchOK = false;
  if (useBatch) {
    try {
      for (let i = 0; i < primaries.length; i += 50) {
        await actionBatch(primaries.slice(i, i + 50));
        await sleep(2500);
      }
      batchOK = true;
      console.log("batched action API worked for primaries");
    } catch (e) { console.log("batch failed: " + e.message); }
  }
  const seq = batchOK ? alternates : all;
  console.log("sequential checks for " + seq.length + " names ...");
  for (const n of seq) {
    try { await restOne(n); } catch (e) { status[n] = "ERR:" + e.message; }
    console.log(status[n] + " | " + n);
    await sleep(1600);
  }
  // report primaries and alternates
  console.log("\n=== RESULTS ===");
  for (const n of primaries) console.log((status[n] || "unchecked").padEnd(8) + " | " + n);
  console.log("--- alternates ---");
  for (const n of alternates) console.log((status[n] || "unchecked").padEnd(8) + " | " + n);
  const fsOut = { status, imgUrl };
  fs.writeFileSync("C:/Users/LUFY/Documents/Flag guesser/_tmp_results.json", JSON.stringify(fsOut, null, 1));
  console.log("\nsaved _tmp_results.json");
}
main().catch(e => { console.error("FATAL", e); process.exit(1); });
