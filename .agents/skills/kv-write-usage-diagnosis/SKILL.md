---
name: kv-write-usage-diagnosis
description: Diagnose unexpectedly high Cloudflare Workers KV write usage by comparing account metrics with cache and scheduled-task write paths in this repository.
---

# Workers KV write usage diagnosis

Use this skill when Cloudflare reports high Workers KV operations, or when a change to this project should reduce KV writes without making calendar data too stale.

## Workflow

1. Read the current Workers KV analytics for the affected namespace and dates. Check which action types are rising, when the rise began, which Workers bind the namespace, and whether a scheduled trigger or recent deployment lines up with it. Verify the current analytics granularity in Cloudflare's documentation; do not attribute namespace totals to a particular key unless the available data supports that.
2. Inventory KV writes in `server/` and `shared/` (`put`, `set`, delete, and wrapper calls). For each write, trace its caller and trigger: request-time cache refresh, scheduled sync, migration, or other path. Record both the application's freshness interval and the physical KV expiration; they control different behavior.
3. Estimate the expected daily writes. For each independently refreshed cache key, estimate refreshes per day from its freshness interval and traffic, then add scheduled writes and metadata writes. Compare the estimate with the measured daily pattern. Binding aliases to the same namespace do not themselves create operations; each executed KV API call does.
4. Make the smallest change that removes unnecessary writes while preserving required freshness and failure behavior. Consider a longer freshness interval for slow-changing data, skipping a write when normalized content is unchanged, or removing writes to status data that has no reader. Keep higher freshness for time-sensitive/live data. Do not suppress writes when content actually changes.
5. Follow this repository's `AGENTS.md` validation sequence. Recheck the resulting diff and report the measured baseline, code paths changed, expected reduction assumptions, and any production measurement still needed.
6. Keep Git delivery separate from Cloudflare deployment. A push does not change production behavior; deploy only when the user has explicitly asked for deployment.

## Repository locations to inspect

- `server/utils/kv.js`: cache freshness and KV adapter behavior.
- `server/api/events.get.ts` and callers in `server/utils/`: request-time reads and refreshes.
- `server/utils/calendars.js`: calendar-source and tournament metadata caches.
- `server/utils/calendar-sync.js` and `server/tasks/calendar/sync.js`: scheduled writes and cadence.
- `wrangler.jsonc` or `wrangler.toml`, plus Nuxt/Nitro config: bindings and scheduled triggers.

## Common pitfalls

- A KV record's long physical TTL does not prevent application refreshes if the code uses a shorter `refreshedAt` interval.
- Count write call sites and their invocation frequency; duplicate aliases are not duplicate writes unless code calls KV through both bindings.
- Do not treat a deploy date or cron schedule as the cause without comparing it to measured operation counts and the code's actual write paths.
- In the current test suite, `runCalendarSyncTask skips gracefully when no KV binding is available` also exercises the bound path against live upstreams and can exceed Bun's default 5-second test timeout. If that is the only failure, rerun with `bun test --timeout=20000` and report the timeout override.
- Never print or commit Cloudflare credentials. If a credential is exposed in chat or logs, recommend revoking and replacing it.
