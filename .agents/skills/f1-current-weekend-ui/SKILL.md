---
name: f1-current-weekend-ui
description: Build or review the F1 dashboard's current-season home and race-weekend experience, including next-race selection, schedules, countdowns, weekend state, standings summaries, and stale-data handling. Do not use for detailed race charts.
---

# F1 Current Weekend UI

Present the next relevant event accurately across timezones, weekend formats, postponements, and incomplete refreshes.

## Event selection and state

Derive the displayed event from canonical race and session records, not hard-coded calendars or browser locale assumptions.

- Distinguish upcoming, active weekend, session recently completed, completed event, postponed, cancelled, and schedule-to-be-confirmed states.
- Use actual session status and timestamps when available; do not infer completion merely because a scheduled end time passed.
- Support standard, sprint, and historical/future format variations through stored session types and race formats.
- When no future event exists, show a season-complete state rather than wrapping silently to another season.

## Time and freshness

- Store and compare timestamps in UTC, then render in the user's selected or local timezone with the zone clearly available.
- Make countdown behavior deterministic at session boundaries and safe during server/client hydration.
- Display the last successful relevant import and a stale-data warning when freshness thresholds are exceeded.
- Do not replace the last known valid result with an error-only screen when a refresh fails; disclose both the retained data and failure state.

## Page composition

Prioritize next race, session schedule, latest completed result, driver standings, constructor standings, and calendar status. Link cards to the corresponding season, race, session, driver, and constructor pages.

Follow `DIRECTIVES.md` for responsive information hierarchy, original motorsport-inspired styling, accessible contrast, reduced motion, and non-color-only states. Avoid official logos, fonts, team artwork, or implied affiliation.

## Verification

Use injected time and deterministic database fixtures to test boundaries before, during, and after each session; sprint weekends; postponements; cancellations; missing actual timestamps; stale imports; season completion; and multiple timezones. Verify mobile layout, keyboard access, loading, empty, and error states.
