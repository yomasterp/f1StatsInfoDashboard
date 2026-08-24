---
name: f1-query-contracts
description: Design or review typed server-side query functions and read APIs for F1 dashboard pages, filters, pagination, caching, freshness, and availability metadata. Use for application read contracts, not schema creation or provider ingestion.
---

# F1 Query Contracts

Expose stable, page-oriented read models from canonical PostgreSQL data without leaking database or provider details into components.

## Contract design

- Start from the user flow and define a typed result shaped for that page or chart.
- Validate route, search, cursor, season, driver, constructor, circuit, and date inputs with Zod or equivalent runtime validation.
- Return source-neutral identifiers, display fields, units, availability, and freshness. Do not expose provider payloads or ORM rows directly.
- Distinguish empty results from unavailable coverage, stale data, invalid filters, and operational failure.
- Keep time values and points exact in the domain layer; format them at the presentation boundary.
- Use a consistent error contract that does not reveal database details or credentials.

## Pagination and filtering

- Use a deterministic total ordering with a unique tie-breaker.
- Treat cursors as opaque and validate them before use.
- Apply the same filters to data rows, counts, aggregates, and comparison sides.
- Bound page size and selected chart series.
- Avoid offset pagination for high-volume lap or interval data when a stable cursor is more appropriate.

## Performance and caching

- Inspect the generated query and expected access path for high-cardinality endpoints.
- Add indexes through the schema workflow only when supported by an actual query.
- Prevent N+1 profile, standings, and race-result queries.
- Cache only results whose invalidation is understood. Include season/session/import freshness in keys when needed.
- Invalidate or revalidate dependent reads after successful imports and corrections, not before the canonical transaction completes.

## Verification

Unit-test input parsing and result mapping. Integration-test filtering, stable pagination, empty/unavailable distinctions, and representative query plans or counts where performance matters. Verify server components and route handlers consume the contract without direct provider access.
