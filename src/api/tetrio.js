// The ONLY module that knows about HTTP. Everything that touches ch.tetr.io lives here:
// User-Agent, rate limiting (queue), caching (cache.cached_until), X-Session-ID, error handling.
const crypto = require('node:crypto');
const { makeError } = require('../utils/errors');

const BASE = 'https://ch.tetr.io/api/';
const DEFAULT_UA = 'TetrioDiscordBot/1.0 (discord.js; self-hosted community bot)';
const NEGATIVE_CACHE_MS = 60_000; // remember "not found" answers for a minute
const FALLBACK_CACHE_MS = 60_000; // used only if a response has no cache object
const SESSION_IDLE_MS = 60 * 60_000; // forget a dataset's session after 1h of no use

// Module state: plain objects/Maps only.
const state = {
  fetchImpl: (...a) => globalThis.fetch(...a),
  now: () => Date.now(),
  userAgent: process.env.BOT_USER_AGENT || DEFAULT_UA,
  minIntervalMs: 1000, // ~1 request / second on average
  burst: 3, // short bursts are OK per the rules
  tokens: 3,
  lastRefill: Date.now(),
  queue: [],
  draining: false,
  cache: new Map(), // url -> { expires, body }
  inflight: new Map(), // url -> Promise (dedupes identical concurrent requests)
  sessions: new Map(), // datasetKey -> { id, lastUsed }
  stats: { requests: 0, cacheHits: 0 },
};

function configure(opts = {}) {
  Object.assign(state, opts);
  if (opts.burst !== undefined) state.tokens = opts.burst;
}

