/* =========================================================
   TEAM STRENGTH
========================================================= */
function strengths(){
  const F=FORMATIONS[S.form];
  let att=0,mid=0,def=0,gk=70,na=0,nm=0,nd=0;
  S.slots.forEach(s=>{
    if(!s.player)return;
    const e=effRating(s.player,s.id);
    if(s.cat==="FWD"){att+=e;na++;}
    else if(s.cat==="MID"){mid+=e;nm++;}
    else if(s.cat==="DEF"){def+=e;nd++;}
    else gk=e;
  });
  att=na?att/na:70;mid=nm?mid/nm:70;def=nd?def/nd:70;
  const boost=chemBoost(),lead=capLead();
  return{
    att:att*0.62+mid*0.38+F.mod.att+boost+(lead-5)*0.22,
    def:def*0.60+gk*0.22+mid*0.18+F.mod.def+boost+(lead-5)*0.22,
    mid,gk,boost,
    get overall(){return(this.att+this.def)/2;}
  };
}

/* =========================================================
   COMMENTARY
========================================================= */
const C_GOAL=["buries it low into the corner!","rises highest and it's in!","picks the spot and finds it!",
  "smashes it in off the underside!","slides it under the keeper!","curls one into the top corner!",
  "taps in at the back post!","fires it through a crowd — goal!"];
const C_GOAL_BIG=["That is a goal worth the admission fee!","Oh, that is special. Absolutely unstoppable.",
  "The keeper didn't move. She didn't dare.","One touch, one look, one finish. Ruthless."];
const C_CONC=["gets in behind and finishes.","punishes a slack pass.","heads home from the corner.",
  "beats the offside trap and slots it.","rifles one in from the edge."];
const C_SAVE=["Huge save! Strong hand, out for a corner.","Somehow she keeps it out!","Point-blank — and saved!",
  "Tipped onto the post and away."];
const C_MISS=["drags it wide with the goal gaping.","hits the bar! Inches from that.",
  "sends it into the stand.","forces a save but can't beat the keeper."];
const C_NOTE=["The away end is in full voice.","A proper end-to-end spell here.",
  "This has become a midfield battle.","The tempo has dropped — both sides catching breath.",
  "The bench is up, screaming for pressure."];
const C_LATE=["Into six added minutes.","The fourth official signals five more.","We're deep into stoppage time."];
const C_TITLE=["The title is on the line here.","Win this and the trophy is theirs.",
  "You can feel the nerves in the ground."];

/* =========================================================
   ONE MATCH
========================================================= */
const COHESION=1.0;   // rivals are real squads who actually played together
function simMyMatch(rawOpp,home){
  const st=strengths(),oppStr=rawOpp+COHESION;
  const e=(st.att-oppStr+(home?2.2:0))/5, de=(oppStr-st.def+(home?0:2.2))/5;
  const lf=clamp(1.48+e*0.62,0.14,5), la=clamp(1.40+de*0.62,0.10,4.6);
  const gf=poisson(R,lf), ga=poisson(R,la);
  // when to score
  const mins=[];
  for(let i=0;i<gf;i++)mins.push({me:true,m:1+rnd(93)});
  for(let i=0;i<ga;i++)mins.push({me:false,m:1+rnd(93)});
  mins.sort((a,b)=>a.m-b.m);
  // who scores — weighted by attacking threat
  const out=S.slots.filter(s=>s.player);
  const weight=s=>{
    const e2=effRating(s.player,s.id);
    const w=s.cat==="FWD"?10:s.cat==="MID"?4:s.cat==="DEF"?1:0.05;
    return w*Math.pow(e2/80,3);
  };
  const pick=()=>{
    const tot=out.reduce((a,s)=>a+weight(s),0);
    let r=R()*tot;
    for(const s of out){r-=weight(s);if(r<=0)return s.player;}
    return out[0].player;
  };
  const events=[];
  for(const g of mins){
    if(g.me){
      const sc=pick();let as=null;
      if(R()<0.7){for(let t=0;t<6;t++){const c=pick();if(c!==sc){as=c;break;}}}
      S.goals[sc.name]=(S.goals[sc.name]||0)+1;
      if(as)S.assists[as.name]=(S.assists[as.name]||0)+1;
      events.push({m:g.m,cls:"goal",t:`⚽ <b>${esc(sc.name)}</b> ${pickFrom(C_GOAL)}${as?` <span class="dim">(${esc(shortName(as.name))})</span>`:""}`});
      if(sc.rating>=91&&R()<0.5)events.push({m:g.m,cls:"big",t:pickFrom(C_GOAL_BIG)});
    }else{
      events.push({m:g.m,cls:"conc",t:`⚽ Their number ${1+rnd(11)} ${pickFrom(C_CONC)}`});
    }
  }
  // colour: saves, misses, notes
  const filler=2+rnd(3);
  for(let i=0;i<filler;i++){
    const m=1+rnd(93),r=R();
    const t=r<0.34?pickFrom(C_SAVE):r<0.7?`<b>${esc(shortName(pick().name))}</b> ${pickFrom(C_MISS)}`:pickFrom(C_NOTE);
    events.push({m,cls:"",t});
  }
  events.sort((a,b)=>a.m-b.m);
  return{gf,ga,events};
}

/* =========================================================
   SEASON FLOW
========================================================= */
const SPEEDS=[{n:"Normal",ms:520},{n:"Fast",ms:250},{n:"Instant",ms:0}];
function myFixture(md){
  const pair=S.season.fx[md].find(([a,b])=>a===0||b===0);
  const home=pair[0]===0;
  return{opp:pair[home?1:0],home};
}
function startSeason(){
  S.season.rivals=pickRivals(S.seed,S.poolMode,S.diff);
  S.season.fx=fixtures(S.seed);
  S.season.ai=simRivalLeague(S.seed,S.season.rivals);
  S.season.md=0;S.season.matches=[];S.season.done=false;
  show("season");
  paintMatchday();
}
function myName(){
  const n=store.get().playerName;
  return n?n+"'s XI":"Your XI";
}
function rowName(r){
  if(r.you)return myName();
  const c=CLUBS[S.season.rivals[r.i-1]];
  return (c.sh||c.c)+' <span class="yr">'+c.s+"</span>";
}

