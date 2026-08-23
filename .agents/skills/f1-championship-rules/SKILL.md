---
name: f1-championship-rules
description: Implement or review Formula 1 driver and constructor standings, points systems, countback, clinching, and mathematical-elimination calculations. Use for championship logic, not generic race statistics.
---

# F1 Championship Rules

Build the championship engine as an independently tested domain module whose results are data-driven and explainable.

## Rule inputs

- Load rules for the selected season; do not hard-code the current points table.
- Model which sessions award points, sprint formats, fastest-lap eligibility, shortened-race scales, exceptional multipliers, dropped-score eras, and other season-specific rules when applicable.
- Treat official classified results and penalties as canonical inputs. Keep driver and constructor scoring separate because eligibility and aggregation differ.
- Represent points exactly; avoid binary floating-point comparisons for championship totals.

## Standings and countback

- Accumulate points only from eligible scoring events under that season's rules.
- Rank equal totals using the applicable countback sequence: wins, second places, third places, and continuing positions as required. Do not stop after wins.
- Preserve the evidence used by countback so the UI can explain a tie.
- Handle entrants with team changes, substitute drivers, constructor identity changes, exclusions, and zero-point classifications without collapsing distinct competitors.

## Clinching and elimination

For each remaining scoring event, calculate the obtainable points under its actual format.

- `clinched`: no rival can finish ahead after all remaining outcomes and applicable countback.
- `active`: at least one valid path remains.
- `mathematically eliminated`: no valid points and countback path remains.
- `conditional`: equal-point or countback-dependent cases where the product needs to expose the dependency.

A simple maximum-points comparison may prove elimination, but it is not sufficient for every tie, shared outcome, or constructor case. Account for mutually exclusive finishing positions and two-car constructor scoring whenever those constraints can change the conclusion.

Return structured results containing current points, maximum reachable points, remaining scoring opportunities, status, and a plain-language reason. Keep calculation logic out of page components.

## Verification

- Unit-test known historical clinching rounds and final standings across multiple rule eras.
- Cover one-point margins, exact ties, countback depth, sprint weekends, fastest-lap eligibility, shortened races, cancelled events, dropped scores, penalties, and constructors with two scoring cars.
- Use compact deterministic fixtures. If a historical expected result is sourced externally, record the source and the rule interpretation in the test or adjacent documentation.
- Run the project lint, typecheck, unit tests, build, and Fallow checks; run database integration tests when rule inputs or stored standings change.

Never present an elimination result without the arithmetic or tie-break reason needed to audit it.
