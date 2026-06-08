/* Shared scoring engine for the World Cup Pool.
   Used by standings.html and the verification tests. Pure functions, no DOM.

   Scoring per team = (group wins + group ties + each knockout round won),
   each multiplied by that team's stage multiplier (mult = base value x seed-tier
   multiplier, precomputed in teams.json). Then the team's whole total is multiplied
   by an OWNERSHIP BONUS: the fewer entrants picked the team, the bigger the bonus.
   Shootout winner = full win; shootout loser / 3rd-place game = not scored. */

function teamPoints(team, result) {
  if (!result) return 0;
  const m = team.mult;
  let p = 0;
  p += (result.groupWins || 0) * m.gw;
  p += (result.groupTies || 0) * m.gt;
  if (result.r32)   p += m.r32;
  if (result.r16)   p += m.r16;
  if (result.qf)    p += m.qf;
  if (result.sf)    p += m.sf;
  if (result.final) p += m.final;
  return Math.round(p * 100) / 100;
}

function teamBreakdown(team, result) {
  const m = team.mult, r = result || {};
  return {
    group: Math.round(((r.groupWins||0)*m.gw + (r.groupTies||0)*m.gt) * 100) / 100,
    r32: r.r32 ? m.r32 : 0,
    r16: r.r16 ? m.r16 : 0,
    qf:  r.qf  ? m.qf  : 0,
    sf:  r.sf  ? m.sf  : 0,
    final: r.final ? m.final : 0,
    total: teamPoints(team, result)
  };
}

function validatePicks(teamNames, teamsByName, config) {
  const errors = [];
  const need = config.picksRequired, floor = config.combinedRankMin;
  const uniq = Array.from(new Set(teamNames));
  if (uniq.length !== teamNames.length) errors.push("Duplicate team selected.");
  if (uniq.length !== need) errors.push(`Pick exactly ${need} teams (you have ${uniq.length}).`);
  let combined = 0, bad = false;
  for (const n of uniq) {
    const t = teamsByName[n];
    if (!t) { bad = true; continue; }
    combined += t.rank;
  }
  if (bad) errors.push("Unknown team in selection.");
  if (uniq.length === need && combined < floor)
    errors.push(`Combined ranking is ${combined}; must be ${floor} or higher.`);
  return { ok: errors.length === 0, combined, errors };
}

// Ownership = fraction of entries that include each team.
function computeOwnership(entries) {
  const n = entries.length, count = {};
  entries.forEach(e => (e.teams || []).forEach(t => count[t] = (count[t]||0) + 1));
  const frac = {};
  Object.keys(count).forEach(t => frac[t] = n ? count[t]/n : 0);
  return { count, frac, entrants: n };
}

// Reward-only ownership bonus from config tiers (maxPct ascending; first match wins).
function ownershipBonus(fracOwned, tiers) {
  const pct = (fracOwned || 0) * 100;
  for (const t of tiers) if (pct <= t.maxPct) return t.mult;
  return 1.0;
}

// Full leaderboard, applying the ownership bonus to each team's total.
function computeStandings(entries, teams, results, config) {
  const byName = {};
  teams.forEach(t => byName[t.name] = t);
  const tiers = (config && config.ownershipBonus) || [{maxPct:100, mult:1.0}];
  const own = computeOwnership(entries);
  const rows = entries.map(e => {
    const detail = e.teams.map(n => {
      const t = byName[n];
      const base = t ? teamPoints(t, results[n]) : 0;
      const ofrac = own.frac[n] || 0;
      const bonus = ownershipBonus(ofrac, tiers);
      return {
        team: n, rank: t ? t.rank : null,
        ownedPct: Math.round(ofrac * 100),
        bonus,
        basePoints: base,
        points: Math.round(base * bonus * 100) / 100,
        breakdown: t ? teamBreakdown(t, results[n]) : null
      };
    });
    const total = Math.round(detail.reduce((s, d) => s + d.points, 0) * 100) / 100;
    return { player: e.player, email: e.email, teams: detail, total };
  });
  rows.sort((a, b) => b.total - a.total);
  let place = 0, prev = null, seen = 0;
  rows.forEach(r => { seen++; if (r.total !== prev) { place = seen; prev = r.total; } r.place = place; });
  return rows;
}

function computePrizes(rows, pool, slots) {
  const out = {}, byPlace = {};
  rows.forEach(r => { (byPlace[r.place] = byPlace[r.place] || []).push(r); });
  Object.keys(byPlace).map(Number).sort((a,b)=>a-b).forEach(pl => {
    const group = byPlace[pl], span = [];
    for (let i = pl; i < pl + group.length; i++) if (slots[i-1] != null) span.push(slots[i-1]);
    const sum = span.reduce((s,x)=>s+x,0);
    const each = group.length ? Math.round((sum/group.length)*100)/100 : 0;
    group.forEach(r => out[r.player] = each);
  });
  return out;
}

if (typeof module !== "undefined") module.exports =
  { teamPoints, teamBreakdown, validatePicks, computeOwnership, ownershipBonus, computeStandings, computePrizes };