function paintMatchday(){
  const md=S.season.md;
  if(md>=MATCHDAYS)return finishSeason();
  const{opp,home}=myFixture(md),c=CLUBS[S.season.rivals[opp-1]];
  $("md-label").textContent=`Matchday ${md+1} of ${MATCHDAYS}`;
  $("mdbar").firstElementChild.style.width=(md/MATCHDAYS*100)+"%";
  $("fx-ha").textContent=home?"Home":"Away";
  $("fx-home").innerHTML=home?`${esc(myName())}`:`${esc(c.c)}<span class="yr">${esc(c.s)}</span>`;
  $("fx-away").innerHTML=home?`${esc(c.c)}<span class="yr">${esc(c.s)}</span>`:`${esc(myName())}`;
  $("fx-score").textContent="– –";
  $("clock").textContent="";
  $("feed").innerHTML=md===0&&c.l?`<div class="opplore">${esc(c.l)}</div>`:"";
  $("btn-next").textContent=md===0?"Kick off ⚽":"Play matchday "+(md+1)+" →";
  $("btn-next").disabled=false;
  paintTable();
  paintPos();
}
function paintPos(){
  const t=buildTable(S.season.matches,S.seed,S.poolMode,S.diff);
  const me=t.find(x=>x.you),pos=t.findIndex(x=>x.you)+1;
  $("md-pos").innerHTML=S.season.matches.length
    ? `<span class="pill pink">${ord(pos)}</span> <span class="mono">${me.pts} pts</span>` : "";
  return{t,pos,me};
}
const ord=n=>n+(n%10===1&&n!==11?"st":n%10===2&&n!==12?"nd":n%10===3&&n!==13?"rd":"th");

async function playMatchday(){
  if(S.season.playing)return;
  S.season.playing=true;
  $("btn-next").disabled=true;
  const md=S.season.md,{opp,home}=myFixture(md);
  const c=CLUBS[S.season.rivals[opp-1]];
  const r=simMyMatch(CS[S.season.rivals[opp-1]][0],home);
  const ms=SPEEDS[S.speed].ms;
  const feed=$("feed");feed.innerHTML="";
  let gf=0,ga=0;
  const setScore=()=>$("fx-score").textContent=home?`${gf} – ${ga}`:`${ga} – ${gf}`;
  setScore();
  // title-race tension in the run-in
  if(md>=MATCHDAYS-3){
    const{pos}=paintPos();
    if(pos<=2)feed.innerHTML=`<div class="opplore">${pickFrom(C_TITLE)}</div>`;
  }
  for(const ev of r.events){
    if(ms){
      $("clock").textContent=`${ev.m}'`;
      await wait(ms);
    }
    if(ev.cls==="goal")gf++;
    if(ev.cls==="conc")ga++;
    setScore();
    const d=document.createElement("div");
    d.className="ev "+ev.cls;
    d.innerHTML=`<span class="min">${ev.m}'</span>${ev.t}`;
    feed.appendChild(d);
    feed.scrollTop=feed.scrollHeight;
  }
  gf=r.gf;ga=r.ga;setScore();
  if(ms)$("clock").textContent="Full time";
  const verdict=gf>ga?"Win":gf===ga?"Draw":"Defeat";
  const d=document.createElement("div");
  d.className="ev "+(gf>ga?"goal":gf===ga?"":"conc");
  d.innerHTML=`<b>Full time — ${verdict}</b> vs ${esc(c.c)} ${esc(c.s)}`;
  feed.appendChild(d);

  S.season.matches.push({gf,ga});
  S.season.md++;
  paintTable();
  const{pos}=paintPos();
  $("mdbar").firstElementChild.style.width=(S.season.md/MATCHDAYS*100)+"%";
  S.season.playing=false;
  if(S.season.md>=MATCHDAYS){
    $("btn-next").textContent="See how it ended →";
    $("btn-next").disabled=false;
  }else{
    $("btn-next").textContent="Next match →";
    $("btn-next").disabled=false;
  }
}
const wait=ms=>new Promise(r=>setTimeout(r,ms));

function paintTable(){
  const rows=buildTable(S.season.matches,S.seed,S.poolMode,S.diff);
  const myPos=rows.findIndex(r=>r.you);
  // mini table: top 5 plus you
  let showIdx=[0,1,2,3,4];
  if(myPos>4)showIdx.push(myPos);
  const html=`<table class="tbl"><thead><tr><th></th><th>Club</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead><tbody>
    ${showIdx.map(i=>tableRow(rows[i],i,rows)).join("")}</tbody></table>`;
  $("mini-table").innerHTML=html;
  // other results for the last completed matchday
  const md=S.season.md-1;
  if(md>=0){
    $("other-results").innerHTML=S.season.ai[md].map(r=>{
      const a=CLUBS[S.season.rivals[r.a-1]],b=CLUBS[S.season.rivals[r.b-1]];
      return `<span class="res">${esc(a.ab)} ${r.ga}-${r.gb} ${esc(b.ab)}</span>`;
    }).join("");
  }else $("other-results").innerHTML="";
  S.season.lastPos=myPos;
}
function tableRow(r,i,rows){
  const cls=[r.you?"you":"",i<3?"ucl":"",i>=rows.length-2?"rel":""].filter(Boolean).join(" ");
  const gd=r.gf-r.ga;
  return `<tr class="${cls}"><td>${i+1}</td><td><span class="cn">${rowName(r)}</span></td>
    <td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td>
    <td>${gd>0?"+":""}${gd}</td><td class="pts">${r.pts}</td></tr>`;
}
function fullTable(){
  const rows=buildTable(S.season.matches,S.seed,S.poolMode,S.diff);
  openSheet(`<div class="sheet-head"><h2 style="margin:0">Table</h2>
    <button class="pill grey" onclick="closeSheet()">Close</button></div>
    <table class="tbl"><thead><tr><th></th><th>Club</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>Pts</th></tr></thead>
    <tbody>${rows.map((r,i)=>{
      const cls=[r.you?"you":"",i<3?"ucl":"",i>=rows.length-2?"rel":""].filter(Boolean).join(" ");
      return `<tr class="${cls}"><td>${i+1}</td><td><span class="cn">${rowName(r)}</span></td>
        <td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gf}</td><td>${r.ga}</td>
        <td class="pts">${r.pts}</td></tr>`;}).join("")}</tbody></table>
    <p class="xs dim" style="margin-top:10px">Top 3 qualify for the Champions League · bottom 2 relegated</p>`);
}

