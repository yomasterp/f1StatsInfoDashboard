import {
  bigserial,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  type PgColumn,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql, type SQLWrapper } from "drizzle-orm";

const hasNonBlankText = (value: SQLWrapper) =>
  sql`char_length(trim(${value})) > 0`;

const hasValidSeasonRange = (fromSeason: SQLWrapper, toSeason: SQLWrapper) =>
  sql`${toSeason} IS NULL OR ${fromSeason} IS NULL OR ${fromSeason} <= ${toSeason}`;

type SourceAliasColumns = {
  source: SQLWrapper;
  sourceIdentifier: SQLWrapper;
  alias: SQLWrapper;
};

const sourceAliasChecks = (table: SourceAliasColumns, tableName: string) => [
  check(`${tableName}_source_not_blank`, hasNonBlankText(table.source)),
  check(
    `${tableName}_source_identifier_not_blank`,
    hasNonBlankText(table.sourceIdentifier),
  ),
  check(`${tableName}_alias_not_blank`, hasNonBlankText(table.alias)),
];

type SourceRecordColumns = {
  source: SQLWrapper;
  sourceIdentifier: SQLWrapper;
};

const sourceRecordChecks = (table: SourceRecordColumns, tableName: string) => [
  check(
    `${tableName}_source_fields_paired`,
    sql`(${table.source} IS NULL AND ${table.sourceIdentifier} IS NULL) OR (${table.source} IS NOT NULL AND ${table.sourceIdentifier} IS NOT NULL AND ${hasNonBlankText(
      table.source,
    )} AND ${hasNonBlankText(table.sourceIdentifier)})`,
  ),
];

export const importRunStatus = pgEnum("import_run_status", [
  "running",
  "succeeded",
  "failed",
  "skipped",
]);

/**
 * Records every ingestion attempt before domain-specific records are introduced.
 * Subsequent importer tables will reference this audit trail through import_run_id.
 */
export const importRuns = pgTable(
  "import_runs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    source: text("source").notNull(),
    scope: text("scope").notNull(),
    status: importRunStatus("status").notNull().default("running"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    durationMs: integer("duration_ms"),
    recordsProcessed: integer("records_processed").notNull().default(0),
    recordCounts: jsonb("record_counts"),
    errorDetails: jsonb("error_details"),
  },
  (table) => [
    check(
      "import_runs_duration_ms_non_negative",
      sql`${table.durationMs} IS NULL OR ${table.durationMs} >= 0`,
    ),
    check(
      "import_runs_records_processed_non_negative",
      sql`${table.recordsProcessed} >= 0`,
    ),
    index("import_runs_source_status_started_at_idx").on(
      table.source,
      table.status,
      table.startedAt,
    ),
  ],
);

export const statusCategory = pgEnum("status_category", [
  "classified",
  "retired",
  "disqualified",
  "not_started",
  "not_classified",
  "unknown",
]);

export const eventStatus = pgEnum("event_status", [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
  "postponed",
  "not_held",
]);

/** A championship season, including seasons that are later cancelled or incomplete. */
export const seasons = pgTable(
  "seasons",
  {
    year: integer("year").primaryKey(),
    championshipName: text("championship_name").notNull(),
    rounds: integer("rounds").notNull().default(0),
    notes: text("notes"),
  },
  (table) => [
    check("seasons_year_range", sql`${table.year} BETWEEN 1950 AND 2100`),
    check("seasons_rounds_non_negative", sql`${table.rounds} >= 0`),
  ],
);

/** ISO-normalized countries used by circuit hosts and competitor nationalities. */
export const countries = pgTable(
  "countries",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    isoAlpha2: text("iso_alpha2").notNull(),
    isoAlpha3: text("iso_alpha3"),
    name: text("name").notNull(),
    demonym: text("demonym"),
  },
  (table) => [
    uniqueIndex("countries_iso_alpha2_unique").on(table.isoAlpha2),
    uniqueIndex("countries_iso_alpha3_unique").on(table.isoAlpha3),
    uniqueIndex("countries_name_unique").on(table.name),
    check("countries_iso_alpha2_length", sql`char_length(${table.isoAlpha2}) = 2`),
    check(
      "countries_iso_alpha2_uppercase",
      sql`${table.isoAlpha2} = upper(${table.isoAlpha2})`,
    ),
    check(
      "countries_iso_alpha3_length",
      sql`${table.isoAlpha3} IS NULL OR char_length(${table.isoAlpha3}) = 3`,
    ),
    check(
      "countries_iso_alpha3_uppercase",
      sql`${table.isoAlpha3} IS NULL OR ${table.isoAlpha3} = upper(${table.isoAlpha3})`,
    ),
  ],
);

