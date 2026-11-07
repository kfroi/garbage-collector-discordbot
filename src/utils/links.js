const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', '..', 'data', 'user-links.json');

function readLinks() {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    throw err;
  }
}

function writeLinks(links) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(links, null, 2)}\n`, 'utf8');
  fs.renameSync(temp, file);
}

function getLinkedUsername(discordId) {
  return readLinks()[discordId];
}

function linkUsername(discordId, username) {
  const links = readLinks();
  links[discordId] = username;
  writeLinks(links);
}

function unlinkUsername(discordId) {
  const links = readLinks();
  const previous = links[discordId];
  if (previous !== undefined) {
    delete links[discordId];
    writeLinks(links);
  }
  return previous;
}

module.exports = { getLinkedUsername, linkUsername, unlinkUsername };