/* =========================================================
   AWARDS + FINISH
========================================================= */
function awards(){
  const g=Object.entries(S.goals).sort((a,b)=>b[1]-a[1]);
  const boot=g.length?{name:g[0][0],g:g[0][1],a:S.assists[g[0][0]]||0}:null;
  // holistic player of the season
  let best=null,bs=-1;
  S.slots.filter(s=>s.player).forEach(s=>{
    const p=s.player,gl=S.goals[p.name]||0,as=S.assists[p.name]||0;
    const cs=S.season.matches.filter(m=>m.ga===0).length;
    const sc=gl*4+as*2.4+(s.cat==="DEF"?cs*1.6:s.cat==="GK"?cs*2.2:0)
      +effRating(p,s.id)*0.06+(S.captain===s.id?1+leadOf(p)*0.2:0);
    if(sc>bs){bs=sc;best=p.name;}
  });
  // league golden boot race — deterministic rival benchmark
  const rng=mulberry32((S.seed^0x1d872b41)>>>0);
  const bench=11+Math.floor(rng()*11);
  return{boot,pots:best,bench,cs:S.season.matches.filter(m=>m.ga===0).length};
}

function finishSeason(){
  S.season.done=true;
  const flags={draft:S.draft,diff:S.diff,daily:S.daily,pool:S.poolMode,form:S.form,dyn:S.dyn,
               seed:S.seed,day:utcDay()};
  const r=scoreSeason(S.season.matches,flags);
  S.result=r;
  const aw=awards();
  $("r-verdict").innerHTML=r.perfect?'22<b>-</b>0':r.champion?"CHAMPIONS":esc(ord(r.pos));
  $("r-sub").textContent=
      r.perfect  ? "The perfect season. Nobody has ever done it."
    : r.champion ? (r.unbeaten?"Champions — and unbeaten":"Champions of England")
    : r.unbeaten ? "Unbeaten all season — but not champions"
    : r.pos<=3   ? "Champions League football"
    : r.pos<=6   ? "A good season, just short of Europe"
    : r.pos<=10  ? "A season in the middle"
    :              "Relegated";
  $("r-pos").textContent=ord(r.pos)+" of 12";
  $("r-record").textContent=`W${r.w} D${r.d} L${r.l} · ${r.gf}:${r.ga}`;
  $("r-lpts").textContent=r.lpts+" pts";
  $("r-score").textContent=r.pts.toLocaleString();
  const mb=[];
  if(DIFF_MULT[S.diff]!==1)mb.push(`${DRAFT_MODES[S.draft]?"":""}${S.diff} ×${DIFF_MULT[S.diff]}`);
  if(DRAFT_MULT[S.draft]!==1)mb.push(`${DRAFT_MODES[S.draft].n} ×${DRAFT_MULT[S.draft]}`);
  if(POOL_MULT[S.poolMode]!==1)mb.push(`${POOLS[S.poolMode].n} ×${POOL_MULT[S.poolMode]}`);
  if(S.daily)mb.push("Daily ×1.1");
  if(r.feat)mb.push("⭐ Featured ×1.15");
  $("r-mult").textContent=mb.length?mb.join(" · "):"";

  $("r-table").innerHTML=`<table class="tbl"><thead><tr><th></th><th>Club</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead>
    <tbody>${r.table.map((row,i)=>tableRow(row,i,r.table)).join("")}</tbody></table>`;

  const awHTML=[];
  if(aw.boot)awHTML.push(awRow("Your top scorer",`${aw.boot.name} — ${aw.boot.g} goals${aw.boot.a?` (${aw.boot.a} assists)`:""}`));
  if(aw.boot&&aw.boot.g>=aw.bench)awHTML.push(awRow("🥇 WSL Golden Boot",`${aw.boot.name} wins it (beat ${aw.bench})`));
  else awHTML.push(awRow("WSL Golden Boot","Won elsewhere on "+aw.bench+" goals"));
  if(aw.pots)awHTML.push(awRow("Player of the season",aw.pots));
  awHTML.push(awRow("Clean sheets",aw.cs+" of "+MATCHDAYS));
  $("r-awards").innerHTML=awHTML.join("");

  $("r-xi").innerHTML=S.slots.filter(s=>s.player).map(s=>{
    const p=s.player,gl=S.goals[p.name]||0;
    return `<div class="prow2" style="cursor:default">${shirt(p,20)}
      <div class="nm"><b>${esc(p.name)}</b><span>${roleOf(s.id)} · ${esc(p.team)} ${esc(p.season)}${S.captain===s.id?" · captain":""}</span></div>
      <div class="rt">${gl?"⚽"+gl:""}</div></div>`;}).join("");

  paintChallengeResult(r);
  awardBadges(r,aw);
  recordRun(r,aw);
  show("result");
  if(r.champion)confetti();
  autoSubmit(r);
}
const awRow=(t,n)=>`<div class="award"><div style="flex:1"><div class="aw-t">${t}</div><div class="aw-n">${esc(n)}</div></div></div>`;

