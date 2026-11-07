const { baseEmbed, addField } = require('./common');
const f = require('../utils/format');
const { stats, agg, replayLink } = require('./record');

function runText(r) {
  const s = stats(r);
  const z = s.zenith || {};
  const a = agg(r);
  const mods = (r.extras && r.extras.zenith && r.extras.zenith.mods) || [];
  return [
    `🏔️ **${f.formatNumber(z.altitude, 1)} m** (Floor ${z.floor ?? '?'}) ${replayLink(r)}`,
    `${f.formatNumber(a.apm, 2)} APM • ${f.formatNumber(a.pps, 2)} PPS • ${f.formatNumber(a.vsscore, 2)} VS`,
    `KOs: ${f.formatNumber(s.kills)}${mods.length ? ` • Mods: ${mods.join(', ')}` : ''} • ${f.discordTime(r.ts)}`,
  ].join('\n');
}

/** QUICK PLAY (zenith) and EXPERT QUICK PLAY (zenithex) share one layout. */
function buildZenithEmbed(data, username, expert = false) {
  const d = data || {};
  const embed = baseEmbed(`${expert ? 'EXPERT ' : ''}QUICK PLAY — ${username}`, expert ? 0xc0392b : 0xf39c12);
  embed.setDescription(d.record ? runText(d.record) : 'No run this week.');
  if (d.record) {
    addField(embed, 'Weekly global rank', f.posOrDash(d.rank));
    addField(embed, 'Weekly local rank', f.posOrDash(d.rank_local));
  }
  const best = d.best || {};
  addField(embed, `Career best${f.isNum(best.rank) && best.rank > 0 ? ` (finished #${f.formatNumber(best.rank)})` : ''}`, best.record ? runText(best.record) : 'No career best yet.', false);
  return embed;
}

module.exports = { buildZenithEmbed };
