---
name: f1-schema-evolution
description: Design or change this F1 dashboard's Drizzle/PostgreSQL schema, migrations, constraints, indexes, and database integration tests. Use for persistent data-model changes; do not use for query-only or UI-only work.
---

# F1 Schema Evolution

Evolve the canonical PostgreSQL model without flattening historical Formula 1 differences or weakening import traceability.

## Before changing the schema

- Read `DIRECTIVES.md` and the relevant unchecked section of `requirements.md`.
- Inspect `src/lib/database/schema.ts`, the latest files in `drizzle/`, and related tests in `tests/database/`.
- Confirm whether a value is genuinely optional, historically inapplicable, unavailable from a source, or merely not imported yet. Model these states deliberately.

## Modeling rules

- Keep the database source-neutral. Resolve provider identifiers through canonical entities and alias/source-record mappings rather than using provider names as primary identity.
- Represent races and sessions separately. Do not infer session state solely from a race or assume every weekend has the same format.
- Preserve distinctions that official corrections can change independently, such as qualifying classification versus final grid position and finishing order versus classified position.
- Store durations as integer milliseconds, timestamps with time zone in UTC, dates as dates, and exact championship points in a non-floating representation.
- Support historical rule and format ranges through data, not current-season constants.
- Add foreign keys, natural uniqueness, domain checks, and indexes that match expected lookup, import, and chart paths. Pair `source` and `source_identifier` fields and associate imported facts with `import_runs` when applicable.
- Prefer restrictive deletion for historical facts and cascading deletion only for true owned children such as aliases.
- Append migrations after merged migrations. Do not rewrite migration history already used by another branch or environment.

## Change workflow

1. Update the Drizzle schema as the source of truth.
2. Generate the migration with `npm run db:generate`; inspect the SQL and metadata for unintended destructive changes.
3. Add integration tests that prove valid historical and modern examples work and invalid relationships, ranges, duplicates, and source metadata fail.
4. Apply migrations to a clean or appropriately current local PostgreSQL database with `npm run db:migrate`.
5. Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:integration`, `npm run build`, and `npm run fallow` when relevant.

Use transactional fixtures that roll back where practical. Assert meaningful database behavior and SQLSTATE classes rather than only checking that table names exist.

## Completion evidence

Report the exact tables, constraints, indexes, migration files, and tests affected. Mark a requirement complete only after its pull request is merged, as required by `DIRECTIVES.md`.
