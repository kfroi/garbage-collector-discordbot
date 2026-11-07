const { baseEmbed, addField } = require('./common');
const f = require('../utils/format');
const { stats, agg, replayLink } = require('./record');

function buildSprintEmbed(data, username) {
  const d = data || {};
  const embed = baseEmbed(`40 LINES — ${username}`, 0x9b59b6);
  const r = d.record;
  if (!r) return embed.setDescription('This player has never finished a 40 LINES game.');
  const s = stats(r);
  const clears = s.clears || {};
  embed.setDescription(`⏱️ **${f.formatTime(s.finaltime)}** ${replayLink(r)}\nSet ${f.discordTime(r.ts)}`);
  addField(embed, 'Global rank', f.posOrDash(d.rank));
  addField(embed, 'Local rank', f.posOrDash(d.rank_local));
  addField(embed, 'PPS', f.formatNumber(agg(r).pps, 2));
  addField(embed, 'Pieces / Inputs', `${f.formatNumber(s.piecesplaced)} / ${f.formatNumber(s.inputs)}`);
  if (f.isNum(s.inputs) && s.piecesplaced) addField(embed, 'KPP', f.formatNumber(s.inputs / s.piecesplaced, 2));
  if (s.finesse) addField(embed, 'Finesse faults', f.formatNumber(s.finesse.faults));
  addField(embed, 'Clears', `Quads ${clears.quads ?? 0} • Triples ${clears.triples ?? 0} • Doubles ${clears.doubles ?? 0} • Singles ${clears.singles ?? 0}`, false);
  return embed;
}

module.exports = { buildSprintEmbed };
