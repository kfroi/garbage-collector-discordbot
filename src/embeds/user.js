const { baseEmbed, addField } = require('./common');
const f = require('../utils/format');

function buildUserEmbed(user) {
  const u = user || {};
  const name = u.username || 'unknown';
  const embed = baseEmbed(`${f.flag(u.country)} ${name.toUpperCase()}`.trim())
    .setURL(`https://ch.tetr.io/u/${encodeURIComponent(name)}`);
  if (u._id && f.isNum(u.avatar_revision)) embed.setThumbnail(`https://tetr.io/user-content/avatars/${u._id}.jpg?rv=${u.avatar_revision}`);
  if (u.supporter && u.bio) embed.setDescription(f.truncate(u.bio, 1000));
  addField(embed, 'Role', String(u.role || '—') + (u.botmaster ? ` (operated by ${u.botmaster})` : ''));
  addField(embed, 'XP', f.formatNumber(u.xp));
  addField(embed, 'Achievement Rating', f.formatNumber(u.ar));
  addField(embed, 'Online games', `${f.hiddenOr(u.gameswon)} won / ${f.hiddenOr(u.gamesplayed)} played`);
  addField(embed, 'Time played', f.formatDuration(u.gametime));
  addField(embed, 'Friends', f.formatNumber(u.friend_count));
  addField(embed, 'Joined', u.ts ? f.discordTime(u.ts, 'D') : 'Before join dates were recorded');
  if (u.supporter) addField(embed, 'Supporter', `💖 Tier ${f.isNum(u.supporter_tier) ? u.supporter_tier : '?'}`);
  if (u.badstanding) addField(embed, 'Standing', '⚠️ Bad standing');
  const badges = Array.isArray(u.badges) ? u.badges : [];
  if (badges.length) addField(embed, `Badges (${badges.length})`, badges.slice(0, 12).map((b) => b.label || b.id).join(', ') + (badges.length > 12 ? ', …' : ''), false);
  const conns = Object.entries(u.connections || {}).filter(([, c]) => c && (c.display_username || c.username));
  if (conns.length) addField(embed, 'Connections', conns.map(([k, c]) => `**${k}**: ${c.display_username || c.username}`).join('\n'), false);
  const old = Array.isArray(u.oldusernames) ? u.oldusernames : [];
  if (old.length) addField(embed, 'Previous usernames', old.slice(0, 10).map((o) => o.username).join(', '), false);
  return embed;
}

module.exports = { buildUserEmbed };
