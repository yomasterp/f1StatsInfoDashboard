CREATE TABLE "constructor_championship_results" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"season_year" integer NOT NULL,
	"position" integer NOT NULL,
	"points" numeric(8, 3) DEFAULT '0' NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"countback_details" jsonb,
	"import_run_id" integer,
	"source" text,
	"source_identifier" text,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"constructor_id" integer NOT NULL,
	CONSTRAINT "constructor_championship_results_position_positive" CHECK ("constructor_championship_results"."position" > 0),
	CONSTRAINT "constructor_championship_results_points_non_negative" CHECK ("constructor_championship_results"."points" >= 0),
	CONSTRAINT "constructor_championship_results_wins_non_negative" CHECK ("constructor_championship_results"."wins" >= 0),
	CONSTRAINT "constructor_championship_results_source_fields_paired" CHECK (("constructor_championship_results"."source" IS NULL AND "constructor_championship_results"."source_identifier" IS NULL) OR ("constructor_championship_results"."source" IS NOT NULL AND "constructor_championship_results"."source_identifier" IS NOT NULL AND char_length(trim("constructor_championship_results"."source")) > 0 AND char_length(trim("constructor_championship_results"."source_identifier")) > 0))
);
--> statement-breakpoint
CREATE TABLE "driver_championship_results" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"season_year" integer NOT NULL,
	"position" integer NOT NULL,
	"points" numeric(8, 3) DEFAULT '0' NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"countback_details" jsonb,
	"import_run_id" integer,
	"source" text,
	"source_identifier" text,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"driver_id" integer NOT NULL,
	CONSTRAINT "driver_championship_results_position_positive" CHECK ("driver_championship_results"."position" > 0),
	CONSTRAINT "driver_championship_results_points_non_negative" CHECK ("driver_championship_results"."points" >= 0),
	CONSTRAINT "driver_championship_results_wins_non_negative" CHECK ("driver_championship_results"."wins" >= 0),
	CONSTRAINT "driver_championship_results_source_fields_paired" CHECK (("driver_championship_results"."source" IS NULL AND "driver_championship_results"."source_identifier" IS NULL) OR ("driver_championship_results"."source" IS NOT NULL AND "driver_championship_results"."source_identifier" IS NOT NULL AND char_length(trim("driver_championship_results"."source")) > 0 AND char_length(trim("driver_championship_results"."source_identifier")) > 0))
);
--> statement-breakpoint
ALTER TABLE "constructor_championship_results" ADD CONSTRAINT "constructor_championship_results_season_year_seasons_year_fk" FOREIGN KEY ("season_year") REFERENCES "public"."seasons"("year") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "constructor_championship_results" ADD CONSTRAINT "constructor_championship_results_import_run_id_import_runs_id_fk" FOREIGN KEY ("import_run_id") REFERENCES "public"."import_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "constructor_championship_results" ADD CONSTRAINT "constructor_championship_results_constructor_id_constructors_id_fk" FOREIGN KEY ("constructor_id") REFERENCES "public"."constructors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_championship_results" ADD CONSTRAINT "driver_championship_results_season_year_seasons_year_fk" FOREIGN KEY ("season_year") REFERENCES "public"."seasons"("year") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_championship_results" ADD CONSTRAINT "driver_championship_results_import_run_id_import_runs_id_fk" FOREIGN KEY ("import_run_id") REFERENCES "public"."import_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_championship_results" ADD CONSTRAINT "driver_championship_results_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "constructor_championship_results_season_entrant_unique" ON "constructor_championship_results" USING btree ("season_year","constructor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "constructor_championship_results_source_identifier_unique" ON "constructor_championship_results" USING btree ("source","source_identifier");--> statement-breakpoint
CREATE INDEX "constructor_championship_results_season_position_idx" ON "constructor_championship_results" USING btree ("season_year","position");--> statement-breakpoint
CREATE INDEX "constructor_championship_results_entrant_season_idx" ON "constructor_championship_results" USING btree ("constructor_id","season_year");--> statement-breakpoint
CREATE INDEX "constructor_championship_results_import_run_id_idx" ON "constructor_championship_results" USING btree ("import_run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "driver_championship_results_season_entrant_unique" ON "driver_championship_results" USING btree ("season_year","driver_id");--> statement-breakpoint
CREATE UNIQUE INDEX "driver_championship_results_source_identifier_unique" ON "driver_championship_results" USING btree ("source","source_identifier");--> statement-breakpoint
CREATE INDEX "driver_championship_results_season_position_idx" ON "driver_championship_results" USING btree ("season_year","position");--> statement-breakpoint
CREATE INDEX "driver_championship_results_entrant_season_idx" ON "driver_championship_results" USING btree ("driver_id","season_year");--> statement-breakpoint
CREATE INDEX "driver_championship_results_import_run_id_idx" ON "driver_championship_results" USING btree ("import_run_id");