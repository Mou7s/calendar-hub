# Calendar Hub

A **read-only calendar aggregator** built on **Nuxt 4** + **Nuxt Hub** + **Cloudflare Workers**: upstream schedules are normalized into RFC 5545-compliant **ICS / webcal feeds**, with a multilingual calendar UI on top.

**The value is in the `.ics` feeds; the pages are just the entry point.** Live site: <https://calendarhub.mou7s.com>

---

## Feeds

| Path | Topic | Coverage |
| --- | --- | --- |
| `/spacex.ics` | SpaceX launches | Primary feed. Merges two sources (GraphQL Page Tiles + TIMING JSON) with vehicle, launch site, and official livestream links; **missions that are live stay in the feed past their scheduled time** so viewers can still jump to the stream |
| `/calendar.ics`, `/launches.ics` | SpaceX launches | Aliases of the same feed, kept for existing subscribers |
| `/ics/spacex.ics` | SpaceX launches | Topic-style path, aligned with the other topics |
| `/ics/f1.ics` | F1 schedule | 2026 season, 24 rounds; sprint / qualifying / race times per venue converted to absolute times using fixed per-circuit UTC offsets |
| `/ics/wtt.ics` | WTT table tennis | Parsed from the official calendar; only matches with **both players and a start time published** are emitted; R16 and later, except `WTT Contender` events which keep **the final only** |
| `/ics/dota2.ics` | Dota 2 matches | Upcoming Liquipedia fixtures with published times (format, teams, event links); finished matches kept for 48 hours with scores and winners; venues parsed from the tournament infobox `Location:` |
| `/ics/tech-events.ics` | Big-tech launches | Built-in static data |
| `/ics/games.ics` | AAA game releases | Built-in static data |
| `/ics/holidays.ics` | China public holidays & makeup workdays | Built-in static data |

The last three topics are served at the ICS / JSON layer only (`/api/topics` lists all 7). **The calendar UI mounts the first 4 layers.**

How to subscribe: the in-site Subscribe dialog offers one-click `webcal://` subscribe plus HTTPS link copy per layer; you can also paste any path above into Apple Calendar / Google Calendar / Outlook via "Subscribe to calendar".

Response headers are a hard contract with calendar clients - changing them breaks existing subscriptions:

```text
content-type: text/calendar; charset=utf-8
cache-control: public, max-age=300
content-disposition: inline; filename="spacex-launches.ics"
```

---

## Features

### Calendar UI (based on the `nuxt-ui-templates/calendar` template)

- **URL is the state**: `/day|week|month/<YYYY-MM-DD>`; invalid views or dates 404; `/` 302s to today. Prev/next and view switches only change the URL.
- **Month view**: virtualized infinite scroll, fetched in 6-week chunks, URL synced while scrolling, sticky month labels.
- **Week / day views**: shared hour grid + all-day row, collapsing to 3 days below the `lg` breakpoint.
- **Sidebar**: floating glass panel (slideover below `lg`) with layer toggles (cookie-persisted), mini calendar (click-to-jump, main view follows), subscribe entry, and settings menu.
- **Command palette**: search loaded events, jump to dates, switch layers (opened from the sidebar).
- **Event details**: clicking an event opens the mission detail; field names and icons come from `app/utils/calendar-event-presentation.js` by layer (time, vehicle, venue, scores, official links).
- **Glassmorphism & theming**: primary color in `app/app.config.ts`, `glass-material` utilities and view transitions in `app/assets/css/main.css`; primary / neutral palettes are user-selectable and persisted (localStorage + first-paint inline script, no flash on reload).
- **Lunar calendar & solar terms**: shown next to the day number / in week headers under `zh-CN` only, hidden in other locales.
- **Offline badge**: shows the number of queued requests while offline.

### Data ingestion & caching

