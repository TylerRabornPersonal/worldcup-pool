/* Shared scoring engine for the World Cup Pool.
   Used by both standings.html and the verification tests.
   Pure functions, no DOM. */

// Per-team points = group wins + group ties + each knockout round won,
// each multiplied by that team's stage multiplier.
// Shootout winner = full win (caller records the round as won=true).
// Shootout loser / 3rd-place game = not scored (left false / 0).
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

// Break a team's points down by stage (for the UI detail rows).
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

// Validate a pick set against the rules.
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

// Compute the full leaderboard.
function computeStandings(entries, teams, results) {
  const byName = {};
  teams.forEach(t => byName[t.name] = t);
  const rows = entries.map(e => {
    const detail = e.teams.map(n => {
      const t = byName[n];
      return { team: n, rank: t ? t.rank : null, points: t ? teamPoints(t, results[n]) : 0,
               breakdown: t ? teamBreakdown(t, results[n]) : null };
    });
    const total = Math.round(detail.reduce((s, d) => s + d.points, 0) * 100) / 100;
    return { player: e.player, email: e.email, teams: detail, total };
  });
  rows.sort((a, b) => b.total - a.total);
  // dense-ish placement with ties sharing a place
  let place = 0, prev = null, seen = 0;
  rows.forEach(r => { seen++; if (r.total !== prev) { place = seen; prev = r.total; } r.place = place; });
  return rows;
}

// Prize split honoring "no tiebreakers: ties split the combined slots".
function computePrizes(rows, pool, slots) {
  // slots: array of dollar amounts for place 1,2,3,...
  // group rows by place, split the sum of the slots they span.
  const out = {};
  const byPlace = {};
  rows.forEach(r => { (byPlace[r.place] = byPlace[r.place] || []).push(r); });
  Object.keys(byPlace).map(Number).sort((a,b)=>a-b).forEach(pl => {
    const group = byPlace[pl];
    const span = [];
    for (let i = pl; i < pl + group.length; i++) if (slots[i-1] != null) span.push(slots[i-1]);
    const sum = span.reduce((s,x)=>s+x,0);
    const each = group.length ? Math.round((sum/group.length)*100)/100 : 0;
    group.forEach(r => out[r.player] = each);
  });
  return out;
}

if (typeof module !== "undefined") module.exports =
  { teamPoints, teamBreakdown, validatePicks, computeStandings, computePrizes };
