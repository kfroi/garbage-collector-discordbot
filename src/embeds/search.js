const { baseEmbed, listDescription } = require('./common');
const f = require('../utils/format');

function buildSearchEmbed(data, query) {
  const users = (data && Array.isArray(data.users)) ? data.users : [];
  return baseEmbed(`🔎 Users linked to ${query}`)
    .setDescription(listDescription(users.map((u) => `• ${f.userLink(u.username)} (\`${u._id}\`)`), 'No TETR.IO account is linked to that connection.'));
}

module.exports = { buildSearchEmbed };
