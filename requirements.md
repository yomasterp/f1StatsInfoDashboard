# F1 Race Dashboard — Requirements

## 1. Project purpose and scope

### 1.1 Portfolio application

- [ ] Build a local-first Formula 1 dashboard that demonstrates full-stack engineering, data modeling, scheduled data ingestion, analytics, and visualization skills.
  - The first deployment target is local development. Cloud hosting, user accounts, and live timing are not required for the initial release.

### 1.2 Historical and current-season coverage

- [ ] Store core FIA Formula One World Championship data from the 1950 season through the current 2026 season.
  - Core coverage includes races, circuits, drivers, constructors, qualifying, race results, sprint results when applicable, standings, championship results, and finishing statuses.
- [ ] Store detailed session data from 2018 onward.
  - Detailed coverage includes practice results, lap times, per-lap positions, pit stops, tire compounds, and tire stints.
- [ ] Clearly identify unavailable or incomplete data in both the database and the interface.
  - The application must never imply that lap, pit-stop, tire, or practice data exists for older seasons when it does not.

### 1.3 First-release product areas

- [ ] Provide a current-season and upcoming-race dashboard.
- [ ] Provide a historical results explorer for drivers, constructors, races, circuits, and seasons.
- [ ] Provide driver and constructor comparison tools.
- [ ] Provide driver and constructor championship scenarios with automatic mathematical elimination.
- [ ] **NEWS-PRODUCT-001:** Provide a curated Formula 1 news section sourced through a licensed metadata API.
  - **NEWS-PRODUCT-001.a:** Show publisher attribution and link to the original article rather than reproducing full copyrighted articles.

## 2. Technology requirements

### 2.1 Application stack

- [x] Use Next.js and TypeScript for the web application.
  - Use the App Router and server-side data fetching where it improves page performance and searchability.
- [ ] Use PostgreSQL as the canonical application database.
  - PostgreSQL must hold the normalized, queryable application dataset; the app must not depend on a public source API at page-render time.
- [x] Use a typed database layer and migrations.
  - Select one ORM/query layer, such as Prisma or Drizzle, and use migrations to make the schema reproducible.
- [ ] Use Zod or equivalent runtime validation for external data and API input.

### 2.2 Detailed-data ingestion

- [ ] Run a dedicated ingestion worker for detailed session data.
  - A small Python worker may use FastF1 because it provides session-oriented lap, tire, pit, and timing data; the user-facing app remains TypeScript.
- [ ] Keep the ingestion process separate from the Next.js request lifecycle.
  - Imports may take minutes, must be rerunnable, and must not block a user visiting the dashboard.

### 2.3 Local development

- [x] Provide a documented local setup with environment variables and database startup instructions.
  - Required secrets and connection strings must never be committed to source control.
- [ ] Use database seed/import commands that work on a clean local machine.

### 2.4 News ingestion

- [x] **NEWS-INGEST-001:** Keep news ingestion separate from the Next.js request lifecycle.
- [x] **NEWS-INGEST-002:** Validate news-provider responses with Zod before normalization or storage.
- [x] **NEWS-INGEST-003:** Keep the news provider replaceable behind a typed provider interface.

## 3. Data-source requirements

### 3.1 Source roles

- [ ] Use a historical core source such as Jolpica F1 for normalized championship records.
  - This source supplies the initial reference data and results coverage; imported records must retain their source identifiers.
- [ ] Use FastF1 for 2018+ session detail where coverage is verified.
  - It supplies lap timing, sector timing, tires/stints, pit information, practice data, and related session details.
- [ ] Use official/FIA information only as a verification reference for schedules, classifications, penalties, and corrections.
  - Do not scrape or ingest from F1 TV, Formula1.com live timing, livestreams, browser network calls, or unofficial reverse-engineered F1 TV endpoints.
- [x] **NEWS-SOURCE-001:** Use NewsData.io for deployed portfolio and preview article discovery under its applicable plan and terms.
  - **NEWS-SOURCE-001.a:** Store article metadata and short provider-supplied descriptions only, preserve publisher attribution, and link readers to the original publisher.
  - **NEWS-SOURCE-001.b:** Do not store or display full article content or publisher imagery from NewsData.io unless the relevant rights are independently confirmed.
  - **NEWS-SOURCE-001.c:** Keep NewsData.io credentials server-side and account for the free plan's delayed results and request quota.
