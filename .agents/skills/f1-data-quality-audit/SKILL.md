---
name: f1-data-quality-audit
description: Build or run repeatable audits for F1 database completeness, relational consistency, provenance, coverage, standings reconciliation, and corrected results. Use for validation reports and data-quality gates, not for silently repairing data.
---

# F1 Data Quality Audit

Produce an auditable account of what is complete, inconsistent, unavailable, stale, or unverified.

## Audit categories

Check at the narrowest useful season, race, session, table, source, and import-run scope:

- expected versus imported seasons, rounds, sessions, entrants, and classifications;
- foreign-key and uniqueness assumptions not already enforced by PostgreSQL;
- race-result positions, status categories, laps, fastest laps, and points consistency;
- driver and constructor standings against cumulative eligible scoring events;
- aliases, canonical identities, source identifiers, provenance, and duplicate candidates;
- detailed-data coverage from 2018 onward, including explicitly unavailable sessions;
- import runs stuck in progress, failed scopes, stale successful imports, and superseded records;
- news canonical URLs, provider identifiers, freshness, and attribution metadata where applicable.

## Report design

- Give every check a stable identifier, scope, severity, outcome, expected value, observed value, and actionable context.
- Distinguish error, warning, informational coverage gap, and known accepted exception.
- Summarize counts without losing record-level evidence needed to investigate.
- Make output deterministic and machine-readable, with a concise human summary.
- Exit nonzero only for severities intended to block the selected workflow.
- Redact credentials and avoid dumping full provider payloads.

## Correction boundary

An audit may propose or export correction candidates, but it must not silently rewrite canonical data. Apply corrections through the normal import/correction workflow with provenance and audit history. Keep accepted exceptions explicit and narrowly scoped; do not use broad ignore lists to make a report green.

## Verification

Test each rule with a passing fixture, a failing fixture, an unavailable-data case, and an accepted exception where applicable. Run audits against small deterministic integration datasets before full backfills. For every production-scale audit, record database/import scope, code version, start/end time, and summary counts.
