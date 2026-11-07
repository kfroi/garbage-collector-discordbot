const { SlashCommandBuilder } = require('discord.js');
const { getLinkedUsername, unlinkUsername } = require('../utils/links');
const { inputError } = require('../utils/errors');

const data = new SlashCommandBuilder().setName('unlink').setDescription('Remove your linked TETR.IO username');

async function execute(ctx) {
  const username = getLinkedUsername(ctx.user.id);
  if (!username) throw inputError('You do not have a linked TETR.IO username.');
  unlinkUsername(ctx.user.id);
  await ctx.reply({ content: `Removed your linked TETR.IO username \`${username}\`.` });
}

module.exports = { data, execute };
