---
name: f1-data-ingestion
description: Build or change historical and post-session Formula 1 ingestion, normalization, provenance, coverage, correction, and validation workflows for Jolpica or FastF1 data. Do not use for live-timing scraping or ordinary read queries.
---

# F1 Data Ingestion

Import reproducible, traceable data into PostgreSQL while keeping provider payloads outside page-render paths.

## Source boundaries

- Use Jolpica for the 1950-current core championship record and FastF1 for verified 2018+ practice, lap, position, pit-stop, and tire-stint detail.
- Use FIA or Formula1.com material only for manual verification and official corrections.
- Never ingest from F1 TV, livestreams, Formula1.com live timing, captured browser traffic, or reverse-engineered private endpoints.
- Check provider terms, attribution, rate limits, and known coverage before adding or expanding a source.

## Pipeline design

- Keep ingestion separate from the Next.js request lifecycle. A worker must be rerunnable without a browser request remaining open.
- Validate external payloads at the boundary with Zod in TypeScript or an equivalent typed model in Python. Reject or quarantine malformed records with useful context.
- Normalize identifiers through source mappings and alias tables before inserting facts. Do not match drivers, constructors, or circuits by display name alone.
- Normalize timestamps to UTC, durations to integer milliseconds, and provider enums to canonical lookup values.
- Create an `import_runs` record for each bounded scope. Record source, scope, status, timing, processed/inserted/updated/skipped/failed counts, and sanitized error details.
- Retain source identifiers and imported timestamps on imported facts. Corrections must remain attributable instead of silently erasing audit history.
- Make writes idempotent through stable source keys and database uniqueness. Use transactions around a coherent import unit and prevent concurrent imports of the same session/scope.
- Use bounded retries with backoff only for transient failures. Do not retry validation, licensing, authentication, or deterministic mapping failures indefinitely.

## Coverage and corrections

Distinguish these states explicitly:

- not attempted;
- checked and unavailable;
- partially available;
- imported but unverified;
- verified;
- stale or superseded.

Record coverage at the narrowest useful season/race/session/table scope. A successful empty response is not automatically proof that data does not exist.

Re-import affected classifications and derived standings after penalties or source corrections. Recalculate dependent aggregates only after the canonical transaction succeeds.

## Validation

- Use committed fixtures for mapper and importer tests; ordinary test runs must not depend on live provider availability.
- Test rerunning the same import, partial failures, unknown aliases, corrected records, absent optional sessions, and source timeouts.
- Reconcile race counts, unique entrants, points totals, standings accumulation, and table coverage after backfills.
- Produce a validation/coverage summary that names discrepancies instead of hiding them.

When adding Python, include locked dependencies plus pytest, formatting, linting, and type checking as required by `DIRECTIVES.md`. Never log credentials, connection strings, subscription tokens, or raw sensitive headers.
