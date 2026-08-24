---
name: f1-provider-contract-tests
description: Create or review fixture-driven contract tests for Formula 1 and news data providers, including Jolpica, FastF1, NewsData, and NewsAPI adapters. Use for provider payload validation and normalization boundaries, not database idempotency or browser flows.
---

# F1 Provider Contract Tests

Protect provider adapters from upstream payload changes without making normal tests depend on live services.

## Contract boundary

Test each provider in two stages:

1. raw response validation at the external boundary;
2. normalization into the project's source-neutral typed record.

A fixture should prove the fields the application relies on, not reproduce an entire provider schema. Test missing required fields, nullable or absent optional fields, unknown additive fields, malformed types, provider error bodies, and empty successful responses.

## Fixture policy

- Store compact, representative fixtures under a provider-specific directory in `tests/fixtures/`.
- Remove API keys, tokens, account identifiers, request headers, and irrelevant copyrighted content before committing.
- Record the provider, endpoint or operation, capture date, and scenario in the test or adjacent fixture metadata.
- Include success, empty, pagination, rate-limit, transient failure, and permanent failure examples where the adapter supports them.
- Do not refresh fixtures merely to make a failing test pass. Determine whether the provider changed, the fixture is wrong, or the adapter should remain backward-compatible.
- Default unit and CI tests must not call live providers. Keep credentialed smoke checks explicit, bounded, and outside the ordinary test command.

## Assertions

- Validate raw fixtures with the same Zod or typed boundary used in production.
- Assert canonical identifiers, UTC timestamps, integer-millisecond durations, normalized URLs, enums, and provenance fields.
- Verify stable handling of unknown fields so additive provider changes do not cause unnecessary failures.
- Verify missing or changed relied-upon fields fail with sanitized, actionable errors.
- Test pagination tokens, page termination, quota responses, retry classification, and provider-specific error mapping.
- Ensure provider adapters never leak credentials or raw sensitive headers into errors or logs.

Use table-driven tests when multiple providers must satisfy the same normalized contract. Keep provider-specific assertions in the adapter suite rather than weakening the shared contract.

## Verification

Run `npm test`, lint, typecheck, build, and Fallow for TypeScript adapters. Run the Python test, formatter, linter, and type checks required by `DIRECTIVES.md` when FastF1 code is introduced. Report whether live smoke checks were deliberately skipped.
