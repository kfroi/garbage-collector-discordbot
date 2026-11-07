const { baseEmbed, addField } = require('./common');
const f = require('../utils/format');
const { stats, agg, replayLink } = require('./record');

function buildBlitzEmbed(data, username) {
  const d = data || {};
  const embed = baseEmbed(`BLITZ — ${username}`, 0xe74c3c);
  const r = d.record;
  if (!r) return embed.setDescription('This player has never finished a BLITZ game.');
  const s = stats(r);
  const clears = s.clears || {};
  embed.setDescription(`⚡ **${f.formatNumber(s.score)}** points ${replayLink(r)}\nSet ${f.discordTime(r.ts)}`);
  addField(embed, 'Global rank', f.posOrDash(d.rank));
  addField(embed, 'Local rank', f.posOrDash(d.rank_local));
  addField(embed, 'Level', f.formatNumber(s.level));
  addField(embed, 'PPS', f.formatNumber(agg(r).pps, 2));
  addField(embed, 'Lines', f.formatNumber(s.lines));
  addField(embed, 'Top combo / B2B', `${f.formatNumber(s.topcombo)} / ${f.formatNumber(s.topbtb)}`);
  addField(embed, 'T-spins / All clears', `${f.formatNumber(s.tspins)} / ${f.formatNumber(clears.allclear)}`);
  return embed;
}

module.exports = { buildBlitzEmbed };
