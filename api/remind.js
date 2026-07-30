import { list } from '@vercel/blob';
import { decryptEmail, writeSub, signUnsub, utcDay, featuredFor } from './_shared.js';

const SITE = 'https://twentytwo.app';

/* ---------- lifecycle drip ----------
   A daily cron walks every opted-in subscriber and sends at most one email,
   chosen by where they are in their lifecycle (welcome → streak nudges →
   win-back). State (what's been sent) lives on the subscriber record. */

const daysSince = (last, today) =>
  last ? Math.round((Date.parse(today + 'T00:00:00Z') - Date.parse(last + 'T00:00:00Z')) / 864e5) : 999;

function decide(sub, today) {
  const d = daysSince(sub.lastPlayed, today), sent = sub.sent || {}, st = sub.streak || 0;
  if (!sent.welcome) return 'welcome';
  if ([3, 7, 14, 30].includes(st) && d <= 1 && !sent['ms' + st]) return 'ms';
  if (st >= 2 && d === 1 && sent.risk !== today) return 'risk';        // streak alive, not yet played today
  if (st < 2 && d === 1 && sent.daily !== today) return 'daily';       // played yesterday, gentle nudge
  if (d === 3 && !sent.wb3) return 'wb3';
  if (d >= 7 && d < 30 && !sent.wb7) return 'wb7';
  return null;
}

const cta = (label) => `<a href="${SITE}" style="display:inline-block;background:#ff3d7f;color:#2a0413;font-weight:800;padding:13px 26px;border-radius:8px;text-decoration:none;font-size:15px">${label}</a>`;
const statline = (sub) => {
  const bits = [];
  if (sub.streak >= 2) bits.push(`🔥 ${sub.streak}-day streak`);
  if (sub.runs) bits.push(`${sub.runs} run${sub.runs === 1 ? '' : 's'} played`);
  if (sub.champs) bits.push(`🏆 ${sub.champs} world title${sub.champs === 1 ? '' : 's'}`);
  return bits.length ? `<p style="font-size:13px;color:#ff3d7f;font-weight:700;margin-top:14px">${bits.join(' · ')}</p>` : '';
};
const featline = (today) => {
  const f = featuredFor(today);
  return `<p style="font-size:13px;color:#b9a8cc;margin-top:14px">⭐ Today's featured challenge: <b style="color:#ff3d7f">${f.n}</b> — play it for a <b>+15%</b> score bonus.</p>`;
};
function wrap(inner, unsub, preheader) {
  return `<span style="display:none;max-height:0;overflow:hidden">${preheader || ''}</span>
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:26px;background:#16062b;color:#f6eefe;border-radius:14px">
    <div style="font-size:32px;font-weight:900;letter-spacing:-1px">22<span style="color:#ff3d7f">-</span>0</div>
    ${inner}
    <p style="font-size:11px;color:#9b8fae;margin-top:22px">You opted in when saving a season in 22-0. <a href="${unsub}" style="color:#b9a8cc">Unsubscribe</a> anytime.</p>
  </div>`;
}

