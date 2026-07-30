# 22-0 — Build the Ultimate WSL XI

A free, fan-made Women's Super League draft game. Draw club-seasons from the league's whole history — **84 squads, 2011 to 2025-26, 1,352 players** — draft a starting XI one player at a time, then play a **full 22-game season**: eleven rivals home and away, a live table, a title race and a run-in.

**Twenty-two games. Zero defeats. Nobody has ever done it.**

## Play

🎮 **[Play it live](https://twenty-two-zero.vercel.app)**

## What's in the game

- 🎰 **The draw** — a case-opening reel of WSL club-seasons in their own colours, from the semi-professional summers of 2011 to the record-breaking present. One re-draw per season.
- 🎯 **Place anyone anywhere** — you choose the shirt for every pick, FIFA-style: related roles are free (LM↔LW, CM↔AM↔DM, full-back↔wing-back), near roles cost a little, and only a real misfit (a striker at centre-back, anyone in goal) costs big.
- ⚡ **Chemistry** — rewards real football: players who **actually played together** that season link strongest, then **clubmates across eras** (a Chelsea spine from four different years), **countrymates**, and **contemporaries**. Playing everyone in their proper position lifts it further. A normal XI sits around 16.
- 🏆 **A whole season, not a cup run** — 22 matchdays with minute-by-minute commentary, and the other five fixtures resolving around you every week. The **table is the point**: watch yourself climb it, or not.
- 📅 **Real rivals** — your eleven opponents are real WSL squads, one per club, never the same club twice: Arsenal 2012 away, Chelsea 2024-25 at home, Doncaster Rovers Belles scrapping at the bottom.
- 📜 **Lore** — every club-season lands with a line of its history: the Maracanã it isn't, but the Doncaster demotion, the points-per-game title, the 60,160 at the Emirates, the season decided by seven goals.
- 🧩 **Draft modes** — Classic, **Era Tour** (a new WSL era each draw), **Dynasty** (one club, every season it has played), **Wage Cap** (budget 930). Plus a player-pool filter: All-time ×1.0, Full-time era ×0.9, Modern ×0.8.
- 💀 **Difficulties** — Classic, Hard (ratings hidden, stronger league), Legend (only the best club-seasons, every week).
- 🗓 **One free season a day** — played however you like, with its own leaderboard and 🔥 streaks. A fresh one at midnight UTC.
- ⭐ **Featured challenge of the day** — a rotating named config worth **+15%**, verified server-side.
- 🆚 **Beat-my-season links** — every run is seeded, so a shared link gives your friend **the same eleven rivals, the same fixture list and the same rules**, with your points as the bar.
- 📖 **Squad album** — a Panini-style collection of every club-season you have drafted from, by era, lore included. Collect all 84.
- 📸 **Share card** — results render as an image: verdict, points, the 22-match result grid and your full XI.
- 🌍 **Live world leaderboard** — every finished season saves automatically. All-time, daily and 🔥 Regulars boards.
- 📬 **Email drip** — opt-in only, strictly one per day maximum: welcome, daily nudge, streak-at-risk, milestones, win-backs.

## Scoring

| Event | Points |
|---|---|
| Win | 60 |
| Draw | 25 |
| Goals | +3 scored / −2 conceded |
| Champions | +250 |
| Unbeaten season | +150 |
| Perfect 22-0 | +400 |

Multipliers: Hard ×1.3 · Legend ×1.7 · Era Tour ×1.15 · Dynasty ×1.2 · Wage Cap ×1.3 · Full-time era ×0.9 · Modern ×0.8 · Daily ×1.1 · Featured ×1.15.

## How the league is verified

The whole 12-team league is a pure function of `(seed, pool, difficulty)`: who your eleven rivals are, the fixture list, and **every result that doesn't involve you**, generated on its own RNG stream so nothing you do at the keyboard can shift it.

That means the server doesn't have to trust a claimed league position — given your 22 scorelines and the seed, `api/_shared.js` rebuilds the identical table and derives the finish itself. The league core is mirrored verbatim between [src/game-core.js](src/game-core.js) and [api/_shared.js](api/_shared.js); `scripts/simulate.mjs` plays hundreds of headless seasons and fails if the two ever disagree.

### Anti-abuse

Run tokens must be 60s–6h old (a plausible playtime), a season must be exactly 22 matches with sane scorelines and a believable seasonal goal total, the seed must be a real 32-bit value, points and final position are both recomputed server-side, names are sanitised and filtered, and a honeypot field quietly swallows naive bots.

What the server *cannot* do is verify the match engine itself — a plausible-looking set of 22 scorelines will be taken at face value. That is a deliberate trade: it is a fan game, and determined cheaters are not the threat model.

## Architecture

```
index.html        ← the whole game, one self-contained file (built from src/)
src/
  head.html       ← markup + CSS
  clubs.mjs       ← source squad data (club, season, players, tiers)
  lore.mjs        ← one line of history per club-season
  data.js         ← generated: CLUBS + CS (do not edit by hand)
  game-core.js    ← draft, reel, chemistry, positions, LEAGUE CORE
  game-season.js  ← match engine, matchday loop, table, awards, sharing
api/              ← Vercel serverless functions
  token.js        ← run token (proves a plausible playtime)
  score.js        ← validate + rebuild the table + store; update boards
  leaderboard.js  ← cached reads (alltime / daily / streaks)
  remind.js       ← daily drip cron, one lifecycle email per subscriber
  unsubscribe.js  ← signed one-click unsubscribe
  _data.js        ← generated: mirror of CS for the server
scripts/
  extract.mjs     ← clubs.mjs + lore.mjs → data.js + _data.js (validates both)
  simulate.mjs    ← headless seasons + client↔server scoring parity check
  rebuild.mjs     ← rebuild aggregates; --remove-name moderation
```

Storage is **Vercel Blob**: one immutable JSON blob per submitted season, plus top-100 aggregate blobs per board.

## Develop

```bash
npm install
npm run data          # rebuild src/data.js from clubs.mjs + lore.mjs
npm run build         # rebuild index.html from src/
node scripts/simulate.mjs 300   # 300 headless seasons + parity check
```

`scripts/extract.mjs` **fails the build** on any data problem: a squad without a goalkeeper, a player whose position contradicts their line, a club-season with no lore, or lore pointing at a club-season that doesn't exist.

## About the data

Squads are the notable first-team players for that exact season, researched against club-season records, with transfer timing checked in both directions — a player is only listed in a season she actually played there.

**Ratings are an unofficial, descriptive interpretation, not a record of anything.** Each player's researched tier becomes a band, jittered deterministically by name so she reads consistently across seasons, then nudged by era: the WSL of 2011 was a semi-professional league and the modern one is not. Club strength is the best-XI average, spread around the mean so a title-winning side and a relegated one are genuinely far apart.

Specific positions (RB vs LB, AM vs CM) are a descriptive reading of the role a player actually filled that season — the underlying sources usually record only GK/DF/MF/FW.

The game plays the **modern 22-game, 12-team format** throughout, even when drafting from 2011, when the league was eight clubs and fourteen games. It expands to 14 clubs from 2026-27; the game keeps 22 games, because that is where the name comes from.

## Privacy

Emails are **optional and opt-in only**, encrypted with AES-256-GCM before storage, never returned by any API and never displayed. Export locally with `npm run export-emails`.

---

*22-0 is an independent, fan-made game celebrating the Women's Super League. Not affiliated with the WSL, WSL Football, WPLL, the FA or any club. Sister game: [7-0](https://sevenzero.app), the World Cup one.*
