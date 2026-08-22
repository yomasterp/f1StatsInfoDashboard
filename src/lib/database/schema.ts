import { check, index, integer, jsonb, pgEnum, pgTable, bigserial, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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
