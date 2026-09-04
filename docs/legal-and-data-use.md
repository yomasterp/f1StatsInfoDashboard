# Legal and data-use boundaries

## Project identity and branding

F1 Race Dashboard is an unofficial, non-affiliated portfolio project. It is not
endorsed by, associated with, or sponsored by Formula 1, the FIA, any team, or
any driver.

Do not add Formula 1, FIA, team, or driver logos; official fonts; team artwork;
copyrighted video; or branding that could imply endorsement. Use original UI
assets and generic descriptive language instead. The application footer must
retain the unofficial-project disclaimer when public routes are added or
redesigned.

## Source attribution and content limits

The product must identify a source where the source or provider requires it.
For news, every displayed article must show its publisher and link readers to
the original article. The application stores and displays only the metadata
allowed by the selected provider: title, short provider-supplied description,
publisher, author, publication time, and the original URL.

Do not fetch, store, reproduce, or display complete publisher article bodies.
Do not use publisher images unless the relevant provider and publisher rights
have been independently confirmed. Do not remove author, publisher, copyright,
trademark, or other attribution information supplied with a record.

## Current news providers

NewsData.io is the configured default provider. Its credentials remain
server-side in the root `.env`; they must never be committed or exposed through
`NEXT_PUBLIC_` variables. Before enabling a scheduled import or deploying a
change, review the current [NewsData.io documentation](https://newsdata.io/documentation),
[pricing](https://newsdata.io/pricing), and applicable terms for the selected
plan. Quotas, freshness, permitted fields, and plan terms can change.

NewsAPI is supported only for local development. Its Developer plan is limited
to development and testing; a production or staging use requires an appropriate
subscription. Review the current [NewsAPI terms](https://newsapi.org/terms) and
[pricing](https://newsapi.org/pricing) before use.

## Future data sources

Jolpica, FastF1, FIA, and any future source must have a documented source
record before an importer or UI surface is added. The record must state the
source URL, permitted use and attribution, rate limits, storage/redistribution
limits, and the review date. Official/FIA information is a verification source;
the project must not scrape F1 TV, Formula1.com live timing, livestreams,
browser network calls, or reverse-engineered F1 TV endpoints.

## Release review checklist

Complete this checklist for every release that adds a source, import, or
source-backed interface:

- [ ] The public page carries the unofficial-project disclaimer and uses no
  prohibited Formula 1, FIA, team, or driver branding.
- [ ] The selected provider's current terms, plan, quota, attribution, and
  storage limits were reviewed and recorded in the change or pull request.
- [ ] Publisher/source attribution and original links are visible wherever
  required.
- [ ] No full articles, unlicensed images, credentials, or `NEXT_PUBLIC_`
  provider keys are included.
- [ ] The implementation is within the provider's approved API and does not
  use prohibited scraping or live-timing sources.

## FOD-109 review record

Reviewed on 2026-09-03:

- `src/app/page.tsx` provides the public unofficial/non-affiliation disclaimer.
- `src/lib/news/newsdata.ts` discards NewsData image URLs; its article body is
  validated only as provider input and is not normalized for storage.
- `src/lib/news/importer.ts` persists metadata fields rather than complete
  article content.
- `docs/news-foundation.md` documents publisher attribution, original links,
  server-side credentials, and provider/quota checks.

The review found no provider keys, full article bodies, or publisher images in
the current news ingestion path. This document records the remaining release
checklist and requirements for future sources without changing their scope.
