# Calendar Responsive View

Use this skill when changing how the calendar adapts its day, week, or month views to screen width, including visible day columns, route navigation, view labels, and event fetching.

## Keep one source of truth

- Put the responsive mode in `app/composables/useCalendar.ts` so the displayed date range, page title, previous/next dates, and route state agree.
- For compact week mode, pass a three-day range through `rangeFor`; for wide week mode, use seven days. Do not slice the days only inside `WeekView.vue`, because its arrows and fetched interval would still describe a full week.
- Keep adjacent-range prefetch in `app/composables/useCalendarEvents.ts` and mini-calendar hover prefetch in `app/components/calendar/Mini.vue` aligned with the same three-day or seven-day window.
- Derive the selected week tab label from the same responsive state. Reuse `calendar.viewThreeDay` and `calendar.viewWeek` translations in every supported locale; keep the command palette label in sync.
- Preserve SSR hydration by keeping the initial server render stable and applying browser-width state after mount.

## Verify behavior

1. Open a week route at a narrow width below the `lg` breakpoint (for example, 800 px). Confirm the selected tab says “三日” in Chinese, exactly three consecutive date columns appear, and next/previous links move by three days, including across a month boundary.
2. Open the same route above `lg` (for example, 1400 px). Confirm the tab says “周”, seven date columns appear, and next/previous links move by seven days.
3. Check that event range fetching and adjacent-range prefetch use the visible interval, then run the project validation commands required by `AGENTS.md` and make a real request to the local dev server.

## Common pitfall

Responsive column hiding can look correct while the URL and navigation still use the original weekly range. Treat the rendered columns, tab label, title range, arrow step, event query interval, and prefetch interval as one behavior and verify them together at both breakpoints.
