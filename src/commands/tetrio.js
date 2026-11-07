// /tetrio <sub> <username>  — user info + every per-user summary endpoint.
const { SlashCommandBuilder } = require('discord.js');
const api = require('../api/tetrio');
const { usernameOrLinked } = require('../utils/context');
const { withCacheFooter } = require('../embeds/common');
const { buildUserEmbed } = require('../embeds/user');
const { buildLeagueEmbed } = require('../embeds/league');
const { buildSprintEmbed } = require('../embeds/sprint');
const { buildBlitzEmbed } = require('../embeds/blitz');
const { buildZenithEmbed } = require('../embeds/zenith');
const { buildZenEmbed } = require('../embeds/zen');
const { buildUserAchievementsEmbed } = require('../embeds/achievements');
const { buildAllSummariesEmbed } = require('../embeds/summaries');

const SUBS = {
  user: { desc: 'Profile: XP, badges, connections, playtime', run: (u) => api.getUser(u), build: (d) => buildUserEmbed(d) },
  league: { desc: 'TETRA LEAGUE summary', run: (u) => api.getUserSummary(u, 'league'), build: buildLeagueEmbed },
  sprint: { desc: '40 LINES personal best', run: (u) => api.getUserSummary(u, '40l'), build: buildSprintEmbed },
  blitz: { desc: 'BLITZ personal best', run: (u) => api.getUserSummary(u, 'blitz'), build: buildBlitzEmbed },
  zenith: { desc: 'QUICK PLAY (this week + career best)', run: (u) => api.getUserSummary(u, 'zenith'), build: (d, u) => buildZenithEmbed(d, u, false) },
  zenithex: { desc: 'EXPERT QUICK PLAY (this week + career best)', run: (u) => api.getUserSummary(u, 'zenithex'), build: (d, u) => buildZenithEmbed(d, u, true) },
  zen: { desc: 'ZEN level and score', run: (u) => api.getUserSummary(u, 'zen'), build: buildZenEmbed },
  achievements: { desc: "User's achievements", run: (u) => api.getUserSummary(u, 'achievements'), build: buildUserAchievementsEmbed },
  all: { desc: 'One-embed overview of every mode (heavier request)', run: (u) => api.getAllSummaries(u), build: buildAllSummariesEmbed },
};

const data = new SlashCommandBuilder().setName('tetr').setDescription('Look up a TETR.IO player');
for (const [name, sub] of Object.entries(SUBS)) {
  data.addSubcommand((s) => s.setName(name).setDescription(sub.desc)
    .addStringOption((o) => o.setName('username').setDescription('TETR.IO username or user ID (defaults to your linked account)')));
}

async function execute(ctx) {
  const sub = SUBS[ctx.subcommand];
  const username = usernameOrLinked(ctx.options.username, ctx.user.id);
  const res = await sub.run(username);
  await ctx.reply({ embeds: [withCacheFooter(sub.build(res.data, username), res)] });
}

module.exports = { data, execute, aliases: ['t', 'tr'] };