/* =========================================================
   BADGES + LOCAL RECORD
========================================================= */
const BADGES=[
  {id:"first",n:"First season",d:"Finish a season"},
  {id:"champ",n:"Champions",d:"Win the WSL"},
  {id:"unbeaten",n:"Invincible",d:"A season without defeat"},
  {id:"perfect",n:"22-0",d:"Win all 22"},
  {id:"treble",n:"Three in a row",d:"Win the title three runs running"},
  {id:"boot",n:"Golden Boot",d:"One of yours wins the league's scoring race"},
  {id:"fort",n:"Fortress",d:"10+ clean sheets"},
  {id:"century",n:"Century",d:"Score 60+ league goals"},
  {id:"chem",n:"Telepathy",d:"Chemistry of 24 or more"},
  {id:"streak7",n:"Regular",d:"A 7-day streak"}
];
function awardBadges(r,aw){
  const st=store.get(),got=[];
  const give=id=>{if(!st.badges[id]){st.badges[id]=1;got.push(id);}};
  give("first");
  if(r.champion)give("champ");
  if(r.unbeaten)give("unbeaten");
  if(r.perfect)give("perfect");
  if(aw.boot&&aw.boot.g>=aw.bench)give("boot");
  if(aw.cs>=10)give("fort");
  if(r.gf>=60)give("century");
  if(teamChem()>=24)give("chem");
  if(st.streak>=7)give("streak7");
  store.set(st);
  $("r-badges").innerHTML=got.length
    ? `<div class="card"><h3 style="margin-top:0">Unlocked</h3>${got.map(id=>{
        const b=BADGES.find(x=>x.id===id);
        return `<div class="award"><div style="flex:1"><div class="aw-n">🏅 ${b.n}</div><div class="aw-t">${b.d}</div></div></div>`;
      }).join("")}</div>` : "";
}
function recordRun(r,aw){
  const st=store.get(),today=utcDay();
  st.runs++;
  if(r.champion)st.titles++;
  if(r.unbeaten)st.unbeatens++;
  if(r.perfect)st.perfects++;
  st.bestPts=Math.max(st.bestPts,r.pts);
  st.bestLpts=Math.max(st.bestLpts,r.lpts);
  st.goals+=r.gf;
  if(aw.boot)st.topScorers[aw.boot.name]=(st.topScorers[aw.boot.name]||0)+aw.boot.g;
  if(S.daily){
    const y=new Date(Date.now()-864e5).toISOString().slice(0,10);
    st.streak=st.lastDaily===y?st.streak+1:st.lastDaily===today?st.streak:1;
    st.lastDaily=today;
  }
  st.lastRun=today;
  store.set(st);
}

/* =========================================================
   SUBMIT
========================================================= */
async function autoSubmit(r){
  if(S.submitted)return;S.submitted=true;
  const st=store.get();
  if(!st.playerName)return;
  const body={
    name:st.playerName,country:st.playerCountry,
    matches:S.season.matches,seed:S.seed,
    draft:S.draft,diff:S.diff,pool:S.poolMode,form:S.form,dyn:S.dyn,daily:S.daily,
    xi:S.slots.filter(s=>s.player).map(s=>[s.player.name,s.player.year,s.player.ab]),
    token:S.token,web:$("in-web")?.value||""
  };
  if(st.optin&&st.playerEmail&&!st.emailSent){body.email=st.playerEmail;body.optin=true;}
  try{
    const j=await apiPost("/api/score",body);
    if(j&&j.ok){
      if(body.email){const s2=store.get();s2.emailSent=1;store.set(s2);}
      if(j.rank)toast(`Saved — #${j.rank} all-time 🌍`);
      else toast("Saved to the leaderboard ✓");
      if(j.pts&&Math.abs(j.pts-r.pts)>1)console.warn("score mismatch",j.pts,r.pts);
    }else if(j&&j.err)console.warn("submit rejected:",j.err);
  }catch(e){}
}

/* =========================================================
   CHALLENGE LINKS — same seed, same rules, same league
========================================================= */
let ACTIVE_CH=null;
function challengeLink(){
  const r=S.result;
  const p=[S.seed.toString(16),r.pts,S.draft,S.diff,S.poolMode,S.form].join("-");
  const st=store.get();
  return `${SITE_URL}/?c=${p}&by=${encodeURIComponent(st.playerName||"a manager")}${S.dyn?"&dyn="+encodeURIComponent(S.dyn):""}`;
}
function parseChallengeURL(){
  const u=new URLSearchParams(location.search),c=u.get("c");
  if(!c)return;
  const[seed,pts,draft,diff,pool,form]=c.split("-");
  if(!seed||!form||!FORMATIONS[form])return;
  const ch={seed:parseInt(seed,16),pts:+pts||0,draft,diff,pool,form,
            by:u.get("by")||"a manager",dyn:u.get("dyn")||null};
  try{localStorage.setItem("twentytwo_challenge",JSON.stringify(ch));}catch(e){}
  history.replaceState(null,"",location.pathname);
}
function getChallenge(){
  try{return JSON.parse(localStorage.getItem("twentytwo_challenge"));}catch(e){return null;}
}
function paintChallenge(){
  const ch=getChallenge(),el=$("chbanner");
  if(!ch){el.style.display="none";return;}
  el.style.display="";
  el.innerHTML=`<div><b>${esc(ch.by)}</b> scored <b>${ch.pts.toLocaleString()}</b> and dares you to beat it.</div>
    <div class="xs dim" style="margin-top:4px">Same league, same rivals, same rules: ${esc(ch.form)} · ${esc(ch.draft)} · ${esc(ch.diff)}</div>
    <div class="row" style="margin-top:9px">
      <button class="btn sm" id="ch-accept" style="margin:0">Accept the challenge</button>
      <button class="btn ghost sm" id="ch-clear" style="margin:0">Dismiss</button></div>`;
  $("ch-accept").onclick=acceptChallenge;
  $("ch-clear").onclick=()=>{localStorage.removeItem("twentytwo_challenge");paintChallenge();};
}
function acceptChallenge(){
  const ch=getChallenge();if(!ch)return;
  ACTIVE_CH=ch;
  pref={form:ch.form,draft:ch.draft,diff:ch.diff,pool:ch.pool,dyn:ch.dyn};
  RUN_SEED=ch.seed;
  localStorage.removeItem("twentytwo_challenge");
  beginRun(true);
}
function paintChallengeResult(r){
  const el=$("r-challenge");
  if(!ACTIVE_CH){el.innerHTML="";return;}
  const beat=r.pts>ACTIVE_CH.pts;
  el.innerHTML=`<div class="card" style="border-color:${beat?"var(--mint)":"var(--loss)"}">
    <b>${beat?"Challenge beaten 🎉":"Challenge not beaten"}</b>
    <div class="sm dim">${esc(ACTIVE_CH.by)} scored ${ACTIVE_CH.pts.toLocaleString()} — you scored ${r.pts.toLocaleString()}.</div></div>`;
}
function shareChallenge(){
  const txt=`I scored ${S.result.pts.toLocaleString()} in 22-0 — same league, same rivals. Beat it:\n${challengeLink()}`;
  if(navigator.share)navigator.share({title:"22-0",text:txt}).catch(()=>{});
  else navigator.clipboard?.writeText(txt).then(()=>toast("Challenge link copied ✓"));
}

