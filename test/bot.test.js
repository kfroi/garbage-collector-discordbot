const test = require('node:test');
const assert = require('node:assert');
const fx = (n) => require(`./fixtures/${n}.json`);
const f = require('../src/utils/format');
const { parsePrefixArgs, tokenize } = require('../src/utils/context');
const api = require('../src/api/tetrio');

test('format helpers', () => {
  assert.strictEqual(f.formatTime(49091.67), '49.092s');
  assert.strictEqual(f.formatTime(62345), '1:02.345');
  assert.strictEqual(f.formatNumber(1234567), '1,234,567');
  assert.strictEqual(f.rankEmoji('z'), '⬜ Unranked');
  assert.strictEqual(f.flag('CA'), '🇨🇦');
  assert.strictEqual(f.formatDuration(-1), 'Hidden');
});

test('embeds build from real sample JSON without throwing', () => {
  const e = (m) => require(`../src/embeds/${m}`);
  const checks = [
    e('sprint').buildSprintEmbed(fx('summary_40l').data, 'osk'),
    e('zenith').buildZenithEmbed(fx('summary_zenith').data, 'osk'),
    e('league').buildLeagueEmbed(fx('summary_league').data, 'osk'),
    e('achievements').buildUserAchievementsEmbed(fx('summary_achievements').data, 'osk'),
    e('user').buildUserEmbed(fx('user').data),
    e('news').buildNewsEmbed(fx('news').data),
    e('labs').buildLeagueRanksEmbed(fx('league_ranks').data),
    e('search').buildSearchEmbed(fx('search').data, 'discord:username:osk'),
    e('blitz').buildBlitzEmbed({ record: null }, 'nobody'),
    e('stats').buildActivityEmbed({ activity: [5, 4, 3] }),
  ];
  for (const embed of checks) {
    const j = embed.toJSON();
    assert.ok(j.title);
    assert.ok(JSON.stringify(j).length < 6000, 'within Discord embed limits');
  }
  assert.match(checks[0].toJSON().description, /49\.092s/);
});

test('embeds survive missing / unexpected fields', () => {
  const { buildLeagueEmbed } = require('../src/embeds/league');
  const { buildUserEmbed } = require('../src/embeds/user');
  assert.ok(buildLeagueEmbed({}, 'x').toJSON().title);
  assert.ok(buildUserEmbed(null).toJSON().title);
});

test('prefix parser: subcommands, positional, name:value, choices, errors', () => {
  const lb = require('../src/commands/leaderboard').data.toJSON();
  assert.deepStrictEqual(parsePrefixArgs(lb, tokenize('users xp limit:5')), { subcommand: 'users', options: { type: 'xp', limit: 5 } });
  assert.throws(() => parsePrefixArgs(lb, ['nope']), (err) => err.kind === 'input' && /Unknown subcommand/.test(err.message));
  assert.throws(() => parsePrefixArgs(lb, tokenize('users xp limit:500')), (err) => err.kind === 'input');
  const search = require('../src/commands/search').data.toJSON();
  assert.deepStrictEqual(parsePrefixArgs(search, tokenize('twitch display_username Some Name')).options,
    { platform: 'twitch', by: 'display_username', value: 'Some Name' });
  assert.deepStrictEqual(parsePrefixArgs(search, tokenize('discord osk')).options, { platform: 'discord', value: 'osk' });
  assert.deepStrictEqual(parsePrefixArgs(search, tokenize('discord 123456789012345678 id')).options,
    { platform: 'discord', value: '123456789012345678', by: 'id' });
  assert.deepStrictEqual(parsePrefixArgs(search, tokenize('discord id 123456789012345678')).options,
    { platform: 'discord', by: 'id', value: '123456789012345678' });
  assert.deepStrictEqual(parsePrefixArgs(search, tokenize('discord id')).options, { platform: 'discord', value: 'id' });
  const tetrio = require('../src/commands/tetrio').data.toJSON();
  assert.deepStrictEqual(parsePrefixArgs(tetrio, ['league']), { subcommand: 'league', options: {} });
});

test('api: never targets the main game API', () => {
  assert.strictEqual(api.buildUrl('users/osk'), 'https://ch.tetr.io/api/users/osk');
  assert.throws(() => api.buildUrl('https://tetr.io/api/users/me'));
});

test('api: honors cache_until, sends UA + per-dataset X-Session-ID, maps errors', async () => {
  let clock = 1_000_000;
  const calls = [];
  api.configure({
    now: () => clock, minIntervalMs: 1, burst: 5,
    fetchImpl: async (url, opts) => {
      calls.push({ url, headers: opts.headers });
      if (url.includes('/users/ghost')) return { status: 404, json: async () => ({ success: false, error: { msg: 'No such user!' } }) };
      return { status: 200, json: async () => ({ success: true, data: { ok: url }, cache: { status: 'miss', cached_at: clock, cached_until: clock + 60_000 } }) };
    },
  });
  api.resetState();
  await api.getServerStats();
  await api.getServerStats(); // served from cache
  assert.strictEqual(calls.length, 1);
  clock += 61_000; // cache expired -> refetch
  await api.getServerStats();
  assert.strictEqual(calls.length, 2);
  assert.match(calls[0].headers['User-Agent'], /TetrioDiscordBot/);

  await api.getUserLeaderboard('xp', { limit: 10 });
  await api.getUserLeaderboard('xp', { limit: 10, after: '1:0:0' });
  await api.getUserLeaderboard('league', { limit: 10 });
  const sid = (i) => calls[i].headers['X-Session-ID'];
  assert.strictEqual(sid(2), sid(3), 'pages of the same dataset share a session');
  assert.notStrictEqual(sid(2), sid(4), 'different datasets get different sessions');
  assert.notStrictEqual(sid(0), sid(2));

  await assert.rejects(api.getUser('ghost'), (err) => err.kind === 'not_found');
  await assert.rejects(api.getUser('ghost'), (err) => err.kind === 'not_found');
  assert.strictEqual(calls.filter((c) => c.url.includes('ghost')).length, 1, '404s are cached briefly too');
});

test('api: rate limiter spaces requests beyond the burst', async () => {
  const times = [];
  api.configure({ now: () => Date.now(), minIntervalMs: 50, burst: 2, fetchImpl: async (url) => { times.push(Date.now()); return { status: 200, json: async () => ({ success: true, data: {}, cache: { cached_until: 0 } }) }; } });
  api.resetState();
  await Promise.all([1, 2, 3, 4].map((k) => api.getAchievement(k)));
  assert.strictEqual(times.length, 4);
  assert.ok(times[3] - times[0] >= 80, `expected spacing, got ${times[3] - times[0]}ms`);
});


test('commands: required options come before optional ones at every level (Discord rule 50035)', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const dir = path.join(__dirname, '..', 'src', 'commands');
  const check = (opts, where) => {
    let seenOptional = false;
    for (const o of opts || []) {
      if (o.type === 1 || o.type === 2) { check(o.options, `${where} ${o.name}`); continue; }
      if (!o.required) seenOptional = true;
      else assert.ok(!seenOptional, `${where}: required option "${o.name}" is declared after an optional one`);
    }
  };
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
    const json = require(path.join(dir, file)).data.toJSON();
    check(json.options, `/${json.name}`);
  }
});
