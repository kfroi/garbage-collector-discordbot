// /labs scoreflow | leagueflow | ranks
const { SlashCommandBuilder } = require('discord.js');
const api = require('../api/tetrio');
const { usernameOrLinked } = require('../utils/context');
const { withCacheFooter } = require('../embeds/common');
const { buildScoreflowEmbed, buildLeagueflowEmbed, buildLeagueRanksEmbed } = require('../embeds/labs');

const data = new SlashCommandBuilder().setName('labs').setDescription('TETRA CHANNEL Labs charts')
  .addSubcommand((s) => s.setName('scoreflow').setDescription("Chart of a player's scores in a mode")
    .addStringOption((o) => o.setName('gamemode').setDescription('Game mode').setRequired(true).addChoices(
      { name: '40 LINES', value: '40l' }, { name: 'BLITZ', value: 'blitz' }))
    .addStringOption((o) => o.setName('username').setDescription('TETR.IO username or user ID (defaults to your linked account)')))
  .addSubcommand((s) => s.setName('leagueflow').setDescription("Chart of a player's TETRA LEAGUE matches")
    .addStringOption((o) => o.setName('username').setDescription('TETR.IO username or user ID (defaults to your linked account)')))
  .addSubcommand((s) => s.setName('ranks').setDescription('TR needed for every TETRA LEAGUE rank'));

async function execute(ctx) {
  const o = ctx.options;
  let res; let embed;
  if (ctx.subcommand === 'ranks') {
    res = await api.getLeagueRanks();
    embed = buildLeagueRanksEmbed(res.data);
  } else if (ctx.subcommand === 'leagueflow') {
    const username = usernameOrLinked(o.username, ctx.user.id);
    res = await api.getLeagueflow(username);
    embed = buildLeagueflowEmbed(res.data, username);
  } else {
    const username = usernameOrLinked(o.username, ctx.user.id);
    res = await api.getScoreflow(username, o.gamemode);
    embed = buildScoreflowEmbed(res.data, { username, gamemode: o.gamemode });
  }
  await ctx.reply({ embeds: [withCacheFooter(embed, res)] });
}

module.exports = { data, execute };