- [x] **NEWS-SOURCE-002:** Retain NewsAPI only as an optional local-development provider under its applicable plan and terms.

### 3.2 Provenance and import history

- [ ] Record the source, source record identifier, import time, and import-run identifier for imported records.
  - This makes data issues traceable and allows a source record to be refreshed without guessing where it came from.
- [ ] Keep an import log with success, failure, record counts, duration, and error details.
- [ ] Support corrected results and post-race penalties without deleting audit history.

### 3.3 Data-quality validation

- [ ] Validate every imported season against expected race rounds and known final standings.
- [ ] Validate every race result for unique driver/constructor entries, valid finishing status, and consistent points totals.
- [ ] Validate that standings after a round equal the cumulative points from completed scoring events.
- [ ] Produce a coverage report by table and season.
  - The report should state, for example, that tire stints are verified from 2018 onward and whether a specific session is missing.

## 4. Database requirements

### 4.1 Reference data

- [x] Create `seasons`.
  - Stores season year, championship name, number of rounds, and any season-level notes.
- [x] Create `countries`.
  - Normalizes host countries and driver/constructor nationalities.
- [x] Create `circuits` and `circuit_configurations`.
  - A circuit can have multiple historical layouts/configurations, so the layout used by a race must be identifiable.
- [x] Create `drivers`, `driver_aliases`, `constructors`, and `constructor_aliases`.
  - Canonical entities must not break when sources use alternate spellings, names, abbreviations, or renamed teams.
- [x] Create `status_codes`.
  - Captures classifications and retirement reasons such as finished, lapped, accident, engine failure, disqualified, and did not start.
- [x] Create `points_systems` and `race_formats`.
  - Championship scoring and weekend formats changed over time, so neither may be hard-coded.
- [x] Create `session_types` and `tire_compounds`.
  - These standardize practice, qualifying, sprint, race, and tire naming across imports.

### 4.2 Race-weekend structure

- [x] Create `races`.
  - Stores season, round, circuit configuration, official title, dates, scheduled start, format, and cancellation/postponement state.
- [x] Create `sessions`.
  - Stores each practice, qualifying, sprint shootout, sprint, and race session separately, including planned/actual start and completion status.

### 4.3 Results and standings

- [x] Create `race_results`.
  - Stores grid position, classified and finishing positions, points, laps completed, time/laps behind, fastest-lap fields, driver, constructor, and status.
- [x] Create `qualifying_results`.
  - Stores Q1, Q2, Q3, qualifying position, and final grid position separately because penalties can change the grid.
- [x] Create `sprint_results`.
  - Must support seasons with no sprint events and evolving sprint formats.
- [x] Create `practice_results`.
  - Stores session classification, best lap, laps completed, driver, and constructor for 2018+ sessions where data is available.
- [x] Create `driver_standings` and `constructor_standings`.
  - Store standings after each relevant scoring event, not only final standings.
- [ ] Create `driver_championship_results` and `constructor_championship_results`.
  - Store each final season classification and season totals for fast historical pages.

### 4.4 Detailed-session tables

- [ ] Create `lap_times` for 2018+.
  - Each row represents a driver lap and stores lap number, duration, sector times, stint number, tire fields, and pit-in/pit-out markers when available.
- [ ] Create `lap_positions` for 2018+ race sessions.
  - Each row stores a driver's position at the end of a lap, enabling position-change charts.
- [ ] Create `pit_stops` for 2018+.
  - Store the lap, driver, stop duration, pit-lane duration when available, and a link to the source session.
- [ ] Create `tire_stints` for 2018+.
  - Store start/end lap, compound, tire age, stint number, driver, and session.

### 4.5 Deferred detailed tables

- [ ] Reserve schema space for `weather_observations`.
  - Weather is deferred from v1 but should support time/lap-level air temperature, track temperature, humidity, wind, and rainfall later.
- [ ] Reserve schema space for `session_intervals`.
  - Interval/gap snapshots are deferred because they are high-volume and have limited historical coverage.

