// /records user
const { SlashCommandBuilder } = require('discord.js');
const api = require('../api/tetrio');
const { usernameOrLinked } = require('../utils/context');
const { withCacheFooter } = require('../embeds/common');
const { buildUserRecordsEmbed } = require('../embeds/records');
const { addNextPageHint } = require('../embeds/leaderboard');

const MODES = [{ name: '40 LINES', value: '40l' }, { name: 'BLITZ', value: 'blitz' }, { name: 'QUICK PLAY', value: 'zenith' },
  { name: 'EXPERT QUICK PLAY', value: 'zenithex' }, { name: 'TETRA LEAGUE', value: 'league' }];

const data = new SlashCommandBuilder().setName('records').setDescription("A player's game records")
  .addSubcommand((s) => s.setName('user').setDescription("A player's top / recent / PB-progression records")
    .addStringOption((o) => o.setName('gamemode').setDescription('Game mode').setRequired(true).addChoices(...MODES))
    .addStringOption((o) => o.setName('username').setDescription('TETR.IO username or user ID (defaults to your linked account)'))
    .addStringOption((o) => o.setName('type').setDescription('Which list (default: top)').addChoices(
      { name: 'Top scores', value: 'top' }, { name: 'Most recent', value: 'recent' }, { name: 'PB progression', value: 'progression' }))
    .addIntegerOption((o) => o.setName('limit').setDescription('Entries (1-25, default 10)').setMinValue(1).setMaxValue(25))
    .addStringOption((o) => o.setName('after').setDescription('Cursor from "Next page"')));

async function execute(ctx) {
  const o = ctx.options;
  if (ctx.subcommand === 'user') {
    const type = o.type || 'top';
    const username = usernameOrLinked(o.username, ctx.user.id);
    const res = await api.getUserRecords(username, o.gamemode, type, { limit: o.limit || 10, after: o.after });
    const embed = buildUserRecordsEmbed(res.data, { username, gamemode: o.gamemode, type });
    addNextPageHint(embed, res.data && res.data.entries, `t?records user ${username} ${o.gamemode} ${type}`);
    return ctx.reply({ embeds: [withCacheFooter(embed, res)] });
  }
}

module.exports = { data, execute, aliases: ['rec'] };
