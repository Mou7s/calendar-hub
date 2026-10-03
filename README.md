<p align="center">
  English · <a href="./README.zh-CN.md">简体中文</a>
</p>

# Calendar Hub

A read-only calendar aggregator that turns SpaceX launches, Formula 1 sessions, WTT table tennis matches, and Dota 2 fixtures into subscribable **ICS calendar feeds**, with a multilingual calendar interface for browsing them.

**Calendar subscriptions are the product; the website is the discovery and subscription entry point.** Once a feed is added to a calendar client, that client fetches updates on its own refresh schedule.

Live site: [calendarhub.mou7s.com](https://calendarhub.mou7s.com)

## Calendar Feeds

The Subscribe dialog offers one-click `webcal://` links and copyable HTTPS URLs. You can also paste these URLs into the “Subscribe by URL” feature in Apple Calendar, Google Calendar, or Outlook.

| Calendar | Feed | Coverage |
| --- | --- | --- |
| SpaceX | [spacex.ics](https://calendarhub.mou7s.com/spacex.ics) | Launch time, vehicle, launch site, and official webcast link. Live missions remain available after their scheduled launch time. |
| Formula 1 | [f1.ics](https://calendarhub.mou7s.com/ics/f1.ics) | Practice, sprint, qualifying, and race sessions from the current official 2026 Formula 1 calendar and event pages. |
| WTT | [wtt.ics](https://calendarhub.mou7s.com/ics/wtt.ics) | Published matches with confirmed players and start times. Most series retain the round of 16 onward; regular Contender events retain finals only. |
| Dota 2 | [dota2.ics](https://calendarhub.mou7s.com/ics/dota2.ics) | Liquipedia tournaments and fixtures filtered by server-side rules. Completed matches remain for 48 hours and include scores and winners. |

The website and `/api/topics` expose the same four calendars. For compatibility with existing subscriptions, SpaceX is also available at `/calendar.ics`, `/launches.ics`, and `/ics/spacex.ics`.

## Features

- Day, week, and month views at `/day/<date>`, `/week/<date>`, and `/month/<date>`, using `YYYY-MM-DD`.
- A virtualized, infinitely scrolling month view that loads events by date range and keeps the URL synchronized.
- Calendar visibility controls, a mini calendar, event search, and event details.
- A glass-material interface with light and dark modes and selectable theme colors.
- Seven locales: Simplified Chinese, English, Japanese, Korean, Spanish, French, and German.
- Lunar dates and solar terms in the Simplified Chinese interface, backed by complete data for 1900–2100.
- Offline status, site-wide SEO metadata, and JSON-LD structured data for the next launch.

The application only presents upstream data. It does not allow creating, editing, deleting, or rescheduling events.

## Technology and Data Flow

Calendar Hub is based on the [Nuxt UI Calendar template](https://github.com/nuxt-ui-templates/calendar) and uses Nuxt 4, Nuxt UI 4, Tailwind CSS, NuxtHub KV, Cloudflare Workers, and Bun.

Data flow: **upstream schedules → server-side normalization and KV cache → ICS feeds / JSON APIs → calendar clients and the website**.

- SpaceX data combines the GraphQL Page Tiles and TIMING JSON sources used by the official website.
- Formula 1 sessions are loaded from the current official calendar with bounded concurrency.
- WTT data is parsed from official tournament and match data. Dota 2 data comes from Liquipedia with an explicit `User-Agent`.
- The `calendar:sync` task runs hourly for SpaceX and Formula 1. Other calendars use their own request-time caching flows.
- `/api/events` loads sources independently, filters by overlapping time range, deduplicates by ID, and selects localized titles using `locale`.
- Event start and end values are absolute ISO timestamps; clients display them in the user's local time zone.

Upstream providers may revise schedules, publish times late, or change page structures. Always treat the relevant organizer as the final authority.

## Local Development

Install Bun (`package.json` currently declares version `1.4.0`), then run:

```bash
bun install
bun run dev
```

The application is available at `http://localhost:3000` by default. To change the port, use an environment variable:

```powershell
$env:PORT = '3111'
bun run dev
```

Do not append `--host --port 3111`; that combination may be parsed as an invalid hostname.

### Useful Endpoints

| Endpoint | Purpose |
| --- | --- |
| `/api/calendars` | The four calendar layers used by the UI |
| `/api/topics` | All topics and their subscription paths |
| `/api/events?start=...&end=...&locale=en` | Aggregated events; query windows are limited to 90 days |
| `/api/launches` | Upcoming launches |
| `/api/history-launches` | Historical launches |
| `/api/launches/<slug>` | Details for one launch |
| `/api/calendar/<topic>` | JSON data for one topic |
| `/spacex.ics`, `/ics/<topic>.ics` | Calendar feeds |

After starting the development server, verify real responses in PowerShell:

```powershell
curl.exe -s http://localhost:3000/api/calendars
curl.exe -s 'http://localhost:3000/api/events?start=2026-10-01T00:00:00Z&end=2026-11-01T00:00:00Z&locale=en'
curl.exe -sD - -o NUL http://localhost:3000/spacex.ics
```

## Project Structure

```text
app/                       Frontend application, calendar views, details, and Subscribe dialog
  composables/             Route state, event loading, lunar calendar, and theme colors
  utils/                   Date, event layout, presentation, and theme utilities
server/
  api/                     Calendar, topic, event, and launch JSON endpoints
  routes/                  ICS feed routes
  utils/                   Fetching, normalization, ICS serialization, and KV caching
  tasks/calendar/sync.js   Scheduled synchronization entry point
  plugins/                 URL and streamed-response compatibility
shared/                    Shared event types and time utilities
i18n/locales/              Translation messages for seven locales
build/                     Build compatibility code
scripts/                   Translation and theme-color CSS generators
test/                      Data, feed, theme, and compatibility tests
public/                    Static assets, robots.txt, and sitemap
nuxt.config.ts             Nuxt, i18n, KV, and Nitro configuration
wrangler.toml              Worker domain, KV bindings, and scheduled triggers
```

## Development Constraints

See [AGENTS.md](./AGENTS.md) for the complete rules. In particular:

1. **Keep event identities stable.** The SpaceX UID must remain `UID:${mission.correlationId || mission.id}@spacexcalendar.local`.
2. **Preserve the feed response contract.** `/spacex.ics` must keep these headers:

   ```text
   Content-Type: text/calendar; charset=utf-8
   Content-Disposition: inline; filename="spacex-launches.ics"
   Cache-Control: public, max-age=300
   ```

3. **Serialize safely.** ICS text fields must pass through `escapeIcsText`. Live missions must remain in upcoming results and feeds after their scheduled time.
4. **Keep the application read-only.** Do not restore event writes, editors, or drag-and-drop flows. New `CalendarEvent` fields must remain optional and timestamps must remain absolute ISO values.
5. **Filter subscriptions on the server.** Regular `WTT Contender` events retain finals only. UI filtering cannot replace ICS filtering.
6. **Keep translations synchronized.** New copy must update at least `zh-CN.json` and `en.json`.
7. **Stay lightweight at the edge.** Check the server bundle size before adding dependencies.

### Maintaining Translations and Theme Colors

```powershell
$env:OPENAI_API_KEY = 'your-key'
bun run translate:locales -- --locales=ja,ko,es,fr,de
```

```bash
bun run generate:theme-colors
```

## Verification

Before committing or deploying, run these commands in order:

```bash
bun test
node --check server/utils/calendars.js
node --check server/utils/spacex.js
node --check server/utils/kv.js
node --check server/routes/spacex.ics.js
bun run typecheck
bun run lint
bun run build
git diff --check
```

For frontend or data-ingestion changes, also verify the real APIs, ICS response headers, and rendered pages.

## Cloudflare Workers Deployment

Static assets are served through Workers Assets; Nitro Worker handles SSR, APIs, and ICS feeds. Before deployment, check `wrangler.toml` for the custom domain, current KV namespace, and hourly Cron trigger.

```bash
bun run preview:worker   # Build and preview in the local Workers runtime
bun run deploy:worker    # Build and deploy to Cloudflare
```

After deployment, verify the live feed responses:

```powershell
curl.exe -I https://calendarhub.mou7s.com/spacex.ics
curl.exe -I https://calendarhub.mou7s.com/ics/wtt.ics
```

## Troubleshooting

- **APIs return the Nuxt welcome page:** an old development process may still be using a stale module graph or `.nuxt` cache. Read its PID from `.nuxt/nuxt.lock`, stop that specific process, remove the project's `.nuxt` and `.output` directories, and restart.
- **Another Nuxt development process is already running:** inspect the PID in the lock file and confirm that it belongs to this project before stopping it.
- **Scheduled sync is skipped locally:** scheduled tasks skip when no usable KV binding is available.
- **Subscription changes do not appear immediately:** calendar clients refresh on their own schedules, and upstream data and application caches affect timing.

## License

Licensed under the [MIT License](./LICENSE). The interface is based on the official [nuxt-ui-templates/calendar](https://github.com/nuxt-ui-templates/calendar) template.
