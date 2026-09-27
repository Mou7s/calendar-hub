---
name: calendar-event-localization
description: Localize calendar event details and layer names across all supported locales without changing ICS source data.
---

# Calendar event localization

Use this skill when event titles look localized but event details, venue, winner, score labels, or calendar names still mix languages.

## Workflow

1. Trace the full render path from static/source data through the JSON API to the composable and detail component. Check every directly rendered field, including title, phase/vehicle, venue, description, winner, per-game scores, and layer name.
2. Keep source fixtures and ICS output stable unless schedule content itself must change. Add locale-aware presentation at the JSON/API boundary so browser text can vary by the request locale without changing event IDs, dates, score data, or ICS UIDs.
3. Map source event categories and participant names for all seven locales (`zh-CN`, `en`, `ja`, `ko`, `es`, `fr`, `de`). Normalize source markers such as medal icons before category lookup, then add the marker once to the localized title.
4. Return structured details in their own fields. Avoid synthesizing a description that repeats phase and venue below those same rows.
5. Localize every visible label and the calendar-layer name in all seven locale files. Check every consumer of the layer list, including the sidebar/search data and subscription modal.
6. Exercise every fixture in every locale. Compare output against the original full source category/phase to catch missing mappings. Japanese legitimately uses CJK characters, so check for known Chinese-only phrases there instead of banning the whole Unicode range. Avoid treating shared words such as French “doubles” or Spanish “semifinal” as untranslated English.

## Validation

- Run the repository's required tests, typecheck, build, syntax checks, and `git diff --check` from `AGENTS.md`.
- Query `/api/events` for all seven locales over a range containing both scheduled and completed events. Confirm localized title, phase, venue, winner, and game-score values, and confirm no redundant description is returned.
- Check `/api/calendars` consumers render the translated layer name, while the `.ics` feed keeps its established stable identity and serialization.

## Common pitfalls

- Translating `titleEn`/`titleZh` alone leaves bilingual phase, venue, or winner fields visible in the popover.
- Medal symbols can be accidentally duplicated when they remain in the category lookup key and are appended again after localization.
- Broad substring tests produce false positives for valid cognates and Japanese kanji; test actual source-string leakage and locale-specific expected output instead.
