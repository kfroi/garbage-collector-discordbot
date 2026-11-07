// /achievement info | leaderboard
const { SlashCommandBuilder } = require('discord.js');
const api = require('../api/tetrio');
const { withCacheFooter } = require('../embeds/common');
const { buildAchievementInfoEmbed, buildAchievementLeaderboardEmbed, compressPairs } = require('../embeds/achievements');
const { register } = require('../utils/pagination');

const idOpt = (o) => o.setName('id').setDescription('Achievement ID (number)').setRequired(true).setMinValue(1);
const data = new SlashCommandBuilder().setName('achievement').setDescription('TETR.IO achievements')
  .addSubcommand((s) => s.setName('info').setDescription('Achievement details, cutoffs and top 10').addIntegerOption(idOpt))
  .addSubcommand((s) => s.setName('leaderboard').setDescription('Achievement leaderboard').addIntegerOption(idOpt)
    .addIntegerOption((o) => o.setName('limit').setDescription('Entries (1-100, displayed 10 per page)').setMinValue(1).setMaxValue(100)));

async function execute(ctx) {
  const { id, limit } = ctx.options;
  if (ctx.subcommand === 'info') {
    const res = await api.getAchievement(id);
    return ctx.reply({ embeds: [withCacheFooter(buildAchievementInfoEmbed(res.data), res)] });
  }
  // Achievement info (cached 5 min) gives name/value type so values format correctly.
  const info = await api.getAchievement(id);
  const res = await api.getAchievementEntries(id, { limit: limit || 10 });
  const ach = (info.data && info.data.achievement) || {};
  const entries = compressPairs(res.data && res.data.entries, ach.pair);
  const renderPage = register({
    entries,
    render: (pageEntries, offset) => withCacheFooter(
      buildAchievementLeaderboardEmbed(pageEntries, id, ach, offset), res),
    ownerId: ctx.user && ctx.user.id,
  });
  return ctx.reply(renderPage());
}

module.exports = { data, execute, aliases: ['ach'] };
