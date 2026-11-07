// Shared embed helpers (pure: data in, EmbedBuilder out).
const { EmbedBuilder } = require('discord.js');
const { DEFAULT_COLOR, truncate } = require('../utils/format');

function baseEmbed(title, color = DEFAULT_COLOR) {
  return new EmbedBuilder().setTitle(truncate(title, 256)).setColor(color);
}

/** Footer describing where data came from and how fresh it is. */
function withCacheFooter(embed, meta) {
  const parts = ['Data: TETRA CHANNEL (ch.tetr.io)'];
  if (meta && meta.fromCache) parts.push('served from bot cache');
  else if (meta && meta.cache && meta.cache.status) parts.push(`server cache: ${meta.cache.status}`);
  embed.setFooter({ text: parts.join(' • ') });
  const at = meta && meta.cache && Number(meta.cache.cached_at);
  if (Number.isFinite(at) && at > 0) embed.setTimestamp(at);
  return embed;
}

/** Add a field only if it has a real value; keeps Discord's 25-field / 1024-char limits. */
function addField(embed, name, value, inline = true) {
  if (value === undefined || value === null || value === '' || value === '—') return embed;
  if ((embed.data.fields || []).length >= 25) return embed;
  return embed.addFields({ name: truncate(name, 256), value: truncate(value, 1024), inline });
}

const ERROR_STYLE = {
  input: { title: '⚠️ Invalid input', color: 0xf1c40f },
  not_found: { title: '🔍 Not found', color: 0xe67e22 },
  rate_limited: { title: '⏳ Slow down', color: 0xe67e22 },
  timeout: { title: '⌛ TETR.IO timed out', color: 0xe74c3c },
  network: { title: '📡 Network error', color: 0xe74c3c },
  api: { title: '❌ TETR.IO returned an error', color: 0xe74c3c },
  internal: { title: '💥 Something went wrong', color: 0xe74c3c },
};

function buildErrorEmbed(err) {
  const style = ERROR_STYLE[err && err.kind] || ERROR_STYLE.internal;
  const msg = err && err.kind ? err.message : 'An unexpected error occurred. It has been logged.';
  const embed = baseEmbed(style.title, style.color).setDescription(truncate(msg, 2000));
  if (err && err.usage) addField(embed, 'Usage', `\`\`\`\n${err.usage}\n\`\`\``, false);
  return embed;
}

/** Numbered list lines -> description, respecting the 4096-char limit. */
function listDescription(lines, empty = 'Nothing to show.') {
  if (!lines.length) return empty;
  let out = '';
  for (const line of lines) {
    if (out.length + line.length + 1 > 4000) { out += '\n…'; break; }
    out += `${out ? '\n' : ''}${line}`;
  }
  return out;
}

module.exports = { baseEmbed, withCacheFooter, addField, buildErrorEmbed, listDescription };