/* =========================================================
   SHARE
========================================================= */
function shareText(){
  const r=S.result;
  const head=r.perfect?"22-0. THE PERFECT SEASON 🏆":r.champion?"CHAMPIONS OF ENGLAND 🏆":
    r.unbeaten?"Unbeaten all season":`Finished ${ord(r.pos)}`;
  const grid=S.season.matches.map(m=>m.gf>m.ga?"🟩":m.gf===m.ga?"⬜":"🟥").join("");
  return `22-0 — ${head}\n${grid}\nW${r.w} D${r.d} L${r.l} · ${r.lpts} pts · ${r.pts.toLocaleString()} points\n🎯 Beat my season: ${challengeLink()}`;
}
async function doShare(){
  const txt=shareText();
  try{
    const blob=await renderShareCard();
    if(blob&&navigator.canShare&&navigator.canShare({files:[new File([blob],"22-0.png",{type:"image/png"})]})){
      await navigator.share({files:[new File([blob],"22-0.png",{type:"image/png"})],text:txt});
      return;
    }
    if(blob){
      const a=document.createElement("a");
      a.href=URL.createObjectURL(blob);a.download="22-0.png";a.click();
      navigator.clipboard?.writeText(txt);toast("Image saved, text copied ✓");return;
    }
  }catch(e){}
  if(navigator.share)navigator.share({title:"22-0",text:txt}).catch(()=>{});
  else navigator.clipboard?.writeText(txt).then(()=>toast("Copied ✓"));
}
function rr(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function renderShareCard(){
  return new Promise(res=>{
    const r=S.result,W=1080,H=1350;
    const cv=document.createElement("canvas");cv.width=W;cv.height=H;
    const x=cv.getContext("2d");
    const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,"#2b1450");g.addColorStop(1,"#0d0318");
    x.fillStyle=g;x.fillRect(0,0,W,H);
    x.textAlign="center";
    x.fillStyle="#f6eefe";x.font="900 108px -apple-system,Segoe UI,Roboto,sans-serif";
    x.fillText("22",W/2-46,150);
    x.fillStyle="#ff3d7f";x.fillText("-",W/2+40,150);
    x.fillStyle="#f6eefe";x.fillText("0",W/2+96,150);
    x.font="600 26px -apple-system,Segoe UI,Roboto,sans-serif";x.fillStyle="#b9a8cc";
    x.fillText("BUILD THE ULTIMATE WSL XI",W/2,196);
    const head=r.perfect?"THE PERFECT SEASON":r.champion?"CHAMPIONS":r.unbeaten?"UNBEATEN":ord(r.pos)+" PLACE";
    x.font="900 68px -apple-system,Segoe UI,Roboto,sans-serif";x.fillStyle=r.champion?"#ff3d7f":"#f6eefe";
    x.fillText(head,W/2,300);
    x.font="900 128px -apple-system,Segoe UI,Roboto,sans-serif";x.fillStyle="#f6eefe";
    x.fillText(r.pts.toLocaleString(),W/2,440);
    x.font="600 30px -apple-system,Segoe UI,Roboto,sans-serif";x.fillStyle="#b9a8cc";
    x.fillText(`W${r.w}  D${r.d}  L${r.l}   ·   ${r.lpts} league points`,W/2,490);
    // result grid
    const cols=11,cw=76,ch=30,gx=(W-cols*cw)/2;
    S.season.matches.forEach((m,i)=>{
      const cx=gx+(i%cols)*cw,cy=540+Math.floor(i/cols)*(ch+10);
      x.fillStyle=m.gf>m.ga?"#52e6c4":m.gf===m.ga?"#a99bb8":"#ff6b5a";
      rr(x,cx+4,cy,cw-8,ch,7);x.fill();
    });
    // XI
    let y=660;
    x.font="700 24px -apple-system,Segoe UI,Roboto,sans-serif";
    S.slots.filter(s=>s.player).forEach((s,i)=>{
      const p=s.player,col=i%2,row=Math.floor(i/2);
      const bx=90+col*460,by=y+row*74;
      x.fillStyle="rgba(255,255,255,.06)";rr(x,bx,by,430,60,12);x.fill();
      x.fillStyle=p.k;rr(x,bx+14,by+14,32,32,7);x.fill();
      x.textAlign="left";x.fillStyle="#f6eefe";x.font="700 23px -apple-system,Segoe UI,Roboto,sans-serif";
      x.fillText(p.name.slice(0,20),bx+60,by+30);
      x.fillStyle="#b9a8cc";x.font="500 18px -apple-system,Segoe UI,Roboto,sans-serif";
      x.fillText(`${roleOf(s.id)} · ${p.team} ${p.season}`,bx+60,by+50);
      x.textAlign="center";
    });
    x.textAlign="center";x.fillStyle="#b9a8cc";x.font="600 26px -apple-system,Segoe UI,Roboto,sans-serif";
    x.fillText("twentytwo.app",W/2,H-52);
    cv.toBlob(b=>res(b),"image/png");
  });
}
function confetti(){
  if(reducedMotion)return;
  const cv=document.createElement("canvas");
  cv.style.cssText="position:fixed;inset:0;pointer-events:none;z-index:90";
  cv.width=innerWidth;cv.height=innerHeight;document.body.appendChild(cv);
  const x=cv.getContext("2d"),cols=["#ff3d7f","#52e6c4","#ffa8c6","#f6eefe"];
  const bits=Array.from({length:110},()=>({x:Math.random()*cv.width,y:-20-Math.random()*cv.height,
    vy:2+Math.random()*4,vx:-1+Math.random()*2,s:5+Math.random()*7,c:cols[Math.floor(Math.random()*4)],
    r:Math.random()*6}));
  let t=0;
  (function loop(){
    t++;x.clearRect(0,0,cv.width,cv.height);
    bits.forEach(b=>{b.y+=b.vy;b.x+=b.vx;b.r+=0.1;
      x.save();x.translate(b.x,b.y);x.rotate(b.r);x.fillStyle=b.c;x.fillRect(-b.s/2,-b.s/2,b.s,b.s*0.6);x.restore();});
    if(t<190)requestAnimationFrame(loop);else cv.remove();
  })();
}

