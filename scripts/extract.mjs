/* Regenerates src/data.js and api/_data.js from src/clubs.mjs + src/lore.mjs.
   Run: node scripts/extract.mjs   (or: npm run data)

   Ratings are an unofficial, descriptive interpretation: each squad's research
   tier (star / key / squad) becomes a band, jittered deterministically by name
   so the same player reads consistently across seasons, then nudged by era —
   the WSL of 2011 was a semi-professional league and the modern one is not. */
import { readFileSync, writeFileSync } from 'node:fs';
import { CLUB_SEASONS } from '../src/clubs.mjs';
import { LORE } from '../src/lore.mjs';

const KIT = {
  "Arsenal":                 ["#EF0107","#FFFFFF","ARS","Arsenal","sleeves"],
  "Chelsea":                 ["#034694","#FFFFFF","CHE","Chelsea"],
  "Manchester City":         ["#6CABDD","#1C2C5B","MCI","Man City"],
  "Manchester United":       ["#DA291C","#FBE122","MUN","Man United"],
  "Liverpool":               ["#C8102E","#F6EB61","LIV","Liverpool"],
  "Everton":                 ["#003399","#FFFFFF","EVE","Everton"],
  "Birmingham City":         ["#0000C8","#FFFFFF","BIR","Birmingham"],
  "Bristol Academy":         ["#E21C38","#FFFFFF","BRI","Bristol Acad"],
  "Bristol City":            ["#E21C38","#FFFFFF","BRC","Bristol City"],
  "Doncaster Rovers Belles": ["#E4002B","#FFFFFF","DON","Doncaster","hoops"],
  "Lincoln Ladies":          ["#DA291C","#FFFFFF","LIN","Lincoln"],
  "Notts County":            ["#1A1A1A","#FFFFFF","NOT","Notts County"],
  "Sunderland":              ["#EB172B","#FFFFFF","SUN","Sunderland"],
  "Reading":                 ["#004494","#FFFFFF","REA","Reading","hoops"],
  "Yeovil Town":             ["#00874E","#FFFFFF","YEO","Yeovil"],
  "Brighton & Hove Albion":  ["#0057B8","#FFFFFF","BHA","Brighton","stripes"],
  "West Ham United":         ["#7A263A","#1BB1E7","WHU","West Ham","sleeves"],
  "Tottenham Hotspur":       ["#132257","#FFFFFF","TOT","Spurs"],
  "Aston Villa":             ["#95BFE5","#670E36","AVL","Aston Villa","sleeves"],
  "Leicester City":          ["#003090","#FDBE11","LEI","Leicester"],
  "Crystal Palace":          ["#1B458F","#C4122E","CRY","Crystal Palace"],
  "London City Lionesses":   ["#6A2C91","#FFFFFF","LCL","London City"]
};

/* the same player is written differently by different sources; one canonical
   spelling each keeps the album, the club bonds and the scorer table honest */
const NAME_ALIAS = {
  "Jennifer Beattie": "Jen Beattie",
  "Daniëlle van de Donk": "Danielle van de Donk",
  "Bethany England": "Beth England",
  "Becky Spencer": "Rebecca Spencer",
  "Jessica Carter": "Jess Carter",
  "Jessica Sigsworth": "Jess Sigsworth",
  "Steph Bannon": "Stephanie Bannon",
  "Vicki Greenwell": "Victoria Greenwell",
  "Sophie Bradley-Auckland": "Sophie Bradley",
  "Gabrielle George": "Gabby George"
};

/* hand-set ratings for marquee player-seasons ("Name|Season"). The tier bands
   place everyone else; these pin the icons so a Golden Boot season always
   out-rates a good season, and a record season tops the game. Applied after
   the band+jitter+era pipeline, as absolute values. */
