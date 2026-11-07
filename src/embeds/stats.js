const { baseEmbed, addField } = require('./common');
const f = require('../utils/format');

function buildServerStatsEmbed(d = {}) {
  const s = d || {};
  const embed = baseEmbed('📊 TETR.IO server statistics', 0x2ecc71);
  addField(embed, 'Users', f.formatNumber(s.usercount));
  addField(embed, 'Anonymous', f.formatNumber(s.anoncount));
  addField(embed, 'Accounts ever', f.formatNumber(s.totalaccounts));
  addField(embed, 'Ranked (TL)', f.formatNumber(s.rankedcount));
  addField(embed, 'Records stored', f.formatNumber(s.recordcount));
  addField(embed, 'Games played', f.formatNumber(s.gamesplayed));
  addField(embed, 'Games finished', f.formatNumber(s.gamesfinished));
  addField(embed, 'Time played', f.formatDuration(s.gametime));
  addField(embed, 'Keys pressed', f.formatNumber(s.inputs));
  addField(embed, 'Pieces placed', f.formatNumber(s.piecesplaced));
  addField(embed, 'New users / s', f.formatNumber(s.usercount_delta, 3));
  addField(embed, 'Games / s', f.formatNumber(s.gamesplayed_delta, 2));
  return embed;
}

function buildActivityEmbed(d = {}) {
  const points = (d && Array.isArray(d.activity)) ? d.activity.filter(f.isNum) : [];
  const embed = baseEmbed('📈 Player activity (last 2 days)', 0x2ecc71);
  if (!points.length) return embed.setDescription('No activity data.');
  const chronological = points.slice().reverse(); // API gives newest first
  embed.setDescription(`\`${f.sparkline(chronological, 48)}\`\n← 2 days ago • now →`);
  addField(embed, 'Now', f.formatNumber(points[0]));
  addField(embed, 'Peak', f.formatNumber(Math.max(...points)));
  addField(embed, 'Low', f.formatNumber(Math.min(...points)));
  return embed;
}

module.exports = { buildServerStatsEmbed, buildActivityEmbed };