/** The physical venue; a venue can have multiple historically distinct layouts. */
export const circuits = pgTable(
  "circuits",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    locality: text("locality"),
    countryId: integer("country_id")
      .notNull()
      .references(() => countries.id, { onDelete: "restrict" }),
    latitude: numeric("latitude", { precision: 8, scale: 5 }),
    longitude: numeric("longitude", { precision: 8, scale: 5 }),
  },
  (table) => [
    uniqueIndex("circuits_slug_unique").on(table.slug),
    index("circuits_country_id_idx").on(table.countryId),
    check("circuits_slug_not_blank", hasNonBlankText(table.slug)),
    check("circuits_name_not_blank", hasNonBlankText(table.name)),
    check(
      "circuits_latitude_range",
      sql`${table.latitude} IS NULL OR ${table.latitude} BETWEEN -90 AND 90`,
    ),
    check(
      "circuits_longitude_range",
      sql`${table.longitude} IS NULL OR ${table.longitude} BETWEEN -180 AND 180`,
    ),
  ],
);

/** A named circuit layout/configuration that can be selected by a historical race. */
export const circuitConfigurations = pgTable(
  "circuit_configurations",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    circuitId: integer("circuit_id")
      .notNull()
      .references(() => circuits.id, { onDelete: "restrict" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    lengthKm: numeric("length_km", { precision: 6, scale: 3 }),
    effectiveFromSeason: integer("effective_from_season").references(
      () => seasons.year,
      { onDelete: "restrict" },
    ),
    effectiveToSeason: integer("effective_to_season").references(
      () => seasons.year,
      { onDelete: "restrict" },
    ),
    notes: text("notes"),
  },
  (table) => [
    uniqueIndex("circuit_configurations_circuit_code_unique").on(
      table.circuitId,
      table.code,
    ),
    index("circuit_configurations_circuit_id_idx").on(table.circuitId),
    check(
      "circuit_configurations_code_not_blank",
      hasNonBlankText(table.code),
    ),
    check(
      "circuit_configurations_name_not_blank",
      hasNonBlankText(table.name),
    ),
    check(
      "circuit_configurations_length_positive",
      sql`${table.lengthKm} IS NULL OR ${table.lengthKm} > 0`,
    ),
    check(
      "circuit_configurations_effective_range",
      hasValidSeasonRange(table.effectiveFromSeason, table.effectiveToSeason),
    ),
  ],
);

/** Canonical driver identity, independent from an external provider's spelling or abbreviation. */
export const drivers = pgTable(
  "drivers",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    slug: text("slug").notNull(),
    givenName: text("given_name").notNull(),
    familyName: text("family_name").notNull(),
    dateOfBirth: date("date_of_birth"),
    nationalityCountryId: integer("nationality_country_id").references(
      () => countries.id,
      { onDelete: "restrict" },
    ),
    permanentNumber: integer("permanent_number"),
  },
  (table) => [
    uniqueIndex("drivers_slug_unique").on(table.slug),
    uniqueIndex("drivers_permanent_number_unique").on(table.permanentNumber),
    index("drivers_nationality_country_id_idx").on(table.nationalityCountryId),
    check("drivers_slug_not_blank", hasNonBlankText(table.slug)),
    check(
      "drivers_given_name_not_blank",
      hasNonBlankText(table.givenName),
    ),
    check(
      "drivers_family_name_not_blank",
      hasNonBlankText(table.familyName),
    ),
    check(
      "drivers_permanent_number_range",
      sql`${table.permanentNumber} IS NULL OR ${table.permanentNumber} BETWEEN 0 AND 99`,
    ),
  ],
);

/** Source-specific names, abbreviations, and source record identifiers for a driver. */
export const driverAliases = pgTable(
  "driver_aliases",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    driverId: integer("driver_id")
      .notNull()
      .references(() => drivers.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    sourceIdentifier: text("source_identifier").notNull(),
    alias: text("alias").notNull(),
  },
  (table) => [
    uniqueIndex("driver_aliases_source_identifier_unique").on(
      table.source,
      table.sourceIdentifier,
    ),
    uniqueIndex("driver_aliases_driver_source_alias_unique").on(
      table.driverId,
      table.source,
      table.alias,
    ),
    index("driver_aliases_driver_id_idx").on(table.driverId),
    ...sourceAliasChecks(table, "driver_aliases"),
  ],
);

