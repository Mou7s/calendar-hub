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
- For 2026 Aichi-Nagoya table tennis, the official results hub is client-rendered. Its daily results page uses `https://results.asiangames2026.org/#/discipline/TTE/schedule/daily/YYYY-MM-DD`; the verified daily-data route is `https://back.results.asiangames2026.org/s/AG2026/en/TTE/schedule/daily/YYYY-MM-DD`. The API response is compressed, so use the official page or decode it before parsing, and check each match's status and start time inside the shared session.
- A fixture's competitor order can differ from the official page's display order. Convert scores and winners carefully before storing them.
- A finished event without a verified result should not receive a guessed score.
- Do not alter SpaceX UID generation, ICS response headers, or field escaping while correcting a different sports calendar.