- **Multi-source aggregation**: `/api/events` merges SpaceX (upcoming + history), F1, WTT, and Dota 2 into a single `CalendarEvent[]`, filtered by `start`/`end` overlap (90-day window cap; month view needs 84 days so it just fits), titles picked by `locale`, deduplicated by id.
- **Independent degradation**: sources resolve via `Promise.allSettled` with separate fallbacks; only a total failure returns 502.
- **KV + SWR**: upstream data lands in Nuxt Hub KV; stale data is served while a background refresh runs, so upstream rate limits never block readers. Dynamic TTLs: 5 minutes normally, 30 minutes when there is no live mission and the next launch is 3+ hours away, 24 hours for mission-detail cards.
- **Version tracking**: `SEQUENCE` and `LAST-MODIFIED` advance with the launch window so calendar clients don't re-push every event as changed.
- **Scheduled sync**: the Nitro task `calendar:sync` runs at minute 7 every hour (`scheduledTasks` in `nuxt.config.ts`, mirrored by `crons` in `wrangler.toml`).

### i18n

`@nuxtjs/i18n` with `strategy: 'no_prefix'`, auto-detecting the browser language on first paint. 7 locales: zh-CN / English / Japanese / Korean / Spanish / French / German.

### SEO

`app/app.vue` injects JSON-LD: `WebSite`, `SoftwareApplication`, plus an `Event` for the next launch; backed by `public/robots.txt` and `public/sitemap.xml`.

### Read-only boundary

This site offers **no event create/update/delete** - data comes from upstream APIs + KV cache. The template's write path (store, `events.post/patch/delete`, zod schemas, drag-to-reschedule, double-click-to-create) was removed during migration; clicking an event only displays it.

---

## Stack

- **Framework**: Nuxt 4 (`future.compatibilityVersion: 4`)
- **UI**: Nuxt UI 4 + Tailwind CSS + Lucide / Heroicons icons (inlined into the client bundle)
- **Platform**: Nuxt Hub (KV) + Cloudflare Workers (`nitro.preset: 'cloudflare_module'`)
- **i18n**: `@nuxtjs/i18n`
- **Utilities**: `@vueuse/core`, `date-fns`, `@internationalized/date`, `h3`
- **Package manager / runtime**: Bun (`packageManager: bun@1.4.0`)
- **Tests**: `bun test` (built-in runner)

---

## Project structure

```text
app/                          # Nuxt 4 frontend
  |-- app.vue                 # App root: UApp shell + site-wide SEO/JSON-LD + shared event state
  |-- app.config.ts           # Nuxt UI theme and glass-component slot overrides
  |-- error.vue
  |-- assets/css/             # main.css (glass utilities/transitions), theme-colors.css (generated)
  |-- components/
  |   |-- AppSidebar.vue      # Floating sidebar (layer toggles / mini calendar / subscribe / settings)
  |   |-- AppSearch.vue       # UCommandPalette command palette
  |   |-- SubscribeModal.vue  # Subscribe dialog: webcal one-click + ICS link copy
  |   |-- SettingsMenu.vue    # Language / theme / appearance
  |   |-- AppLogo.vue
  |   `-- calendar/           # DayColumn / EventBlock / EventChip / EventPopover /
  |                           # List / Mini / MissionDetail / MonthView / MonthWeek /
  |                           # NowIndicator / WeekView
  |-- composables/
  |   |-- createAppComposable.ts  # App-level singleton wrapper
  |   |-- useCalendar.ts          # URL-as-state, paging, sidebar & modal switches
  |   |-- useCalendarEvents.ts    # Layers + range-chunked fetching, day bucketing, offline queue
  |   |-- useLunar.js             # Lunar / solar-term conversion (full 1900-2100 tables)
  |   `-- useThemeColors.ts       # Primary / neutral selection & persistence
  |-- pages/
  |   |-- index.vue               # / -> 302 /month/<today>
  |   `-- [view]/[date].vue       # Calendar page (validate -> 404 on bad input)
  |-- plugins/theme-colors.client.ts
  `-- utils/                  # dates / layout / calendars / calendar-colors /
                              # calendar-event-presentation / theme-colors
server/                       # Nitro backend
  |-- api/
  |   |-- events.get.ts               # Template-contract endpoint: multi-source CalendarEvent[]
  |   |-- calendars.get.ts            # UI layers (4, mapped to Nuxt UI theme colors)
  |   |-- topics.get.ts               # All topics (7, with ICS paths)
  |   |-- launches.get.js             # Upcoming launches (SWR cache, also the SEO Event source)
  |   |-- history-launches.get.js     # Past launches
  |   |-- calendar/[topic].get.js     # Per-topic calendar JSON
  |   `-- launches/[slug].get.js      # Single mission detail
  |-- routes/                 # ICS feed routes
  |   |-- spacex.ics.js / calendar.ics.js / launches.ics.js
  |   `-- ics/[topic].ics.js          # Topic feeds (Content-Type / SEQ red lines live here)
  |-- utils/                  # spacex.js (dual-source fetch + ICS serialization),
  |                           # calendars.js (topic registry / F1 / WTT / Dota 2 parsing +
  |                           # generic ICS), kv.js (SWR), calendar-sync.js, launches.js
  |-- tasks/calendar/sync.js  # Scheduled sync task
  |-- middleware/fix-url.js
  `-- plugins/fix-url.js
