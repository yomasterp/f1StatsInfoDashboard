---
name: f1-news-pipeline
description: Build or review the dashboard's licensed Formula 1 news discovery pipeline, provider adapters, canonical URL deduplication, quota-aware refresh, freshness, attribution, and metadata-only presentation. Do not use for race-result ingestion.
---

# F1 News Pipeline

Provide timely article discovery while respecting provider plans, publisher rights, and the project's metadata-only scope.

## Source and content boundaries

- Use NewsData.io for deployed or preview discovery under the applicable plan and NewsAPI only for permitted local development.
- Keep providers behind the typed interface in `src/lib/news/`.
- Store and display metadata needed for discovery: publisher, canonical URL, headline, short provider-supplied description when permitted, publication time, language, provenance, and freshness.
- Do not reproduce full articles or publisher imagery unless both provider and publisher terms explicitly permit it.
- Link users to the original publisher and make external navigation clear.
- Never scrape publisher pages to fill missing metadata.

## Normalization and deduplication

- Validate raw responses before normalization.
- Canonicalize URLs conservatively: normalize host and safe tracking parameters without merging genuinely different articles.
- Deduplicate by canonical URL and stable provider identifier while retaining provenance.
- Preserve meaningful headline and timestamp corrections from later refreshes.
- Do not use headline similarity alone as destructive deduplication.

## Refresh behavior

- Keep refreshes outside the Next.js request lifecycle.
- Respect quotas with bounded page sizes, date windows, and schedules.
- Record `import_runs`, counts, duration, provider, sanitized failures, and the last successful refresh.
- Distinguish no new articles from provider failure and stale data.
- Use bounded retries only for transient errors; surface quota exhaustion and authentication problems without retry loops.
- Never log API keys or include them in URLs, fixtures, errors, or PR evidence.

## Presentation and tests

Expose publisher/date filters, freshness, loading, empty, stale, and error states. Test providers with sanitized fixtures, URL normalization edge cases, deduplication, corrected metadata, quota errors, and reruns. Keep ordinary tests offline.
