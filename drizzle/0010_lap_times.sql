CREATE TABLE "lap_times" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"driver_id" integer NOT NULL,
	"lap_number" integer NOT NULL,
	"lap_time_ms" integer,
	"sector_1_time_ms" integer,
	"sector_2_time_ms" integer,
	"sector_3_time_ms" integer,
	"stint_number" integer,
	"tire_compound_id" integer,
	"tire_age_laps" integer,
	"is_fresh_tire" boolean,
	"pit_in" boolean,
	"pit_out" boolean,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_reason" text,
	"is_accurate" boolean,
	"import_run_id" integer,
	"source" text,
	"source_identifier" text,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lap_times_lap_number_positive" CHECK ("lap_times"."lap_number" > 0),
	CONSTRAINT "lap_times_lap_time_positive" CHECK ("lap_times"."lap_time_ms" IS NULL OR "lap_times"."lap_time_ms" > 0),
	CONSTRAINT "lap_times_sector_1_time_positive" CHECK ("lap_times"."sector_1_time_ms" IS NULL OR "lap_times"."sector_1_time_ms" > 0),
	CONSTRAINT "lap_times_sector_2_time_positive" CHECK ("lap_times"."sector_2_time_ms" IS NULL OR "lap_times"."sector_2_time_ms" > 0),
	CONSTRAINT "lap_times_sector_3_time_positive" CHECK ("lap_times"."sector_3_time_ms" IS NULL OR "lap_times"."sector_3_time_ms" > 0),
	CONSTRAINT "lap_times_stint_number_positive" CHECK ("lap_times"."stint_number" IS NULL OR "lap_times"."stint_number" > 0),
	CONSTRAINT "lap_times_tire_age_laps_non_negative" CHECK ("lap_times"."tire_age_laps" IS NULL OR "lap_times"."tire_age_laps" >= 0),
	CONSTRAINT "lap_times_deleted_reason_not_blank" CHECK ("lap_times"."deleted_reason" IS NULL OR char_length(trim("lap_times"."deleted_reason")) > 0),
	CONSTRAINT "lap_times_deleted_reason_requires_deleted_lap" CHECK ("lap_times"."deleted_reason" IS NULL OR "lap_times"."is_deleted"),
	CONSTRAINT "lap_times_source_fields_paired" CHECK (("lap_times"."source" IS NULL AND "lap_times"."source_identifier" IS NULL) OR ("lap_times"."source" IS NOT NULL AND "lap_times"."source_identifier" IS NOT NULL AND char_length(trim("lap_times"."source")) > 0 AND char_length(trim("lap_times"."source_identifier")) > 0))
);
--> statement-breakpoint
ALTER TABLE "lap_times" ADD CONSTRAINT "lap_times_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lap_times" ADD CONSTRAINT "lap_times_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lap_times" ADD CONSTRAINT "lap_times_tire_compound_id_tire_compounds_id_fk" FOREIGN KEY ("tire_compound_id") REFERENCES "public"."tire_compounds"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lap_times" ADD CONSTRAINT "lap_times_import_run_id_import_runs_id_fk" FOREIGN KEY ("import_run_id") REFERENCES "public"."import_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lap_times_session_driver_lap_unique" ON "lap_times" USING btree ("session_id","driver_id","lap_number");--> statement-breakpoint
CREATE UNIQUE INDEX "lap_times_source_identifier_unique" ON "lap_times" USING btree ("source","source_identifier");--> statement-breakpoint
CREATE INDEX "lap_times_session_lap_idx" ON "lap_times" USING btree ("session_id","lap_number");--> statement-breakpoint
CREATE INDEX "lap_times_driver_session_lap_idx" ON "lap_times" USING btree ("driver_id","session_id","lap_number");--> statement-breakpoint
CREATE INDEX "lap_times_tire_compound_id_idx" ON "lap_times" USING btree ("tire_compound_id");--> statement-breakpoint
CREATE INDEX "lap_times_import_run_id_idx" ON "lap_times" USING btree ("import_run_id");