shared/                       # Frontend/backend contract
  |-- types/index.d.ts        # CalendarEvent / Calendar / DateRange / CalendarView
  `-- utils/time.ts
i18n/locales/                 # 7 locale files + supported.json
scripts/                      # translate-locales.js / generate-theme-colors.js /
                              # check-theme-colors-css.js
test/                         # calendar.test.js / calendar-layer-colors.test.js /
                              # theme-colors.test.js
public/                       # sw.js, robots.txt, sitemap.xml
nuxt.config.ts
wrangler.toml
```

---

## Data rules & red lines

Read these before touching code - each one maps to "will subscribers' calendars break":

1. **UID algorithm is locked**: `UID:${mission.correlationId || mission.id}@spacexcalendar.local`. Changing it floods every subscriber's client with duplicates.
2. **`.ics` response headers are locked**: see the "Feeds" section above.
3. **Serialization must escape**: every ICS field through `escapeIcsText`.
4. **Live-mission preservation**: missions with `isLive === true` stay in upcoming and `.ics` even after `launchAt` passes.
5. **Time is absolute ISO**: `start` / `end` leave the server via `toISOString()`; clients bucket by local timezone; titles switch between `titleZh` / `titleEn` by the `locale` query param.
6. **WTT pruning is destructive**: pruned matches disappear from all subscribers' calendars - assess round-coverage changes before shipping; **never substitute client-side filtering for server-side pruning** (calendar clients only read `.ics`).
7. **The lunar table is the full 1900-2100 set**: never revert to a single-year lookup - it breaks across New Year; input and output are `yyyy-MM-dd` strings, out-of-range returns empty string.
8. **Stay lightweight**: this runs on the edge - check `.output/server` size before adding a dependency.
9. **New UI copy needs locale entries**: update at least `i18n/locales/zh-CN.json` and `en.json`; sync the rest with the translation script.

---

## Local development

```bash
bun install
bun run dev          # http://localhost:3000
```

To change ports, use env vars - **do not** write `--host --port 3111`: listen treats `--port` as the hostname value and throws `Invalid hostname`.

Handy debug endpoints:

| Endpoint | What it returns |
| --- | --- |
| `/api/calendars` | UI layers (4) |
| `/api/topics` | All topics with ICS paths (7) |
| `/api/events?start=...&end=...&locale=zh-CN` | Aggregated events (template contract, 90-day cap) |
| `/api/launches`, `/api/history-launches` | Upcoming / past launches |
| `/api/calendar/f1`, `/api/calendar/wtt`, `/api/calendar/dota2` | Raw per-topic data |
| `/spacex.ics`, `/ics/wtt.ics` | Feeds |

Verify against real requests (more reliable than reading code):

