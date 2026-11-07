const { SlashCommandBuilder } = require('discord.js');
const api = require('../api/tetrio');
const { requireUsername } = require('../utils/context');
const { getLinkedUsername, linkUsername, unlinkUsername } = require('../utils/links');

const data = new SlashCommandBuilder().setName('link').setDescription('Link your Discord account to a TETR.IO username')
  .addStringOption((o) => o.setName('username').setDescription('Your TETR.IO username or user ID').setRequired(true));

async function execute(ctx) {
  const username = requireUsername(ctx.options.username);
  const user = await api.getUser(username);
  const linkedUsername = user.data && user.data.username ? user.data.username : username;
  const previous = getLinkedUsername(ctx.user.id);
  linkUsername(ctx.user.id, linkedUsername);
  await ctx.reply({ content: previous ? `Updated your linked TETR.IO username from \`${previous}\` to \`${linkedUsername}\`.` : `Linked your TETR.IO username as \`${linkedUsername}\`.` });
}

module.exports = { data, execute };
