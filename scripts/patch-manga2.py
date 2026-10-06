import re

P = 'css/styles.css'
s = open(P, encoding='utf8').read()
misses = []

PAIRS = [
    # buttons + chips rounded
    (""".btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 9px;
  padding: 11px 20px; border: var(--bw) solid var(--ink);""",
     """.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 9px;
  padding: 11px 20px; border: var(--bw) solid var(--ink); border-radius: 13px;"""),
    (""".iconbtn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 38px; height: 38px; border: var(--bw) solid var(--ink);""",
     """.iconbtn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 38px; height: 38px; border: var(--bw) solid var(--ink); border-radius: 12px;"""),
    (""".chip {
  display: inline-flex; align-items: center; gap: 8px; height: 38px;
  padding: 0 12px; border: var(--bw) solid var(--ink);""",
     """.chip {
  display: inline-flex; align-items: center; gap: 8px; height: 38px;
  padding: 0 12px; border: var(--bw) solid var(--ink); border-radius: 11px;"""),
    (".xp-bar { width: 64px; height: 9px; background: var(--paper-2); overflow: hidden; border: 2px solid var(--ink); }",
     ".xp-bar { width: 64px; height: 11px; background: var(--paper-2); overflow: hidden; border: 2px solid var(--ink); border-radius: 99px; }"),
    (".xp-fill { display: block; height: 100%; width: 0%; background: var(--ink); transition: width .5s cubic-bezier(.22, 1, .36, 1); }",
     ".xp-fill { display: block; height: 100%; width: 0%; background: var(--ink); border-radius: 99px; transition: width .5s cubic-bezier(.22, 1, .36, 1); }"),
    (""".toast {
  display: flex; align-items: center; gap: 10px; padding: 11px 18px;""",
     """.toast {
  display: flex; align-items: center; gap: 10px; padding: 11px 18px; border-radius: 12px;"""),
    # hero headline: cartoon green offset shadow, no stroke
    (""".hero .h1 { font-size: clamp(2.6rem, 8vw, 5.4rem); line-height: .98; color: var(--paper-2);
  text-shadow: 3px 3px 0 var(--ink), 6px 6px 0 var(--ink); -webkit-text-stroke: 2px var(--ink);
  transform: rotate(-1deg); }
.hero .h1 .grad-text { color: var(--ink); background: var(--accent); text-shadow: none; -webkit-text-stroke: 0; box-shadow: 4px 4px 0 var(--shadow-ink); padding: 0 .1em; }""",
     """.hero .h1 { font-size: clamp(2.7rem, 8vw, 5.6rem); line-height: 1; color: var(--ink);
  text-shadow: 4px 4px 0 var(--accent);
  transform: rotate(-1deg); }
.hero .h1 .grad-text { color: var(--accent); background: none; text-shadow: 4px 4px 0 var(--shadow-ink); box-shadow: none; padding: 0 .04em; }"""),
    (".stat-box { padding: 14px 16px; border: var(--bw) solid var(--ink); background: var(--paper-2); box-shadow: var(--hard-shadow-sm); text-align: center; }",
     ".stat-box { padding: 14px 16px; border: var(--bw) solid var(--ink); border-radius: 13px; background: var(--paper-2); box-shadow: var(--hard-shadow-sm); text-align: center; }"),
    (".q-progress { flex: 1; height: 16px; background: var(--paper-2); border: var(--bw) solid var(--ink); box-shadow: 2px 2px 0 var(--shadow-ink); overflow: hidden; }",
     ".q-progress { flex: 1; height: 18px; background: var(--paper-2); border: var(--bw) solid var(--ink); border-radius: 99px; box-shadow: 2px 2px 0 var(--shadow-ink); overflow: hidden; }"),
    (""".quiz-flagsvg {
  position: relative; display: block; width: min(420px, 84%); margin: 6px auto 24px;
  background: #fff; padding: 8px;""",
     """.quiz-flagsvg {
  position: relative; display: block; width: min(420px, 84%); margin: 6px auto 24px;
  background: #fff; padding: 9px; border-radius: 12px;"""),
    (""".choice {
  display: flex; align-items: center; gap: 12px; padding: 12px 14px;
  border: var(--bw) solid var(--ink); background: var(--paper-2);""",
     """.choice {
  display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 12px;
  border: var(--bw) solid var(--ink); background: var(--paper-2);"""),
    (""".choice .ckey {
  display: inline-flex; align-items: center; justify-content: center; flex: none;
  width: 28px; height: 28px; background: var(--ink); color: var(--paper);""",
     """.choice .ckey {
  display: inline-flex; align-items: center; justify-content: center; flex: none;
  width: 28px; height: 28px; border-radius: 9px; background: var(--ink); color: var(--paper);"""),
    (".choice .cflag { width: 46px; height: 31px; object-fit: cover; border: 2px solid var(--ink); flex: none; background: #fff; }",
     ".choice .cflag { width: 46px; height: 31px; object-fit: cover; border: 2px solid var(--ink); border-radius: 6px; flex: none; background: #fff; }"),
    ("""  padding: 6px 14px; border: 3px solid currentColor; border-radius: 6px;""",
     """  padding: 6px 14px; border: 3px solid currentColor; border-radius: 12px;"""),
    (".reveal-flag { width: 76px; border: 2.5px solid var(--ink); background: #fff; flex: none; box-shadow: 3px 3px 0 var(--shadow-ink); }",
     ".reveal-flag { width: 76px; border: 2.5px solid var(--ink); border-radius: 8px; background: #fff; flex: none; box-shadow: 3px 3px 0 var(--shadow-ink); }"),
    (".chip-tag { padding: 4px 10px; border: 2px solid var(--ink); background: var(--paper); font-size: .74rem; font-weight: 700; letter-spacing: .02em; box-shadow: 2px 2px 0 var(--shadow-ink); }",
     ".chip-tag { padding: 4px 11px; border: 2px solid var(--ink); border-radius: 99px; background: var(--paper); font-size: .74rem; font-weight: 700; letter-spacing: .02em; box-shadow: 2px 2px 0 var(--shadow-ink); }"),
    (".result-squares .sq { width: 20px; height: 20px; border: 2px solid var(--ink); background: var(--accent); animation: sqPop .35s cubic-bezier(.34, 1.56, .64, 1) both; }",
     ".result-squares .sq { width: 20px; height: 20px; border: 2px solid var(--ink); border-radius: 6px; background: var(--accent); animation: sqPop .35s cubic-bezier(.34, 1.56, .64, 1) both; }"),
    (".recap-cell { border: 2px solid var(--ink); background: #fff; padding: 7px 7px 6px; box-shadow: 3px 3px 0 var(--shadow-ink); transform: rotate(-1deg); }",
     ".recap-cell { border: 2px solid var(--ink); border-radius: 9px; background: #fff; padding: 7px 7px 6px; box-shadow: 3px 3px 0 var(--shadow-ink); transform: rotate(-1deg); }"),
    (""".geo-badge {
  display: inline-flex; align-items: center; gap: 7px; padding: 7px 13px;""",
     """.geo-badge {
  display: inline-flex; align-items: center; gap: 7px; padding: 7px 13px; border-radius: 11px;"""),
    (""".guess-map {
  width: 340px; height: 230px; border: 3px solid var(--ink); box-shadow: 6px 6px 0 rgba(0,0,0,.55);""",
     """.guess-map {
  width: 340px; height: 230px; border: 3px solid var(--ink); border-radius: 14px; box-shadow: 6px 6px 0 rgba(0,0,0,.55);"""),
    (".geo-size-btns button { width: 32px; height: 32px; border: 2.5px solid var(--ink); background: var(--paper-2); color: var(--ink); cursor: pointer; font-weight: 700; font-size: .78rem; box-shadow: 2px 2px 0 rgba(0,0,0,.55); }",
     ".geo-size-btns button { width: 32px; height: 32px; border: 2.5px solid var(--ink); border-radius: 9px; background: var(--paper-2); color: var(--ink); cursor: pointer; font-weight: 700; font-size: .78rem; box-shadow: 2px 2px 0 rgba(0,0,0,.55); }"),
    (""".ccard {
  display: flex; flex-direction: column; align-items: flex-start; gap: 8px; padding: 12px;
  border: 2px solid var(--ink); background: var(--paper-2); box-shadow: 3px 3px 0 var(--shadow-ink);""",
     """.ccard {
  display: flex; flex-direction: column; align-items: flex-start; gap: 8px; padding: 12px; border-radius: 13px;
  border: 2px solid var(--ink); background: var(--paper-2); box-shadow: 3px 3px 0 var(--shadow-ink);"""),
    (".ccard img { width: 100%; aspect-ratio: 4/3; object-fit: cover; border: 2px solid var(--ink); background: #fff; }",
     ".ccard img { width: 100%; aspect-ratio: 4/3; object-fit: cover; border: 2px solid var(--ink); border-radius: 8px; background: #fff; }"),
    (".lore-flag-band img.big { display: inline-block; width: min(340px, 80%); background: #fff; padding: 8px; border: var(--bw) solid var(--ink); box-shadow: var(--hard-shadow); transform: rotate(-.8deg); }",
     ".lore-flag-band img.big { display: inline-block; width: min(340px, 80%); background: #fff; padding: 8px; border-radius: 12px; border: var(--bw) solid var(--ink); box-shadow: var(--hard-shadow); transform: rotate(-.8deg); }"),
    (".lf-box { padding: 10px 12px; border: 2px solid var(--ink); background: var(--paper-2); box-shadow: 2px 2px 0 var(--shadow-ink); }",
     ".lf-box { padding: 10px 12px; border: 2px solid var(--ink); border-radius: 11px; background: var(--paper-2); box-shadow: 2px 2px 0 var(--shadow-ink); }"),
    (""".empire-card {
  display: flex; gap: 14px; padding: 15px; border: var(--bw) solid var(--ink);""",
     """.empire-card {
  display: flex; gap: 14px; padding: 15px; border: var(--bw) solid var(--ink); border-radius: 14px;"""),
    (""".empire-card .ec-icon {
  width: 58px; height: 58px; display: flex; align-items: center; justify-content: center;
  border: var(--bw) solid var(--ink); flex: none;""",
     """.empire-card .ec-icon {
  width: 58px; height: 58px; display: flex; align-items: center; justify-content: center;
  border: var(--bw) solid var(--ink); border-radius: 16px; flex: none;"""),
    (""".empire-detail .ed-icon {
  width: 64px; height: 64px; display: flex; align-items: center; justify-content: center;
  border: var(--bw) solid var(--ink); flex: none;""",
     """.empire-detail .ed-icon {
  width: 64px; height: 64px; display: flex; align-items: center; justify-content: center;
  border: var(--bw) solid var(--ink); border-radius: 18px; flex: none;"""),
    (".friend-row { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: var(--bw) solid var(--ink); background: var(--paper-2); box-shadow: 3px 3px 0 var(--shadow-ink); }",
     ".friend-row { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: var(--bw) solid var(--ink); border-radius: 13px; background: var(--paper-2); box-shadow: 3px 3px 0 var(--shadow-ink); }"),
    ("""  text-align: center; padding: 16px;
  border: 2.5px dashed var(--ink); background: var(--paper);""",
     """  text-align: center; padding: 16px; border-radius: 14px;
  border: 2.5px dashed var(--ink); background: var(--paper);"""),
    (""".avatar-pick button {
  width: 40px; height: 40px; border: 2.5px solid var(--ink); cursor: pointer;""",
     """.avatar-pick button {
  width: 40px; height: 40px; border: 2.5px solid var(--ink); border-radius: 12px; cursor: pointer;"""),
    (""".hist-card {
  position: relative; border: var(--bw) solid var(--ink); background: var(--paper-2);""",
     """.hist-card {
  position: relative; border: var(--bw) solid var(--ink); border-radius: 13px; background: var(--paper-2);"""),
    (""".daily-chip {
  display: inline-flex; align-items: center; gap: 8px; padding: 11px 20px;""",
     """.daily-chip {
  display: inline-flex; align-items: center; gap: 8px; padding: 11px 20px; border-radius: 13px;"""),
    (""".game-head .gh-icon {
  display: flex; align-items: center; justify-content: center;
  width: 66px; height: 66px;""",
     """.game-head .gh-icon {
  display: flex; align-items: center; justify-content: center;
  width: 66px; height: 66px; border-radius: 19px;"""),
    (""".badge-lvl {
  display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px;
  background: var(--accent); color: var(--accent-ink);
  border: 2px solid var(--ink); box-shadow: 2px 2px 0 var(--shadow-ink);""",
     """.badge-lvl {
  display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 99px;
  background: var(--accent); color: var(--accent-ink);
  border: 2px solid var(--ink); box-shadow: 2px 2px 0 var(--shadow-ink);"""),
    (".skel { border: 2px solid var(--ink); background: repeating-linear-gradient(-45deg, var(--paper-3) 0 10px, var(--paper-2) 10px 20px); animation: none; }",
     ".skel { border: 2px solid var(--ink); border-radius: 10px; background: repeating-linear-gradient(-45deg, var(--paper-3) 0 10px, var(--paper-2) 10px 20px); animation: none; }"),
    (""".mc-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 46px; height: 46px; margin-bottom: 12px;""",
     """.mc-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 46px; height: 46px; margin-bottom: 12px; border-radius: 14px;"""),
    (""".mode-card .mc-badge {
  position: absolute; top: 12px; left: 14px;
  font-size: .6rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase;
  padding: 3px 8px; background: var(--accent); color: var(--accent-ink);""",
     """.mode-card .mc-badge {
  position: absolute; top: 12px; left: 14px;
  font-size: .6rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase;
  padding: 3px 9px; border-radius: 99px; background: var(--accent); color: var(--accent-ink);"""),
    (""".navlink {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 7px 11px; border: var(--bw) solid transparent;""",
     """.navlink {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 7px 11px; border: var(--bw) solid transparent; border-radius: 11px;"""),
]

for old, new in PAIRS:
    if old not in s:
        misses.append(old.splitlines()[0][:70]); continue
    s = s.replace(old, new)

open(P, 'w', encoding='utf8', newline='\n').write(s)
print("patched", P, "| applied:", len(PAIRS) - len(misses), "| misses:", len(misses))
for m in misses: print("   !!", m)