```bash
curl -s localhost:3000/api/calendars
curl -sD - -o /dev/null localhost:3000/spacex.ics          # header red line
curl -s "localhost:3000/api/events?start=2026-09-01T00:00:00&end=2026-09-30T00:00:00&locale=zh-CN"
# Lunar / solar-term text is only rendered under zh-CN:
curl -s -H "Accept-Language: zh-CN" localhost:3000/month/2026-09-07 | grep -o $'\xe7\x99\xbd\xe9\x9c\xb2'
```

(The last `grep` pattern is the UTF-8 bytes for "Bai Lu" / White Dew, one of the solar terms.)

### Gotchas

- **Every `/api/*` returns 200 + the Nuxt welcome page**: the local dev server is running with a stale module graph / `.nuxt` cache, not broken code. Grab the PID from `.nuxt/nuxt.lock` -> kill -> `rm -rf .nuxt .output` -> restart.
- **`Another Nuxt dev is already running (PID x)`**: that PID is the one in the lock file.
- The repo uses CRLF, so a `patch` whose `old_string` isn't byte-identical can fuzzy-match and silently mangle indentation - rewrite the whole block when that happens.

---

## Tests & checks

```bash
bun test                 # 59 cases / 3 files: SpaceX dual-source merge & fallback, F1,
                         # WTT tiers & round coverage, Contender final-only pruning, ICS escaping,
                         # SWR, live preservation, topic ICS routes, layer presentation mapping,
                         # theme-color persistence (localStorage key / first-paint script / generated CSS)
node --check server/utils/calendars.js
node --check server/utils/spacex.js
node --check server/utils/kv.js
node --check server/routes/spacex.ics.js
bun run typecheck        # vue-tsc
bun run build
git diff --check
```

New features need new tests, especially anything that parses external sources.

---

## Updating locale files

After editing `i18n/locales/en.json` and `zh-CN.json`, sync the other 5 locales with the built-in script:

```bash
export OPENAI_API_KEY="your-key"
bun run translate:locales -- --locales=ja,ko,es,fr,de
```

`app/assets/css/theme-colors.css` is generated:

```bash
bun run generate:theme-colors
```

Forgetting to regenerate after changing the palette list fails the theme-color tests in `bun test`.

---

## Deployment

The deploy target is a **Cloudflare Workers Module Worker**: static frontend assets via Workers Assets, SSR / API / ICS routes via the Nitro Worker.

```bash
bun run deploy:worker    # build + wrangler deploy
bun run preview:worker   # preview on the local Workers runtime
```

Three things to watch in `wrangler.toml`:

- `[triggers] crons = ["7 * * * *"]`: together with `scheduledTasks` in `nuxt.config.ts`, drives `calendar:sync`.
- `[[kv_namespaces]]`: the `SPACEX_KV` (plus `KV` alias) binding - the ID must belong to the current Cloudflare account.
- `[[routes]]`: `calendarhub.mou7s.com` via a Worker Custom Domain.

Verify headers after deploy:

```bash
curl -I https://calendarhub.mou7s.com/spacex.ics
curl -I https://calendarhub.mou7s.com/ics/wtt.ics
```

---

## Data sources & disclaimer

- **SpaceX**: APIs exposed by the official site frontend (GraphQL Page Tiles + TIMING JSON), unaffected by the unmaintained v4 history API.
- **F1**: 2026 season schedule (built in, with per-venue UTC offsets).
- **WTT**: <https://www.worldtabletennis.com/events_calendar> - only matches with published fixtures and start times are synced.
- **Dota 2**: [Liquipedia MediaWiki API](https://liquipedia.net/api-terms-of-use) with a compliant `User-Agent` (`DOTA2_MATCHES_USER_AGENT`); results cached for 30 minutes; rendered HTML is parsed, so an upstream redesign can silently break matching - validate parsing against real page data before changing it.
- **tech-events / games / holidays**: built-in static data, updated with the code.
- Times are converted to local time by the calendar client - no manual adjustment needed; this site only aggregates and displays read-only data.

---

## License

MIT. The repo is based on the official template [`nuxt-ui-templates/calendar`](https://github.com/nuxt-ui-templates/calendar), see `LICENSE`.
