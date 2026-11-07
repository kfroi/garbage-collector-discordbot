// Helpers to describe a single Record object (structure may change, so read defensively).
const f = require('../utils/format');

const stats = (r) => (r && r.results && r.results.stats) || {};
const agg = (r) => (r && r.results && r.results.aggregatestats) || {};

/** One-line summary of a record, depending on its game mode. */
function recordLine(r) {
  if (!r) return '—';
  const s = stats(r);
  const a = agg(r);
  const mode = r.gamemode;
  if (Array.isArray(r.otherusers) && r.otherusers.length) {
    const lb = (r.results && r.results.leaderboard) || [];
    const me = lb.find((p) => r.user && p.id === r.user.id) || lb[0] || {};
    const them = lb.find((p) => p !== me) || {};
    const res = (r.extras && r.extras.result) || '';
    return `${res ? `**${res}** ` : ''}${me.wins ?? '?'}-${them.wins ?? '?'} vs ${them.username || r.otherusers[0].username || '?'}`;
  }
  if (mode === '40l') return `**${f.formatTime(s.finaltime)}** • ${f.formatNumber(a.pps, 2)} PPS`;
  if (mode === 'blitz') return `**${f.formatNumber(s.score)}** pts • Lv ${f.formatNumber(s.level)} • ${f.formatNumber(a.pps, 2)} PPS`;
  if (mode === 'zenith' || mode === 'zenithex') {
    const z = s.zenith || {};
    const mods = (r.extras && r.extras.zenith && r.extras.zenith.mods) || [];
    return `**${f.formatNumber(z.altitude, 1)} m** (F${z.floor ?? '?'}) • ${f.formatNumber(a.apm, 1)} APM${mods.length ? ` • mods: ${mods.join(', ')}` : ''}`;
  }
  return `${mode || 'game'} • score ${f.formatNumber(s.score)} • ${r.results && r.results.gameoverreason ? r.results.gameoverreason : ''}`;
}

const replayLink = (r) => (r && r.replayid && !r.stub ? `[replay](https://tetr.io/#R:${r.replayid})` : '');

module.exports = { recordLine, replayLink, stats, agg };
