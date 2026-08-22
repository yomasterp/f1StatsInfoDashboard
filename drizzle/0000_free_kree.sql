CREATE TYPE "public"."import_run_status" AS ENUM('running', 'succeeded', 'failed', 'skipped');--> statement-breakpoint
CREATE TABLE "import_runs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"scope" text NOT NULL,
	"status" "import_run_status" DEFAULT 'running' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"duration_ms" integer,
	"records_processed" integer DEFAULT 0 NOT NULL,
	"record_counts" jsonb,
	"error_details" jsonb,
	CONSTRAINT "import_runs_duration_ms_non_negative" CHECK ("import_runs"."duration_ms" IS NULL OR "import_runs"."duration_ms" >= 0),
	CONSTRAINT "import_runs_records_processed_non_negative" CHECK ("import_runs"."records_processed" >= 0)
);
--> statement-breakpoint
CREATE INDEX "import_runs_source_status_started_at_idx" ON "import_runs" USING btree ("source","status","started_at");