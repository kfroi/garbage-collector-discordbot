// Pure formatting helpers: numbers, times, rank colors, rank emoji, flags, sparklines.

const isNum = (n) => typeof n === 'number' && Number.isFinite(n);

function formatNumber(n, decimals = 0) {
  if (!isNum(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** Milliseconds -> "49.092s" or "1:02.345". */
function formatTime(ms) {
  if (!isNum(ms) || ms < 0) return '—';
  const totalSec = ms / 1000;
  const m = Math.floor(totalSec / 60);
  const s = totalSec - m * 60;
  return m > 0 ? `${m}:${s.toFixed(3).padStart(6, '0')}` : `${s.toFixed(3)}s`;
}

/** Seconds -> "140h 3m". Hidden stats (-1) -> "Hidden". */
function formatDuration(sec) {
  if (!isNum(sec)) return '—';
  if (sec < 0) return 'Hidden';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${formatNumber(h)}h ${m}m` : `${m}m ${Math.floor(sec % 60)}s`;
}

const formatPercent = (x, decimals = 2) => (isNum(x) ? `${(x * 100).toFixed(decimals)}%` : '—');
const hiddenOr = (n, decimals = 0) => (isNum(n) && n < 0 ? 'Hidden' : formatNumber(n, decimals));
const posOrDash = (n) => (isNum(n) && n > 0 ? `#${formatNumber(n)}` : '—');

/** ISO string or ms -> Discord timestamp markup "<t:123:R>". */
function discordTime(value, style = 'R') {
  const ms = typeof value === 'number' ? value : Date.parse(value);
  return isNum(ms) ? `<t:${Math.floor(ms / 1000)}:${style}>` : 'unknown';
}

const RANKS = {
  'x+': { color: 0xa763ea, emoji: '🟣' }, x: { color: 0xff45ff, emoji: '🟪' }, u: { color: 0xff3813, emoji: '🟥' },
  ss: { color: 0xdb8b1f, emoji: '🟧' }, 's+': { color: 0xd8af0e, emoji: '🟨' }, s: { color: 0xe0a71b, emoji: '🟨' },
  's-': { color: 0xb2972b, emoji: '🟫' }, 'a+': { color: 0x1fa834, emoji: '🟩' }, a: { color: 0x46ad51, emoji: '🟩' },
  'a-': { color: 0x3bb687, emoji: '🟢' }, 'b+': { color: 0x4f99c0, emoji: '🟦' }, b: { color: 0x4f64c9, emoji: '🟦' },
  'b-': { color: 0x5650c7, emoji: '🔵' }, 'c+': { color: 0x552883, emoji: '🟪' }, c: { color: 0x733e8f, emoji: '🟪' },
  'c-': { color: 0x79558c, emoji: '🟣' }, 'd+': { color: 0x8e6091, emoji: '🟤' }, d: { color: 0x907591, emoji: '🟤' },
  z: { color: 0x828282, emoji: '⬜' },
};
const DEFAULT_COLOR = 0x5865f2;

const rankColor = (rank) => (RANKS[String(rank || '').toLowerCase()] || { color: DEFAULT_COLOR }).color;
function rankEmoji(rank) {
  const r = String(rank || 'z').toLowerCase();
  const info = RANKS[r] || RANKS.z;
  return `${info.emoji} ${r === 'z' ? 'Unranked' : r.toUpperCase()}`;
}

/** "CA" -> 🇨🇦 ; vanity/unknown codes (e.g. XM) are shown as text. */
function flag(code) {
  if (!code || typeof code !== 'string') return '';
  const c = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(c) || c.startsWith('X')) return `[${c}]`;
  return String.fromCodePoint(...[...c].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}

const MEDALS = { 0: 'None', 1: '🥉 Bronze', 2: '🥈 Silver', 3: '🥇 Gold', 4: '💠 Platinum', 5: '💎 Diamond', 100: '📜 Issued' };
const medal = (rank) => MEDALS[rank] || '—';

/** Numbers -> "▁▂▄█" text chart (downsampled to `width` points). */
function sparkline(values, width = 40) {
  const nums = (values || []).filter(isNum);
  if (!nums.length) return '';
  const step = Math.max(1, nums.length / width);
  const pts = [];
  for (let i = 0; i < nums.length && pts.length < width; i += step) pts.push(nums[Math.floor(i)]);
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const bars = '▁▂▃▄▅▆▇█';
  return pts.map((v) => bars[max === min ? 3 : Math.round(((v - min) / (max - min)) * 7)]).join('');
}

const truncate = (s, max) => {
  const str = String(s ?? '');
  return str.length > max ? `${str.slice(0, max - 1)}…` : str;
};

/** Format a game result for a given mode (used by records, news, scoreflow). */
function formatResult(gamemode, value) {
  if (!isNum(value)) return '—';
  if (gamemode === '40l') return formatTime(Math.abs(value));
  if (gamemode === 'zenith' || gamemode === 'zenithex') return `${formatNumber(value, 1)} m`;
  return formatNumber(value);
}

const prisecter = (p) => (p && isNum(p.pri) ? `${p.pri}:${p.sec}:${p.ter}` : null);
const userLink = (name) => `[${name}](https://ch.tetr.io/u/${encodeURIComponent(String(name).toLowerCase())})`;

module.exports = {
  isNum, formatNumber, formatTime, formatDuration, formatPercent, hiddenOr, posOrDash, discordTime,
  rankColor, rankEmoji, flag, medal, sparkline, truncate, formatResult, prisecter, userLink, DEFAULT_COLOR,
};