/** Canonical constructor/team identity, retained across provider and naming changes. */
export const constructors = pgTable(
  "constructors",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    nationalityCountryId: integer("nationality_country_id").references(
      () => countries.id,
      { onDelete: "restrict" },
    ),
  },
  (table) => [
    uniqueIndex("constructors_slug_unique").on(table.slug),
    index("constructors_nationality_country_id_idx").on(table.nationalityCountryId),
    check(
      "constructors_slug_not_blank",
      hasNonBlankText(table.slug),
    ),
    check("constructors_name_not_blank", hasNonBlankText(table.name)),
  ],
);

/** Source-specific names, abbreviations, and source record identifiers for a constructor. */
export const constructorAliases = pgTable(
  "constructor_aliases",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    constructorId: integer("constructor_id")
      .notNull()
      .references(() => constructors.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    sourceIdentifier: text("source_identifier").notNull(),
    alias: text("alias").notNull(),
  },
  (table) => [
    uniqueIndex("constructor_aliases_source_identifier_unique").on(
      table.source,
      table.sourceIdentifier,
    ),
    uniqueIndex("constructor_aliases_constructor_source_alias_unique").on(
      table.constructorId,
      table.source,
      table.alias,
    ),
    index("constructor_aliases_constructor_id_idx").on(table.constructorId),
    ...sourceAliasChecks(table, "constructor_aliases"),
  ],
);

/** Classification and retirement status definitions shared by results across seasons. */
export const statusCodes = pgTable(
  "status_codes",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    code: text("code").notNull(),
    description: text("description").notNull(),
    category: statusCategory("category").notNull(),
    isClassified: boolean("is_classified").notNull().default(false),
  },
  (table) => [
    uniqueIndex("status_codes_code_unique").on(table.code),
    check("status_codes_code_not_blank", hasNonBlankText(table.code)),
    check(
      "status_codes_description_not_blank",
      hasNonBlankText(table.description),
    ),
  ],
);

/** Data-driven scoring rules; the JSON rule payload preserves evolving award details. */
export const pointsSystems = pgTable(
  "points_systems",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    effectiveFromSeason: integer("effective_from_season").references(
      () => seasons.year,
      { onDelete: "restrict" },
    ),
    effectiveToSeason: integer("effective_to_season").references(
      () => seasons.year,
      { onDelete: "restrict" },
    ),
    rules: jsonb("rules").notNull(),
    notes: text("notes"),
  },
  (table) => [
    uniqueIndex("points_systems_code_unique").on(table.code),
    check("points_systems_code_not_blank", hasNonBlankText(table.code)),
    check("points_systems_name_not_blank", hasNonBlankText(table.name)),
    check(
      "points_systems_effective_range",
      hasValidSeasonRange(table.effectiveFromSeason, table.effectiveToSeason),
    ),
  ],
);

/** Data-driven weekend formats, including formats with no sprint session. */
export const raceFormats = pgTable(
  "race_formats",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    hasSprint: boolean("has_sprint").notNull().default(false),
    schedule: jsonb("schedule").notNull(),
    effectiveFromSeason: integer("effective_from_season").references(
      () => seasons.year,
      { onDelete: "restrict" },
    ),
    effectiveToSeason: integer("effective_to_season").references(
      () => seasons.year,
      { onDelete: "restrict" },
    ),
    notes: text("notes"),
  },
  (table) => [
    uniqueIndex("race_formats_code_unique").on(table.code),
    check("race_formats_code_not_blank", hasNonBlankText(table.code)),
    check("race_formats_name_not_blank", hasNonBlankText(table.name)),
    check(
      "race_formats_effective_range",
      hasValidSeasonRange(table.effectiveFromSeason, table.effectiveToSeason),
    ),
  ],
);

/** Standardized session names used by imports and future race-weekend records. */
export const sessionTypes = pgTable(
  "session_types",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    sequence: integer("sequence").notNull(),
    isChampionshipScoring: boolean("is_championship_scoring").notNull().default(false),
  },
  (table) => [
    uniqueIndex("session_types_code_unique").on(table.code),
    check("session_types_code_not_blank", hasNonBlankText(table.code)),
    check("session_types_name_not_blank", hasNonBlankText(table.name)),
    check("session_types_sequence_non_negative", sql`${table.sequence} >= 0`),
  ],
);