const RATING_OVERRIDE = {
  // the very top
  "Vivianne Miedema|2018-19":95, "Vivianne Miedema|2019-20":94,
  "Sam Kerr|2020-21":94, "Sam Kerr|2021-22":94, "Sam Kerr|2022-23":93,
  "Khadija Shaw|2023-24":94, "Khadija Shaw|2024-25":93, "Khadija Shaw|2025-26":94, "Khadija Shaw|2022-23":92,
  "Rachel Daly|2022-23":93,
  "Lauren James|2023-24":93, "Lauren James|2024-25":93, "Lauren James|2025-26":93,
  "Lauren Hemp|2021-22":93, "Lauren Hemp|2023-24":93, "Lauren Hemp|2025-26":93,
  "Fran Kirby|2017-18":92, "Fran Kirby|2020-21":93,
  "Pernille Harder|2020-21":93,
  "Beth Mead|2021-22":93, "Beth Mead|2022-23":92,
  "Beth England|2019-20":92,
  "Mariona Caldentey|2024-25":93, "Mariona Caldentey|2025-26":92,
  "Alessia Russo|2024-25":93, "Alessia Russo|2025-26":92,
  "Yui Hasegawa|2024-25":92, "Yui Hasegawa|2025-26":93,
  "Keira Walsh|2024-25":92, "Keira Walsh|2025-26":92,
  "Hannah Hampton|2025-26":92,
  "Mary Earps|2022-23":92, "Mary Earps|2023-24":92,
  "Lucy Bronze|2020-21":92, "Lucy Bronze|2024-25":90, "Lucy Bronze|2025-26":90,
  "Vivianne Miedema|2017-18":91, "Vivianne Miedema|2021-22":92, "Vivianne Miedema|2022-23":92,
  "Vivianne Miedema|2024-25":90, "Vivianne Miedema|2025-26":91,
  // era greats, priced to their own league
  "Kelly Smith|2012":92, "Kim Little|2012":92, "Kim Little|2013":91,
  "Rachel Williams|2011":89, "Natasha Dowie|2013":90, "Fara Williams|2013":91, "Fara Williams|2017-18":89,
  "Ji So-yun|2014":90, "Ji So-yun|2015":91, "Beth Mead|2015":91,
  "Eniola Aluko|2016":91, "Izzy Christiansen|2016":91, "Ellen White|2017-18":92, "Ellen White|2020-21":91,
  "Nikita Parris|2018-19":91, "Steph Houghton|2014":91, "Fran Kirby|2017 Spring Series":90,
  // corrections where the blind jitter over- or under-shot
  "Ella Toone|2023-24":91, "Elisabeth Terland|2025-26":91, "Phallon Tullis-Joyce|2024-25":91,
  "Millie Bright|2024-25":92, "Erin Cuthbert|2024-25":91, "Maya Le Tissier|2024-25":91,
  "Sandy Baltimore|2024-25":91, "Olivia Smith|2024-25":91, "Olivia Smith|2025-26":92,
  "Ellen White|2018-19":91, "Viviane Asseyi|2024-25":88, "Jane Ross|2018-19":88, "Sue Smith|2013":87
};

const TIER = { star:[89,93], key:[82,87], squad:[76,81] };
const SPREAD_MID = 84, SPREAD_K = 1.9;
const ERA_LIFT = y => y <= 2013 ? -4 : y <= 2016 ? -2.5 : y <= 2019 ? -1 : y <= 2022 ? 0 : 0.5;

const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const seasonYear = s => parseInt(String(s).slice(0, 4), 10);

const LINES = new Set(['GK','DEF','MID','FWD']);
const POSES = new Set(['GK','RB','LB','CB','DM','CM','AM','RM','LM','RW','LW','ST']);
const LINE_OF = {GK:'GK',RB:'DEF',LB:'DEF',CB:'DEF',DM:'MID',CM:'MID',AM:'MID',RM:'MID',LM:'MID',RW:'FWD',LW:'FWD',ST:'FWD'};

const problems = [];
const warnings = [];
const out = [];

