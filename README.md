# TETR.IO Discord Bot

A Discord bot that reads player and server data from the **TETRA CHANNEL API** (`https://ch.tetr.io/api/`) and shows it as tidy Discord embeds. Every endpoint in the [official API docs](https://tetr.io/about/api/) is covered. Every command works two ways:

- as a **slash command**: `/tetrio league username:osk`
- as a **prefix command**: `t?tetrio league osk`

Built with Node.js and discord.js v14 (CommonJS). The code uses **only functions and plain objects**: no custom classes, no prototypes. The only `new` calls are for discord.js builders and built-ins like `Error`/`URL`/`Map`.

---

## 1. What is an API? (the short version)

An **API** (Application Programming Interface) is a website made for programs instead of people. You don't get an HTML page back. Instead the bot sends an HTTP `GET` request to a URL like

```
https://ch.tetr.io/api/users/osk/summaries/40l
```

and gets **JSON** back (plain data made of objects, arrays, strings and numbers):

```json
{ "success": true,
  "data":  { "record": { ... }, "rank": 35345, "rank_local": 1 },
  "cache": { "status": "miss", "cached_at": 1794025833786, "cached_until": 1794026133786 } }
```

- `success`: did it work? If it's `false`, there's an `error.msg` explaining why.
- `data`: the actual information.
- `cache`: how long this answer stays valid. `cached_until` is a timestamp in milliseconds. Until then, asking again returns the same data, so **we don't ask again**.

The bot's job is to: **read the user's command → make the right request → turn the JSON into an embed → reply**.

---

## 2. Setup and running

You need **Node.js 18.17 or newer** (`node -v` shows your version).

1. **Create the bot in Discord**
   1. Go to <https://discord.com/developers/applications> → *New Application*.
   2. **General Information** → copy the **Application ID**. This is your `CLIENT_ID`.
   3. **Bot** → *Reset Token* → copy the token. This is your `DISCORD_TOKEN`, and you should **keep it secret**.
   4. **Bot** → *Privileged Gateway Intents* → turn on **MESSAGE CONTENT INTENT**. Prefix (`t?`) commands need it. Slash commands work without it.
   5. **OAuth2 → URL Generator**: tick scopes `bot` and `applications.commands`, then permissions *Send Messages*, *Embed Links* and *Read Message History*. Open the generated URL to invite the bot to your server.
2. **Configure**
   ```bash
   cp .env.example .env      # then edit .env and fill in your values
   ```
   | Variable | Required | Meaning |
   |---|---|---|
   | `DISCORD_TOKEN` | yes | Bot token |
   | `CLIENT_ID` | yes (deploy) | Application ID |
   | `GUILD_ID` | no | Server ID. If set, slash commands register only there, and they show up instantly. Good for testing. |
   | `PREFIX` | no | Text-command prefix, default `t?` |
   | `BOT_USER_AGENT` | no | The User-Agent sent to TETR.IO. Please put a way to contact you in it. |
3. **Install dependencies**: `npm install`
4. **Register slash commands**: `npm run deploy`. You only need to rerun this when you **change a command's definition** (name, options, description). To remove stale guild-scoped duplicates, set `GUILD_ID` to the server ID and run `npm run deploy:cleanup`.
5. **Start the bot**: `npm start`
6. **Optional checks**: `npm test` runs the unit tests. `npm run check` runs a syntax check on every file.

Use `/link username:<name>` once to link a Discord account to a TETR.IO username. The username is then
used by default for `/tetr`, `/labs scoreflow`, `/labs leagueflow`, and `/records user`.
Pass an explicit username to override the link. Use `/unlink` to remove it.

---

## 3. Project structure

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

## 4. TETRA CHANNEL API rules and how this bot obeys them

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

## 5. Command reference

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

**Pagination:** paginated embeds end with a "Next page" hint containing a cursor (a *prisecter*). Copy it to get the next page, e.g. `t?lb users xp after:123.4:0:0`.

---

## 6. User stories

Each story has a **statement**, **success criteria** (what should happen when it works) and **error criteria** (what should happen when it doesn't). Unless a story says otherwise, all errors appear as a coloured error embed in the channel, and the bot never crashes.

### US-1: Player profile
**Statement:** As a TETR.IO player, I want to look up any player's profile, so that I can see their XP, badges, playtime and linked accounts.
- **Success:** `/tetrio user osk` or `t?tetrio user osk` replies with an embed showing username and flag, avatar, role, XP, Achievement Rating, games won/played, playtime, join date, badges, connections and old usernames. Stats the player has hidden show as "Hidden".
- **Error:** an unknown username gives a 🔍 *Not found* embed with TETR.IO's message. An invalid username (wrong characters or length) gives ⚠️ *Invalid input* **without** calling the API.

### US-2: TETRA LEAGUE summary
**Statement:** As a competitive player, I want to see someone's TETRA LEAGUE standing, so that I can compare ranks before a match.
- **Success:** the embed is coloured with the player's rank colour. It shows rank, TR, Glicko ± RD, GLIXARE, global/local position, percentile, APM/PPS/VS, next/previous rank and past seasons. Players with fewer than 10 games see "Not placed yet (n / 10)".
- **Error:** same as US-1 for unknown or invalid users. Missing fields show `—` instead of crashing.

### US-3: Single-player personal bests (40 LINES, BLITZ, ZEN)
**Statement:** As a solo player, I want to see a player's 40 LINES, BLITZ and ZEN results, so that I can track records and set goals.
- **Success:** `sprint` shows the time (e.g. `49.092s`), global/local rank, PPS, KPP, finesse faults, clears and a replay link. `blitz` shows score, level, PPS, lines, combo/B2B. `zen` shows level and score.
- **Error:** if a mode was never played, the embed says so ("has never finished a 40 LINES game"). That is not treated as an error. Unknown or invalid users are handled as in US-1.

### US-4: QUICK PLAY / EXPERT QUICK PLAY
**Statement:** As a QUICK PLAY fan, I want to see a player's weekly run and career best, so that I know how high they climbed.
- **Success:** shows altitude, floor, APM/PPS/VS, KOs, mods and weekly rank for this week's run, plus the career best with its final rank.
- **Error:** no run this week shows "No run this week". No career best shows "No career best yet". Unknown users are handled as in US-1.

### US-5: Achievements
**Statement:** As a completionist, I want to see a player's achievements and look up any achievement's leaderboard, so that I know what to grind next.
- **Success:** `/tetrio achievements` lists the 15 best achievements with medal, value (formatted by value type: number, time, altitude/floor…) and position, plus medal counts. `/achievement info <id>` shows name, objective, category, medal cutoffs and the top 10. `/achievement leaderboard <id>` shows a paginated leaderboard. Duo achievements are merged into one line per pair.
- **Error:** a non-numeric ID (prefix) or an ID below 1 gives ⚠️ *Invalid input* plus usage. An ID that doesn't exist gives a TETR.IO error embed.

### US-6: Overview of every mode
**Statement:** As a casual user, I want one command that summarises a player across all modes, so that I don't need to run seven commands.
- **Success:** `/tetrio all` shows TL, 40L, BLITZ, QUICK PLAY, EXPERT QP, ZEN and achievement count in one embed. This uses one (heavier) request, as the docs suggest, only when you actually want everything.
- **Error:** as US-1. Modes with no data show "Not played" / "—".

### US-7: Find a player by social account
**Statement:** As a server member, I want to find someone's TETR.IO account from their Discord/Twitch/etc. account, so that I can look them up without knowing their in-game name.
- **Success:** `/search discord <username>` (or `id`, or a Discord ID, which is detected automatically) lists matching TETR.IO accounts with profile links.
- **Error:** no match shows "No TETR.IO account is linked to that connection". An invalid platform, or `display_username` on a platform that doesn't support it, gives ⚠️ *Invalid input*.

### US-8: Leaderboards
**Statement:** As a community member, I want to browse the TL/XP/AR leaderboards, past seasons and records leaderboards, optionally by country, so that I can see who is on top.
- **Success:** shows a numbered list with flags and values (`limit` 1–25, default 10). `country:CA` filters by country. `revolution:2024w31` shows a past QUICK PLAY week. A "Next page" hint gives the exact command for the next page, and all pages share one X-Session-ID so the data stays consistent.
- **Error:** a bad country code (not 2 letters), a bad cursor, a bad revolution format or `limit` outside 1–25 gives ⚠️ *Invalid input* with usage, and **no request is sent**. A season that doesn't exist gives an empty list or a TETR.IO error embed.

### US-9: Personal record history
**Statement:** As a player reviewing my progress, I want to list my top, recent or PB-progression records per mode, so that I can review my games.
- **Success:** `/records user osk 40l recent` lists records with result, time, replay link and ⭐ for PBs (TETRA LEAGUE shows the score and opponent).

### US-10: News feed
**Statement:** As a fan, I want to see the latest TETRA NEWS globally or for one player, so that I can catch new PBs, rank-ups and badges.
- **Success:** `/news` (all streams), `/news global`, or `/news <username>` (stream `user_<id>`) shows up to 25 items with icons and relative times. News types the bot doesn't know yet still appear on a generic line.
- **Error:** an unknown username gives 🔍 *Not found*. An empty stream shows "No news yet".

### US-11: Labs charts
**Statement:** As a stats nerd, I want charts of a player's score history and TL matches, plus the TR needed for each rank, so that I can see trends.
- **Success:** `scoreflow` shows a text sparkline (`▁▂▄█`) of all games and of PB progression, plus the number of games, PBs and the best result. `leagueflow` shows a TR sparkline, W/L, current and peak TR, and the last 5 matches. `ranks` lists every rank with its TR threshold, percentile and player count.
- **Error:** no data shows "No records in this mode" / "No TETRA LEAGUE matches found". Unknown users are handled as in US-1.

### US-12: Server stats and activity
**Statement:** As a curious user, I want to see how many people play TETR.IO and how active it is, so that I can know the best time to play.
- **Success:** `/server stats` shows users, ranked players, games played, playtime, pieces, etc. `/server activity` shows a 2-day sparkline plus current, peak and low.
- **Error:** network or API problems show the matching error embed (US-15).

### US-13: Slash and prefix usage
**Statement:** As a server member, I want to use either `/commands` or `t?commands`, so that I can use whichever I'm used to.
- **Success:** every command gives the same embed in both styles. Prefix args can be positional or `name:value`, and quotes keep spaces. `t?help` / `/help` lists all commands with prefix usage, generated from the command definitions. Aliases such as `t?lb` work.
- **Error:** an unknown `t?` command is ignored silently (to avoid spam). A wrong subcommand, missing argument, too many arguments, wrong type or a value outside a choice list gives ⚠️ *Invalid input* with the exact correct **Usage** block. Prefix commands need the Message Content intent (see Setup). Without it, only slash commands work.

### US-14: Respecting the API (caching and rate limiting)
**Statement:** As the bot host, I want the bot to follow TETR.IO's API rules automatically, so that my bot (and IP) never gets blocked and the service stays healthy for everyone.
- **Success:** the same lookup inside its cache window is answered from memory, and the footer says "served from bot cache". Requests beyond a burst of 3 are queued and sent about 1 per second. Each dataset gets its own X-Session-ID. No URL outside `https://ch.tetr.io/api/` can ever be requested. All of this is covered by unit tests.
- **Error:** if TETR.IO still answers **429 Too Many Requests**, the bot waits for `Retry-After` (up to 10 s) and retries **once**. If that fails, it shows ⏳ *Slow down — try again in ~Ns*.

### US-15: Graceful failure
**Statement:** As a user, I want clear messages when something goes wrong, so that I know whether it's my typo or a TETR.IO problem.
- **Success:** each failure type has its own embed: ⚠️ invalid input (with usage), 🔍 not found (404), ⏳ rate limited (429), ⌛ timeout (no answer within 10 s), 📡 network error, ❌ API error (`success:false` with TETR.IO's message, or an unreadable response), 💥 unexpected bug (logged to the console, generic message to the user).
- **Error:** if even the error reply fails (e.g. a missing permission), the problem is logged to the console and the bot keeps running.

---

## 7. Testing

```bash
npm test        # node:test: formatters, embeds from real sample JSON, prefix parser, API cache/session/rate limit
npm run check   # node --check on every source file
```

The API tests use a **fake `fetch`** (`api.configure({ fetchImpl })`), so they never contact TETR.IO.

## 8. Adding a command

1. Create `src/commands/mycommand.js` exporting `{ data: new SlashCommandBuilder()…, execute: async (ctx) => {…} }`.
2. If needed, add an endpoint helper in `api/tetrio.js` and an embed builder in `embeds/`.
3. Run `npm run deploy` once, then restart the bot. The prefix version (`t?mycommand`) works automatically.
