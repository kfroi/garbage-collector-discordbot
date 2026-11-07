const { baseEmbed, addField } = require('./common');
const f = require('../utils/format');

function buildLeagueEmbed(data, username) {
  const d = data || {};
  const embed = baseEmbed(`TETRA LEAGUE — ${username}`, f.rankColor(d.rank));
  const placed = f.isNum(d.tr) && d.tr >= 0;
  embed.setDescription(placed
    ? `${f.rankEmoji(d.rank)} • **${f.formatNumber(d.tr, 2)} TR**${d.decaying ? ' • 📉 decaying' : ''}`
    : `Not placed yet (${f.formatNumber(d.gamesplayed)} / 10 placement games).`);
  addField(embed, 'Games', `${f.formatNumber(d.gameswon)} W / ${f.formatNumber(d.gamesplayed)} P`);
  if (f.isNum(d.gamesplayed) && d.gamesplayed > 0) addField(embed, 'Win rate', f.formatPercent(d.gameswon / d.gamesplayed));
  if (placed) {
    addField(embed, 'Glicko', `${f.formatNumber(d.glicko, 1)} ± ${f.formatNumber(d.rd, 1)}`);
    addField(embed, 'GLIXARE', `${f.formatNumber(d.gxe, 2)}%`);
    addField(embed, 'Global / Local', `${f.posOrDash(d.standing)} / ${f.posOrDash(d.standing_local)}`);
    addField(embed, 'Top', f.isNum(d.percentile) ? `${f.formatPercent(d.percentile)} (${f.rankEmoji(d.percentile_rank)})` : '—');
  }
  addField(embed, 'APM / PPS / VS', `${f.formatNumber(d.apm, 2)} / ${f.formatNumber(d.pps, 2)} / ${f.formatNumber(d.vs, 2)}`);
  if (d.bestrank) addField(embed, 'Best rank (season)', f.rankEmoji(d.bestrank));
  if (d.next_rank) addField(embed, 'Next rank', `${f.rankEmoji(d.next_rank)} at ${f.posOrDash(d.next_at)}`);
  if (d.prev_rank) addField(embed, 'Previous rank', `${f.rankEmoji(d.prev_rank)} below ${f.posOrDash(d.prev_at)}`);
  const past = Object.values(d.past || {});
  if (past.length) {
    addField(embed, 'Past seasons', past.map((p) => `S${p.season}: ${f.rankEmoji(p.rank)} ${f.formatNumber(p.tr, 0)} TR${f.isNum(p.placement) ? ` (#${p.placement})` : ''}`).join('\n'), false);
  }
  return embed;
}

module.exports = { buildLeagueEmbed };
