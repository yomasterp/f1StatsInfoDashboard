# F1 Race Dashboard

An unofficial, non-affiliated portfolio project for exploring Formula 1 history, current-season results, and session analytics. It does not use Formula 1 logos, official fonts, video, or live timing.

## Local setup

### Prerequisites

- Node.js 24 or later
- A local PostgreSQL server
- A database named `f1_race_dashboard`
- A NewsData.io key when using the default news commands

pgAdmin is only a database administration client. Create the local database through pgAdmin, then copy `.env.example` to `.env` and set a local connection string:

```env
DATABASE_URL=postgresql://postgres:your-local-password@localhost:5432/f1_race_dashboard
NEWS_PROVIDER=newsdata
NEWSDATA_API_KEY=your-newsdata-key
```

Add the NewsData.io key only to the root `.env`. Never prefix it with `NEXT_PUBLIC_`, send it to browser code, or commit `.env`; the file is ignored by Git. The optional query, language, category, and base-URL settings are documented in `.env.example`. NewsAPI remains available only as an explicitly selected local-development provider.

### Install and run

```powershell
npm install
npm run db:check
npm run db:migrate
npm run dev
```

The database is the application’s canonical data store. Pages will query it rather than public source APIs at render time.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server. |
| `npm run lint` | Run ESLint. |
| `npm run typecheck` | Run TypeScript validation. |
| `npm run fallow` | Analyze changed TypeScript and JavaScript for codebase-level risks. |
| `npm test` | Run unit tests. |
| `npm run test:integration` | Validate the applied local database migration. |
| `npm run build` | Build the production app. |
| `npm run db:check` | Verify the local PostgreSQL connection. |
| `npm run db:generate` | Generate a migration after a schema change. |
| `npm run db:migrate` | Apply committed migrations to the configured database. |
| `npm run news:check` | Make one validated request to the selected news provider and print up to five headline summaries without storing them. |
| `npm run news:import` | Fetch, validate, normalize, and idempotently store article metadata from the selected news provider. |

## Current database foundation

The initial migration creates `import_runs`, an audit log for ingestion attempts. It tracks the source, import scope, outcome, timing, record counts, and error details. Future schema branches will add normalized Formula 1 reference data and associate imported records with an import run.

The reference-data migration adds normalized seasons, countries, circuits and configurations, driver and constructor identities with source-specific aliases, status codes, points systems, race formats, session types, and tire compounds. Future race, session, and results records will reference these canonical tables rather than source-specific names.

The race-weekend migration adds races and sessions. Races identify the season, round, circuit configuration, weekend format, dates, scheduled start, and lifecycle state. Sessions independently track their type, weekend order, planned and actual timing, completion, lap counts, and lifecycle state so postponed or cancelled sessions do not have to be inferred from race-level data.

The race-results migration records each driver's official race classification, constructor, finishing status, grid and finishing positions, points, completed laps, race time or deficit, and fastest-lap details. Results link to a specific session and retain optional source/import identifiers so future ingestion can rerun deterministically without duplicating a driver in the same race classification.

The qualifying-results migration keeps Q1, Q2, and Q3 best times separate from both the official qualifying classification and the final race-grid position. This preserves grid penalties and pit-lane starts without rewriting the qualifying result, while nullable phase times support historical formats and drivers who did not advance or set a time.

The sprint-results migration stores each driver's grid, finish and classified positions, constructor, status, exact points, completed laps, timing or lap deficits, and optional fastest-lap details for a sprint session. It does not hard-code a scoring distribution, so historical and future sprint formats can use the points system applicable to their season.

The practice-results migration stores each driver's session classification, constructor, optional status, best-lap time and lap number, gap to the session leader, and completed-lap count. Nullable timing fields preserve the difference between a driver who set no representative time and one whose data has not yet been imported, while source and import-run fields keep later FastF1 ingestion traceable.

The driver- and constructor-standings migration records a snapshot after each scoring session. Each snapshot stores the ranked entrant, exact points, win count, optional countback evidence, and source/import provenance; the session reference makes sprint and race standings distinct without assuming every season follows the same weekend format.

The driver- and constructor-championship-results migration stores each entrant's final official classification for a season. It keeps exact points, wins, optional countback evidence, and source/import provenance separate from session-by-session standings so historical pages can retrieve final tables without assuming a season ended with a standard race weekend.

The lap-times migration stores one driver lap per session and lap number, including optional lap and sector durations, stint number, tire compound and age, freshness, pit-in/pit-out markers, accuracy, and deleted-lap context. Nullable detailed fields preserve unavailable FastF1-era data without representing it as a valid zero-value lap, while session/lap and driver/session/lap indexes support later charts.

The news-foundation migration adds normalized `news_sources` and `news_articles`. Article records contain discovery metadata and short descriptions, link to their publisher and import run, and are deduplicated by both canonical URL and provider record identifier. Full article bodies are intentionally discarded.

To verify a key and import news after applying migrations:

```powershell
npm run news:check
npm run news:import
```

Both commands run outside the Next.js request lifecycle. See `docs/news-foundation.md` for provider boundaries, configuration, and operational guidance.

No Formula 1 source data has been imported yet. The future Jolpica and FastF1 workers will be separate from the Next.js request lifecycle, rerunnable, rate-limited, and idempotent.
