---
name: official-schedule-correction
description: Correct static sports calendar fixtures against official schedules and results while preserving ICS subscriber identity.
---

# Official sports schedule correction

Use this skill when a static sports calendar in `server/utils/calendars.js` needs schedule, result, or status corrections.

## Workflow

1. Find the fixture array and its existing event IDs. Treat those IDs as subscriber-facing identifiers because the ICS UID is derived from each ID. Keep IDs stable when correcting an existing event; add an ID only for a genuinely missing event.
2. Check the organizer or national Olympic committee's daily schedule for each affected date, then check its official results pages for scores. Use sources for the sport and date rather than relying on a general event overview.
3. Record the venue's local time in the source notes, then convert every start and end time to absolute UTC ISO strings. Keep one event per accurately described round/session; if the source only gives a shared session window, use that window instead of guessing individual match times.
4. Mark events `Finished` only after their scheduled end has passed in the venue timezone. Add a score and winner only when an official result supports them, and keep the score orientation consistent with `competitor1` and `competitor2`.
5. Preserve the calendar's read-only model and existing ICS serialization. Keep `titleEn` and `titleZh` aligned when changing fixture names. Update existing assertions that encode corrected data, without broadening the change into unrelated calendar tests.

## Validation

- Review the complete fixture diff for duplicate IDs, incorrect UTC offsets, and mismatches between labels, dates, status, and scores.
- Run the project's required `node --check server/utils/calendars.js` and existing test suite before submitting or deploying, following the repository's `AGENTS.md` workflow.
- Use `git diff --check` to catch whitespace errors. For changes that affect live calendar responses, verify the corresponding API or ICS feed through a running dev server when the repository instructions require it.

## Common pitfalls

- A daily schedule may group several events into one broad time window; do not invent more precise times.
- A fixture's competitor order can differ from the official page's display order. Convert scores and winners carefully before storing them.
- A finished event without a verified result should not receive a guessed score.
- Do not alter SpaceX UID generation, ICS response headers, or field escaping while correcting a different sports calendar.

## F1 live synchronization

- Use the current season calendar for race membership and each race page for session timestamps, UTC offsets and circuit metadata. An official news article can remain stale while returning HTTP 200; successful parsing alone does not prove freshness.
- Preserve historical ID keys when official URL slugs change (Brazil and Abu Dhabi aliases) or a race relocates. Validate venue-local session dates before converting to UTC; Las Vegas night sessions cross the UTC day boundary.
- Fetch with bounded concurrency, timeout and response size. Reject incomplete seasons rather than replacing good KV with partial data. Verify the production JSON and ICS, and keep last successful check time separate from content modification time.