function resetState() {
  state.cache.clear();
  state.inflight.clear();
  state.sessions.clear();
  state.queue.length = 0;
  state.tokens = state.burst;
  state.lastRefill = state.now();
  state.stats = { requests: 0, cacheHits: 0 };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- URL building (hard guard against the forbidden main game API) ----------
function buildUrl(path, query = {}) {
  const url = new URL(path.replace(/^\/+/, ''), BASE);
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  if (url.origin !== 'https://ch.tetr.io' || !url.pathname.startsWith('/api/')) {
    throw makeError('internal', 'Refusing to call anything other than the TETRA CHANNEL API (ch.tetr.io/api).');
  }
  return url.toString();
}

// Dataset = path + filters, WITHOUT pagination params. Pages of the same leaderboard
// share one X-Session-ID (consistent data); unrelated requests never share one.
function datasetKey(path, query = {}) {
  const filters = Object.entries(query)
    .filter(([k, v]) => !['after', 'before', 'limit'].includes(k) && v !== undefined && v !== null && v !== '')
    .sort()
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return filters ? `${path}?${filters}` : path;
}

function sessionIdFor(key) {
  const now = state.now();
  const existing = state.sessions.get(key);
  if (existing && now - existing.lastUsed < SESSION_IDLE_MS) {
    existing.lastUsed = now;
    return existing.id;
  }
  const fresh = { id: crypto.randomUUID(), lastUsed: now };
  state.sessions.set(key, fresh);
  return fresh.id;
}

// ---------- Rate limiter: token bucket + FIFO queue ----------
function refill() {
  const now = state.now();
  const gained = Math.floor((now - state.lastRefill) / state.minIntervalMs);
  if (gained > 0) {
    state.tokens = Math.min(state.burst, state.tokens + gained);
    state.lastRefill += gained * state.minIntervalMs;
  }
}

async function drain() {
  if (state.draining) return;
  state.draining = true;
  try {
    while (state.queue.length) {
      refill();
      if (state.tokens <= 0) {
        await sleep(Math.max(10, state.minIntervalMs - (state.now() - state.lastRefill)));
        continue;
      }
      state.tokens -= 1;
      const job = state.queue.shift();
      job.run().then(job.resolve, job.reject);
    }
  } finally {
    state.draining = false;
  }
}

function schedule(run) {
  return new Promise((resolve, reject) => {
    state.queue.push({ run, resolve, reject });
    drain();
  });
}

// ---------- The actual HTTP call ----------
async function doFetch(url, sessionId, attempt = 1) {
  let res;
  try {
    state.stats.requests += 1;
    res = await state.fetchImpl(url, {
      headers: { 'User-Agent': state.userAgent, 'X-Session-ID': sessionId, Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    const timeout = err && (err.name === 'TimeoutError' || err.name === 'AbortError');
    throw makeError(timeout ? 'timeout' : 'network', timeout ? 'TETR.IO took too long to answer.' : 'Could not reach TETR.IO.', { cause: err });
  }

  if (res.status === 429) {
    const retryAfter = Number(res.headers && res.headers.get && res.headers.get('retry-after')) || 5;
    if (attempt < 2 && retryAfter <= 10) {
      await sleep(retryAfter * 1000);
      return schedule(() => doFetch(url, sessionId, attempt + 1));
    }
    throw makeError('rate_limited', `TETR.IO asked us to slow down. Try again in ~${retryAfter}s.`, { retryAfter });
  }

  let body;
  try {
    body = await res.json();
  } catch {
    throw makeError('api', `TETR.IO returned an unreadable response (HTTP ${res.status}).`, { status: res.status });
  }
  if (!body || typeof body !== 'object') throw makeError('api', 'TETR.IO returned an empty response.');
  return { status: res.status, body };
}

/**
 * GET a TETRA CHANNEL endpoint. Returns { data, cache, fromCache }.
 * Serves from local cache until the server's cache.cached_until passes.
 */
async function get(path, query = {}) {
  const url = buildUrl(path, query);
  const now = state.now();
  const hit = state.cache.get(url);
  if (hit && hit.expires > now) {
    state.stats.cacheHits += 1;
    return unwrap(hit.body, true);
  }
  if (state.inflight.has(url)) return unwrap(await state.inflight.get(url), true);

  const sessionId = sessionIdFor(datasetKey(path, query));
  const promise = schedule(() => doFetch(url, sessionId))
    .then(({ status, body }) => {
      const until = body.cache && Number(body.cache.cached_until);
      let expires = Number.isFinite(until) && until > 0 ? until : state.now() + FALLBACK_CACHE_MS;
      if (body.success === false) expires = state.now() + (status === 404 ? NEGATIVE_CACHE_MS : 5_000);
      const stored = Object.assign({}, body, { _status: status });
      state.cache.set(url, { expires, body: stored });
      pruneCache();
      return stored;
    })
    .finally(() => state.inflight.delete(url));
  state.inflight.set(url, promise);
  return unwrap(await promise, false);
}

function unwrap(body, fromCache) {
  if (body.success === false) {
    const msg = (body.error && (body.error.msg || body.error.message)) || 'Unknown error from TETR.IO.';
    const notFound = body._status === 404 || /no such|not found/i.test(msg);
    throw makeError(notFound ? 'not_found' : 'api', msg);
  }
  return { data: body.data === undefined ? null : body.data, cache: body.cache || null, fromCache };
}

function pruneCache() {
  if (state.cache.size < 500) return;
  const now = state.now();
  for (const [k, v] of state.cache) if (v.expires <= now) state.cache.delete(k);
}

// ---------- Endpoint helpers (one per documented endpoint) ----------
const enc = (s) => encodeURIComponent(String(s).toLowerCase());
const page = (o = {}) => ({ after: o.after, before: o.before, limit: o.limit, country: o.country });

const api = {
  getServerStats: () => get('general/stats'),
  getServerActivity: () => get('general/activity'),
  getUser: (user) => get(`users/${enc(user)}`),
  getUserSummary: (user, mode) => get(`users/${enc(user)}/summaries/${mode}`),
  getAllSummaries: (user) => get(`users/${enc(user)}/summaries`),
  searchUsers: (query) => get(`users/search/${encodeURIComponent(query)}`),
  getUserLeaderboard: (lb, o) => get(`users/by/${lb}`, page(o)),
  getHistoricalLeaderboard: (lb, season, o) => get(`users/history/${lb}/${encodeURIComponent(season)}`, page(o)),
  getUserRecords: (user, gamemode, lb, o = {}) =>
    get(`users/${enc(user)}/records/${gamemode}/${lb}`, { after: o.after, before: o.before, limit: o.limit }),
  getRecordsLeaderboard: (id, o = {}) => get(`records/${encodeURIComponent(id)}`, { after: o.after, before: o.before, limit: o.limit }),
  getAllNews: (limit) => get('news/', { limit }),
  getNews: (stream, limit) => get(`news/${encodeURIComponent(stream)}`, { limit }),
  getScoreflow: (user, gamemode) => get(`labs/scoreflow/${enc(user)}/${gamemode}`),
  getLeagueflow: (user) => get(`labs/leagueflow/${enc(user)}`),
  getLeagueRanks: () => get('labs/league_ranks'),
  getAchievement: (k) => get(`achievements/${Number(k)}`),
  getAchievementEntries: (k, o = {}) => get(`achievements/${Number(k)}/entries`, { after: o.after, before: o.before, limit: o.limit }),
};

/** Resolve a username or ID to a user ID (uses the cached user-info endpoint). */
async function resolveUserId(user) {
  if (/^[0-9a-f]{24}$/i.test(user)) return user.toLowerCase();
  const { data } = await api.getUser(user);
  if (!data || !data._id) throw makeError('not_found', `No such user: ${user}`);
  return data._id;
}

module.exports = { ...api, resolveUserId, get, buildUrl, datasetKey, configure, resetState, state, BASE };
