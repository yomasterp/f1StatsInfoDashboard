CREATE TYPE "public"."event_status" AS ENUM('scheduled', 'in_progress', 'completed', 'cancelled', 'postponed', 'not_held');--> statement-breakpoint
CREATE TABLE "races" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"season_year" integer NOT NULL,
	"round" integer NOT NULL,
	"slug" text NOT NULL,
	"official_name" text NOT NULL,
	"circuit_configuration_id" integer NOT NULL,
	"race_format_id" integer NOT NULL,
	"weekend_start_date" date NOT NULL,
	"weekend_end_date" date NOT NULL,
	"scheduled_start" timestamp with time zone,
	"status" "event_status" DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	CONSTRAINT "races_round_positive" CHECK ("races"."round" > 0),
	CONSTRAINT "races_slug_not_blank" CHECK (char_length(trim("races"."slug")) > 0),
	CONSTRAINT "races_official_name_not_blank" CHECK (char_length(trim("races"."official_name")) > 0),
	CONSTRAINT "races_weekend_date_range" CHECK ("races"."weekend_start_date" <= "races"."weekend_end_date")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"race_id" integer NOT NULL,
	"session_type_id" integer NOT NULL,
	"sequence" integer NOT NULL,
	"planned_start" timestamp with time zone,
	"actual_start" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"status" "event_status" DEFAULT 'scheduled' NOT NULL,
	"scheduled_laps" integer,
	"completed_laps" integer,
	"notes" text,
	CONSTRAINT "sessions_sequence_non_negative" CHECK ("sessions"."sequence" >= 0),
	CONSTRAINT "sessions_scheduled_laps_positive" CHECK ("sessions"."scheduled_laps" IS NULL OR "sessions"."scheduled_laps" > 0),
	CONSTRAINT "sessions_completed_laps_non_negative" CHECK ("sessions"."completed_laps" IS NULL OR "sessions"."completed_laps" >= 0),
	CONSTRAINT "sessions_completion_after_start" CHECK ("sessions"."completed_at" IS NULL OR "sessions"."actual_start" IS NULL OR "sessions"."completed_at" >= "sessions"."actual_start")
);
--> statement-breakpoint
ALTER TABLE "races" ADD CONSTRAINT "races_season_year_seasons_year_fk" FOREIGN KEY ("season_year") REFERENCES "public"."seasons"("year") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "races" ADD CONSTRAINT "races_circuit_configuration_id_circuit_configurations_id_fk" FOREIGN KEY ("circuit_configuration_id") REFERENCES "public"."circuit_configurations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "races" ADD CONSTRAINT "races_race_format_id_race_formats_id_fk" FOREIGN KEY ("race_format_id") REFERENCES "public"."race_formats"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_race_id_races_id_fk" FOREIGN KEY ("race_id") REFERENCES "public"."races"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_session_type_id_session_types_id_fk" FOREIGN KEY ("session_type_id") REFERENCES "public"."session_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "races_season_round_unique" ON "races" USING btree ("season_year","round");--> statement-breakpoint
CREATE UNIQUE INDEX "races_season_slug_unique" ON "races" USING btree ("season_year","slug");--> statement-breakpoint
CREATE INDEX "races_circuit_configuration_id_idx" ON "races" USING btree ("circuit_configuration_id");--> statement-breakpoint
CREATE INDEX "races_race_format_id_idx" ON "races" USING btree ("race_format_id");--> statement-breakpoint
CREATE INDEX "races_status_scheduled_start_idx" ON "races" USING btree ("status","scheduled_start");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_race_session_type_unique" ON "sessions" USING btree ("race_id","session_type_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_race_sequence_unique" ON "sessions" USING btree ("race_id","sequence");--> statement-breakpoint
CREATE INDEX "sessions_session_type_id_idx" ON "sessions" USING btree ("session_type_id");--> statement-breakpoint
CREATE INDEX "sessions_status_planned_start_idx" ON "sessions" USING btree ("status","planned_start");