function template(kind, sub, today) {
  const name = (sub.n || 'manager').replace(/[<>]/g, ''), st = sub.streak || 0;
  switch (kind) {
    case 'welcome': return {
      subject: `Welcome to the dugout, ${name} ⚽`,
      pre: 'One free season a day. 22 games, 0 defeats.',
      inner: `<p style="font-size:15px;line-height:1.6">Hi ${name} — you're in, and you're on the world leaderboard. Every day you get <b>one free season</b>: draft an XI from the whole history of the Women's Super League, then play all 22 games — table, title race, run-in and all.</p>
        <p style="font-size:15px;line-height:1.6">Win the lot and you have the perfect season: <b>22-0</b>. Nobody has done it yet.</p>
        ${cta("Play today's season →")}${featline(today)}` };
    case 'ms': return {
      subject: `🔥 ${st} days straight, ${name} — that's a streak`,
      pre: 'You are officially a 22-0 regular.',
      inner: `<p style="font-size:15px;line-height:1.6">${st} days in a row, ${name}. That puts you among the regulars — and the streak board is watching. Don't stop now.</p>
        ${cta('Keep it alive →')}${statline(sub)}` };
    case 'risk': return {
      subject: `⏳ Your ${st}-day streak dies at midnight, ${name}`,
      pre: 'One season saves it.',
      inner: `<p style="font-size:15px;line-height:1.6">${name} — your <b>🔥 ${st}-day streak</b> is alive until midnight UTC. One season, one title race, and it survives.</p>
        ${cta('Save the streak →')}${featline(today)}` };
    case 'daily': return {
      subject: `⚽ A fresh season is waiting, ${name}`,
      pre: 'New draw, new rivals, new run at the title.',
      inner: `<p style="font-size:15px;line-height:1.6">Morning ${name} — last season is in the books and the fixtures are out again. Eleven new rivals, 22 games, one shot at going unbeaten.</p>
        ${cta("Play today's season →")}${featline(today)}${statline(sub)}` };
    case 'wb3': return {
      subject: `${name}, your XI is asking questions 👀`,
      pre: 'Three days without a season. The dressing room talks.',
      inner: `<p style="font-size:15px;line-height:1.6">It's been a few days, ${name}. Somewhere a draw is landing on Arsenal 2018-19 without you, and Miedema is going unpicked. Your next title race is one tap away.</p>
        ${cta('Back to the dugout →')}${statline(sub)}` };
    case 'wb7': return {
      subject: `The league moved on without you, ${name}`,
      pre: 'New squads, new challenges, same 22 games.',
      inner: `<p style="font-size:15px;line-height:1.6">${name} — the whole WSL is still in there, from the semi-pro summers of 2011 to the record-breaking modern era. There's a ⭐ featured challenge every day and an album of club-seasons to fill. Your comeback season writes itself.</p>
        ${cta('Play 22-0 →')}${featline(today)}` };
  }
}

export default async function handler(req, res) {
  const auth = req.headers.authorization || '';
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ err: 'auth' });
  const today = utcDay();
  const live = !!process.env.RESEND_API_KEY;

  // suppression list (older unsubscribes that predate the unsub flag)
  const suppressed = new Set();
  for (const b of (await list({ prefix: 'suppress/' })).blobs) {
    const m = b.pathname.match(/suppress\/([a-f0-9]{32})/); if (m) suppressed.add(m[1]);
  }

  const tally = {}; let sent = 0, eligible = 0, cursor;
  do {
    const page = await list({ prefix: 'subs/', cursor });
    cursor = page.cursor;
    for (const b of page.blobs) {
      let sub; try { sub = await (await fetch(b.url + '?v=' + Date.now())).json(); } catch { continue; }
      if (!sub || sub.unsub || suppressed.has(sub.h)) continue;
      const kind = decide(sub, today);
      if (!kind) continue;
      eligible++;
      tally[kind] = (tally[kind] || 0) + 1;
      if (!live) continue;
      let email; try { email = decryptEmail(sub); } catch { continue; }
      const unsub = `${SITE}/api/unsubscribe?h=${sub.h}&s=${signUnsub(sub.h)}`;
      const t = template(kind, sub, today);
      try {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
          body: JSON.stringify({ from: process.env.REMIND_FROM || '22-0 <onboarding@resend.dev>', to: email, subject: t.subject, html: wrap(t.inner, unsub, t.pre) })
        });
        if (r.ok) {
          sub.sent = sub.sent || {};
          sub.sent[kind === 'ms' ? 'ms' + (sub.streak || 0) : kind] = today;
          await writeSub(sub);
          sent++;
        }
      } catch { /* skip on send error */ }
    }
  } while (cursor);

  return res.status(200).json({ ok: 1, day: today, sent, eligible, byKind: tally, dryRun: !live });
}