### 4.6 News metadata

- [x] **NEWS-DATA-001:** Create `news_sources` and `news_articles`.
  - **NEWS-DATA-001.a:** Store normalized publishers, canonical article URLs, headlines, short descriptions, publication timestamps, import provenance, and freshness timestamps.
- [x] **NEWS-DATA-002:** Deduplicate news by canonical URL and stable provider record identifier.

### 4.7 Integrity and performance

- [ ] Use foreign keys, unique constraints, and check constraints for relational integrity.
- [ ] Add indexes for the queries used by pages and charts.
  - At minimum index season, race, session, driver, constructor, and `(session_id, lap_number)` paths.
- [ ] Make detailed-data imports idempotent.
  - Re-running a session import must update or skip existing records rather than create duplicates.

## 5. Ingestion and refresh requirements

### 5.1 Initial backfill

- [ ] Import all core historical data for 1950–2026.
- [ ] Import detailed data for verified 2018–2026 sessions.
- [ ] Store the import result even when an event has no data for a detailed table.
  - This distinguishes "checked and unavailable" from "not imported yet."

### 5.2 Post-session refresh

- [ ] Refresh data after every completed 2026 practice, qualifying, sprint, and race session.
  - The first version does not require live timing while a session is active.
- [ ] Refresh results and standings again after official classifications or penalty changes.
- [ ] Recalculate cached season aggregates and championship scenarios after a successful relevant import.

### 5.3 Operational safety

- [ ] Prevent concurrent imports of the same session.
- [ ] Retry transient source failures with bounded retries and useful logs.
- [ ] Surface stale-data status in the admin/import view.

### 5.4 News refresh

- [x] **NEWS-REFRESH-001:** Provide a rerunnable command that imports Formula 1 article metadata from the configured news provider.
- [ ] **NEWS-REFRESH-002:** Refresh news on a quota-aware schedule and surface the last successful refresh time.
- [x] **NEWS-REFRESH-003:** Record news-import success, failure, counts, duration, and sanitized errors without logging API credentials.

## 6. User-interface requirements

### 6.1 Current-season home page

- [ ] Show the next race with circuit, country, dates, countdown, and session schedule.
- [ ] Show the latest completed session/result.
- [ ] Show current driver and constructor standings.
- [ ] Show the full 2026 calendar and clearly distinguish completed, current, and upcoming events.

### 6.2 Season and historical explorer

- [ ] Provide a season selector from 1950 through 2026.
- [ ] Show schedule, results, qualifying, sprint information, and standings for a selected season.
- [ ] Provide filters by season, driver, constructor, circuit, country, and session type.
- [ ] Make data-availability limitations visible at the page or chart level.

### 6.3 Race detail page

- [ ] Show race metadata, schedule, circuit, grid, qualifying, sprint, and final classification.
- [ ] Show race-level points impact on both championships.
- [ ] Show detailed charts for 2018+ races when data exists.

### 6.4 Driver and constructor profiles

- [ ] Show career totals, team/driver history, season-by-season results, wins, podiums, poles, points, and finish-status breakdowns.
- [ ] Link profiles to related races, seasons, constructors, and drivers.
- [ ] Avoid misleading comparisons across eras by always exposing the selected date/season scope.

### 6.5 Comparison tools

- [ ] Support driver-versus-driver comparisons.
  - Compare wins, podiums, poles, points, starts, DNFs, average grid position, and average finish.
- [ ] Support constructor-versus-constructor comparisons.
- [ ] Support filters for career, season, circuit, era, and teammate-overlap periods where applicable.

### 6.6 News

- [ ] **NEWS-UI-001:** Provide a responsive `/news` page with publisher, publication time, headline, summary, and an external link to the original article.
- [ ] **NEWS-UI-002:** Provide publisher and date filters plus loading, empty, error, and stale-data states.
- [ ] **NEWS-UI-003:** Add a compact latest-news section to the current-season home page.

## 7. Visualization requirements

### 7.1 Lap-time chart

- [ ] Plot selected drivers' lap times over a session.
- [ ] Support compound colors, pit-stop markers, and track/session-status annotations where available.
- [ ] Handle invalid, deleted, in-lap, out-lap, or missing lap times without distorting the chart.

