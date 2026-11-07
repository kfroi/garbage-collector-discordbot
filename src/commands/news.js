// /news [stream] [limit]  — all news, global news, or one user's news stream.
const { SlashCommandBuilder } = require('discord.js');
const api = require('../api/tetrio');
const { requireUsername } = require('../utils/context');
const { withCacheFooter } = require('../embeds/common');
const { buildNewsEmbed } = require('../embeds/news');

const data = new SlashCommandBuilder().setName('news').setDescription('TETRA NEWS feed')
  .addStringOption((o) => o.setName('stream').setDescription('"all" (default), "global", or a username'))
  .addIntegerOption((o) => o.setName('limit').setDescription('Items (1-25, default 10)').setMinValue(1).setMaxValue(25));

async function execute(ctx) {
  const stream = String(ctx.options.stream || 'all').toLowerCase();
  const limit = ctx.options.limit || 10;
  let res; let title;
  if (stream === 'all') { res = await api.getAllNews(limit); title = 'all streams'; }
  else if (stream === 'global') { res = await api.getNews('global', limit); title = 'global'; }
  else {
    const username = requireUsername(stream);
    const id = await api.resolveUserId(username);
    res = await api.getNews(`user_${id}`, limit);
    title = username;
  }
  await ctx.reply({ embeds: [withCacheFooter(buildNewsEmbed(res.data, title), res)] });
}

module.exports = { data, execute };
