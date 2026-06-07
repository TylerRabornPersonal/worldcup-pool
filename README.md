# 2026 World Cup Pool

A no-database, static site for running the pool. Two pages, three JSON data files, one shared
scoring engine. Lives on GitHub Pages; I (Claude) update results and push daily.

## Files

```
index.html        Pick form — 48 teams as checkboxes, live validation, emails entry to you
standings.html    Live leaderboard — reads the JSON, computes scores, ranks players
scoring.js        Shared scoring/validation/prize engine (also used by the test harness)
data/teams.json   The 48 teams, seeds (1-48), groups, multipliers, and pool config
data/picks.json   Everyone's entries (locked after the deadline)
data/results.json The match results — the only file that changes during the tournament
```

## This year's settings (edit in data/teams.json → "config")

- 6 picks per entry, combined seed must total **72 or higher**
- Seeds locked from the **FIFA ranking of 1 April 2026** (the last set before kickoff)
- Submission goes to **tylerraborn@gmail.com** (change `submitEmail` if you want)
- $10 entry; payout 1st 75%−$10, 2nd 25%−$10, 3rd $10

## Rules now written down (were only implied before)

- Win = 1 pt, group tie = 0.5 pt, each × the team's stage multiplier
- Knockout shootout: **winner gets the full win, loser gets nothing**
- The 3rd-place playoff is **not scored**
- New for 2026: a **Round of 32**, so there's an extra multiplier column

## Running it locally

Browsers block `fetch` of local files opened directly, so use a tiny server:

```
cd worldcup-pool
python3 -m http.server 8000
# open http://localhost:8000/index.html
```

## How a season runs

1. Share the `index.html` link. People pick 6 teams; the form emails their entry to you.
2. Forward me the entries — I write them into `data/picks.json` and lock it at the deadline.
3. Each morning during the tournament a scheduled task here updates `data/results.json`,
   recomputes, and pushes to GitHub (needs a repo-scoped token from you).

## Updating results (data/results.json)

For each team, record group tallies and which knockout rounds they **won**:

```json
"Brazil": { "groupWins": 2, "groupTies": 1, "r32": true, "r16": true,
            "qf": false, "sf": false, "final": false }
```

## Multiplier curve (6 tiers of 8, in data/teams.json)

| Seeds | Grp W/T | R32 | R16 | QF | SF | Final |
|------|--------|-----|-----|----|----|-------|
| 1–8  | 1.0 | 1.0 | 1.0 | 1.5 | 2.0 | 3.0 |
| 9–16 | 1.5 | 2.0 | 2.0 | 2.5 | 3.0 | 4.0 |
| 17–24| 2.0 | 2.5 | 3.0 | 4.0 | 5.0 | 6.0 |
| 25–32| 3.0 | 3.5 | 4.0 | 5.0 | 6.0 | 7.0 |
| 33–40| 4.0 | 5.0 | 6.0 | 7.0 | 8.0 | 9.0 |
| 41–48| 5.0 | 6.0 | 7.0 | 8.0 | 9.0 | 10.0 |

All values are editable — change them in `data/teams.json` and both pages pick it up.
