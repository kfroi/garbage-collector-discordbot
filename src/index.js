// Entry point: client setup, login, event wiring. Auto-loads every file in ./commands.
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client, GatewayIntentBits, Events, Partials, ActivityType } = require('discord.js');
const { fromInteraction, fromMessage, tokenize } = require('./utils/context');
const { buildErrorEmbed } = require('./embeds/common');
const { handleButton } = require('./utils/pagination');

const PREFIX = process.env.PREFIX || 't?';

/** Load commands/*.js -> { byName: Map, list: [] }. A new command is just a new file. */
function loadCommands(dir = path.join(__dirname, 'commands')) {
  const byName = new Map();
  const list = [];
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
    const cmd = require(path.join(dir, file));
    if (!cmd.data || typeof cmd.execute !== 'function') { console.warn(`[commands] skipping ${file}: missing data/execute`); continue; }
    list.push(cmd);
    byName.set(cmd.data.name, cmd);
    for (const alias of cmd.aliases || []) byName.set(alias, cmd);
  }
  return { byName, list };
}

/** Run a command with a context; every failure becomes a friendly error embed. */
async function run(cmd, ctx, commands) {
  ctx.commands = commands.list;
  ctx.prefix = PREFIX;
  try {
    await ctx.defer();
    await cmd.execute(ctx);
  } catch (err) {
    if (!err || !err.kind || err.kind === 'internal') console.error('[command error]', err);
    await ctx.reply({ embeds: [buildErrorEmbed(err)] }).catch((e) => console.error('[reply failed]', e));
  }
}

function start() {
  const token = process.env.DISCORD_TOKEN;
  if (!token) { console.error('DISCORD_TOKEN is missing. Copy .env.example to .env and fill it in.'); process.exit(1); }
  const commands = loadCommands();
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages],
    partials: [Partials.Channel],
  });

  client.once(Events.ClientReady, async (c) => {
    try {
      await c.user.setAvatar(fs.readFileSync(path.join(__dirname, 'icon', 'tetrio-anim.gif')));
    } catch (err) {
      console.error('[avatar] failed to apply src/icon/tetrio-anim.gif', err);
    }

    c.user.setPresence({
      status: 'online',
      activities: [{
        name: 'TETR.IO',
        type: ActivityType.Playing,
        state: 'Collecting garbage',
        details: 'Monitoring the stack',
      }],
    });
    console.log(`Logged in as ${c.user.tag}. Prefix: ${PREFIX} • ${commands.list.length} commands loaded.`);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isButton()) {
      await handleButton(interaction);
      return;
    }
    if (!interaction.isChatInputCommand()) return;
    const cmd = commands.byName.get(interaction.commandName);
    if (!cmd) return;
    await run(cmd, fromInteraction(interaction), commands);
  });

  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.content.toLowerCase().startsWith(PREFIX.toLowerCase())) return;
    const tokens = tokenize(message.content.slice(PREFIX.length));
    const name = (tokens.shift() || 'help').toLowerCase();
    const cmd = commands.byName.get(name);
    if (!cmd) return; // ignore unknown commands quietly (avoid spam)
    let ctx;
    try {
      ctx = fromMessage(message, cmd, tokens, PREFIX);
    } catch (err) {
      await message.reply({ embeds: [buildErrorEmbed(err)], allowedMentions: { repliedUser: false } }).catch(() => null);
      return;
    }
    await run(cmd, ctx, commands);
  });

  client.login(token);
}

if (require.main === module) start();
module.exports = { loadCommands, run };
