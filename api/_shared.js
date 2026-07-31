import crypto from 'node:crypto';
import { put, list } from '@vercel/blob';

/* ---- scoring + the league model (mirrored in src/game-core.js — keep in sync) ----
   Everything below is a pure function of (seed, pool, difficulty) plus the 22
   scorelines the client submits. That means the server rebuilds the whole
   12-team table itself and derives the final position, rather than trusting a
   claimed one. */
import { CS } from './_data.js';

export const DIFF_MULT = { classic: 1, hard: 1.3, legend: 1.7 };
export const DRAFT_MULT = { classic: 1, era: 1.15, dynasty: 1.2, cap: 1.3 };
export const POOL_MULT = { all: 1, ft: 0.9, mod: 0.8 };
export const POOLS = { all: { y: 0 }, ft: { y: 2018 }, mod: { y: 2022 } };
export const RIVAL_N = 11, MATCHDAYS = 22;

/* featured challenge of the day — mirrored in src/game-core.js FEATURED */
export const FEATURED = [
  { n: "Invincible Day", draft: "classic", diff: "legend", pool: "all", form: "4-3-3" },
  { n: "Modern Masters", draft: "classic", diff: "hard", pool: "mod", form: "4-2-3-1" },
  { n: "Gunners Dynasty", draft: "dynasty", dyn: "Arsenal", diff: "classic", pool: "all", form: "4-3-3" },
  { n: "Time Traveller", draft: "era", diff: "classic", pool: "all", form: "4-4-2" },
  { n: "Moneyball", draft: "cap", diff: "classic", pool: "all", form: "4-4-2" },
  { n: "Blues Dynasty", draft: "dynasty", dyn: "Chelsea", diff: "classic", pool: "all", form: "4-2-3-1" },
  { n: "Low Block Night", draft: "classic", diff: "hard", pool: "all", form: "4-1-4-1" },
  { n: "Full-Time Only", draft: "classic", diff: "classic", pool: "ft", form: "4-2-3-1" },
  { n: "Era Tour: Hard Mode", draft: "era", diff: "hard", pool: "all", form: "4-3-3" },
  { n: "Wing-back Wednesday-ish", draft: "classic", diff: "classic", pool: "all", form: "3-4-3" }
];
export function featuredFor(day) {
  let h = 0; for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) >>> 0;
  return FEATURED[h % FEATURED.length];
}
export const FEAT_MULT = 1.15;
export function matchesFeatured(flags, day) {
  const f = featuredFor(day || utcDay());
  return !!flags.daily && flags.draft === f.draft && flags.diff === f.diff && flags.pool === f.pool
    && flags.form === f.form && (f.dyn ? flags.dyn === f.dyn : true);
}

/* ---------------- LEAGUE CORE (verbatim mirror of src/game-core.js) ---------------- */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const cl=(v,a,b)=>Math.max(a,Math.min(b,v));

