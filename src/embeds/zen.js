const { baseEmbed, addField } = require('./common');
const f = require('../utils/format');

function buildZenEmbed(data, username) {
  const d = data || {};
  const embed = baseEmbed(`ZEN — ${username}`, 0x1abc9c).setDescription('🧘 Endless, relaxed mode progress.');
  addField(embed, 'Level', f.formatNumber(d.level));
  addField(embed, 'Score', f.formatNumber(d.score));
  return embed;
}

module.exports = { buildZenEmbed };