for (const cs of CLUB_SEASONS) {
  const y = cs.y ?? seasonYear(cs.s);
  const kit = KIT[cs.c];
  if (!kit) { problems.push(`no kit colours for club "${cs.c}"`); continue; }
  const shortName = kit[3] || cs.c;
  const pat = kit[4] || 'solid';
  const key = cs.c + '|' + cs.s;
  const lore = LORE[key];
  if (!lore) problems.push(`no lore for ${key}`);

  const players = cs.p.map(p => {
    const [rawName, line, pos, tierName, nat] = p;
    const name = NAME_ALIAS[rawName] || rawName;
    if (!LINES.has(line)) problems.push(`${key}: bad line "${line}" for ${name}`);
    if (!POSES.has(pos)) problems.push(`${key}: bad position "${pos}" for ${name}`);
    else if (LINE_OF[pos] !== line) problems.push(`${key}: ${name} is ${line} but plays ${pos}`);
    const band = TIER[tierName] || TIER.squad;
    const spread = band[1] - band[0];
    const generated = band[0] + (hash(name + cs.s) % (spread + 1)) + ERA_LIFT(y);
    const r = RATING_OVERRIDE[name + '|' + cs.s] ?? generated;
    return [name, line, Math.max(70, Math.min(96, Math.round(r))), pos, nat || ''];
  });

  // a squad must be able to field a legal XI
  const byLine = { GK:0, DEF:0, MID:0, FWD:0 };
  players.forEach(p => byLine[p[1]]++);
  if (byLine.GK < 1) problems.push(`${key}: no goalkeeper`);
  if (players.length < 12) problems.push(`${key}: only ${players.length} players`);
  if (byLine.DEF < 3 || byLine.MID < 2 || byLine.FWD < 2)
    warnings.push(`${key}: lopsided squad GK${byLine.GK} DEF${byLine.DEF} MID${byLine.MID} FWD${byLine.FWD}`);

  // strength = best XI average, the number the league sim runs on.
  // Spread around the mean afterwards: raw best-XI averages bunch into ~9 points
  // because the tier bands overlap, which would make every rival roughly as good
  // as every other. The real league is not like that — a title-winning Chelsea
  // side and a relegated one are far apart — so the gap is stretched to match.
  const best = players.map(p => p[2]).sort((a, b) => b - a).slice(0, 11);
  const raw = best.reduce((a, b) => a + b, 0) / best.length;
  const str = Math.round((SPREAD_MID + (raw - SPREAD_MID) * SPREAD_K) * 10) / 10;

  out.push({ c: cs.c, sh: shortName, s: String(cs.s), y, k: kit[0], k2: kit[1], ab: kit[2], pat, l: lore || '', str, p: players });
}

out.sort((a, b) => a.y - b.y || a.c.localeCompare(b.c));

// lore entries that point at a club-season we do not have
const have = new Set(out.map(c => c.c + '|' + c.s));
for (const k of Object.keys(LORE)) if (!have.has(k)) problems.push(`lore for missing club-season ${k}`);

if (warnings.length) console.warn('\nNotes:\n' + warnings.map(w => '  · ' + w).join('\n') + '\n');
if (problems.length) {
  console.error('\nDATA PROBLEMS:\n' + problems.map(p => '  - ' + p).join('\n') + '\n');
  if (!process.argv.includes('--force')) { console.error(`${problems.length} problem(s); re-run with --force to build anyway.`); process.exit(1); }
}

const clubIds = [...new Set(out.map(c => c.c))];
const CS = out.map(c => [c.str, c.y, clubIds.indexOf(c.c)]);

const js = v => JSON.stringify(v);
const clubLine = c => `{c:${js(c.c)},sh:${js(c.sh)},pat:${js(c.pat)},s:${js(c.s)},y:${c.y},k:${js(c.k)},k2:${js(c.k2)},ab:${js(c.ab)},l:${js(c.l)},p:[${c.p.map(p => `[${js(p[0])},${js(p[1])},${p[2]},${js(p[3])},${js(p[4])}]`).join(',')}]}`;

writeFileSync(new URL('../src/data.js', import.meta.url), `/* =========================================================
   DATA — ${out.length} WSL club-seasons, ${out[0].y}–${out[out.length - 1].y}
   [name, line, rating, position, nationality]
   Ratings are unofficial and descriptive, not a record of anything.
   (generated by scripts/extract.mjs — edit src/clubs.mjs + src/lore.mjs and re-run)
========================================================= */
const CLUBS=[
${out.map(clubLine).join(',\n')}
];

/* [strength, year, clubId] — the only club data the league sim needs.
   Mirrored byte-for-byte in api/_data.js so the server can rebuild the table. */
const CS=${js(CS)};
`);

writeFileSync(new URL('../api/_data.js', import.meta.url), `/* generated by scripts/extract.mjs — mirrors the CS array in src/data.js */
export const CS=${js(CS)};
export const CLUB_NAMES=${js(clubIds)};
`);

const players = out.reduce((a, c) => a + c.p.length, 0);
const nats = new Set(out.flatMap(c => c.p.map(p => p[4]).filter(Boolean)));
console.log(`src/data.js: ${out.length} club-seasons (${clubIds.length} clubs, ${out[0].y}–${out[out.length - 1].y}), ${players} players, ${nats.size} nationalities`);
console.log(`strength range ${Math.min(...CS.map(c => c[0]))}–${Math.max(...CS.map(c => c[0]))}`);