export function pickRivals(seed,poolMode,diff){
  const rng=mulberry32((seed^0x5bf03635)>>>0);
  const minY=(POOLS[poolMode]||POOLS.all).y;
  const el=[];for(let i=0;i<CS.length;i++)if(CS[i][1]>=minY)el.push(i);
  el.sort((a,b)=>CS[b][0]-CS[a][0]||a-b);
  const frac=diff==="legend"?0.4:diff==="hard"?0.66:1;
  const cut=el.slice(0,Math.max(RIVAL_N+4,Math.round(el.length*frac)));
  const seen=new Set(),out=[];
  const draw=arr=>{const p=arr.slice();
    while(out.length<RIVAL_N&&p.length){
      const c=p.splice(Math.floor(rng()*p.length),1)[0];
      if(seen.has(CS[c][2]))continue;
      seen.add(CS[c][2]);out.push(c);
    }};
  draw(cut); if(out.length<RIVAL_N) draw(el);
  return out;
}
export function fixtures(seed){
  const n=RIVAL_N+1,ids=[...Array(n).keys()],first=[];
  for(let r=0;r<n-1;r++){
    const pairs=[];
    for(let i=0;i<n/2;i++){const a=ids[i],b=ids[n-1-i];pairs.push(r%2?[b,a]:[a,b]);}
    first.push(pairs);
    ids.splice(1,0,ids.pop());
  }
  const second=first.map(rd=>rd.map(([a,b])=>[b,a]));
  const rng=mulberry32((seed^0x2545f491)>>>0);
  const sh=a=>{const x=a.slice();for(let i=x.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[x[i],x[j]]=[x[j],x[i]];}return x;};
  return sh(first).concat(sh(second));
}
function poisson(rng,l){let x=0,p=Math.exp(-l),s=p,u=rng();while(u>s&&x<9){x++;p*=l/x;s+=p;}return x;}
function simAI(rng,sa,sb){
  const e=(sa+2.2-sb)/5;
  return [poisson(rng,cl(1.48+e*0.62,0.15,5)),poisson(rng,cl(1.48-e*0.62,0.15,5))];
}
export function simRivalLeague(seed,rivals){
  const rng=mulberry32((seed^0x9e3779b9)>>>0),fx=fixtures(seed),out=[];
  for(const round of fx){
    const day=[];
    for(const[a,b]of round){
      if(a===0||b===0)continue;
      const[ga,gb]=simAI(rng,CS[rivals[a-1]][0],CS[rivals[b-1]][0]);
      day.push({a,b,ga,gb});
    }
    out.push(day);
  }
  return out;
}
const blankRow=()=>({p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0});
function applyResult(t,gf,ga){
  t.p++;t.gf+=gf;t.ga+=ga;
  if(gf>ga){t.w++;t.pts+=3;}else if(gf===ga){t.d++;t.pts++;}else t.l++;
}
export function buildTable(myMatches,seed,poolMode,diff,upto){
  const rivals=pickRivals(seed,poolMode,diff),ai=simRivalLeague(seed,rivals),fx=fixtures(seed);
  const n=RIVAL_N+1,rows=Array.from({length:n},blankRow);
  const played=upto==null?myMatches.length:Math.min(upto,myMatches.length);
  for(let md=0;md<played;md++){
    for(const r of ai[md]){applyResult(rows[r.a],r.ga,r.gb);applyResult(rows[r.b],r.gb,r.ga);}
    const mine=fx[md].find(([a,b])=>a===0||b===0);
    const opp=mine[0]===0?mine[1]:mine[0];
    const m=myMatches[md];
    applyResult(rows[0],m.gf,m.ga);applyResult(rows[opp],m.ga,m.gf);
  }
  return rows.map((r,i)=>Object.assign({i,you:i===0,club:i===0?null:rivals[i-1]},r))
    .sort((a,b)=>b.pts-a.pts||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||(a.you?-1:b.you?1:a.i-b.i));
}

export function validateRun(matches) {
  if (!Array.isArray(matches) || matches.length !== MATCHDAYS) return 'matches';
  for (const x of matches) {
    if (!x || typeof x !== 'object') return 'match';
    if (!Number.isInteger(x.gf) || !Number.isInteger(x.ga)) return 'goals';
    if (x.gf < 0 || x.ga < 0 || x.gf > 12 || x.ga > 12) return 'goals';
  }
  const gf = matches.reduce((a, x) => a + x.gf, 0);
  if (gf > 140) return 'goals-total';        // 6.4 a game for a whole season
  return null;
}

