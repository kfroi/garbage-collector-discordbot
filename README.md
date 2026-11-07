# TETR.IO Discord Bot

Invite Garbage Collector to your server!  
> https://discord.com/oauth2/authorize?client_id=1568477666196328448&scope=bot%20applications.commands&permissions=83968

A Discord bot that reads player and server data from the **TETRA CHANNEL API** (`https://ch.tetr.io/api/`) and shows it as tidy Discord embeds. Every endpoint in the [official API docs](https://tetr.io/about/api/) is covered. Every command works two ways:

- as a **slash command**: `/tetrio league username:osk`
- as a **prefix command**: `t?tetrio league osk`

Built with Node.js and discord.js v14 (CommonJS). The code uses **only functions and plain objects**: no custom classes, no prototypes. The only `new` calls are for discord.js builders and built-ins like `Error`/`URL`/`Map`.

## 1. Project structure

```
src/
  index.js            # client setup, login, event wiring (slash + t? prefix); auto-loads commands/
  deploy-commands.js  # registers slash commands (run separately: npm run deploy)
  api/
    tetrio.js         # fetch wrapper, User-Agent, caching, rate limiting, X-Session-ID, error handling
  embeds/             # pure functions: data in -> EmbedBuilder out
    common.js         # base embed, cache footer, error embed, list helper
    record.js         # describes one Record object (shared by several embeds)
    user.js           # buildUserEmbed
    league.js         # buildLeagueEmbed
    sprint.js         # buildSprintEmbed (40 LINES)
    blitz.js          # buildBlitzEmbed
    zenith.js         # buildZenithEmbed (QUICK PLAY + EXPERT QUICK PLAY)
    zen.js            # buildZenEmbed
    achievements.js   # user achievements, achievement info, achievement leaderboard
    summaries.js      # all-summaries overview
    leaderboard.js    # user leaderboards, historical leaderboards, "next page" hint
    records.js        # records leaderboard, personal records, record search
    news.js           # TETRA NEWS
    stats.js          # server stats + activity
    labs.js           # scoreflow, leagueflow, league ranks
    search.js         # user search by social connection
  commands/           # each file exports { data, execute } (+ optional aliases)
    tetrio.js  leaderboard.js  records.js  news.js  search.js
    labs.js    achievement.js  server.js   help.js
  utils/
    format.js         # number/time formatting, rank colors, rank emoji, flags, sparklines
    context.js        # slash/prefix adapter + prefix argument parser
    errors.js         # makeError(kind, message): tagged plain Error objects
test/
  bot.test.js         # node:test unit tests
  fixtures/*.json     # real sample API responses
```

### Why this split

- **`api/` is the only place that knows about HTTP.** Caching, rate limiting, session IDs and the "only ch.tetr.io" guard all live in one spot, so no command can break the API rules by accident.
- **`embeds/` are pure functions** (data in, `EmbedBuilder` out). They never fetch anything, which makes them easy to tweak and easy to test with sample JSON (see `test/fixtures`).
- **`commands/` each export `{ data, execute }`.** `index.js` loads every file in the folder, so a new command is just a new file.
- **`deploy-commands.js` is separate** because you only need to register commands when their definitions change. Registering on every startup can hit Discord's rate limits.
- Run `npm run deploy:global` to register slash commands for DMs and app installations. `npm run deploy` remains guild-scoped when `GUILD_ID` is configured for instant testing.
- **`utils/context.js` makes one `execute()` serve both styles.** A slash interaction and a `t?` message both get turned into the same plain object:
  `{ kind, subcommand, options: { name: value }, defer(), reply(payload) }`.
  Prefix arguments are parsed **using the slash command's own definition** (option names, types, choices, min/max), so you only describe a command once.

### Request flow

```
user types /tetrio league osk     or     t?tetrio league osk
          │                                     │
   fromInteraction()                     fromMessage() → parsePrefixArgs()
          └──────────────┬──────────────────────┘
                 ctx (plain object)
                         │
            commands/tetrio.js execute(ctx)
                         │
            api/tetrio.js getUserSummary()  ── cache? ─ yes → return cached
                         │ no
              rate-limit queue → fetch ch.tetr.io (User-Agent + X-Session-ID)
                         │
            embeds/league.js buildLeagueEmbed(data) → ctx.reply({ embeds })
```

---

## 2. TETRA CHANNEL API rules and how this bot obeys them

| Rule (from the official docs) | How it's enforced (`src/api/tetrio.js`) |
|---|---|
| Only use the TETRA CHANNEL API (`https://ch.tetr.io/api/`). The main game API (`https://tetr.io/api/`) is **not allowed** without written consent, and using it can get your account suspended. | `buildUrl()` builds every URL from `https://ch.tetr.io/api/` and **throws** if the result points anywhere else. There is a unit test for this. (Avatar images use `tetr.io/user-content/...`, the image URL documented in the API docs. Discord loads those images, not the bot, and this is not the game API.) |
| **Do not flood the API.** About one request per second is fine, and short bursts are OK. | Token-bucket rate limiter with a FIFO queue: bursts of up to 3 requests, then 1 request per second on average. Every request waits its turn. |
| **Honor caching data.** Don't re-request until the cache expires. | Every response is stored until its `cache.cached_until`. Repeat requests are answered from memory ("served from bot cache" in the footer). Identical requests made at the same moment are merged into one. "User not found" answers are remembered for 60 seconds, so typos don't spam the API. |
| **Send an `X-Session-ID` header** when you re-request the same datasets. | Each *dataset* (path + filters such as country, but **not** the pagination params `after`/`before`/`limit`) gets its own random UUID. Page 1 and page 2 of a leaderboard therefore share a session and stay consistent. Unused sessions are forgotten after 1 hour. |
| **Don't use one `X-Session-ID` for unrelated requests.** | Different endpoints and different filters always get different session IDs, which keeps load balancing working. |
| Don't break the TETR.IO Terms of Service. | The bot is read-only and public-data-only, and it sends a descriptive `User-Agent` (set `BOT_USER_AGENT` to include your contact info). |
| The API may change without notice. | Embeds read every field defensively: missing values show as `—`, and unknown news types fall back to a generic line. Tests check that embeds still build from empty objects. |

---

## 3. Command reference

Prefix arguments go in the listed order. You can also write them as `name:value` (e.g. `limit:5`). Wrap text that contains spaces in `"quotes"`. Optional "choice" arguments can be skipped (`t?leaderboard users` uses `league`).

| Slash | Prefix example | Endpoint(s) |
|---|---|---|
| `/tetrio user <username>` | `t?tetrio user osk` | `/users/:user` |
| `/tetrio league <username>` | `t?tetrio league osk` | `/users/:user/summaries/league` |
| `/tetrio sprint <username>` | `t?tetrio sprint osk` | `/users/:user/summaries/40l` |
| `/tetrio blitz <username>` | `t?tetrio blitz osk` | `/users/:user/summaries/blitz` |
| `/tetrio zenith <username>` | `t?tetrio zenith osk` | `/users/:user/summaries/zenith` |
| `/tetrio zenithex <username>` | `t?tetrio zenithex osk` | `/users/:user/summaries/zenithex` |
| `/tetrio zen <username>` | `t?tetrio zen osk` | `/users/:user/summaries/zen` |
| `/tetrio achievements <username>` | `t?tetrio achievements osk` | `/users/:user/summaries/achievements` |
| `/tetrio all <username>` | `t?tetrio all osk` | `/users/:user/summaries` |
| `/search <platform> <value> [by]` | `t?search discord someone` (also `t?search twitch display_username "Some Name"`) | `/users/search/:query` |
| `/leaderboard users [type] [country] [limit] [after]` | `t?lb users xp country:CA limit:5` | `/users/by/:leaderboard` |
| `/leaderboard history <season> …` | `t?lb history 1` | `/users/history/league/:season` |
| `/leaderboard records <gamemode> [country] [revolution] …` | `t?lb records 40l` · `t?lb records zenith revolution:2024w31` | `/records/:leaderboard` |
| `/records user <username> <gamemode> [type] [limit] [after]` | `t?records user osk 40l recent` | `/users/:user/records/:gamemode/:leaderboard` |
| `/news [stream] [limit]` | `t?news` · `t?news global` · `t?news osk` | `/news/` and `/news/:stream` |
| `/labs scoreflow <username> <gamemode>` | `t?labs scoreflow osk 40l` | `/labs/scoreflow/:user/:gamemode` |
| `/labs leagueflow <username>` | `t?labs leagueflow osk` | `/labs/leagueflow/:user` |
| `/labs ranks` | `t?labs ranks` | `/labs/league_ranks` |
| `/achievement info <id>` | `t?ach info 1` | `/achievements/:k` |
| `/achievement leaderboard <id> [limit] [after]` | `t?ach leaderboard 1` | `/achievements/:k/entries` |
| `/server stats` | `t?server stats` | `/general/stats` |
| `/server activity` | `t?server activity` | `/general/activity` |
| `/help` | `t?help` | (none, built locally) |

Aliases: `t?t` / `t?tio` / `t?user` = `tetrio`, `t?lb` = `leaderboard`, `t?rec` = `records`, `t?ach` = `achievement`, `t?stats` = `server`, `t?h` = `help`.

---
