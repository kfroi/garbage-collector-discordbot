// /leaderboard users | history | records
const { SlashCommandBuilder } = require('discord.js');
const api = require('../api/tetrio');
const { inputError } = require('../utils/errors');
const { withCacheFooter } = require('../embeds/common');
const { buildUserLeaderboardEmbed, buildHistoryLeaderboardEmbed } = require('../embeds/leaderboard');
const { buildRecordsLeaderboardEmbed } = require('../embeds/records');
const { register } = require('../utils/pagination');

const PRISECTER = /^-?[\d.e+-]+:-?[\d.e+-]+:-?[\d.e+-]+$/i;
const addPaging = (s) => s
  .addStringOption((o) => o.setName('country').setDescription('2-letter country code, e.g. CA'))
  .addIntegerOption((o) => o.setName('limit').setDescription('Entries (1-100, displayed 10 per page)').setMinValue(1).setMaxValue(100));

const data = new SlashCommandBuilder().setName('leaderboard').setDescription('TETR.IO leaderboards')
  .addSubcommand((s) => addPaging(s.setName('users').setDescription('Live player leaderboards')
    .addStringOption((o) => o.setName('type').setDescription('Which leaderboard').addChoices(
      { name: 'TETRA LEAGUE', value: 'league' }, { name: 'XP', value: 'xp' }, { name: 'Achievement Rating', value: 'ar' }))))
  .addSubcommand((s) => addPaging(s.setName('history').setDescription('Final TETRA LEAGUE standings of a past season')
    .addStringOption((o) => o.setName('season').setDescription('Season ID, e.g. 1').setRequired(true))))
  .addSubcommand((s) => addPaging(s.setName('records').setDescription('Best records in a single-player mode')
    .addStringOption((o) => o.setName('gamemode').setDescription('Game mode').setRequired(true).addChoices(
      { name: '40 LINES', value: '40l' }, { name: 'BLITZ', value: 'blitz' }, { name: 'QUICK PLAY', value: 'zenith' }, { name: 'EXPERT QUICK PLAY', value: 'zenithex' }))
    .addStringOption((o) => o.setName('revolution').setDescription('Past week for QUICK PLAY, e.g. 2024w31'))));

function readPaging(o) {
  const country = o.country ? String(o.country).toUpperCase() : undefined;
  if (country && !/^[A-Z]{2}$/.test(country)) throw inputError('`country` must be a 2-letter ISO code like CA or US.');
  return { country, limit: o.limit || 10 };
}

async function execute(ctx) {
  const o = ctx.options;
  const paging = readPaging(o);
  let res; let render;
  if (ctx.subcommand === 'users') {
    const type = o.type || 'league';
    res = await api.getUserLeaderboard(type, paging);
    render = (entries, offset) => withCacheFooter(
      buildUserLeaderboardEmbed({ entries }, { type, country: paging.country, offset }), res);
  } else if (ctx.subcommand === 'history') {
    if (!/^[\w.-]{1,20}$/.test(o.season)) throw inputError('`season` looks invalid (try 1).');
    res = await api.getHistoricalLeaderboard('league', o.season, paging);
    render = (entries) => withCacheFooter(
      buildHistoryLeaderboardEmbed({ entries }, { season: o.season, country: paging.country }), res);
  } else {
    const rev = o.revolution ? String(o.revolution).replace(/^@/, '') : '';
    if (rev && !/^\d{4}w\d{1,2}$/i.test(rev)) throw inputError('`revolution` must look like 2024w31.');
    const id = `${o.gamemode}_${paging.country ? `country_${paging.country}` : 'global'}${rev ? `@${rev}` : ''}`;
    res = await api.getRecordsLeaderboard(id, paging);
    render = (entries, offset) => withCacheFooter(buildRecordsLeaderboardEmbed({ entries }, id, offset), res);
  }
  const renderPage = register({
    entries: res.data && Array.isArray(res.data.entries) ? res.data.entries : [],
    render,
    ownerId: ctx.user && ctx.user.id,
  });
  await ctx.reply(renderPage());
}

module.exports = { data, execute, aliases: ['lb'] };
