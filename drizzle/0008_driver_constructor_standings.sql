CREATE TABLE "constructor_standings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"after_session_id" integer NOT NULL,
	"position" integer NOT NULL,
	"points" numeric(8, 3) DEFAULT '0' NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"countback_details" jsonb,
	"import_run_id" integer,
	"source" text,
	"source_identifier" text,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"constructor_id" integer NOT NULL,
	CONSTRAINT "constructor_standings_position_positive" CHECK ("constructor_standings"."position" > 0),
	CONSTRAINT "constructor_standings_points_non_negative" CHECK ("constructor_standings"."points" >= 0),
	CONSTRAINT "constructor_standings_wins_non_negative" CHECK ("constructor_standings"."wins" >= 0),
	CONSTRAINT "constructor_standings_source_fields_paired" CHECK (("constructor_standings"."source" IS NULL AND "constructor_standings"."source_identifier" IS NULL) OR ("constructor_standings"."source" IS NOT NULL AND "constructor_standings"."source_identifier" IS NOT NULL AND char_length(trim("constructor_standings"."source")) > 0 AND char_length(trim("constructor_standings"."source_identifier")) > 0))
);
--> statement-breakpoint
CREATE TABLE "driver_standings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"after_session_id" integer NOT NULL,
	"position" integer NOT NULL,
	"points" numeric(8, 3) DEFAULT '0' NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"countback_details" jsonb,
	"import_run_id" integer,
	"source" text,
	"source_identifier" text,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"driver_id" integer NOT NULL,
	CONSTRAINT "driver_standings_position_positive" CHECK ("driver_standings"."position" > 0),
	CONSTRAINT "driver_standings_points_non_negative" CHECK ("driver_standings"."points" >= 0),
	CONSTRAINT "driver_standings_wins_non_negative" CHECK ("driver_standings"."wins" >= 0),
	CONSTRAINT "driver_standings_source_fields_paired" CHECK (("driver_standings"."source" IS NULL AND "driver_standings"."source_identifier" IS NULL) OR ("driver_standings"."source" IS NOT NULL AND "driver_standings"."source_identifier" IS NOT NULL AND char_length(trim("driver_standings"."source")) > 0 AND char_length(trim("driver_standings"."source_identifier")) > 0))
);
--> statement-breakpoint
ALTER TABLE "constructor_standings" ADD CONSTRAINT "constructor_standings_after_session_id_sessions_id_fk" FOREIGN KEY ("after_session_id") REFERENCES "public"."sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "constructor_standings" ADD CONSTRAINT "constructor_standings_import_run_id_import_runs_id_fk" FOREIGN KEY ("import_run_id") REFERENCES "public"."import_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "constructor_standings" ADD CONSTRAINT "constructor_standings_constructor_id_constructors_id_fk" FOREIGN KEY ("constructor_id") REFERENCES "public"."constructors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_standings" ADD CONSTRAINT "driver_standings_after_session_id_sessions_id_fk" FOREIGN KEY ("after_session_id") REFERENCES "public"."sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_standings" ADD CONSTRAINT "driver_standings_import_run_id_import_runs_id_fk" FOREIGN KEY ("import_run_id") REFERENCES "public"."import_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_standings" ADD CONSTRAINT "driver_standings_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "constructor_standings_session_entrant_unique" ON "constructor_standings" USING btree ("after_session_id","constructor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "constructor_standings_source_identifier_unique" ON "constructor_standings" USING btree ("source","source_identifier");--> statement-breakpoint
CREATE INDEX "constructor_standings_session_position_idx" ON "constructor_standings" USING btree ("after_session_id","position");--> statement-breakpoint
CREATE INDEX "constructor_standings_entrant_session_idx" ON "constructor_standings" USING btree ("constructor_id","after_session_id");--> statement-breakpoint
CREATE INDEX "constructor_standings_import_run_id_idx" ON "constructor_standings" USING btree ("import_run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "driver_standings_session_entrant_unique" ON "driver_standings" USING btree ("after_session_id","driver_id");--> statement-breakpoint
CREATE UNIQUE INDEX "driver_standings_source_identifier_unique" ON "driver_standings" USING btree ("source","source_identifier");--> statement-breakpoint
CREATE INDEX "driver_standings_session_position_idx" ON "driver_standings" USING btree ("after_session_id","position");--> statement-breakpoint
CREATE INDEX "driver_standings_entrant_session_idx" ON "driver_standings" USING btree ("driver_id","after_session_id");--> statement-breakpoint
CREATE INDEX "driver_standings_import_run_id_idx" ON "driver_standings" USING btree ("import_run_id");