/* =========================================================
   PLAYER PICKER
========================================================= */
function openSheet(html){$("sheet").innerHTML=html;$("modal-bg").classList.add("on");}
function closeSheet(){$("modal-bg").classList.remove("on");}
function openPicker(slotId){
  if(S.landedSquad==null){toast("Draw a squad first");return;}
  const si=S.landedSquad,c=CLUBS[si];
  const need=needList();
  const needTxt=Object.entries(need).map(([k,v])=>`<b>${v}</b> ${k}`).join(" · ");
  const rows=c.p.map((p,pi)=>{
    const key=si+":"+pi,taken=S.picked.has(key);
    const cap=S.draft==="cap"&&p[2]>S.budget-CAP_FLOOR*(picksLeft()-1);
    const eff=slotId?Math.max(40,p[2]-rolePenalty(p[3]||p[1],slotId)):p[2];
    const pen=slotId?rolePenalty(p[3]||p[1],slotId):0;
    return `<div class="prow2${taken||cap?" off":""}" data-pi="${pi}">
      ${shirt({k:c.k,k2:c.k2},20)}
      <div class="nm"><b>${esc(p[0])}</b><span>${p[3]||p[1]}${p[4]?" · "+esc(p[4]):""}${taken?" · already picked":cap?" · over budget":""}</span></div>
      <div class="rt ${tierOf(eff)}">${hidden()?"?":eff}${pen?`<span class="oop"> -${pen}</span>`:""}</div></div>`;
  }).join("");
  openSheet(`<div class="sheet-head">
      <div><h2 style="margin:0">${esc(c.c)} ${esc(c.s)}</h2>
      <div class="xs dim">Choosing for <b style="color:var(--pink-hi)">${roleOf(slotId)}</b></div></div>
      <button class="pill grey" onclick="closeSheet()">Close</button></div>
    <div class="needlist">Still to fill: ${needTxt}</div>
    <div class="plist">${rows}</div>`);
  $("sheet").querySelectorAll(".prow2:not(.off)").forEach(el=>{
    el.onclick=()=>{
      const pi=+el.dataset.pi;
      draft(si,pi,si+":"+pi,slotId);
      S.landedSquad=null;
      $("btn-spin").disabled=picksLeft()===0;
      renderPitch();
    };
  });
}

/* =========================================================
   DRAW SCREEN
========================================================= */
function doSpin(isRespin){
  if(S.spinning||!picksLeft())return;
  S.spinning=true;
  $("btn-spin").disabled=true;$("btn-respin").disabled=true;
  $("landed").classList.remove("pop");
  $("landed").innerHTML=`<span class="prompt">Drawing…</span>`;
  const idx=poolIdx();
  const winner=idx[Math.floor(R()*idx.length)];
  const stopAt=buildReel(winner);
  spinReel(stopAt,()=>{
    S.spinning=false;S.landedSquad=winner;S.lastSquad=winner;
    const c=CLUBS[winner];
    const l=$("landed");
    l.innerHTML=`<span class="reveal">${esc(c.c)} <span class="dim">${esc(c.s)}</span></span>`;
    l.classList.add("pop");
    if(c.l)$("draft-meta").innerHTML=`<span class="xs dim" style="font-style:italic">${esc(c.l)}</span>`;
    setTimeout(paintDraftMeta,3200);
    $("btn-spin").disabled=true;
    $("btn-respin").disabled=S.respins<=0;
    renderPitch();
    toast("Tap a shirt on the pitch to place a player");
  });
}
function doRespin(){
  if(S.respins<=0||S.spinning)return;
  S.respins--;$("respins").textContent=S.respins;
  S.landedSquad=null;
  doSpin(true);
}

