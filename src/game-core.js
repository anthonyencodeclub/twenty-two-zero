/* =========================================================
   FORMATIONS
========================================================= */
const FORMATIONS={
 "4-3-3":{rows:[["LW","ST","RW"],["LCM","CM","RCM"],["LB","LCB","RCB","RB"],["GK"]],
   cats:{LW:"FWD",ST:"FWD",RW:"FWD",LCM:"MID",CM:"MID",RCM:"MID",LB:"DEF",LCB:"DEF",RCB:"DEF",RB:"DEF",GK:"GK"},
   mod:{att:0.6,def:0},blurb:"front-foot"},
 "4-4-2":{rows:[["ST1","ST2"],["LM","LCM","RCM","RM"],["LB","LCB","RCB","RB"],["GK"]],
   cats:{ST1:"FWD",ST2:"FWD",LM:"MID",LCM:"MID",RCM:"MID",RM:"MID",LB:"DEF",LCB:"DEF",RCB:"DEF",RB:"DEF",GK:"GK"},
   mod:{att:0,def:0.6},blurb:"two banks"},
 "4-2-3-1":{rows:[["ST"],["LAM","CAM","RAM"],["LDM","RDM"],["LB","LCB","RCB","RB"],["GK"]],
   cats:{ST:"FWD",LAM:"MID",CAM:"MID",RAM:"MID",LDM:"MID",RDM:"MID",LB:"DEF",LCB:"DEF",RCB:"DEF",RB:"DEF",GK:"GK"},
   mod:{att:-0.2,def:0.9},blurb:"double pivot"},
 "3-5-2":{rows:[["ST1","ST2"],["LCM","CM","RCM"],["LWB","LCB","CB","RCB","RWB"],["GK"]],
   cats:{ST1:"FWD",ST2:"FWD",LCM:"MID",CM:"MID",RCM:"MID",LWB:"DEF",LCB:"DEF",CB:"DEF",RCB:"DEF",RWB:"DEF",GK:"GK"},
   mod:{att:1.0,def:-0.7},blurb:"wing-backs fly"},
 "4-1-4-1":{rows:[["ST"],["LM","LCM","RCM","RM"],["CDM"],["LB","LCB","RCB","RB"],["GK"]],
   cats:{ST:"FWD",LM:"MID",LCM:"MID",RCM:"MID",RM:"MID",CDM:"MID",LB:"DEF",LCB:"DEF",RCB:"DEF",RB:"DEF",GK:"GK"},
   mod:{att:-0.3,def:1.0},blurb:"single pivot"},
 "3-4-3":{rows:[["LW","ST","RW"],["LWB","LCM","RCM","RWB"],["LCB","CB","RCB"],["GK"]],
   cats:{LW:"FWD",ST:"FWD",RW:"FWD",LWB:"MID",LCM:"MID",RCM:"MID",RWB:"MID",LCB:"DEF",CB:"DEF",RCB:"DEF",GK:"GK"},
   mod:{att:1.2,def:-0.9},blurb:"all-out attack"}
};

/* =========================================================
   MODES + SCORING  (the LEAGUE CORE block below is mirrored
   verbatim in api/_shared.js — keep the two in sync)
========================================================= */
const DIFF_MULT={classic:1,hard:1.3,legend:1.7};
const DRAFT_MULT={classic:1,era:1.15,dynasty:1.2,cap:1.3};
const POOL_MULT={all:1,ft:0.9,mod:0.8};
const POOLS={all:{n:"All-time",y:0,d:"every WSL season since 2011"},
             ft:{n:"Full-time era",y:2018,d:"2018-19 onwards"},
             mod:{n:"Modern",y:2022,d:"2022-23 onwards"}};
const DRAFT_MODES={
  classic:{n:"Classic",d:"all "+CLUBS.length+" club-seasons"},
  era:{n:"Era Tour",d:"a new WSL era each draw"},
  dynasty:{n:"Dynasty",d:"one club, every season"},
  cap:{n:"Wage Cap",d:"budget 1560 for 20 players"}
};
/* WSL eras — the league's own history, not decades */
const ERAS=[[2011,2013,"The founding years"],[2014,2016,"Two tiers"],
            [2017,2019,"Going full-time"],[2020,2022,"The boom"],[2023,2030,"The modern game"]];
