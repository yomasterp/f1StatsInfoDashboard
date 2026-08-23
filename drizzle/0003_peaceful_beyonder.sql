CREATE TABLE "race_results" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"driver_id" integer NOT NULL,
	"constructor_id" integer NOT NULL,
	"status_code_id" integer NOT NULL,
	"grid_position" integer,
	"finish_position" integer,
	"classified_position" integer,
	"points" numeric(8, 3) DEFAULT '0' NOT NULL,
	"laps_completed" integer DEFAULT 0 NOT NULL,
	"elapsed_time_ms" integer,
	"time_behind_ms" integer,
	"laps_behind" integer,
	"fastest_lap_rank" integer,
	"fastest_lap_number" integer,
	"fastest_lap_time_ms" integer,
	"fastest_lap_average_speed_kph" numeric(8, 3),
	"fastest_lap_awarded" boolean DEFAULT false NOT NULL,
	"import_run_id" integer,
	"source" text,
	"source_identifier" text,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "race_results_grid_position_non_negative" CHECK ("race_results"."grid_position" IS NULL OR "race_results"."grid_position" >= 0),
	CONSTRAINT "race_results_finish_position_positive" CHECK ("race_results"."finish_position" IS NULL OR "race_results"."finish_position" > 0),
	CONSTRAINT "race_results_classified_position_positive" CHECK ("race_results"."classified_position" IS NULL OR "race_results"."classified_position" > 0),
	CONSTRAINT "race_results_points_non_negative" CHECK ("race_results"."points" >= 0),
	CONSTRAINT "race_results_laps_completed_non_negative" CHECK ("race_results"."laps_completed" >= 0),
	CONSTRAINT "race_results_elapsed_time_ms_positive" CHECK ("race_results"."elapsed_time_ms" IS NULL OR "race_results"."elapsed_time_ms" > 0),
	CONSTRAINT "race_results_time_behind_ms_non_negative" CHECK ("race_results"."time_behind_ms" IS NULL OR "race_results"."time_behind_ms" >= 0),
	CONSTRAINT "race_results_laps_behind_positive" CHECK ("race_results"."laps_behind" IS NULL OR "race_results"."laps_behind" > 0),
	CONSTRAINT "race_results_fastest_lap_rank_positive" CHECK ("race_results"."fastest_lap_rank" IS NULL OR "race_results"."fastest_lap_rank" > 0),
	CONSTRAINT "race_results_fastest_lap_number_positive" CHECK ("race_results"."fastest_lap_number" IS NULL OR "race_results"."fastest_lap_number" > 0),
	CONSTRAINT "race_results_fastest_lap_time_ms_positive" CHECK ("race_results"."fastest_lap_time_ms" IS NULL OR "race_results"."fastest_lap_time_ms" > 0),
	CONSTRAINT "race_results_fastest_lap_average_speed_positive" CHECK ("race_results"."fastest_lap_average_speed_kph" IS NULL OR "race_results"."fastest_lap_average_speed_kph" > 0),
	CONSTRAINT "race_results_source_fields_paired" CHECK (("race_results"."source" IS NULL AND "race_results"."source_identifier" IS NULL) OR ("race_results"."source" IS NOT NULL AND "race_results"."source_identifier" IS NOT NULL AND char_length(trim("race_results"."source")) > 0 AND char_length(trim("race_results"."source_identifier")) > 0))
);
--> statement-breakpoint
ALTER TABLE "race_results" ADD CONSTRAINT "race_results_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_results" ADD CONSTRAINT "race_results_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_results" ADD CONSTRAINT "race_results_constructor_id_constructors_id_fk" FOREIGN KEY ("constructor_id") REFERENCES "public"."constructors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_results" ADD CONSTRAINT "race_results_status_code_id_status_codes_id_fk" FOREIGN KEY ("status_code_id") REFERENCES "public"."status_codes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_results" ADD CONSTRAINT "race_results_import_run_id_import_runs_id_fk" FOREIGN KEY ("import_run_id") REFERENCES "public"."import_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "race_results_session_driver_unique" ON "race_results" USING btree ("session_id","driver_id");--> statement-breakpoint
CREATE UNIQUE INDEX "race_results_source_identifier_unique" ON "race_results" USING btree ("source","source_identifier");--> statement-breakpoint
CREATE INDEX "race_results_session_classified_position_idx" ON "race_results" USING btree ("session_id","classified_position");--> statement-breakpoint
CREATE INDEX "race_results_driver_session_idx" ON "race_results" USING btree ("driver_id","session_id");--> statement-breakpoint
CREATE INDEX "race_results_constructor_session_idx" ON "race_results" USING btree ("constructor_id","session_id");--> statement-breakpoint
CREATE INDEX "race_results_status_code_id_idx" ON "race_results" USING btree ("status_code_id");--> statement-breakpoint
CREATE INDEX "race_results_import_run_id_idx" ON "race_results" USING btree ("import_run_id");