/** Standardized tire names; display colors remain a presentation decision, not source data. */
export const tireCompounds = pgTable(
  "tire_compounds",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    isSlick: boolean("is_slick").notNull().default(false),
    isWet: boolean("is_wet").notNull().default(false),
  },
  (table) => [
    uniqueIndex("tire_compounds_code_unique").on(table.code),
    check("tire_compounds_code_not_blank", hasNonBlankText(table.code)),
    check("tire_compounds_name_not_blank", hasNonBlankText(table.name)),
    check(
      "tire_compounds_surface_type",
      sql`NOT (${table.isSlick} AND ${table.isWet})`,
    ),
  ],
);

/** A championship event tied to the circuit layout and weekend format in use. */
export const races = pgTable(
  "races",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    seasonYear: integer("season_year")
      .notNull()
      .references(() => seasons.year, { onDelete: "restrict" }),
    round: integer("round").notNull(),
    slug: text("slug").notNull(),
    officialName: text("official_name").notNull(),
    circuitConfigurationId: integer("circuit_configuration_id")
      .notNull()
      .references(() => circuitConfigurations.id, { onDelete: "restrict" }),
    raceFormatId: integer("race_format_id")
      .notNull()
      .references(() => raceFormats.id, { onDelete: "restrict" }),
    weekendStartDate: date("weekend_start_date").notNull(),
    weekendEndDate: date("weekend_end_date").notNull(),
    scheduledStart: timestamp("scheduled_start", { withTimezone: true }),
    status: eventStatus("status").notNull().default("scheduled"),
    notes: text("notes"),
  },
  (table) => [
    uniqueIndex("races_season_round_unique").on(table.seasonYear, table.round),
    uniqueIndex("races_season_slug_unique").on(table.seasonYear, table.slug),
    index("races_circuit_configuration_id_idx").on(table.circuitConfigurationId),
    index("races_race_format_id_idx").on(table.raceFormatId),
    index("races_status_scheduled_start_idx").on(
      table.status,
      table.scheduledStart,
    ),
    check("races_round_positive", sql`${table.round} > 0`),
    check("races_slug_not_blank", hasNonBlankText(table.slug)),
    check("races_official_name_not_blank", hasNonBlankText(table.officialName)),
    check(
      "races_weekend_date_range",
      sql`${table.weekendStartDate} <= ${table.weekendEndDate}`,
    ),
  ],
);

/** A practice, qualifying, sprint, or race session within one race weekend. */
export const sessions = pgTable(
  "sessions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    raceId: integer("race_id")
      .notNull()
      .references(() => races.id, { onDelete: "restrict" }),
    sessionTypeId: integer("session_type_id")
      .notNull()
      .references(() => sessionTypes.id, { onDelete: "restrict" }),
    sequence: integer("sequence").notNull(),
    plannedStart: timestamp("planned_start", { withTimezone: true }),
    actualStart: timestamp("actual_start", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    status: eventStatus("status").notNull().default("scheduled"),
    scheduledLaps: integer("scheduled_laps"),
    completedLaps: integer("completed_laps"),
    notes: text("notes"),
  },
  (table) => [
    uniqueIndex("sessions_race_session_type_unique").on(
      table.raceId,
      table.sessionTypeId,
    ),
    uniqueIndex("sessions_race_sequence_unique").on(table.raceId, table.sequence),
    index("sessions_session_type_id_idx").on(table.sessionTypeId),
    index("sessions_status_planned_start_idx").on(table.status, table.plannedStart),
    check("sessions_sequence_non_negative", sql`${table.sequence} >= 0`),
    check(
      "sessions_scheduled_laps_positive",
      sql`${table.scheduledLaps} IS NULL OR ${table.scheduledLaps} > 0`,
    ),
    check(
      "sessions_completed_laps_non_negative",
      sql`${table.completedLaps} IS NULL OR ${table.completedLaps} >= 0`,
    ),
    check(
      "sessions_completion_after_start",
      sql`${table.completedAt} IS NULL OR ${table.actualStart} IS NULL OR ${table.completedAt} >= ${table.actualStart}`,
    ),
  ],
);

