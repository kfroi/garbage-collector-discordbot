const { baseEmbed, addField, listDescription } = require('./common');
const f = require('../utils/format');

/** Format an achievement value according to its value type (vt). */
function achievementValue(a) {
  const v = a && a.v;
  if (!f.isNum(v)) return '—';
  switch (a.vt) {
    case 0: return '✔';
    case 2: return f.formatTime(v);
    case 3: return f.formatTime(-v);
    case 4: return `${f.formatNumber(v, 1)} m${f.isNum(a.a) ? ` (F${a.a})` : ''}`;
    case 5: return `issued ${f.discordTime(-v, 'D')}`;
    case 6: return f.formatNumber(-v, a.deci || 0);
    default: return f.formatNumber(v, a.deci || 0);
  }
}

function buildUserAchievementsEmbed(list, username) {
  const all = Array.isArray(list) ? list : [];
  const embed = baseEmbed(`Achievements — ${username}`, 0xf1c40f);
  if (!all.length) return embed.setDescription('No achievements yet.');
  const counts = {};
  for (const a of all) counts[a.rank] = (counts[a.rank] || 0) + 1;
  const top = all.slice().sort((x, y) => (y.rank || 0) - (x.rank || 0) || (x.pos ?? 1e9) - (y.pos ?? 1e9)).slice(0, 15);
  embed.setDescription(listDescription(top.map((a) =>
    `${f.medal(a.rank)} **${a.name || `#${a.k}`}** — ${achievementValue(a)}${f.isNum(a.pos) && f.isNum(a.total) ? ` (#${f.formatNumber(a.pos + 1)} of ${f.formatNumber(a.total)})` : ''}`)));
  addField(embed, 'Total', f.formatNumber(all.length));
  addField(embed, 'Medals', [5, 4, 3, 2, 1, 100].filter((r) => counts[r]).map((r) => `${f.medal(r)}: ${counts[r]}`).join('\n'));
  return embed;
}

/** Collapse pair-wise (duo) achievement entries that reference each other. */
function compressPairs(entries, pair) {
  if (!pair) return entries;
  const seen = new Set();
  return entries.filter((e) => {
    const id = e.u && e.u._id;
    if (seen.has(id)) return false;
    const ally = e.x && e.x.ally && e.x.ally._id;
    if (ally) seen.add(ally);
    seen.add(id);
    return true;
  });
}

function entryLine(e, i, ach, offset = 0) {
  const u = e.u || {};
  const ally = e.x && e.x.ally ? ` & ${e.x.ally.username}` : '';
  return `\`${String(offset + i + 1).padStart(3)}\` ${f.flag(u.country)} **${u.username || '?'}**${ally} — ${achievementValue({ ...ach, v: e.v, a: e.a })}`;
}

function buildAchievementInfoEmbed(data) {
  const d = data || {};
  const a = d.achievement || {};
  const embed = baseEmbed(`🏆 ${a.name || `Achievement #${a.k}`}`, 0xf1c40f)
    .setDescription(`${a.object ? `**${a.object}**\n` : ''}${a.desc ? `*${a.desc}*` : ''}` || 'No description.');
  addField(embed, 'Category', a.category);
  addField(embed, 'ID', String(a.k ?? '—'));
  if (a.event) addField(embed, 'Event', `${a.event}${a.event_past ? ' (ended)' : ''}`);
  if (a.disabled) addField(embed, 'Status', '⛔ Suspended');
  const c = d.cutoffs || {};
  const cut = ['diamond', 'platinum', 'gold', 'silver', 'bronze'].filter((k) => k in c)
    .map((k) => `${k}: ${c[k] === null ? 'any score' : achievementValue({ ...a, v: c[k] })}${f.isNum(c[`${k}_count`]) ? ` (${f.formatNumber(c[`${k}_count`])} players)` : ''}`);
  addField(embed, `Cutoffs (${f.formatNumber(c.total)} holders)`, cut.join('\n'), false);
  const lb = compressPairs(Array.isArray(d.leaderboard) ? d.leaderboard : [], a.pair).slice(0, 10);
  if (lb.length && !a.nolb) addField(embed, 'Top 10', lb.map((e, i) => entryLine(e, i, a)).join('\n'), false);
  return embed;
}

function buildAchievementLeaderboardEmbed(entries, k, ach = {}, offset = 0) {
  const list = compressPairs(Array.isArray(entries) ? entries : [], ach.pair);
  return baseEmbed(`🏆 Achievement #${k} leaderboard${ach.name ? ` — ${ach.name}` : ''}`, 0xf1c40f)
    .setDescription(listDescription(list.map((e, i) => entryLine(e, i, ach, offset)), 'No entries.'));
}

module.exports = { buildUserAchievementsEmbed, buildAchievementInfoEmbed, buildAchievementLeaderboardEmbed, achievementValue, compressPairs };