const CAP_BUDGET=1560, CAP_FLOOR=74;

/* featured challenge of the day — deterministic rotation, ×1.15 bonus when your
   daily season matches it (mirrored in api/_shared.js — keep in sync) */
const FEATURED=[
  {n:"Invincible Day",draft:"classic",diff:"legend",pool:"all",form:"4-3-3"},
  {n:"Modern Masters",draft:"classic",diff:"hard",pool:"mod",form:"4-2-3-1"},
  {n:"Gunners Dynasty",draft:"dynasty",dyn:"Arsenal",diff:"classic",pool:"all",form:"4-3-3"},
  {n:"Time Traveller",draft:"era",diff:"classic",pool:"all",form:"4-4-2"},
  {n:"Moneyball",draft:"cap",diff:"classic",pool:"all",form:"4-4-2"},
  {n:"Blues Dynasty",draft:"dynasty",dyn:"Chelsea",diff:"classic",pool:"all",form:"4-2-3-1"},
  {n:"Low Block Night",draft:"classic",diff:"hard",pool:"all",form:"4-1-4-1"},
  {n:"Full-Time Only",draft:"classic",diff:"classic",pool:"ft",form:"4-2-3-1"},
  {n:"Era Tour: Hard Mode",draft:"era",diff:"hard",pool:"all",form:"4-3-3"},
  {n:"Wing-back Wednesday-ish",draft:"classic",diff:"classic",pool:"all",form:"3-4-3"}
];
function featuredFor(day){
  let h=0;for(let i=0;i<day.length;i++){h=(h*31+day.charCodeAt(i))>>>0;}
  return FEATURED[h%FEATURED.length];
}
const FEAT_MULT=1.15;
function matchesFeatured(flags,day){
  const f=featuredFor(day||utcDay());
  return !!flags.daily&&flags.draft===f.draft&&flags.diff===f.diff&&flags.pool===f.pool
    &&flags.form===f.form&&(f.dyn?flags.dyn===f.dyn:true);
}
const DYNASTIES=(()=>{const m={};CLUBS.forEach((s,i)=>{(m[s.c]=m[s.c]||[]).push(i);});
  return Object.entries(m).filter(([,v])=>v.length>=4).sort((a,b)=>b[1].length-a[1].length);})();

/* ---------------------------------------------------------
   LEAGUE CORE — pure, deterministic, mirrored in api/_shared.js.
   Given only (seed, pool, difficulty) the whole 12-team league
   is reproducible: who your rivals are, the fixture list, and
   every result that does NOT involve you. That is what lets the
   server recompute your final league position from your 22
   scorelines instead of trusting the client.
--------------------------------------------------------- */
const RIVAL_N=11, MATCHDAYS=22;
/* the bench Anthony specified: 1 GK, 3 defenders, 2 midfielders, 3 attackers */
const BENCH_DEF=[{id:"BG1",cat:"GK"},{id:"BD1",cat:"DEF"},{id:"BD2",cat:"DEF"},{id:"BD3",cat:"DEF"},
  {id:"BM1",cat:"MID"},{id:"BM2",cat:"MID"},{id:"BF1",cat:"FWD"},{id:"BF2",cat:"FWD"},{id:"BF3",cat:"FWD"}];
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const cl=(v,a,b)=>Math.max(a,Math.min(b,v));

// eleven rivals: distinct clubs, drawn harder as difficulty rises
function pickRivals(seed,poolMode,diff){
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
      if(seen.has(CS[c][2]))continue;          // one entry per club, ever
      seen.add(CS[c][2]);out.push(c);
    }};
  draw(cut); if(out.length<RIVAL_N) draw(el);  // widen if the pool is thin
  return out;
}