const importedRecordColumns = () => ({
  importRunId: integer("import_run_id").references(() => importRuns.id, {
    onDelete: "restrict",
  }),
  source: text("source"),
  sourceIdentifier: text("source_identifier"),
  importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
});

const classificationResultColumns = () => ({
  id: bigserial("id", { mode: "number" }).primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "restrict" }),
  driverId: integer("driver_id")
    .notNull()
    .references(() => drivers.id, { onDelete: "restrict" }),
  constructorId: integer("constructor_id")
    .notNull()
    .references(() => constructors.id, { onDelete: "restrict" }),
  statusCodeId: integer("status_code_id")
    .notNull()
    .references(() => statusCodes.id, { onDelete: "restrict" }),
  gridPosition: integer("grid_position"),
  finishPosition: integer("finish_position"),
  classifiedPosition: integer("classified_position"),
  points: numeric("points", { precision: 8, scale: 3 }).notNull().default("0"),
  lapsCompleted: integer("laps_completed").notNull().default(0),
  elapsedTimeMs: integer("elapsed_time_ms"),
  timeBehindMs: integer("time_behind_ms"),
  lapsBehind: integer("laps_behind"),
  fastestLapRank: integer("fastest_lap_rank"),
  fastestLapNumber: integer("fastest_lap_number"),
  fastestLapTimeMs: integer("fastest_lap_time_ms"),
  fastestLapAverageSpeedKph: numeric("fastest_lap_average_speed_kph", {
    precision: 8,
    scale: 3,
  }),
  fastestLapAwarded: boolean("fastest_lap_awarded").notNull().default(false),
  ...importedRecordColumns(),
});

const sessionSummaryResultColumns = () => ({
  id: bigserial("id", { mode: "number" }).primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "restrict" }),
  driverId: integer("driver_id")
    .notNull()
    .references(() => drivers.id, { onDelete: "restrict" }),
  constructorId: integer("constructor_id")
    .notNull()
    .references(() => constructors.id, { onDelete: "restrict" }),
  statusCodeId: integer("status_code_id").references(() => statusCodes.id, {
    onDelete: "restrict",
  }),
  ...importedRecordColumns(),
  notes: text("notes"),
});

type ResultLookupColumns = {
  sessionId: PgColumn;
  driverId: PgColumn;
  constructorId: PgColumn;
  statusCodeId: PgColumn;
  importRunId: PgColumn;
  source: PgColumn;
  sourceIdentifier: PgColumn;
};

const resultLookupIndexes = (table: ResultLookupColumns, tableName: string) => [
  uniqueIndex(`${tableName}_session_driver_unique`).on(
    table.sessionId,
    table.driverId,
  ),
  uniqueIndex(`${tableName}_source_identifier_unique`).on(
    table.source,
    table.sourceIdentifier,
  ),
  index(`${tableName}_driver_session_idx`).on(table.driverId, table.sessionId),
  index(`${tableName}_constructor_session_idx`).on(
    table.constructorId,
    table.sessionId,
  ),
  index(`${tableName}_status_code_id_idx`).on(table.statusCodeId),
  index(`${tableName}_import_run_id_idx`).on(table.importRunId),
];

/** A driver's official classification and performance in a championship race session. */
export const raceResults = pgTable(
  "race_results",
  {
    ...classificationResultColumns(),
  },
  (table) => [
    ...resultLookupIndexes(table, "race_results"),
    index("race_results_session_classified_position_idx").on(
      table.sessionId,
      table.classifiedPosition,
    ),
    check(
      "race_results_grid_position_non_negative",
      sql`${table.gridPosition} IS NULL OR ${table.gridPosition} >= 0`,
    ),
    check(
      "race_results_finish_position_positive",
      sql`${table.finishPosition} IS NULL OR ${table.finishPosition} > 0`,
    ),
    check(
      "race_results_classified_position_positive",
      sql`${table.classifiedPosition} IS NULL OR ${table.classifiedPosition} > 0`,
    ),
    check("race_results_points_non_negative", sql`${table.points} >= 0`),
    check("race_results_laps_completed_non_negative", sql`${table.lapsCompleted} >= 0`),
    check(
      "race_results_elapsed_time_ms_positive",
      sql`${table.elapsedTimeMs} IS NULL OR ${table.elapsedTimeMs} > 0`,
    ),
    check(
      "race_results_time_behind_ms_non_negative",
      sql`${table.timeBehindMs} IS NULL OR ${table.timeBehindMs} >= 0`,
    ),
    check(
      "race_results_laps_behind_positive",
      sql`${table.lapsBehind} IS NULL OR ${table.lapsBehind} > 0`,
    ),
    check(
      "race_results_fastest_lap_rank_positive",
      sql`${table.fastestLapRank} IS NULL OR ${table.fastestLapRank} > 0`,
    ),
    check(
      "race_results_fastest_lap_number_positive",
      sql`${table.fastestLapNumber} IS NULL OR ${table.fastestLapNumber} > 0`,
    ),
    check(
      "race_results_fastest_lap_time_ms_positive",
      sql`${table.fastestLapTimeMs} IS NULL OR ${table.fastestLapTimeMs} > 0`,
    ),
    check(
      "race_results_fastest_lap_average_speed_positive",
      sql`${table.fastestLapAverageSpeedKph} IS NULL OR ${table.fastestLapAverageSpeedKph} > 0`,
    ),
    ...sourceRecordChecks(table, "race_results"),
  ],
);

