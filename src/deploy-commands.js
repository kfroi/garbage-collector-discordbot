// Registers slash commands with Discord. Run only when command definitions change:  npm run deploy
require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env') });
const { REST, Routes } = require('discord.js');
const { loadCommands } = require('./index');

async function deploy() {
  const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;
  if (!DISCORD_TOKEN || !CLIENT_ID) { console.error('DISCORD_TOKEN and CLIENT_ID must be set in .env'); process.exit(1); }
  if (process.argv[2] === 'cleanup') {
    if (!GUILD_ID) { console.error('GUILD_ID must be set in .env to clean up guild commands'); process.exit(1); }
    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: [] });
    console.log(`Removed all guild commands from ${GUILD_ID}.`);
    return;
  }
  const body = loadCommands().list.map((c) => c.data.setDMPermission(true).toJSON());
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  const global = process.argv[2] === 'global';
  const route = GUILD_ID && !global
    ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
    : Routes.applicationCommands(CLIENT_ID);
  const result = await rest.put(route, { body });
  console.log(`Registered ${result.length} commands ${global || !GUILD_ID ? 'globally (can take up to 1h to appear)' : `in guild ${GUILD_ID} (instant)`}.`);
}

deploy().catch((err) => { console.error('Deploy failed:', err); process.exit(1); });
