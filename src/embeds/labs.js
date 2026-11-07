const { baseEmbed, addField } = require('./common');
const f = require('../utils/format');

const RANK_EMOJIS = {
  'x+': ['x_plus', '1568516330699751464'],
  x: ['x_', '1568515773419356210'],
  u: ['u_1', '1568515772169457784'],
  ss: ['ss', '1568515770726490234'],
  's+': ['s_plus', '1568516729787645962'],
  s: ['s_', '1568515766653812886'],
  's-': ['s_minus', '1568516682148741171'],
  'a+': ['a_plus', '1568516411867926598'],
  a: ['a_', '1568515754851049545'],
  'a-': ['a_minus', '1568516182829563965'],
  'b+': ['b_plus', '1568516585952383067'],
  b: ['b_', '1568515758378590298'],
  'b-': ['b_minus', '1568516563206676572'],
  'c+': ['c_plus', '1568516495774843024'],
  c: ['c_', '1568515761750675577'],
  'c-': ['c_minus', '1568516459607494686'],
  'd+': ['d_plus', '1568516634111639602'],
  d: ['d_', '1568515764141690881'],
  z: ['u_1', '1568515772169457784'],
};

/** /labs/scoreflow/:user/:gamemode — points are [tsOffset, isPB, score]. */
function buildScoreflowEmbed(d, { username, gamemode }) {
  const points = (d && Array.isArray(d.points)) ? d.points.filter(Array.isArray) : [];
  const embed = baseEmbed(`🧪 Scoreflow — ${username} (${gamemode})`, 0x8e44ad);
  if (!points.length) return embed.setDescription('No records in this mode.');
  const value = (p) => (gamemode === '40l' ? -p[2] : p[2]); // 40L scores are negative times
  const pbs = points.filter((p) => p[1] === 1);
  const best = gamemode === '40l' ? Math.min(...points.map(value)) : Math.max(...points.map(value));
  embed.setDescription(`All games: \`${f.sparkline(points.map((p) => p[2]), 40)}\`\nPB progression: \`${f.sparkline(pbs.map((p) => p[2]), 40)}\`\n(higher bar = better)`);
  addField(embed, 'Games', f.formatNumber(points.length));
  addField(embed, 'PBs set', f.formatNumber(pbs.length));
  addField(embed, 'Best', f.formatResult(gamemode, best));
  if (f.isNum(d.startTime)) addField(embed, 'First game', f.discordTime(d.startTime, 'D'));
  return embed;
}

const RESULTS = { 1: 'win', 2: 'loss', 3: 'win (DQ)', 4: 'loss (DQ)', 5: 'tie', 6: 'no contest', 7: 'nullified' };

/** /labs/leagueflow/:user — points are [tsOffset, result, trAfter, oppTr]. */
function buildLeagueflowEmbed(d, username) {
  const points = (d && Array.isArray(d.points)) ? d.points.filter(Array.isArray) : [];
  const embed = baseEmbed(`🧪 Leagueflow — ${username}`, 0x8e44ad);
  if (!points.length) return embed.setDescription('No TETRA LEAGUE matches found.');
  const wins = points.filter((p) => p[1] === 1 || p[1] === 3).length;
  const losses = points.filter((p) => p[1] === 2 || p[1] === 4).length;
  const trs = points.map((p) => p[2]);
  embed.setDescription(`TR over time: \`${f.sparkline(trs, 40)}\``);
  addField(embed, 'Matches', f.formatNumber(points.length));
  addField(embed, 'W / L', `${wins} / ${losses}`);
  addField(embed, 'Current TR', f.formatNumber(trs[trs.length - 1]));
  addField(embed, 'Peak TR', f.formatNumber(Math.max(...trs)));
  const recent = points.slice(-5).reverse().map((p) => `${RESULTS[p[1]] || '?'} vs ${f.formatNumber(p[3])} TR → ${f.formatNumber(p[2])} TR`);
  addField(embed, 'Last 5 matches', recent.join('\n'), false);
  return embed;
}

/** /labs/league_ranks */
function buildLeagueRanksEmbed(d) {
  const point = (d && d.data) || {};
  const ranks = Object.entries(point).filter(([k, v]) => k !== 'total' && v && typeof v === 'object');
  const embed = baseEmbed('🧪 TETRA LEAGUE rank thresholds', 0x8e44ad);
  const lines = ranks.map(([k, r]) => `${rankIcon(k)} **${String(k).toUpperCase()}** — ≥ ${f.formatNumber(r.tr, 0)} TR • top ${f.formatPercent(r.percentile, 1)} • ${f.formatNumber(r.count)} players`);
  embed.setDescription(`${f.formatNumber(point.total)} ranked players${d && d.t ? ` • updated ${f.discordTime(d.t)}` : ''}\n\n**Ranks**\n${lines.join('\n')}`);
  return embed;
}

function rankIcon(rank) {
  const [name, id] = RANK_EMOJIS[String(rank || 'z').toLowerCase()] || [];
  return name ? `<:${name}:${id}>` : f.rankEmoji(rank);
}

module.exports = { buildScoreflowEmbed, buildLeagueflowEmbed, buildLeagueRanksEmbed };