/* =========================================================
   WIZARD
========================================================= */
let WIZ={step:0,daily:true};
const WIZ_STEPS=[
  {k:"form",t:"Pick your formation",b:"Shapes change how your XI attacks and defends.",
   opts:()=>Object.entries(FORMATIONS).map(([k,v])=>({v:k,n:k,d:v.blurb}))},
  {k:"draft",t:"Pick a draft mode",b:"How the squads come to you.",
   opts:()=>Object.entries(DRAFT_MODES).map(([k,v])=>({v:k,n:v.n,d:v.d,m:DRAFT_MULT[k]}))},
  {k:"diff",t:"Pick a difficulty",b:"Harder leagues mean better rivals — and bigger scores.",
   opts:()=>[{v:"classic",n:"Classic",d:"ratings shown",m:1},
             {v:"hard",n:"Hard",d:"ratings hidden, stronger league",m:1.3},
             {v:"legend",n:"Legend",d:"the best clubs, every week",m:1.7}]},
  {k:"pool",t:"Pick a player pool",b:"Which slice of WSL history you draft from.",
   opts:()=>Object.entries(POOLS).map(([k,v])=>({v:k,n:v.n,d:v.d,m:POOL_MULT[k]}))}
];
function openWizard(daily){
  WIZ={step:0,daily:!!daily};
  show("wiz");paintWizard();
}
function paintWizard(){
  // Dynasty needs a club choice; slot it in after the draft step
  const steps=WIZ_STEPS.filter(s=>!(s.k==="pool"&&pref.draft==="dynasty"));
  const dyn=pref.draft==="dynasty";
  const total=steps.length+(dyn?1:0);
  if(WIZ.step>=total)return startSignupOrRun();
  let step,isDyn=false;
  if(dyn&&WIZ.step===2){isDyn=true;}
  else step=steps[WIZ.step>2&&dyn?WIZ.step-1:WIZ.step];
  $("wiz-step").textContent=`Step ${WIZ.step+1} of ${total}`;
  if(isDyn){
    $("wiz-title").textContent="Pick your club";
    $("wiz-blurb").textContent="Dynasty: every season that club has played in the WSL.";
    $("wiz-opts").innerHTML=DYNASTIES.map(([c,v])=>
      `<button class="optbtn${pref.dyn===c?" on":""}" data-v="${esc(c)}">${esc(c)}<span>${v.length} seasons</span></button>`).join("");
    $("wiz-opts").querySelectorAll(".optbtn").forEach(el=>el.onclick=()=>{
      pref.dyn=el.dataset.v;WIZ.step++;paintWizard();});
  }else{
    $("wiz-title").textContent=step.t;
    $("wiz-blurb").textContent=step.b;
    $("wiz-opts").innerHTML=step.opts().map(o=>
      `<button class="optbtn${pref[step.k]===o.v?" on":""}" data-v="${esc(o.v)}">${esc(o.n)}
        <span>${esc(o.d)}${o.m&&o.m!==1?` · ×${o.m}`:""}</span></button>`).join("");
    $("wiz-opts").querySelectorAll(".optbtn").forEach(el=>el.onclick=()=>{
      pref[step.k]=el.dataset.v;
      if(step.k==="draft"&&el.dataset.v!=="dynasty")pref.dyn=null;
      WIZ.step++;paintWizard();});
  }
  const m=(DIFF_MULT[pref.diff]||1)*(DRAFT_MULT[pref.draft]||1)*(POOL_MULT[pref.pool]??1)*(WIZ.daily?1.1:1);
  $("wiz-mult").textContent=`Score multiplier so far ×${m.toFixed(2)}`;
}
function startSignupOrRun(){
  const st=store.get();
  if(!st.playerName)show("signup");
  else beginRun(WIZ.daily);
}

/* =========================================================
   RUN START
========================================================= */
async function beginRun(daily){
  const st=store.get();
  if(daily&&st.lastDaily===utcDay()&&!ACTIVE_CH){
    toast("You've played today's season — come back tomorrow 🔥");
    show("home");return;
  }
  resetState(daily);
  S.speed=1;
  $("respins").textContent=S.respins;
  $("picks-n").textContent=picksLeft();
  $("btn-kickoff").disabled=true;
  $("btn-spin").disabled=false;$("btn-respin").disabled=true;
  $("draw-mode").textContent=`${S.form} · ${DRAFT_MODES[S.draft].n} · ${S.diff}${S.dyn?" · "+S.dyn:""}`;
  $("landed").innerHTML=`<span class="prompt">Draw a squad to begin</span>`;
  $("reel-track").innerHTML="";
  renderPitch();paintDraftMeta();
  show("draw");
  try{
    const j=await API("/api/token");
    S.token=j&&j.t?j:null;
  }catch(e){S.token=null;}
}

/* =========================================================
   LEADERBOARD
========================================================= */
let BOARD="alltime";
async function loadBoard(kind,into){
  BOARD=kind||BOARD;
  const el=into||$("board-list");
  el.innerHTML='<div class="dim sm">Loading…</div>';
  try{
    const j=await API("/api/leaderboard?board="+BOARD+"&v="+Date.now());
    const me=store.get().playerName.toLowerCase();
    if(!j.top||!j.top.length){el.innerHTML='<div class="dim sm">Nobody yet. Be first.</div>';return;}
    el.innerHTML=j.top.map((e,i)=>{
      const mine=e.n.toLowerCase()===me;
      const val=BOARD==="streaks"?`🔥 ${e.streak}`:e.p.toLocaleString();
      const sub=BOARD==="streaks"?`${e.days} days · ${(e.tp||0).toLocaleString()} pts`:esc(e.m||"");
      return `<div class="lb-row${mine?" me":""}"><div class="rk">${i+1}</div>
        <div class="who"><b>${esc(e.n)}</b>${e.c?` <span class="xs dim">${esc(e.c)}</span>`:""}
          <div class="xs dim">${sub}</div></div>
        <div class="pt">${val}</div></div>`;}).join("");
  }catch(e){el.innerHTML='<div class="dim sm">Leaderboard unavailable right now.</div>';}
}
function paintHomeBoard(){
  const el=$("home-board");
  el.innerHTML='<h3 style="margin-top:0">Top seasons</h3><div class="dim sm">Loading…</div>';
  API("/api/leaderboard?board=alltime").then(j=>{
    const rows=(j.top||[]).slice(0,5);
    el.innerHTML='<h3 style="margin-top:0">Top seasons</h3>'+(rows.length
      ? rows.map((e,i)=>`<div class="lb-row"><div class="rk">${i+1}</div>
          <div class="who"><b>${esc(e.n)}</b></div><div class="pt">${e.p.toLocaleString()}</div></div>`).join("")
      : '<div class="dim sm">Nobody yet. Be first.</div>');
  }).catch(()=>{el.innerHTML="";});
}

