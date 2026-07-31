/* Headless play-through: drafts an XI, plays all 22 matches, scores the season,
   and checks the server recomputes the identical result from the same 22
   scorelines. Run: node scripts/simulate.mjs [runs]  */
import { readFileSync } from 'node:fs';
import { scoreRun as serverScore } from '../api/_shared.js';

const read = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

// stub just enough browser for the client modules to load
globalThis.matchMedia = () => ({ matches: true });
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; } };
const stubEl = () => ({
  classList: { add() {}, remove() {}, contains: () => false },
  style: {}, dataset: {}, appendChild() {}, querySelectorAll: () => [], querySelector: () => null,
  set innerHTML(v) {}, get innerHTML() { return ''; }, textContent: '', disabled: false,
  firstElementChild: { style: {} }, getBoundingClientRect: () => ({ width: 100 }), scrollTop: 0, scrollHeight: 0
});
globalThis.document = { getElementById: stubEl, querySelectorAll: () => [], addEventListener: () => {}, createElement: stubEl };
// navigator already exists in modern Node
globalThis.fetch = () => Promise.reject(new Error('offline'));

const client = read('src/data.js') + read('src/game-core.js') + read('src/game-season.js');
const G = new Function(client + `
  return { CLUBS, CS, S: () => S, setS: v => { S = v }, pref: () => pref, setPref: v => { pref = v },
           resetState, poolIdx, draft, picksLeft, teamChem, effRating, rolePenalty, leadOf,
           strengths, simMyMatch, pickRivals, fixtures, simRivalLeague, buildTable, scoreSeason,
           MATCHDAYS, FORMATIONS, DIFF_MULT, DRAFT_MULT, POOL_MULT };`)();

const RUNS = Number(process.argv[2]) || 300;
const FORMS = Object.keys(G.FORMATIONS);
const DIFFS = ['classic', 'hard', 'legend'];
const POOLS = ['all', 'ft', 'mod'];

const agg = { pts: [], lpts: [], pos: [], gf: [], chem: [], champ: 0, unbeaten: 0, perfect: 0, rel: 0 };
let mismatches = 0, drafted = 0;

for (let run = 0; run < RUNS; run++) {
  const form = FORMS[run % FORMS.length], diff = DIFFS[run % 3], pool = POOLS[(run / 3 | 0) % 3];
  G.setPref({ form, draft: 'classic', diff, pool, dyn: null });
  G.resetState(true);
  const S = G.S();

  // draft greedily: XI first, then the 9-player bench
  let guard = 0;
  while (G.picksLeft() > 0 && guard++ < 900) {
    const idx = G.poolIdx();
    const si = idx[Math.floor(Math.random() * idx.length)];
    const slot = S.slots.find(s => !s.player) || S.bench.find(s => !s.player);
    const club = G.CLUBS[si];
    const isBench = !S.slots.includes(slot);
    let bestPi = -1, bestVal = -1;
    club.p.forEach((p, pi) => {
      if (S.picked.has(si + ':' + pi)) return;
      if (isBench) {                       // bench slots are typed by line
        const LINE = { GK:'GK',RB:'DEF',LB:'DEF',CB:'DEF',DM:'MID',CM:'MID',AM:'MID',RM:'MID',LM:'MID',RW:'FWD',LW:'FWD',ST:'FWD' };
        if ((LINE[p[3] || p[1]] || p[1]) !== slot.cat) return;
        if (p[2] > bestVal) { bestVal = p[2]; bestPi = pi; }
      } else {
        const v = p[2] - G.rolePenalty(p[3] || p[1], slot.id);
        if (v > bestVal) { bestVal = v; bestPi = pi; }
      }
    });
    if (bestPi < 0) continue;
    S.landedSquad = si;
    G.draft(si, bestPi, si + ':' + bestPi, slot.id);
  }
  if (G.picksLeft() > 0) { console.error('run ' + run + ': could not fill XI'); continue; }
  drafted++;
  S.captain = S.slots.filter(s => s.player).sort((a, b) => G.leadOf(b.player) - G.leadOf(a.player))[0].id;
  agg.chem.push(G.teamChem());

  // play the season
  const rivals = G.pickRivals(S.seed, S.poolMode, S.diff);
  const fx = G.fixtures(S.seed);
  S.season.rivals = rivals; S.season.fx = fx; S.season.ai = G.simRivalLeague(S.seed, rivals);
  for (let md = 0; md < G.MATCHDAYS; md++) {
    const pair = fx[md].find(([a, b]) => a === 0 || b === 0);
    const home = pair[0] === 0, opp = home ? pair[1] : pair[0];
    const r = G.simMyMatch(G.CS[rivals[opp - 1]][0], home);
    S.season.matches.push({ gf: r.gf, ga: r.ga });
  }

  const flags = { draft: 'classic', diff, daily: true, pool, form, dyn: null, seed: S.seed, day: '2026-07-30' };
  const cli = G.scoreSeason(S.season.matches, flags);
  const srv = serverScore(S.season.matches, flags);

  if (cli.pts !== srv.pts || cli.pos !== srv.pos || cli.champion !== srv.champion
      || cli.unbeaten !== srv.unbeaten || cli.perfect !== srv.perfect || cli.lpts !== srv.lpts) {
    mismatches++;
    if (mismatches <= 3) console.error(`MISMATCH run ${run}: client ${cli.pts}/${cli.pos}/${cli.lpts} vs server ${srv.pts}/${srv.pos}/${srv.lpts}`);
  }

  agg.pts.push(cli.pts); agg.lpts.push(cli.lpts); agg.pos.push(cli.pos); agg.gf.push(cli.gf);
  if (cli.champion) agg.champ++;
  if (cli.unbeaten) agg.unbeaten++;
  if (cli.perfect) agg.perfect++;
  if (cli.pos >= 11) agg.rel++;
}

const avg = a => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
const pct = n => (n / drafted * 100).toFixed(1) + '%';
const max = a => Math.max(...a);

console.log(`\n${drafted} full seasons played (${G.MATCHDAYS} matches each, all formations/difficulties/pools)\n`);
console.log(`client↔server scoring mismatches : ${mismatches}   ${mismatches ? '✗ OUT OF SYNC' : '✓ in sync'}`);
console.log(`chemistry            avg ${avg(agg.chem)}   (target ~16, max ${max(agg.chem).toFixed(1)})`);
console.log(`league points        avg ${avg(agg.lpts)}   best ${max(agg.lpts)}`);
console.log(`final position       avg ${avg(agg.pos)}`);
console.log(`goals scored         avg ${avg(agg.gf)}   best ${max(agg.gf)}`);
console.log(`game score           avg ${avg(agg.pts)}   best ${max(agg.pts).toLocaleString()}`);
console.log(`\ntitles won           ${pct(agg.champ)}`);
console.log(`unbeaten seasons     ${pct(agg.unbeaten)}`);
console.log(`perfect 22-0         ${pct(agg.perfect)}`);
console.log(`relegated (11th/12th)${pct(agg.rel)}`);
process.exit(mismatches ? 1 : 0);
