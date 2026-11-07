// Adapter: turns a slash interaction OR a "t?" prefix message into the same plain object:
//   { kind, subcommand, options: { name: value }, user, defer(), reply(payload) }
// Prefix args are parsed using the command's own SlashCommandBuilder JSON, so one definition serves both.
const { inputError } = require('./errors');
const { getLinkedUsername } = require('./links');

const T = { SUB: 1, GROUP: 2, STRING: 3, INTEGER: 4, BOOLEAN: 5, NUMBER: 10 };
const USERNAME_RE = /^([a-z0-9_-]{3,16}|[0-9a-f]{24})$/i;

function fromInteraction(interaction) {
  const options = {};
  let subcommand = null;
  const collect = (list) => {
    for (const o of list || []) {
      if (o.type === T.SUB) { subcommand = o.name; collect(o.options); }
      else if (o.type === T.GROUP) collect(o.options);
      else options[o.name] = o.value;
    }
  };
  collect(interaction.options.data);
  return {
    kind: 'slash',
    subcommand,
    options,
    user: interaction.user,
    defer: () => (interaction.deferred || interaction.replied ? null : interaction.deferReply()),
    reply: (payload) => (interaction.deferred || interaction.replied ? interaction.editReply(payload) : interaction.reply(payload)),
  };
}

/** Split on spaces but keep "quoted strings" together. */
function tokenize(text) {
  const out = [];
  const re = /"([^"]*)"|(\S+)/g;
  let m;
  while ((m = re.exec(text))) out.push(m[1] !== undefined ? m[1] : m[2]);
  return out;
}

function usageFor(prefix, json, sub) {
  const fmt = (o) => (o.required ? `<${o.name}>` : `[${o.name}]`);
  const subs = (json.options || []).filter((o) => o.type === T.SUB);
  if (subs.length && !sub) return subs.map((s) => `${prefix}${json.name} ${s.name} ${(s.options || []).map(fmt).join(' ')}`.trim()).join('\n');
  const opts = sub ? sub.options || [] : json.options || [];
  return `${prefix}${json.name}${sub ? ` ${sub.name}` : ''} ${opts.map(fmt).join(' ')}`.trim();
}

function convert(opt, raw) {
  let value = raw;
  if (opt.type === T.INTEGER || opt.type === T.NUMBER) {
    value = Number(raw);
    if (!Number.isFinite(value) || (opt.type === T.INTEGER && !Number.isInteger(value))) throw new Error(`\`${opt.name}\` must be a ${opt.type === T.INTEGER ? 'whole number' : 'number'}.`);
    if (opt.min_value !== undefined && value < opt.min_value) throw new Error(`\`${opt.name}\` must be at least ${opt.min_value}.`);
    if (opt.max_value !== undefined && value > opt.max_value) throw new Error(`\`${opt.name}\` must be at most ${opt.max_value}.`);
  } else if (opt.type === T.BOOLEAN) {
    if (!/^(true|false|yes|no)$/i.test(raw)) throw new Error(`\`${opt.name}\` must be true or false.`);
    value = /^(true|yes)$/i.test(raw);
  }
  if (opt.choices) {
    const c = opt.choices.find((ch) => String(ch.value).toLowerCase() === String(raw).toLowerCase() || ch.name.toLowerCase() === String(raw).toLowerCase());
    if (!c) throw new Error(`\`${opt.name}\` must be one of: ${opt.choices.map((ch) => ch.value).join(', ')}.`);
    value = c.value;
  }
  return value;
}

/** Parse prefix tokens against a command's JSON definition. Pure; throws input errors. */
function parsePrefixArgs(json, tokens, prefix = 't?') {
  let args = tokens.slice();
  let sub = null;
  const subs = (json.options || []).filter((o) => o.type === T.SUB);
  if (subs.length) {
    const name = (args.shift() || '').toLowerCase();
    sub = subs.find((s) => s.name === name);
    if (!sub) throw inputError(name ? `Unknown subcommand \`${name}\`.` : 'Missing subcommand.', usageFor(prefix, json));
  }
  const defs = sub ? sub.options || [] : json.options || [];
  const usage = usageFor(prefix, json, sub);
  const options = {};
  try {
    // 1) explicit name:value tokens
    args = args.filter((tok) => {
      const i = tok.indexOf(':');
      const def = i > 0 && defs.find((d) => d.name === tok.slice(0, i).toLowerCase());
      if (!def) return true;
      options[def.name] = convert(def, tok.slice(i + 1));
      return false;
    });
    // 2) positional tokens, in declared order. Optional choice-options are skipped if the token doesn't fit.
    let di = 0;
    while (args.length) {
      while (di < defs.length && options[defs[di].name] !== undefined) di += 1;
      if (di >= defs.length) throw new Error(`Too many arguments: \`${args.join(' ')}\`.`);
      const def = defs[di];
      const tok = args[0];
      // Lookahead: a required free-text option may be followed by an optional choice option
      // (Discord forces required-first). If the token matches that later option's choices and
      // more tokens remain, fill the choice first, so "t?search twitch display_username Some Name" still works.
      if (def.required && !def.choices && args.length > 1) {
        const later = defs.slice(di + 1).find((d) => !d.required && d.choices && options[d.name] === undefined
          && d.choices.some((c) => String(c.value).toLowerCase() === tok.toLowerCase()));
        if (later) { options[later.name] = convert(later, args.shift()); continue; }
      }
      const fits = !def.choices || def.choices.some((c) => String(c.value).toLowerCase() === tok.toLowerCase() || c.name.toLowerCase() === tok.toLowerCase());
      if (!fits && !def.required) { di += 1; continue; }
      const isLastString = def.type === T.STRING && defs.slice(di + 1).every((d) => options[d.name] !== undefined);
      const raw = isLastString && !def.choices ? args.splice(0).join(' ') : args.shift();
      options[def.name] = convert(def, raw);
      di += 1;
    }
    const missing = defs.filter((d) => d.required && options[d.name] === undefined);
    if (missing.length) throw new Error(`Missing: ${missing.map((d) => `\`${d.name}\``).join(', ')}.`);
  } catch (err) {
    throw inputError(err.message, usage);
  }
  return { subcommand: sub ? sub.name : null, options };
}

function fromMessage(message, command, tokens, prefix) {
  const parsed = parsePrefixArgs(command.data.toJSON(), tokens, prefix);
  return {
    kind: 'prefix',
    subcommand: parsed.subcommand,
    options: parsed.options,
    user: message.author,
    defer: () => message.channel.sendTyping().catch(() => null),
    reply: (payload) => message.reply({ ...payload, allowedMentions: { repliedUser: false } }),
  };
}

/** Validate a username / user ID option; returns the lowercase value. */
function requireUsername(value) {
  const v = String(value || '').trim().toLowerCase();
  if (!USERNAME_RE.test(v)) throw inputError(`\`${value}\` is not a valid TETR.IO username (3-16 letters, numbers, _ or -) or user ID.`);
  return v;
}

function usernameOrLinked(value, discordId) {
  const linked = value || getLinkedUsername(discordId);
  if (!linked) throw inputError('Provide a TETR.IO username, or link one first with `/link username:<name>`.');
  return requireUsername(linked);
}

module.exports = { fromInteraction, fromMessage, parsePrefixArgs, tokenize, usageFor, requireUsername, usernameOrLinked };
