# F1 Race Dashboard

An unofficial, non-affiliated portfolio project for exploring Formula 1 history, current-season results, and session analytics. It does not use Formula 1 logos, official fonts, video, or live timing.

## Local setup

### Prerequisites

- Node.js 24 or later
- A local PostgreSQL server
- A database named `f1_race_dashboard`

pgAdmin is only a database administration client. Create the local database through pgAdmin, then copy `.env.example` to `.env` and set a local connection string:

```env
DATABASE_URL=postgresql://postgres:your-local-password@localhost:5432/f1_race_dashboard
```

Never commit `.env`; it is ignored by Git.

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

## Current database foundation

The initial migration creates `import_runs`, an audit log for ingestion attempts. It tracks the source, import scope, outcome, timing, record counts, and error details. Future schema branches will add normalized Formula 1 reference data and associate imported records with an import run.

The reference-data migration adds normalized seasons, countries, circuits and configurations, driver and constructor identities with source-specific aliases, status codes, points systems, race formats, session types, and tire compounds. Future race, session, and results records will reference these canonical tables rather than source-specific names.

The race-weekend migration adds races and sessions. Races identify the season, round, circuit configuration, weekend format, dates, scheduled start, and lifecycle state. Sessions independently track their type, weekend order, planned and actual timing, completion, lap counts, and lifecycle state so postponed or cancelled sessions do not have to be inferred from race-level data.

The race-results migration records each driver's official race classification, constructor, finishing status, grid and finishing positions, points, completed laps, race time or deficit, and fastest-lap details. Results link to a specific session and retain optional source/import identifiers so future ingestion can rerun deterministically without duplicating a driver in the same race classification.

No Formula 1 source data has been imported yet. The future Jolpica and FastF1 workers will be separate from the Next.js request lifecycle, rerunnable, rate-limited, and idempotent.