/** A driver's official qualifying classification and resulting race-grid position. */
export const qualifyingResults = pgTable(
  "qualifying_results",
  {
    ...sessionSummaryResultColumns(),
    qualifyingPosition: integer("qualifying_position"),
    finalGridPosition: integer("final_grid_position"),
    q1TimeMs: integer("q1_time_ms"),
    q2TimeMs: integer("q2_time_ms"),
    q3TimeMs: integer("q3_time_ms"),
  },
  (table) => [
    ...resultLookupIndexes(table, "qualifying_results"),
    index("qualifying_results_session_position_idx").on(
      table.sessionId,
      table.qualifyingPosition,
    ),
    check(
      "qualifying_results_position_positive",
      sql`${table.qualifyingPosition} IS NULL OR ${table.qualifyingPosition} > 0`,
    ),
    check(
      "qualifying_results_final_grid_non_negative",
      sql`${table.finalGridPosition} IS NULL OR ${table.finalGridPosition} >= 0`,
    ),
    check(
      "qualifying_results_q1_time_positive",
      sql`${table.q1TimeMs} IS NULL OR ${table.q1TimeMs} > 0`,
    ),
    check(
      "qualifying_results_q2_time_positive",
      sql`${table.q2TimeMs} IS NULL OR ${table.q2TimeMs} > 0`,
    ),
    check(
      "qualifying_results_q3_time_positive",
      sql`${table.q3TimeMs} IS NULL OR ${table.q3TimeMs} > 0`,
    ),
    check(
      "qualifying_results_q2_requires_q1",
      sql`${table.q2TimeMs} IS NULL OR ${table.q1TimeMs} IS NOT NULL`,
    ),
    check(
      "qualifying_results_q3_requires_q2",
      sql`${table.q3TimeMs} IS NULL OR ${table.q2TimeMs} IS NOT NULL`,
    ),
    ...sourceRecordChecks(table, "qualifying_results"),
  ],
);

/** A driver's official classification and performance in a championship sprint. */
export const sprintResults = pgTable(
  "sprint_results",
  {
    ...classificationResultColumns(),
  },
  (table) => [
    ...resultLookupIndexes(table, "sprint_results"),
    index("sprint_results_session_classified_position_idx").on(
      table.sessionId,
      table.classifiedPosition,
    ),
    check(
      "sprint_results_grid_position_non_negative",
      sql`${table.gridPosition} IS NULL OR ${table.gridPosition} >= 0`,
    ),
    check(
      "sprint_results_finish_position_positive",
      sql`${table.finishPosition} IS NULL OR ${table.finishPosition} > 0`,
    ),
    check(
      "sprint_results_classified_position_positive",
      sql`${table.classifiedPosition} IS NULL OR ${table.classifiedPosition} > 0`,
    ),
    check("sprint_results_points_non_negative", sql`${table.points} >= 0`),
    check(
      "sprint_results_laps_completed_non_negative",
      sql`${table.lapsCompleted} >= 0`,
    ),
    check(
      "sprint_results_elapsed_time_ms_positive",
      sql`${table.elapsedTimeMs} IS NULL OR ${table.elapsedTimeMs} > 0`,
    ),
    check(
      "sprint_results_time_behind_ms_non_negative",
      sql`${table.timeBehindMs} IS NULL OR ${table.timeBehindMs} >= 0`,
    ),
    check(
      "sprint_results_laps_behind_positive",
      sql`${table.lapsBehind} IS NULL OR ${table.lapsBehind} > 0`,
    ),
    check(
      "sprint_results_fastest_lap_rank_positive",
      sql`${table.fastestLapRank} IS NULL OR ${table.fastestLapRank} > 0`,
    ),
    check(
      "sprint_results_fastest_lap_number_positive",
      sql`${table.fastestLapNumber} IS NULL OR ${table.fastestLapNumber} > 0`,
    ),
    check(
      "sprint_results_fastest_lap_time_ms_positive",
      sql`${table.fastestLapTimeMs} IS NULL OR ${table.fastestLapTimeMs} > 0`,
    ),
    check(
      "sprint_results_fastest_lap_average_speed_positive",
      sql`${table.fastestLapAverageSpeedKph} IS NULL OR ${table.fastestLapAverageSpeedKph} > 0`,
    ),
    ...sourceRecordChecks(table, "sprint_results"),
  ],
);

