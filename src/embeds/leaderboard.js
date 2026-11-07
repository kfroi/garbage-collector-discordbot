const { baseEmbed, listDescription } = require('./common');
const f = require('../utils/format');

const LB_TITLES = { league: 'TETRA LEAGUE', xp: 'XP', ar: 'Achievement Rating' };

function userLine(e, i, type, offset = 0) {
  const lg = e.league || {};
  const value = type === 'xp' ? `${f.formatNumber(e.xp)} XP`
    : type === 'ar' ? `${f.formatNumber(e.ar)} AR`
      : `${f.rankEmoji(lg.rank)} ${f.formatNumber(lg.tr, 2)} TR`;
  return `\`${String(offset + i + 1).padStart(3)}\` ${f.flag(e.country)} **${e.username || '?'}** — ${value}`;
}

/** /users/by/:leaderboard */
function buildUserLeaderboardEmbed(data, { type = 'league', country, offset = 0 } = {}) {
  const entries = (data && Array.isArray(data.entries)) ? data.entries : [];
  return baseEmbed(`🏅 ${LB_TITLES[type] || type} leaderboard${country ? ` — ${f.flag(country)} ${country.toUpperCase()}` : ''}`)
    .setDescription(listDescription(entries.map((e, i) => userLine(e, i, type, offset)), 'No players found.'));
}

/** /users/history/:leaderboard/:season */
function buildHistoryLeaderboardEmbed(data, { season, country } = {}) {
  const entries = (data && Array.isArray(data.entries)) ? data.entries : [];
  return baseEmbed(`📜 TETRA LEAGUE — Season ${season} final standings${country ? ` (${country.toUpperCase()})` : ''}`)
    .setDescription(listDescription(entries.map((e) =>
      `\`${String(f.isNum(e.placement) ? e.placement : '?').padStart(4)}\` ${f.flag(e.country)} **${e.username || '?'}** — ${f.rankEmoji(e.rank)} ${f.formatNumber(e.tr, 0)} TR`), 'No entries for this season.'));
}

/** "next page" hint shared by all paginated embeds. */
function addNextPageHint(embed, entries, commandHint) {
  const last = Array.isArray(entries) && entries.length ? entries[entries.length - 1] : null;
  const p = last && f.prisecter(last.p);
  if (p) embed.addFields({ name: 'Next page', value: `\`${commandHint} after:${p}\``, inline: false });
  return embed;
}

module.exports = { buildUserLeaderboardEmbed, buildHistoryLeaderboardEmbed, addNextPageHint };
