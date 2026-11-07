// /server stats | activity
const { SlashCommandBuilder } = require('discord.js');
const api = require('../api/tetrio');
const { withCacheFooter } = require('../embeds/common');
const { buildServerStatsEmbed, buildActivityEmbed } = require('../embeds/stats');

const data = new SlashCommandBuilder().setName('server').setDescription('TETR.IO server info')
  .addSubcommand((s) => s.setName('stats').setDescription('Global server statistics'))
  .addSubcommand((s) => s.setName('activity').setDescription('Players online over the last 2 days'));

async function execute(ctx) {
  const res = ctx.subcommand === 'activity' ? await api.getServerActivity() : await api.getServerStats();
  const embed = ctx.subcommand === 'activity' ? buildActivityEmbed(res.data) : buildServerStatsEmbed(res.data);
  await ctx.reply({ embeds: [withCacheFooter(embed, res)] });
}

module.exports = { data, execute, aliases: ['stats'] };