/** A driver's classification and best-lap summary in a practice session. */
export const practiceResults = pgTable(
  "practice_results",
  {
    ...sessionSummaryResultColumns(),
    classificationPosition: integer("classification_position"),
    bestLapTimeMs: integer("best_lap_time_ms"),
    bestLapNumber: integer("best_lap_number"),
    gapToLeaderMs: integer("gap_to_leader_ms"),
    lapsCompleted: integer("laps_completed").notNull().default(0),
  },
  (table) => [
    ...resultLookupIndexes(table, "practice_results"),
    index("practice_results_session_position_idx").on(
      table.sessionId,
      table.classificationPosition,
    ),
    check(
      "practice_results_position_positive",
      sql`${table.classificationPosition} IS NULL OR ${table.classificationPosition} > 0`,
    ),
    check(
      "practice_results_best_lap_time_positive",
      sql`${table.bestLapTimeMs} IS NULL OR ${table.bestLapTimeMs} > 0`,
    ),
    check(
      "practice_results_best_lap_number_positive",
      sql`${table.bestLapNumber} IS NULL OR ${table.bestLapNumber} > 0`,
    ),
    check(
      "practice_results_gap_to_leader_non_negative",
      sql`${table.gapToLeaderMs} IS NULL OR ${table.gapToLeaderMs} >= 0`,
    ),
    check(
      "practice_results_laps_completed_non_negative",
      sql`${table.lapsCompleted} >= 0`,
    ),
    check(
      "practice_results_best_lap_number_requires_time",
      sql`${table.bestLapNumber} IS NULL OR ${table.bestLapTimeMs} IS NOT NULL`,
    ),
    check(
      "practice_results_gap_requires_time",
      sql`${table.gapToLeaderMs} IS NULL OR ${table.bestLapTimeMs} IS NOT NULL`,
    ),
    ...sourceRecordChecks(table, "practice_results"),
  ],
);