// circle-method round robin for 12 teams (0 = you), doubled and seed-shuffled
function fixtures(seed){
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
function simAI(rng,sa,sb){                    // sa is at home
  // tuned against the real league: champions land ~50 pts, the bottom club ~10,
  // and the whole division averages just under three goals a game
  const e=(sa+2.2-sb)/5;
  return [poisson(rng,cl(1.48+e*0.62,0.15,5)),poisson(rng,cl(1.48-e*0.62,0.15,5))];
}

/* every rival-vs-rival result for the whole season, in one deterministic pass on
   its own RNG stream so nothing you do at the keyboard can shift it */
function simRivalLeague(seed,rivals){
  const rng=mulberry32((seed^0x9e3779b9)>>>0),fx=fixtures(seed),out=[];
  for(const round of fx){
    const day=[];
    for(const[a,b]of round){
      if(a===0||b===0)continue;               // your match is played, not simulated
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
/* the table after `upto` of your matches have been played (upto=22 → final) */
function buildTable(myMatches,seed,poolMode,diff,upto){
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

function scoreSeason(matches,flags){
  let pts=0,w=0,d=0,l=0,gf=0,ga=0;
  matches.forEach(m=>{
    if(m.gf>m.ga){pts+=60;w++;}else if(m.gf===m.ga){pts+=25;d++;}else l++;
    pts+=m.gf*3-m.ga*2;gf+=m.gf;ga+=m.ga;
  });
  const table=buildTable(matches,flags.seed,flags.pool,flags.diff),
        pos=table.findIndex(t=>t.you)+1,
        full=matches.length===MATCHDAYS,
        champion=full&&pos===1,
        unbeaten=full&&l===0,
        perfect=full&&w===MATCHDAYS;
  if(champion)pts+=250;
  if(unbeaten)pts+=150;
  if(perfect)pts+=400;
  pts=Math.max(0,pts);
  const feat=matchesFeatured(flags,flags.day);
  const mult=(DIFF_MULT[flags.diff]||1)*(DRAFT_MULT[flags.draft]||1)*(POOL_MULT[flags.pool]??1)
    *(flags.daily?1.1:1)*(feat?FEAT_MULT:1);
  return{pts:Math.round(pts*mult),champion,unbeaten,perfect,pos,table,
         lpts:w*3+d,w,d,l,gf,ga,base:pts,mult,feat};
}
/* ---------------- end LEAGUE CORE ---------------- */

/* =========================================================
   STATE + STORAGE
========================================================= */
let S={};
let RUN_SEED=null;   // set before resetState to replay a challenge's league
let pref={form:"4-3-3",draft:"classic",diff:"classic",dyn:null,pool:"all"};
const utcDay=()=>new Date().toISOString().slice(0,10);

function resetState(daily){
  const draft=pref.draft, form=pref.form, diff=pref.diff;
  const poolMode=draft==="dynasty"?"all":pref.pool;
  const F=FORMATIONS[form];
  const slots=[];F.rows.forEach(r=>r.forEach(id=>slots.push({id,cat:F.cats[id],player:null})));
  const seed=RUN_SEED!=null?RUN_SEED:((Math.random()*4294967296)>>>0);
  RUN_SEED=null;
  S={form,draft,diff,poolMode,daily:!!daily,dyn:draft==="dynasty"?pref.dyn:null,
     slots,bench:BENCH_DEF.map(b=>({...b,player:null})),tactic:"balanced",apps:{},
     lastSquad:-1,spinning:false,picked:new Set(),
     respins:1,captain:null,goals:{},assists:{},era:0,budget:CAP_BUDGET,token:null,submitted:false,
     seed,rng:mulberry32(seed),
     pool:[],reelIdx:[],speed:1,
     season:{md:0,matches:[],rivals:[],ai:[],fx:[],lastPos:null,playing:false,done:false}};
  if(draft==="era"){
    const minY=(POOLS[poolMode]||POOLS.all).y;
    for(let k=0;k<ERAS.length;k++){const[a,b]=ERAS[k];if(CLUBS.some(s=>s.y>=Math.max(a,minY)&&s.y<=b)){S.era=k;break;}}
  }
}
const R=()=>S.rng();
const rnd=n=>Math.floor(R()*n);
const pickFrom=a=>a[rnd(a.length)];

const STORE_KEY="twentytwo_stats_v1";
const STORE_DEF={runs:0,titles:0,unbeatens:0,perfects:0,bestPts:0,bestLpts:0,goals:0,topScorers:{},
  badges:{},streak:0,lastDaily:"",lastRun:"",playerName:"",playerCountry:"",playerEmail:"",optin:false,
  emailSent:0,albumSquads:{},albumPlayers:{}};
const store={
  get(){try{return Object.assign({},STORE_DEF,JSON.parse(localStorage.getItem(STORE_KEY))||{});}
        catch(e){return Object.assign({},STORE_DEF);}},
  set(v){try{localStorage.setItem(STORE_KEY,JSON.stringify(v));}catch(e){}}
};

/* =========================================================
   HELPERS
========================================================= */
const $=id=>document.getElementById(id);
function show(id){document.querySelectorAll(".screen").forEach(s=>s.classList.remove("on"));$(id).classList.add("on");window.scrollTo(0,0);}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function tierOf(r){return r>=93?"icon":r>=88?"gold":r>=83?"silver":"bronze";}
function hidden(){return S.diff==="hard"||S.diff==="legend";}
const reducedMotion=matchMedia("(prefers-reduced-motion: reduce)").matches;
const API=p=>fetch(p,{headers:{accept:"application/json"}}).then(r=>r.ok?r.json():Promise.reject(r.status));
const apiPost=(p,body)=>fetch(p,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body||{})})
  .then(async r=>{let j={};try{j=await r.json();}catch(e){}return j;});
const esc=s=>String(s).replace(/[<>&"]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;"}[c]));
const SITE_URL="https://twenty-two-zero.vercel.app";

function toast(msg){
  const t=$("toast");if(!t)return;
  t.textContent=msg;t.classList.add("on");
  clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove("on"),2600);
}
function openInvite(){
  const txt="22-0 — draft a WSL XI and play a whole season. One free run a day:\n"+SITE_URL;
  if(navigator.share)navigator.share({title:"22-0",text:txt}).catch(()=>{});
  else navigator.clipboard?.writeText(txt).then(()=>toast("Link copied ✓"),()=>toast(SITE_URL));
}

/* club crest — a proper little shield in the club's colours */
function badge(c,size){
  const s=size||26, id="g"+hashStr(c.k+c.ab+s);
  const dark=c.k2&&c.k2!=="#FFFFFF"?c.k2:"#1d0c36";
  return `<svg class="cb" width="${s}" height="${s}" viewBox="0 0 24 26" aria-hidden="true">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c.k}"/><stop offset="1" stop-color="${dark}"/></linearGradient></defs>
    <path d="M12 1 22 4v9c0 6.5-4.2 10.4-10 12C6.2 23.4 2 19.5 2 13V4z" fill="url(#${id})"
      stroke="rgba(255,255,255,.45)" stroke-width="1"/>
    <path d="M12 1 22 4v3H2V4z" fill="rgba(255,255,255,.16)"/>
    <text x="12" y="16" text-anchor="middle" font-size="7.4" font-weight="900"
      fill="#fff" style="text-shadow:0 1px 2px rgba(0,0,0,.6)">${esc(c.ab)}</text></svg>`;
}
const clubLabel=i=>CLUBS[i].c+" "+CLUBS[i].s;

/* =========================================================
   PLAYER POOL + THE DRAW REEL
========================================================= */
function poolIdx(){
  const minY=(POOLS[S.poolMode]||POOLS.all).y;
  let idx=CLUBS.map((s,i)=>i).filter(i=>CLUBS[i].y>=minY);
  if(S.draft==="dynasty"&&S.dyn)idx=idx.filter(i=>CLUBS[i].c===S.dyn);
  if(S.draft==="era"){
    const[a,b]=ERAS[Math.min(S.era,ERAS.length-1)];
    const e=idx.filter(i=>CLUBS[i].y>=a&&CLUBS[i].y<=b);
    if(e.length)idx=e;
  }
  if(S.draft==="cap"){
    const afford=idx.filter(i=>CLUBS[i].p.some(p=>p[2]<=S.budget-CAP_FLOOR*(picksLeft()-1)));
    if(afford.length)idx=afford;
  }
  return idx.length?idx:CLUBS.map((s,i)=>i);
}
function cellHTML(i){
  const c=CLUBS[i];if(!c)return"";
  return `<div class="rcell" style="--c1:${c.k}44;--c2:#1d0c36">
    ${badge(c,26)}<div class="cn">${esc(c.c)}</div><div class="cy">${esc(c.s)}</div></div>`;
}
function cellW(){
  const el=document.querySelector("#reel-track .rcell");
  if(!el)return 112;
  const st=getComputedStyle($("reel-track"));
  return el.getBoundingClientRect().width+parseFloat(st.gap||8);
}
function buildReel(winner){
  const idx=poolIdx(),track=$("reel-track"),n=42;
  const cells=[];
  for(let k=0;k<n;k++)cells.push(idx[Math.floor(R()*idx.length)]);
  const stopAt=n-6;
  cells[stopAt]=winner;
  track.innerHTML=cells.map(cellHTML).join("");
  return stopAt;
}
function spinReel(stopAt,done){
  const track=$("reel-track"),w=cellW(),reelW=$("reel").getBoundingClientRect().width;
  const target=-(stopAt*w)+(reelW/2)-(w/2)+4;
  track.style.transition="none";track.style.transform="translateX(0)";
  void track.offsetWidth;
  const ms=reducedMotion?260:2400;
  track.style.transition=`transform ${ms}ms cubic-bezier(.14,.72,.14,1)`;
  track.style.transform=`translateX(${target}px)`;
  setTimeout(()=>{$("reel-flash").classList.add("on");setTimeout(()=>$("reel-flash").classList.remove("on"),430);done();},ms);
}

/* =========================================================
   CHEMISTRY — every player here comes from one league, so the
   links that matter are: they actually played together, they
   share a club across eras, they share a country, or they share
   an era. Position fit is rewarded on top.
========================================================= */
const CHEM={mult:0.47,cap:4};
function decOf(y){return Math.floor(y/3);}
function bond(a,b){
  if(a.sq===b.sq)return 2.2;                             // same squad, same season
  if(a.team===b.team)return 1.6;                         // same club, different era
  if(a.nat&&a.nat===b.nat)return 1.15;                   // countrymates
  if(Math.abs(a.year-b.year)<=2)return 0.7;              // contemporaries
  return 0.2;                                            // all WSL, at least
}
const ROLE_OF_SLOT={LWB:"LB",RWB:"RB",LCB:"CB",RCB:"CB",LCM:"CM",RCM:"CM",LDM:"DM",RDM:"DM",
  CDM:"DM",LAM:"AM",RAM:"AM",CAM:"AM",ST1:"ST",ST2:"ST"};
const roleOf=id=>ROLE_OF_SLOT[id]||id;
function playerChem(p,mates,slotId){
  const role=roleOf(slotId);
  let fit=0;
  if(p.sp===role)fit=1.6;
  else if(POS_ZERO.some(g=>g.includes(p.sp)&&g.includes(role)))fit=1.2;
  else if(LINE_OF[p.sp]===LINE_OF[role])fit=0.7;
  let best=0,links=0;
  for(const m of mates){if(m===p)continue;const b=bond(p,m);if(b>best)best=b;if(b>=1)links++;}
  return fit+best+Math.min(1.4,0.2*links);
}
function teamChem(){
  const ps=S.slots.filter(s=>s.player).map(s=>({...s.player,slot:s.id}));
  if(!ps.length)return 0;
  const tot=ps.reduce((a,p)=>a+playerChem(p,ps,p.slot),0);
  return Math.round(tot*CHEM.mult*(11/ps.length)*10)/10;
}
const chemBoost=()=>Math.min(CHEM.cap,teamChem()*0.09);

/* =========================================================
   POSITIONS — FIFA-style softness: related roles are free,
   near roles are cheap, only real misfits are punished.
========================================================= */
const LINE_OF={GK:"GK",RB:"DEF",LB:"DEF",CB:"DEF",DM:"MID",CM:"MID",AM:"MID",RM:"MID",LM:"MID",
  RW:"FWD",LW:"FWD",ST:"FWD"};
const POS_ZERO=[["LM","LW"],["RM","RW"],["CM","DM"],["CM","AM"],["LB","LM"],["RB","RM"],["CB","DM"]];
const POS_CHEAP=[["LB","RB"],["LM","RM"],["LW","RW"],["CB","RB"],["CB","LB"],["AM","LW"],["AM","RW"],
  ["AM","ST"],["DM","CB"],["LW","ST"],["RW","ST"]];
const LINE_ORDER={GK:0,DEF:1,MID:2,FWD:3};
function rolePenalty(sp,slotId){
  const role=roleOf(slotId);
  if(sp===role)return 0;
  if(sp==="GK"||role==="GK")return 12;
  if(POS_ZERO.some(g=>g.includes(sp)&&g.includes(role)))return 0;
  if(POS_CHEAP.some(g=>g.includes(sp)&&g.includes(role)))return 2;
  const a=LINE_OF[sp],b=LINE_OF[role];
  if(a===b)return 3;
  return Math.abs(LINE_ORDER[a]-LINE_ORDER[b])>=2?8:4;
}
const effRating=(p,slotId)=>Math.max(40,p.rating-rolePenalty(p.sp,slotId));

/* =========================================================
   LEADERSHIP — a hidden captaincy stat; the best captains drag
   a side through a long season.
========================================================= */
function leadOf(p){
  const h=hashStr(p.name);
  return 4+(h%7)+(p.rating>=90?2:p.rating>=86?1:0);
}
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function capLead(){
  const c=S.slots.find(s=>s.player&&s.id===S.captain);
  return c?Math.min(10,leadOf(c.player)):5;
}
function capName(){const c=S.slots.find(s=>s.player&&s.id===S.captain);return c?c.player.name:"—";}
const leadWord=l=>l>=10?"inspirational":l>=8?"a born leader":l>=6?"steady":"quiet";

/* =========================================================
   DRAFTING
========================================================= */
const picksLeft=()=>S.slots.filter(s=>!s.player).length+S.bench.filter(s=>!s.player).length;
const xiLeft=()=>S.slots.filter(s=>!s.player).length;
function needList(){
  const need={};S.slots.filter(s=>!s.player).forEach(s=>{need[s.cat]=(need[s.cat]||0)+1;});
  return need;
}
function needBench(){
  const need={};S.bench.filter(s=>!s.player).forEach(s=>{need[s.cat]=(need[s.cat]||0)+1;});
  return need;
}
const findSlot=id=>S.slots.find(s=>s.id===id)||S.bench.find(s=>s.id===id);
function draft(si,pi,key,slotId){
  const c=CLUBS[si],pl=c.p[pi];
  const slot=slotId?findSlot(slotId):S.slots.find(s=>!s.player&&s.cat===pl[1]);
  if(!slot||slot.player)return;
  slot.player={name:pl[0],rating:pl[2],sp:pl[3]||pl[1],nat:pl[4]||"",
    team:c.c,year:c.y,season:c.s,ab:c.ab,k:c.k,k2:c.k2,pat:c.pat,cat:pl[1],num:pi+1,sq:si};
  S.picked.add(key);
  {const st=store.get();
   st.albumSquads=st.albumSquads||{};st.albumPlayers=st.albumPlayers||{};
   st.albumSquads[c.c+"|"+c.s]=(st.albumSquads[c.c+"|"+c.s]||0)+1;
   st.albumPlayers[pl[0]+"|"+c.s]=(st.albumPlayers[pl[0]+"|"+c.s]||0)+1;
   store.set(st);}
  if(S.draft==="cap")S.budget-=pl[2];
  if(S.draft==="era")S.era=(S.era+1)%ERAS.length;
  $("modal-bg").classList.remove("on");
  renderPitch(slot.id);
  paintDraftMeta();
  $("picks-n").textContent=picksLeft();
  if(!xiLeft()&&picksLeft()&&!S._benchToldOnce){
    S._benchToldOnce=true;
    toast("Starting XI complete — now build the bench");
  }
  if(!picksLeft()){
    if(!S.captain){
      const best=S.slots.filter(s=>s.player).sort((a,b)=>leadOf(b.player)-leadOf(a.player))[0];
      S.captain=best.id;
    }
    $("btn-kickoff").disabled=false;
    $("btn-spin").disabled=true;$("btn-respin").disabled=true;
    $("landed").innerHTML=`<span class="reveal"><b>Squad complete ✓ — 11 + ${S.bench.length} subs</b></span>`;
    setTimeout(openCaptainSheet,350);
  }
}

function renderPitch(justFilled){
  const F=FORMATIONS[S.form],pitch=$("pitch");
  pitch.innerHTML=F.rows.map(row=>`<div class="prow">${row.map(id=>{
    const s=S.slots.find(x=>x.id===id),p=s.player;
    if(!p)return `<div class="slot empty${S.landedSquad!=null?" target":""}" data-slot="${id}">
        <div class="sid">${roleOf(id)}</div></div>`;
    const eff=effRating(p,id),pen=rolePenalty(p.sp,id);
    return `<div class="slot filled" data-slot="${id}">
      <div class="sid">${roleOf(id)}${S.captain===id?' <span style="color:var(--pink-hi)">C</span>':""}</div>
      ${shirt(p,20)}
      <div class="pn">${esc(shortName(p.name))}</div>
      <div class="pr ${tierOf(eff)}">${hidden()?"?":eff}${pen?` <span class="oop">-${pen}</span>`:""}</div>
    </div>`;}).join("")}</div>`).join("");
  pitch.querySelectorAll(".slot.empty").forEach(el=>el.onclick=()=>openSquad());
  pitch.querySelectorAll(".slot.filled").forEach(el=>el.onclick=()=>{
    S.captain=el.dataset.slot;renderPitch();toast("Captain: "+capName());});
  if(justFilled)pitch.querySelector(`[data-slot="${justFilled}"]`)?.classList.add("pop");
  renderBench();
}
function renderBench(){
  const el=$("bench");if(!el)return;
  el.innerHTML='<div class="bench-t">Bench</div><div class="bench-row">'+S.bench.map(b=>{
    if(!b.player)return `<div class="bslot empty"><span>${b.cat==="GK"?"GK":b.cat==="DEF"?"DF":b.cat==="MID"?"MF":"FW"}</span></div>`;
    return `<div class="bslot">${shirt(b.player,16)}<span>${esc(shortName(b.player.name).split(" ").pop())}</span></div>`;
  }).join("")+"</div>";
}
function shortName(n){
  const parts=n.split(" ");
  return parts.length>1&&n.length>13?parts[0][0]+". "+parts.slice(1).join(" "):n;
}
function shirt(p,size){
  const s=size||20, k=p.k, k2=p.k2||"#fff", pat=p.pat||"solid";
  const BODY="M8 2 4 4v5h3v13h10V9h3V4l-4-2-2 2h-4z";
  let detail="";
  if(pat==="sleeves")detail=`<path d="M8 2 4 4v5h3V4.6z" fill="${k2}"/><path d="M16 2 20 4v5h-3V4.6z" fill="${k2}"/>`;
  else if(pat==="stripes")detail=`<path d="M9.5 3.4h1.8V22H9.5zM12.9 3.4h1.8V22h-1.8z" fill="${k2}" opacity=".9"/>`;
  else if(pat==="hoops")detail=`<path d="M7 9.5h10v2.4H7zM7 14.5h10v2.4H7z" fill="${k2}" opacity=".9"/>`;
  return `<svg class="shirt" viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true">
    <g clip-path="url(#shc)"><clipPath id="shc"><path d="${BODY}"/></clipPath>
      <path d="${BODY}" fill="${k}"/>${detail}</g>
    <path d="${BODY}" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="1"/>
    <path d="M10 2.2c.6.8 1.2 1.2 2 1.2s1.4-.4 2-1.2" fill="none" stroke="${k2}" stroke-width="1.1"/></svg>`;
}
function paintDraftMeta(){
  const bits=[];
  if(S.draft==="cap")bits.push(`Budget <b>${S.budget}</b>`);
  if(S.draft==="era")bits.push(ERAS[Math.min(S.era,ERAS.length-1)][2]);
  if(S.draft==="dynasty")bits.push(S.dyn);
  const ch=teamChem();
  if(S.slots.some(s=>s.player))bits.push(`Chemistry <b>${ch}</b>`);
  $("draft-meta").innerHTML=bits.join(" · ");
}
