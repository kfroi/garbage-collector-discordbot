const { baseEmbed, listDescription } = require('./common');
const f = require('../utils/format');
const { recordLine, replayLink } = require('./record');

const MODE_NAMES = { '40l': '40 LINES', blitz: 'BLITZ', zenith: 'QUICK PLAY', zenithex: 'EXPERT QUICK PLAY', league: 'TETRA LEAGUE' };
const modeName = (m) => MODE_NAMES[m] || String(m || '').toUpperCase();

/** /records/:leaderboard */
function buildRecordsLeaderboardEmbed(data, leaderboardId, offset = 0) {
  const entries = (data && Array.isArray(data.entries)) ? data.entries : [];
  const [mode] = String(leaderboardId).split('_');
  return baseEmbed(`🏁 ${modeName(mode)} records — ${leaderboardId}`)
    .setDescription(listDescription(entries.map((r, i) =>
      `\`${String(offset + i + 1).padStart(3)}\` ${f.flag(r.user && r.user.country)} **${(r.user && r.user.username) || '?'}** — ${recordLine(r)}`), 'No records found.'));
}

/** /users/:user/records/:gamemode/:leaderboard */
function buildUserRecordsEmbed(data, { username, gamemode, type }) {
  const entries = (data && Array.isArray(data.entries)) ? data.entries : [];
  return baseEmbed(`📒 ${username} — ${modeName(gamemode)} (${type})`)
    .setDescription(listDescription(entries.map((r, i) =>
      `\`${String(i + 1).padStart(2)}\` ${recordLine(r)} • ${f.discordTime(r.ts)} ${replayLink(r)}${r.pb ? ' ⭐' : ''}`), 'No records found.'));
}

module.exports = { buildRecordsLeaderboardEmbed, buildUserRecordsEmbed, modeName };
