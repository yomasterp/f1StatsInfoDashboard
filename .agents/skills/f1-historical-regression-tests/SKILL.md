---
name: f1-historical-regression-tests
description: Build or review trusted historical Formula 1 regression fixtures that verify imports, results, standings, points rules, and championship behavior across eras. Use for cross-season correctness, not ordinary schema constraint tests.
---

# F1 Historical Regression Tests

Use a small, auditable set of seasons and events to catch historically incorrect changes without committing a duplicate full database.

## Case selection

Maintain a purposeful matrix covering materially different behavior:

- an early championship with incomplete modern session detail;
- a dropped-score points era;
- a season with a nonstandard scoring exception;
- pre-sprint and sprint formats;
- a recent season with detailed lap and tire data;
- a corrected, penalized, shortened, cancelled, or otherwise exceptional event when implemented.

Choose cases because they exercise a rule or mapping boundary, not because they are famous.

## Expected data

- Record the authoritative or project-approved source and the date each expectation was verified.
- Keep expected values compact: race count, selected classifications, points totals, standings positions, countback evidence, coverage states, and key relationships.
- Separate facts copied from a source from values derived by project logic.
- Do not silently update expectations after a provider correction. Document the correction and why the new expectation is canonical.
- Represent unavailable historical data explicitly; absence of modern timing detail must not fail a complete core-record test.

## Test layers

- Mapper tests verify provider records normalize correctly.
- Import integration tests verify canonical rows and relationships.
- Domain tests verify points, standings, countback, clinching, and elimination.
- End-to-end tests may use the same trusted seed to verify pages, but must not redefine the expected values independently.

Assert meaningful invariants: unique entrants, valid classifications, race and round counts, cumulative points, constructor aggregation, final standings, and declared coverage. Avoid giant snapshots whose changes cannot be reviewed.

## Maintenance

Add a regression case when a real defect reveals a missing era or rule boundary. Keep fixtures deterministic and small enough for CI. Run the relevant unit and database integration suites and identify the historical cases exercised in the PR description.
