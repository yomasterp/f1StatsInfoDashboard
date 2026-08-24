---
name: f1-e2e-testing
description: Create or review Playwright end-to-end tests for the F1 dashboard's primary user journeys, responsive states, and data-availability behavior. Use for browser-level flows after routes exist, not unit, provider-contract, or database-only tests.
---

# F1 End-to-End Testing

Test complete user journeys against deterministic application data, not third-party availability.

## Test environment

- Use Playwright when browser coverage is introduced and add explicit package scripts and CI configuration.
- Start from an isolated PostgreSQL database with committed, minimal seed data. Do not reuse a developer database.
- Disable or intercept external provider calls. Pages must read canonical PostgreSQL data during tests.
- Freeze or inject the current time for next-race countdowns, weekend state, freshness messages, and date filters.
- Disable nondeterministic animation while preserving a separate assertion that reduced-motion behavior works.

## Priority journeys

Cover the routes implemented by the current requirement set, prioritizing:

- current-season home and next-race information;
- season selection and historical navigation;
- race/session result tabs and unavailable-detail messages;
- driver and constructor profiles and comparisons;
- championship scenario explanations;
- news listing, filtering, freshness, and outbound source links.

For every data-driven route, exercise loading where controllable, populated, empty, unavailable, stale, and error states. Include representative desktop and mobile viewports.

## Test quality

- Prefer accessible roles, labels, headings, and stable user-visible identifiers over CSS structure or generated class names.
- Assert the outcome of a user action, not internal React state.
- Keep tests independent and seed only the records each group needs.
- Avoid arbitrary sleeps. Wait for observable UI or application state.
- Do not hide flakes with broad retries. Diagnose shared state, time, animation, race conditions, or unstable selectors.
- Include keyboard navigation and a focused automated accessibility scan where practical, while retaining manual review for complex charts.

## Verification

Run the smallest relevant Playwright project while iterating, then the full end-to-end suite before completion. Record viewport coverage, seeded scenario, and any intentionally untested external navigation. Add the suite to pull-request checks only after it is deterministic and reasonably bounded.
