---
name: wtt-result-freshness
description: Diagnose and fix missing or delayed WTT match results by checking official CDN freshness, shared caches, and recent-result retention.
---

# WTT result freshness

Compare the official event's `take_10_official_results.json` response with the same URL carrying a current `q` timestamp. A 200 response can still contain yesterday's results; compare `matchDateTime.startDateUTC`, scores and response modification time. The unversioned Azure CDN URL has been observed returning older results than the timestamped URL.

Use the refresh timestamp on official-result requests, as on the event-list request. Keep JSON, `/api/events` and topic ICS on `getTopicCalendarCacheKey('wtt')`; invalidate pre-fix data through a shared cache version. WTT has a five-minute server cache, distinct from other topics. SWR can return the old payload once while revalidating, and the browser's range payload cache can require a reload.

The official file contains only ten matches. Merge recently observed completed results into the next payload so a refresh does not remove prior matches. Retain the existing 30-day horizon, discard cached schedules, deduplicate by existing ID and let fresh results replace older scores. This preserves observed results; it does not recover matches that were never fetched. Do not infer a score from elapsed time.

Validate regression cases for timestamp-dependent upstream responses, retained prior-day results, corrected scores, expired history and unchanged ICS UIDs. Follow AGENTS.md checks, then request JSON, event API and WTT ICS from dev and verify at least one current-day official result. Report local verification separately from deployment.

On Windows, Node fetch may ignore proxy environment variables. Curl can retrieve the response through the configured proxy, but some bundled curl versions cannot decode Brotli: inspect `Content-Encoding`, and use Node's `brotliDecompressSync` on the downloaded response for analysis. Do not confuse a local decoding failure with the Worker's upstream failure.