const championshipStandingColumns = () => ({
  id: bigserial("id", { mode: "number" }).primaryKey(),
  afterSessionId: integer("after_session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "restrict" }),
  position: integer("position").notNull(),
  points: numeric("points", { precision: 8, scale: 3 }).notNull().default("0"),
  wins: integer("wins").notNull().default(0),
  countbackDetails: jsonb("countback_details"),
  ...importedRecordColumns(),
});

type ChampionshipStandingColumns = {
  afterSessionId: PgColumn;
  position: PgColumn;
  importRunId: PgColumn;
  source: PgColumn;
  sourceIdentifier: PgColumn;
};

const championshipStandingIndexes = (
  table: ChampionshipStandingColumns,
  entrantId: PgColumn,
  tableName: string,
) => [
  uniqueIndex(`${tableName}_session_entrant_unique`).on(
    table.afterSessionId,
    entrantId,
  ),
  uniqueIndex(`${tableName}_source_identifier_unique`).on(
    table.source,
    table.sourceIdentifier,
  ),
  index(`${tableName}_session_position_idx`).on(
    table.afterSessionId,
    table.position,
  ),
  index(`${tableName}_entrant_session_idx`).on(entrantId, table.afterSessionId),
  index(`${tableName}_import_run_id_idx`).on(table.importRunId),
];

/** A driver's points and countback evidence immediately after a scoring session. */
export const driverStandings = pgTable(
  "driver_standings",
  {
    ...championshipStandingColumns(),
    driverId: integer("driver_id")
      .notNull()
      .references(() => drivers.id, { onDelete: "restrict" }),
  },
  (table) => [
    ...championshipStandingIndexes(table, table.driverId, "driver_standings"),
    check("driver_standings_position_positive", sql`${table.position} > 0`),
    check("driver_standings_points_non_negative", sql`${table.points} >= 0`),
    check("driver_standings_wins_non_negative", sql`${table.wins} >= 0`),
    ...sourceRecordChecks(table, "driver_standings"),
  ],
);

/** A constructor's points and countback evidence immediately after a scoring session. */
export const constructorStandings = pgTable(
  "constructor_standings",
  {
    ...championshipStandingColumns(),
    constructorId: integer("constructor_id")
      .notNull()
      .references(() => constructors.id, { onDelete: "restrict" }),
  },
  (table) => [
    ...championshipStandingIndexes(
      table,
      table.constructorId,
      "constructor_standings",
    ),
    check("constructor_standings_position_positive", sql`${table.position} > 0`),
    check("constructor_standings_points_non_negative", sql`${table.points} >= 0`),
    check("constructor_standings_wins_non_negative", sql`${table.wins} >= 0`),
    ...sourceRecordChecks(table, "constructor_standings"),
  ],
);

/** A normalized publisher discovered through a configured news metadata provider. */
export const newsSources = pgTable(
  "news_sources",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    provider: text("provider").notNull(),
    providerSourceIdentifier: text("provider_source_identifier"),
    name: text("name").notNull(),
    domain: text("domain").notNull(),
    homepageUrl: text("homepage_url").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("news_sources_provider_domain_unique").on(
      table.provider,
      table.domain,
    ),
    uniqueIndex("news_sources_provider_identifier_unique").on(
      table.provider,
      table.providerSourceIdentifier,
    ),
    check("news_sources_provider_not_blank", hasNonBlankText(table.provider)),
    check("news_sources_name_not_blank", hasNonBlankText(table.name)),
    check("news_sources_domain_not_blank", hasNonBlankText(table.domain)),
    check("news_sources_domain_lowercase", sql`${table.domain} = lower(${table.domain})`),
    check("news_sources_homepage_url_not_blank", hasNonBlankText(table.homepageUrl)),
    check(
      "news_sources_provider_identifier_not_blank",
      sql`${table.providerSourceIdentifier} IS NULL OR ${hasNonBlankText(
        table.providerSourceIdentifier,
      )}`,
    ),
  ],
);

/** Licensed article metadata; full publisher article bodies are intentionally not stored. */
export const newsArticles = pgTable(
  "news_articles",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    newsSourceId: integer("news_source_id")
      .notNull()
      .references(() => newsSources.id, { onDelete: "restrict" }),
    provider: text("provider").notNull(),
    providerRecordIdentifier: text("provider_record_identifier").notNull(),
    canonicalUrl: text("canonical_url").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    author: text("author"),
    imageUrl: text("image_url"),
    language: text("language").notNull().default("en"),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    importRunId: integer("import_run_id")
      .notNull()
      .references(() => importRuns.id, { onDelete: "restrict" }),
  },
  (table) => [
    uniqueIndex("news_articles_canonical_url_unique").on(table.canonicalUrl),
    uniqueIndex("news_articles_provider_record_unique").on(
      table.provider,
      table.providerRecordIdentifier,
    ),
    index("news_articles_published_at_idx").on(table.publishedAt),
    index("news_articles_source_published_at_idx").on(
      table.newsSourceId,
      table.publishedAt,
    ),
    index("news_articles_import_run_id_idx").on(table.importRunId),
    check("news_articles_provider_not_blank", hasNonBlankText(table.provider)),
    check(
      "news_articles_provider_record_identifier_not_blank",
      hasNonBlankText(table.providerRecordIdentifier),
    ),
    check("news_articles_canonical_url_not_blank", hasNonBlankText(table.canonicalUrl)),
    check("news_articles_title_not_blank", hasNonBlankText(table.title)),
    check(
      "news_articles_language_code",
      sql`char_length(${table.language}) = 2 AND ${table.language} = lower(${table.language})`,
    ),
    check(
      "news_articles_seen_range",
      sql`${table.lastSeenAt} >= ${table.firstSeenAt}`,
    ),
  ],
);
