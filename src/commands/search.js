// /search <platform> <value> [by]  (prefix also accepts: t?search <platform> [by] <value>) — find TETR.IO accounts by a linked social connection.
const { SlashCommandBuilder } = require('discord.js');
const api = require('../api/tetrio');
const { inputError } = require('../utils/errors');
const { withCacheFooter } = require('../embeds/common');
const { buildSearchEmbed } = require('../embeds/search');

const data = new SlashCommandBuilder().setName('search').setDescription('Find a TETR.IO account by a linked social account')
  .addStringOption((o) => o.setName('platform').setDescription('Platform').setRequired(true).addChoices(
    ...['discord', 'twitch', 'twitter', 'reddit', 'youtube', 'steam'].map((p) => ({ name: p, value: p }))))
  // Discord requires required options before optional ones, so `value` comes before `by`.
  .addStringOption((o) => o.setName('value').setDescription('The ID / username to look for').setRequired(true))
  .addStringOption((o) => o.setName('by').setDescription('Field to match (default: username)').addChoices(
    { name: 'id', value: 'id' }, { name: 'username', value: 'username' }, { name: 'display_username', value: 'display_username' }));

async function execute(ctx) {
  const { platform, value } = ctx.options;
  let by = ctx.options.by || 'username';
  if (by === 'display_username' && !['twitch', 'twitter'].includes(platform)) {
    throw inputError('`display_username` only exists for twitch and twitter. Use `username` or `id`.');
  }
  // With no explicit field, a /search discord with the caller's own user ID looks up by ID.
  if (!ctx.options.by && platform === 'discord' && /^\d{15,21}$/.test(value)) by = 'id';
  const query = `${platform}:${by}:${String(value).trim()}`;
  const res = await api.searchUsers(query);
  await ctx.reply({ embeds: [withCacheFooter(buildSearchEmbed(res.data, query), res)] });
}

module.exports = { data, execute };
