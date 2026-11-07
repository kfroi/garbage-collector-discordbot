const { baseEmbed, listDescription } = require('./common');
const f = require('../utils/format');

/** Turn one news item into a line. New types may appear at any time -> generic fallback. */
function newsLine(item) {
  const d = (item && item.data) || {};
  const who = d.username ? `**${d.username}**` : 'Someone';
  const when = f.discordTime(item && item.ts);
  const mode = { '40l': '40 LINES', blitz: 'BLITZ', zenith: 'QUICK PLAY', zenithex: 'EXPERT QUICK PLAY' }[d.gametype] || d.gametype;
  switch (item && item.type) {
    case 'leaderboard': return `🏆 ${who} placed **#${d.rank}** on the global ${mode} leaderboard with ${f.formatResult(d.gametype, d.result)} ${when}`;
    case 'personalbest': return `⭐ ${who} got a new ${mode} PB: ${f.formatResult(d.gametype, d.result)} ${when}`;
    case 'badge': return `🎖️ ${who} earned the badge **${d.label || d.type}** ${when}`;
    case 'rankup': return `📈 ${who} reached ${f.rankEmoji(d.rank)} in TETRA LEAGUE ${when}`;
    case 'supporter': return `💖 ${who} became a TETR.IO Supporter ${when}`;
    case 'supporter_gift': return `🎁 ${who} was gifted TETR.IO Supporter ${when}`;
    default: return `📰 ${who}: ${(item && item.type) || 'news'} ${when}`;
  }
}

function buildNewsEmbed(data, title = 'Latest news') {
  const news = (data && Array.isArray(data.news)) ? data.news : [];
  return baseEmbed(`📰 TETRA NEWS — ${title}`, 0x3498db).setDescription(listDescription(news.map(newsLine), 'No news yet.'));
}

module.exports = { buildNewsEmbed, newsLine };
