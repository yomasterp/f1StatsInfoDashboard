CREATE TABLE "practice_results" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"driver_id" integer NOT NULL,
	"constructor_id" integer NOT NULL,
	"status_code_id" integer,
	"classification_position" integer,
	"best_lap_time_ms" integer,
	"best_lap_number" integer,
	"gap_to_leader_ms" integer,
	"laps_completed" integer DEFAULT 0 NOT NULL,
	"import_run_id" integer,
	"source" text,
	"source_identifier" text,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	CONSTRAINT "practice_results_position_positive" CHECK ("practice_results"."classification_position" IS NULL OR "practice_results"."classification_position" > 0),
	CONSTRAINT "practice_results_best_lap_time_positive" CHECK ("practice_results"."best_lap_time_ms" IS NULL OR "practice_results"."best_lap_time_ms" > 0),
	CONSTRAINT "practice_results_best_lap_number_positive" CHECK ("practice_results"."best_lap_number" IS NULL OR "practice_results"."best_lap_number" > 0),
	CONSTRAINT "practice_results_gap_to_leader_non_negative" CHECK ("practice_results"."gap_to_leader_ms" IS NULL OR "practice_results"."gap_to_leader_ms" >= 0),
	CONSTRAINT "practice_results_laps_completed_non_negative" CHECK ("practice_results"."laps_completed" >= 0),
	CONSTRAINT "practice_results_best_lap_number_requires_time" CHECK ("practice_results"."best_lap_number" IS NULL OR "practice_results"."best_lap_time_ms" IS NOT NULL),
	CONSTRAINT "practice_results_gap_requires_time" CHECK ("practice_results"."gap_to_leader_ms" IS NULL OR "practice_results"."best_lap_time_ms" IS NOT NULL),
	CONSTRAINT "practice_results_source_fields_paired" CHECK (("practice_results"."source" IS NULL AND "practice_results"."source_identifier" IS NULL) OR ("practice_results"."source" IS NOT NULL AND "practice_results"."source_identifier" IS NOT NULL AND char_length(trim("practice_results"."source")) > 0 AND char_length(trim("practice_results"."source_identifier")) > 0))
);
--> statement-breakpoint
ALTER TABLE "practice_results" ADD CONSTRAINT "practice_results_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_results" ADD CONSTRAINT "practice_results_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_results" ADD CONSTRAINT "practice_results_constructor_id_constructors_id_fk" FOREIGN KEY ("constructor_id") REFERENCES "public"."constructors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_results" ADD CONSTRAINT "practice_results_status_code_id_status_codes_id_fk" FOREIGN KEY ("status_code_id") REFERENCES "public"."status_codes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_results" ADD CONSTRAINT "practice_results_import_run_id_import_runs_id_fk" FOREIGN KEY ("import_run_id") REFERENCES "public"."import_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "practice_results_session_driver_unique" ON "practice_results" USING btree ("session_id","driver_id");--> statement-breakpoint
CREATE UNIQUE INDEX "practice_results_source_identifier_unique" ON "practice_results" USING btree ("source","source_identifier");--> statement-breakpoint
CREATE INDEX "practice_results_session_position_idx" ON "practice_results" USING btree ("session_id","classification_position");--> statement-breakpoint
CREATE INDEX "practice_results_driver_session_idx" ON "practice_results" USING btree ("driver_id","session_id");--> statement-breakpoint
CREATE INDEX "practice_results_constructor_session_idx" ON "practice_results" USING btree ("constructor_id","session_id");--> statement-breakpoint
CREATE INDEX "practice_results_status_code_id_idx" ON "practice_results" USING btree ("status_code_id");--> statement-breakpoint
CREATE INDEX "practice_results_import_run_id_idx" ON "practice_results" USING btree ("import_run_id");