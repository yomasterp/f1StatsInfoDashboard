---
name: f1-import-idempotency-tests
description: Create or review PostgreSQL integration tests for rerunnable F1 or news imports, corrections, partial failures, concurrency, and audit history. Use for import write semantics, not provider payload contracts.
---

# F1 Import Idempotency Tests

Prove that rerunning or recovering an import produces one correct canonical result and an accurate audit trail.

## Required scenarios

For each importer or bounded import scope, test:

- first successful import;
- identical rerun;
- source record with corrected mutable fields;
- partial batch failure followed by retry;
- permanent validation or mapping failure;
- transient failure classification and bounded retry behavior;
- two attempts for the same session or scope when concurrency protection applies;
- empty-but-successful and checked-unavailable responses;
- records that share display names but have distinct source identities.

## Database assertions

Use the real PostgreSQL constraints and importer transaction boundaries.

- Assert stable canonical row counts and source identifiers after reruns.
- Assert whether unchanged records are skipped and changed records are updated according to the importer's contract.
- Verify aliases resolve to the same canonical entity without name-only matching.
- Verify `import_runs` status, timing, processed/inserted/updated/skipped/failed counts, and sanitized errors.
- Verify coverage distinguishes not attempted, unavailable, partial, imported, verified, stale, and superseded states where supported.
- Verify a failed coherent transaction cannot leave facts committed while its audit record claims failure or success incorrectly.
- Verify official corrections preserve provenance and do not silently erase required audit history.

## Test isolation

Run against a migrated test database with deterministic fixtures. Use unique scope identifiers and transactions or explicit cleanup so serial integration tests cannot contaminate each other. Inject failures at controlled boundaries rather than relying on unstable networks or process termination.

A concurrency test must assert the intended outcome—lock, skip, queue, or conflict—not merely that one request happened to finish first.

## Verification

Run migrations, the targeted integration test, the complete integration suite, unit tests, lint, typecheck, build, and Fallow when importer code changes. Report the exact rerun and recovery cases covered.
