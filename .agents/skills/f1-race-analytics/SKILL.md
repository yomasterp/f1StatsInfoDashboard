---
name: f1-race-analytics
description: Build or review this dashboard's lap-time, tire-stint, position-change, and driver/constructor comparison analytics and visualizations. Use when transforming race data into metrics or charts; do not use for ingestion or schema-only work.
---

# F1 Race Analytics

Create auditable calculations and accessible visualizations without implying precision or coverage the data does not support.

## Data contracts

- Query canonical PostgreSQL data rather than provider APIs during rendering.
- Return availability and freshness metadata with chart data. Distinguish unavailable, partial, stale, filtered, and complete datasets.
- Keep raw observations separate from derived series. Express lap and sector durations as integer milliseconds until display formatting.
- Define each metric's scope and denominator: season/era/circuit, starts versus entries, classified finishes, teammate overlap, and treatment of sprints or DNFs.
- Perform reusable calculations in typed server/domain modules, not inside React presentation components.

## Lap-time analysis

- Preserve raw lap numbers and driver identity.
- Flag deleted or invalid laps, pit in/out laps, safety-car or session-status periods, and missing sectors when known.
- Exclude anomalous laps only through an explicit, testable filter; allow the UI to explain what was excluded.
- Avoid connecting gaps in a way that invents continuous data.

## Tire and position analysis

- Display stints as compound plus start/end lap and mark incomplete or inferred boundaries.
- Do not infer a tire change solely from elapsed time when a trusted stint or pit event is absent.
- Plot race position with position 1 visually highest. Preserve gaps for retirements or missing late-race records and distinguish classified finish from last observed lap position.
- Link pit events, compounds, and position changes only when their session, driver, and lap alignment is valid.

## Comparisons

- Apply identical filters to both compared drivers or constructors.
- Separate totals from rates and expose sample size. Avoid presenting cross-era raw totals as inherently equivalent.
- Treat teammate-only comparisons as overlapping events with compatible entries, not merely overlapping calendar years.
- Define reliability and DNF categories from canonical status groups and disclose excluded statuses.

## Presentation and performance

- Follow `DIRECTIVES.md`: information-first responsive layouts, restrained motion with reduced-motion support, accessible contrast, and non-color-only distinctions.
- Use original styling; do not copy F1/team branding or official visual assets.
- Provide labels, units, legends, keyboard-accessible controls, useful tooltips, empty/error states, and a textual summary where practical.
- Limit initial series and payload size for dense sessions. Prefer server aggregation or intentional downsampling that preserves extrema; disclose when displayed data is sampled.

## Validation

Test metric functions with missing laps, ties, retirements, pit transitions, invalid laps, partial stints, and unequal comparison samples. Verify chart axes, units, filtering, availability messages, responsive behavior, and reduced motion. Run lint, typecheck, unit tests, build, and Fallow; add end-to-end coverage when a primary user flow changes.
