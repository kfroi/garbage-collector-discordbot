const { baseEmbed, addField } = require('./common');
const f = require('../utils/format');
const { stats } = require('./record');

/** Compact one-embed overview of /users/:user/summaries (every mode). */
function buildAllSummariesEmbed(data, username) {
  const d = data || {};
  const lg = d.league || {};
  const embed = baseEmbed(`Overview — ${username}`, f.rankColor(lg.rank));
  const s40 = d['40l'] || {};
  const bl = d.blitz || {};
  addField(embed, 'TETRA LEAGUE', f.isNum(lg.tr) && lg.tr >= 0 ? `${f.rankEmoji(lg.rank)}\n${f.formatNumber(lg.tr, 0)} TR ${f.posOrDash(lg.standing)}` : 'Unranked');
  addField(embed, '40 LINES', s40.record ? `${f.formatTime(stats(s40.record).finaltime)} ${f.posOrDash(s40.rank)}` : 'Not played');
  addField(embed, 'BLITZ', bl.record ? `${f.formatNumber(stats(bl.record).score)} ${f.posOrDash(bl.rank)}` : 'Not played');
  for (const [key, label] of [['zenith', 'QUICK PLAY'], ['zenithex', 'EXPERT QP']]) {
    const z = d[key] || {};
    const week = z.record && stats(z.record).zenith;
    const best = z.best && z.best.record && stats(z.best.record).zenith;
    addField(embed, label, `Week: ${week ? `${f.formatNumber(week.altitude, 1)} m` : '—'}\nBest: ${best ? `${f.formatNumber(best.altitude, 1)} m` : '—'}`);
  }
  if (d.zen) addField(embed, 'ZEN', `Lv ${f.formatNumber(d.zen.level)} • ${f.formatNumber(d.zen.score)}`);
  if (Array.isArray(d.achievements)) addField(embed, 'Achievements', f.formatNumber(d.achievements.length));
  return embed;
}

module.exports = { buildAllSummariesEmbed };
