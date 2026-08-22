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
