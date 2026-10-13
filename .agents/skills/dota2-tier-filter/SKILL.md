---
name: dota2-tier-filter
description: Diagnose small Dota 2 tournaments leaking into calendar feeds and validate Tier 1 filtering.
---

# Dota 2 subscription filtering

Apply when changing Dota 2 tournament eligibility or investigating unwanted matches.

- Inspect `parseDota2Matches`, tournament metadata fetching and the KV fallback together. Accept only confirmed Tier 1 metadata; missing metadata, empty tiers and legacy venue-only entries must be excluded.
- Keep cached confirmed Tier 1 tournaments eligible when upstream requests fail. Do not infer tournament eligibility from names or venues.
- Version the topic payload cache through `getTopicCalendarCacheKey` and use the same key in JSON, ICS and `/api/events`. Update the TTL branch in `kv.js`; do not reuse old payloads containing unfiltered matches.
- Preserve match IDs and ICS UIDs. Filtering removes existing subscriber events after client refresh, so explain the impact before changing the policy.
- Test known Tier 1, lower tiers, missing metadata and upstream failure with cached metadata. Run repository checks and request the local JSON and ICS routes; an empty live feed proves neither upstream availability nor the presence of major tournaments.