### 7.2 Tire-stint chart

- [ ] Show a horizontal timeline of each driver's stints by compound and lap range.
- [ ] Connect stints to pit-stop events when both datasets are available.
- [ ] Explain unavailable or incomplete tire data.

### 7.3 Position-change chart

- [ ] Plot race position by lap for selected drivers.
- [ ] Allow a user to compare grid position, lap-by-lap position, and final classified position.
- [ ] Mark retirements and missing late-race data clearly.

### 7.4 Comparison charts

- [ ] Provide readable bar/line charts for the selected comparison metrics.
- [ ] Use accessible labels, tooltips, legends, and non-color-only distinctions.

## 8. Championship scenario requirements

### 8.1 Supported championships

- [ ] Calculate scenarios for both drivers' and constructors' championships.
- [ ] Use the selected season's points system, including sprint scoring and fastest-lap rules where applicable.

### 8.2 Automatic elimination

- [ ] Calculate remaining maximum points for each competitor.
- [ ] Mark competitors as `clinched`, `active`, or `mathematically eliminated`.
- [ ] Apply historical tie-break/countback rules rather than treating equal points as a final tie.
- [ ] Explain each status in plain language with the relevant points totals and scoring events remaining.

### 8.3 Verification

- [ ] Test the engine against historical seasons with known clinching or elimination states.
- [ ] Test regular, sprint, and points-system-change seasons.

## 9. API and application behavior requirements

### 9.1 Read APIs

- [ ] Provide typed endpoints or server-side query functions for seasons, calendar, races, results, standings, profiles, comparisons, charts, and scenarios.
- [ ] **NEWS-API-001:** Provide typed server-side query functions for news lists, filters, and freshness metadata.
- [ ] Support filtering and pagination for high-cardinality lists.
- [ ] Return explicit availability metadata with detailed-session responses.

### 9.2 Reliability and UX

- [ ] Implement loading, empty, error, and stale-data states for every data-driven page.
- [ ] Keep public pages responsive on desktop and mobile.
- [ ] Cache expensive aggregate/chart queries appropriately while preserving correctness after imports.

## 10. Testing, documentation, and compliance

### 10.1 Automated testing

- [ ] Unit-test points calculations, standings accumulation, tie-break rules, normalizers, and data mappers.
- [ ] Integration-test imports against fixture source responses.
- [ ] Test database constraints and idempotent re-import behavior.
- [ ] End-to-end test primary navigation: current season, historical season, race detail, comparison, and scenarios.

### 10.2 Documentation

- [ ] Create a README with setup, architecture, source list, import commands, data coverage, and screenshots.
- [ ] Create an ERD for the database schema.
- [ ] Document known coverage limitations and correction procedures.

### 10.3 Branding and legal boundaries

- [ ] Identify the application as an unofficial, non-affiliated portfolio project.
- [ ] Do not use F1 logos, official fonts, copyrighted video, team artwork, or branding that suggests F1 endorsement without permission.
- [ ] Follow each data provider's terms, attribution, rate-limit, and storage requirements.
- [x] **NEWS-LEGAL-001:** Do not reproduce full news articles or use publisher imagery unless the provider and publisher permit that use.

## 11. Completion milestones

- [ ] **Milestone 1 — Foundation:** Next.js app, PostgreSQL, schema migrations, local setup, and seed data.
- [ ] **Milestone 2 — Historical core:** 1950–2026 core importer, validation report, season/race/standing pages.
- [ ] **Milestone 3 — Profiles and comparison:** driver/constructor pages, comparison queries, and comparison charts.
- [ ] **Milestone 4 — Championship engine:** driver/constructor scenarios, elimination logic, and historical tests.
- [ ] **Milestone 5 — Session analytics:** 2018+ FastF1 worker, lap/pit/stint/position tables, and race visualizations.
- [ ] **Milestone 6 — Current-season operations:** scheduled post-session imports, correction refreshes, stale-data handling, and project polish.
- [ ] **NEWS-MILESTONE-001 — News:** licensed news ingestion, normalized article metadata, scheduled refreshes, and the news interface.