export function scoreRun(matches, flags) {
  let pts = 0, w = 0, d = 0, l = 0, gf = 0, ga = 0;
  matches.forEach(m => {
    if (m.gf > m.ga) { pts += 60; w++; } else if (m.gf === m.ga) { pts += 25; d++; } else l++;
    pts += m.gf * 3 - m.ga * 2; gf += m.gf; ga += m.ga;
  });
  const seed = Number.isInteger(flags.seed) ? flags.seed >>> 0 : 0;
  const table = buildTable(matches, seed, flags.pool, flags.diff);
  const pos = table.findIndex(t => t.you) + 1;
  const full = matches.length === MATCHDAYS;
  const champion = full && pos === 1, unbeaten = full && l === 0, perfect = full && w === MATCHDAYS;
  if (champion) pts += 250;
  if (unbeaten) pts += 150;
  if (perfect) pts += 400;
  pts = Math.max(0, pts);
  const feat = matchesFeatured(flags, flags.day);
  const mult = (DIFF_MULT[flags.diff] || 1) * (DRAFT_MULT[flags.draft] || 1) * (POOL_MULT[flags.pool] ?? 1)
    * (flags.daily ? 1.1 : 1) * (feat ? FEAT_MULT : 1);
  return { pts: Math.round(pts * mult), champion, unbeaten, perfect, pos, lpts: w * 3 + d, w, d, l, gf, ga, base: pts, mult, feat };
}

/* ---- run token (proves a plausible playtime; not credit-related) ---- */
export function signToken(t) {
  return crypto.createHmac('sha256', process.env.TOKEN_KEY || '').update('run:' + t).digest('hex');
}
export function signRun(kind, t, uid) {
  return crypto.createHmac('sha256', process.env.TOKEN_KEY || '')
    .update(kind + ':' + t + ':' + (uid || '')).digest('hex');
}
export function verifyRun(tok) {
  if (!tok || !tok.t || !tok.s) return null;
  if (['paid', 'daily', 'free'].includes(tok.k)) {
    return tok.s === signRun(tok.k, tok.t, tok.u || '') ? { t: tok.t, kind: tok.k, uid: tok.u || '' } : null;
  }
  return tok.s === signToken(tok.t) ? { t: tok.t, kind: 'free', uid: '' } : null;
}

/* ---- email / drip plumbing ---- */
export function encryptEmail(email) {
  const key = Buffer.from(process.env.EMAIL_KEY, 'hex');
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([c.update(email, 'utf8'), c.final()]);
  return { iv: iv.toString('base64'), ct: ct.toString('base64'), tag: c.getAuthTag().toString('base64') };
}
export function decryptEmail(rec) {
  const key = Buffer.from(process.env.EMAIL_KEY, 'hex');
  const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(rec.iv, 'base64'));
  d.setAuthTag(Buffer.from(rec.tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(rec.ct, 'base64')), d.final()]).toString('utf8');
}
export const emailHash = e => crypto.createHash('sha256').update(e.trim().toLowerCase()).digest('hex').slice(0, 32);
export const signUnsub = h => crypto.createHmac('sha256', process.env.TOKEN_KEY || '').update('unsub:' + h).digest('hex').slice(0, 32);

/* one drip subscriber per email (hash-keyed): encrypted address + lifecycle state */
export async function readSub(h) {
  try {
    const { blobs } = await list({ prefix: `subs/${h}.json`, limit: 1 });
    if (!blobs.length) return null;
    const r = await fetch(blobs[0].url + '?v=' + Date.now());
    return r.ok ? await r.json() : null;
  } catch { return null; }
}
export async function writeSub(s) {
  await put(`subs/${s.h}.json`, JSON.stringify(s), {
    access: 'public', addRandomSuffix: false, allowOverwrite: true,
    contentType: 'application/json', cacheControlMaxAge: 0
  });
}
// upsert on a played-and-emailed run — tracks activity for the drip campaign
export async function upsertSub({ email, name, country, streak, champion }) {
  const h = emailHash(email), today = utcDay(), enc = encryptEmail(email);
  let s = await readSub(h);
  if (!s) s = { v: 1, h, created: today, runs: 0, champs: 0, sent: {}, unsub: false };
  Object.assign(s, enc);                 // refresh ciphertext
  s.n = name; if (country) s.c = country;
  s.lastPlayed = today;
  s.streak = streak || s.streak || 0;
  s.best = Math.max(s.best || 0, s.streak);
  s.runs = (s.runs || 0) + 1;
  if (champion) s.champs = (s.champs || 0) + 1;
  s.unsub = false;                       // opting in again re-subscribes
  await writeSub(s);
  return s;
}