/* =========================================================
   ALBUM
========================================================= */
function openAlbum(){
  const st=store.get(),sq=st.albumSquads||{};
  const got=Object.keys(sq).length;
  $("album-progress").innerHTML=`<div class="kv"><div><b>${got}</b> of ${CLUBS.length} club-seasons</div>
    <div class="pill pink">${Math.round(got/CLUBS.length*100)}%</div></div>
    <div class="xs dim" style="margin-top:6px">Every squad you have drafted from, ever.</div>`;
  const byEra={};
  CLUBS.forEach((c,i)=>{
    const e=ERAS.find(([a,b])=>c.y>=a&&c.y<=b)||ERAS[ERAS.length-1];
    (byEra[e[2]]=byEra[e[2]]||[]).push(i);
  });
  $("album-list").innerHTML=Object.entries(byEra).map(([era,idx])=>
    `<h3>${esc(era)}</h3><div class="alb-grid">${idx.map(i=>{
      const c=CLUBS[i],has=sq[c.c+"|"+c.s];
      return `<div class="alb${has?" got":""}" data-i="${i}">
        ${has?badge(c,22):'<div class="cb" style="background:#2b1450">?</div>'}
        <div class="an">${esc(has?c.c:"???")}</div><div class="ay">${esc(c.s)}</div></div>`;
    }).join("")}</div>`).join("");
  $("album-list").querySelectorAll(".alb.got").forEach(el=>el.onclick=()=>albumDetail(+el.dataset.i));
  show("album");
}
function albumDetail(i){
  const c=CLUBS[i],st=store.get();
  openSheet(`<div class="sheet-head"><div><h2 style="margin:0">${esc(c.c)} ${esc(c.s)}</h2></div>
    <button class="pill grey" onclick="closeSheet()">Close</button></div>
    ${c.l?`<p class="sm dim" style="font-style:italic">${esc(c.l)}</p>`:""}
    <div class="plist">${c.p.map(p=>{
      const fielded=(st.albumPlayers||{})[p[0]+"|"+c.s];
      return `<div class="prow2" style="cursor:default${fielded?"":";opacity:.5"}">
        <div class="nm"><b>${esc(p[0])}</b><span>${p[3]||p[1]}${p[4]?" · "+esc(p[4]):""}${fielded?" · fielded ✓":""}</span></div>
        <div class="rt">${p[2]}</div></div>`;}).join("")}</div>`);
}

/* =========================================================
   HOME PAINT
========================================================= */
function paintHome(){
  const st=store.get(),today=utcDay();
  const played=st.lastDaily===today;
  $("btn-daily").textContent=played?"Played today ✓ — play again tomorrow":"Play today's season →";
  $("btn-daily").disabled=played;
  $("daily-sub").textContent=played?"Your streak is safe. New season at midnight UTC."
    :"One free season a day — play it your way";
  $("streak-pill").innerHTML=st.streak>=2?`<span class="pill pink">🔥 ${st.streak}</span>`:"";
  const f=featuredFor(today);
  $("daily-featured").innerHTML=`⭐ Today's featured challenge: <b>${esc(f.n)}</b> — +15% if your season matches it.`;
  $("btn-featured").style.display=played?"none":"";
  paintChallenge();
  paintHomeBoard();
}
function applyFeatured(){
  const f=featuredFor(utcDay());
  pref={form:f.form,draft:f.draft,diff:f.diff,pool:f.pool,dyn:f.dyn||null};
  beginRun(true);
}

/* =========================================================
   INIT
========================================================= */
function init(){
  parseChallengeURL();
  paintHome();

  $("btn-daily").onclick=()=>openWizard(true);
  $("btn-featured").onclick=applyFeatured;
  $("btn-board").onclick=()=>{show("board");loadBoard("alltime");};
  $("btn-album").onclick=openAlbum;
  $("btn-how").onclick=()=>show("how");
  $("btn-invite").onclick=openInvite;
  $("how-back").onclick=()=>show("home");
  $("board-back").onclick=()=>show("home");
  $("album-back").onclick=()=>show("home");
  $("btn-home2").onclick=()=>{paintHome();show("home");};
  $("btn-result-board").onclick=()=>{show("board");loadBoard("alltime");};
  $("signup-back").onclick=()=>show("wiz");
  $("wiz-back").onclick=()=>{if(WIZ.step>0){WIZ.step--;paintWizard();}else{paintHome();show("home");}};

  document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>{
    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("on"));
    t.classList.add("on");loadBoard(t.dataset.b);});

  $("btn-signup-go").onclick=()=>{
    const name=$("in-name").value.trim();
    if(name.length<2){toast("Pick a manager name");return;}
    const st=store.get();
    st.playerName=name.slice(0,20);
    st.playerCountry=$("in-country").value.trim().toUpperCase().slice(0,2);
    st.playerEmail=$("in-email").value.trim();
    st.optin=$("in-optin").checked&&!!st.playerEmail;
    store.set(st);
    beginRun(WIZ.daily);
  };

  $("btn-spin").onclick=()=>doSpin(false);
  $("btn-respin").onclick=doRespin;
  $("btn-quit").onclick=()=>{paintHome();show("home");};
  $("btn-kickoff").onclick=startSeason;

  $("btn-next").onclick=()=>{
    if(S.season.md>=MATCHDAYS)finishSeason();
    else if(S.season.md===0&&!S.season.matches.length&&$("btn-next").textContent.startsWith("Kick"))playMatchday();
    else playMatchday();
  };
  $("btn-table-full").onclick=fullTable;
  $("btn-speed").onclick=()=>{
    S.speed=(S.speed+1)%SPEEDS.length;
    $("btn-speed").textContent="Speed: "+SPEEDS[S.speed].n;
  };
  $("btn-squad").onclick=()=>openSheet(`<div class="sheet-head"><h2 style="margin:0">Your XI</h2>
    <button class="pill grey" onclick="closeSheet()">Close</button></div>
    <div class="plist">${S.slots.filter(s=>s.player).map(s=>{
      const p=s.player,g=S.goals[p.name]||0;
      return `<div class="prow2" style="cursor:default">${shirt(p,20)}
        <div class="nm"><b>${esc(p.name)}</b><span>${roleOf(s.id)} · ${esc(p.team)} ${esc(p.season)}</span></div>
        <div class="rt">${g?"⚽"+g:""}</div></div>`;}).join("")}</div>`);

  $("btn-share").onclick=doShare;
  $("btn-challenge-share").onclick=shareChallenge;
  $("modal-bg").onclick=e=>{if(e.target.id==="modal-bg")closeSheet();};
}
document.addEventListener("DOMContentLoaded",init);
