// /help — lists every command (built from the loaded command definitions).
const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, addField } = require('../embeds/common');
const { usageFor } = require('../utils/context');

const data = new SlashCommandBuilder().setName('help').setDescription('How to use this bot');

async function execute(ctx) {
  const prefix = ctx.prefix || 't?';
  const embed = baseEmbed('TETR.IO bot — help').setDescription(
    `Use slash commands (\`/tetr league\`) or the prefix \`${prefix}\` (\`${prefix}tetr league osk\`).\n` +
    'Prefix args are positional, or `name:value`. Wrap text with spaces in "quotes".');
  for (const cmd of (ctx.commands || [])) {
    const json = cmd.data.toJSON();
    addField(embed, `/${json.name}${cmd.aliases ? ` (aliases: ${cmd.aliases.join(', ')})` : ''}`, `\`\`\`\n${usageFor(prefix, json)}\n\`\`\``, false);
  }
  await ctx.reply({ embeds: [embed] });
}

module.exports = { data, execute, aliases: ['h', 'commands'] };