/* ---- input hygiene ---- */
const BAD = /(fuck|shit|cunt|nigg|fag|wank|twat|bitch|cock|dick|piss)/i;
export function cleanName(raw) {
  const n = String(raw || '').replace(/[\u0000-\u001f<>&"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20);
  if (n.length < 2) return null;
  if (/https?:|www\.|@/i.test(n)) return null;
  if (BAD.test(n)) return null;
  return n;
}
export function cleanCountry(raw) {
  const c = String(raw || '').toUpperCase();
  return /^[A-Z]{2}$/.test(c) ? c : '';
}
export function cleanXI(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 20).map(p => {
    if (!Array.isArray(p)) return null;
    const name = String(p[0] || '').replace(/[<>&"'`\\]/g, '').slice(0, 32);
    const year = Number.isInteger(p[1]) && p[1] >= 1930 && p[1] <= 2030 ? p[1] : 0;
    const flag = String(p[2] || '').slice(0, 8);
    return name ? [name, year, flag] : null;
  }).filter(Boolean);
}

/* ---- aggregate leaderboards in Blob ---- */
export async function readAgg(key) {
  try {
    const { blobs } = await list({ prefix: `agg/${key}.json`, limit: 1 });
    if (!blobs.length) return { count: 0, top: [] };
    const r = await fetch(blobs[0].url + '?v=' + Date.now());
    if (!r.ok) return { count: 0, top: [] };
    const j = await r.json();
    return { count: j.count || 0, top: Array.isArray(j.top) ? j.top : [], updated: j.updated || 0 };
  } catch {
    return { count: 0, top: [] };
  }
}
export async function writeAgg(key, agg) {
  await put(`agg/${key}.json`, JSON.stringify(agg), {
    access: 'public', addRandomSuffix: false, allowOverwrite: true,
    contentType: 'application/json', cacheControlMaxAge: 60
  });
}
const aggKey = e => e.n.toLowerCase() + '|' + (e.c || '');
// inserts entry, dedupes by name+country keeping the best, returns 1-based rank or null
export function mergeTop(agg, entry) {
  agg.count = (agg.count || 0) + 1;
  const top = agg.top || [];
  const same = top.find(e => aggKey(e) === aggKey(entry));
  if (same) { if (entry.p > same.p) Object.assign(same, entry); }
  else top.push(entry);
  top.sort((a, b) => b.p - a.p || a.ts - b.ts);
  agg.top = top.slice(0, 100);
  agg.updated = Date.now();
  const i = agg.top.findIndex(e => aggKey(e) === aggKey(entry));
  return i >= 0 ? i + 1 : null;
}

export const utcDay = () => new Date().toISOString().slice(0, 10);
export const utcYesterday = () => new Date(Date.now() - 864e5).toISOString().slice(0, 10);

/* ---- daily-regulars streak board ---- */
export function bumpStreak(agg, entry, pts) {
  const key = e => e.n.toLowerCase() + '|' + (e.c || '');
  let e = (agg.top = agg.top || []).find(x => key(x) === key(entry));
  if (!e) { e = { n: entry.n, c: entry.c, streak: 0, best: 0, days: 0, tp: 0, last: '' }; agg.top.push(e); }
  const today = utcDay();
  if (e.last !== today) {
    e.streak = e.last === utcYesterday() ? e.streak + 1 : 1;
    e.best = Math.max(e.best, e.streak);
    e.days++; e.tp += pts; e.last = today;
    e.n = entry.n; e.c = entry.c;
  }
  agg.top.sort((a, b) => b.streak - a.streak || b.days - a.days || b.tp - a.tp);
  agg.top = agg.top.slice(0, 200);
  agg.count = agg.top.length;
  agg.updated = Date.now();
  return e.streak;
}
