CREATE TYPE "public"."status_category" AS ENUM('classified', 'retired', 'disqualified', 'not_started', 'not_classified', 'unknown');--> statement-breakpoint
CREATE TABLE "circuit_configurations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"circuit_id" integer NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"length_km" numeric(6, 3),
	"effective_from_season" integer,
	"effective_to_season" integer,
	"notes" text,
	CONSTRAINT "circuit_configurations_code_not_blank" CHECK (char_length(trim("circuit_configurations"."code")) > 0),
	CONSTRAINT "circuit_configurations_name_not_blank" CHECK (char_length(trim("circuit_configurations"."name")) > 0),
	CONSTRAINT "circuit_configurations_length_positive" CHECK ("circuit_configurations"."length_km" IS NULL OR "circuit_configurations"."length_km" > 0),
	CONSTRAINT "circuit_configurations_effective_range" CHECK ("circuit_configurations"."effective_to_season" IS NULL OR "circuit_configurations"."effective_from_season" IS NULL OR "circuit_configurations"."effective_from_season" <= "circuit_configurations"."effective_to_season")
);
--> statement-breakpoint
CREATE TABLE "circuits" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"locality" text,
	"country_id" integer NOT NULL,
	"latitude" numeric(8, 5),
	"longitude" numeric(8, 5),
	CONSTRAINT "circuits_slug_not_blank" CHECK (char_length(trim("circuits"."slug")) > 0),
	CONSTRAINT "circuits_name_not_blank" CHECK (char_length(trim("circuits"."name")) > 0),
	CONSTRAINT "circuits_latitude_range" CHECK ("circuits"."latitude" IS NULL OR "circuits"."latitude" BETWEEN -90 AND 90),
	CONSTRAINT "circuits_longitude_range" CHECK ("circuits"."longitude" IS NULL OR "circuits"."longitude" BETWEEN -180 AND 180)
);
--> statement-breakpoint
CREATE TABLE "constructor_aliases" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"constructor_id" integer NOT NULL,
	"source" text NOT NULL,
	"source_identifier" text NOT NULL,
	"alias" text NOT NULL,
	CONSTRAINT "constructor_aliases_source_not_blank" CHECK (char_length(trim("constructor_aliases"."source")) > 0),
	CONSTRAINT "constructor_aliases_source_identifier_not_blank" CHECK (char_length(trim("constructor_aliases"."source_identifier")) > 0),
	CONSTRAINT "constructor_aliases_alias_not_blank" CHECK (char_length(trim("constructor_aliases"."alias")) > 0)
);
--> statement-breakpoint
CREATE TABLE "constructors" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"nationality_country_id" integer,
	CONSTRAINT "constructors_slug_not_blank" CHECK (char_length(trim("constructors"."slug")) > 0),
	CONSTRAINT "constructors_name_not_blank" CHECK (char_length(trim("constructors"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"iso_alpha2" text NOT NULL,
	"iso_alpha3" text,
	"name" text NOT NULL,
	"demonym" text,
	CONSTRAINT "countries_iso_alpha2_length" CHECK (char_length("countries"."iso_alpha2") = 2),
	CONSTRAINT "countries_iso_alpha2_uppercase" CHECK ("countries"."iso_alpha2" = upper("countries"."iso_alpha2")),
	CONSTRAINT "countries_iso_alpha3_length" CHECK ("countries"."iso_alpha3" IS NULL OR char_length("countries"."iso_alpha3") = 3),
	CONSTRAINT "countries_iso_alpha3_uppercase" CHECK ("countries"."iso_alpha3" IS NULL OR "countries"."iso_alpha3" = upper("countries"."iso_alpha3"))
);
--> statement-breakpoint
CREATE TABLE "driver_aliases" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"driver_id" integer NOT NULL,
	"source" text NOT NULL,
	"source_identifier" text NOT NULL,
	"alias" text NOT NULL,
	CONSTRAINT "driver_aliases_source_not_blank" CHECK (char_length(trim("driver_aliases"."source")) > 0),
	CONSTRAINT "driver_aliases_source_identifier_not_blank" CHECK (char_length(trim("driver_aliases"."source_identifier")) > 0),
	CONSTRAINT "driver_aliases_alias_not_blank" CHECK (char_length(trim("driver_aliases"."alias")) > 0)
);
--> statement-breakpoint
CREATE TABLE "drivers" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"given_name" text NOT NULL,
	"family_name" text NOT NULL,
	"date_of_birth" date,
	"nationality_country_id" integer,
	"permanent_number" integer,
	CONSTRAINT "drivers_slug_not_blank" CHECK (char_length(trim("drivers"."slug")) > 0),
	CONSTRAINT "drivers_given_name_not_blank" CHECK (char_length(trim("drivers"."given_name")) > 0),
	CONSTRAINT "drivers_family_name_not_blank" CHECK (char_length(trim("drivers"."family_name")) > 0),
	CONSTRAINT "drivers_permanent_number_range" CHECK ("drivers"."permanent_number" IS NULL OR "drivers"."permanent_number" BETWEEN 0 AND 99)
);
--> statement-breakpoint
CREATE TABLE "points_systems" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"effective_from_season" integer,
	"effective_to_season" integer,
	"rules" jsonb NOT NULL,
	"notes" text,
	CONSTRAINT "points_systems_code_not_blank" CHECK (char_length(trim("points_systems"."code")) > 0),
	CONSTRAINT "points_systems_name_not_blank" CHECK (char_length(trim("points_systems"."name")) > 0),
	CONSTRAINT "points_systems_effective_range" CHECK ("points_systems"."effective_to_season" IS NULL OR "points_systems"."effective_from_season" IS NULL OR "points_systems"."effective_from_season" <= "points_systems"."effective_to_season")
);
--> statement-breakpoint
CREATE TABLE "race_formats" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"has_sprint" boolean DEFAULT false NOT NULL,
	"schedule" jsonb NOT NULL,
	"effective_from_season" integer,
	"effective_to_season" integer,
	"notes" text,
	CONSTRAINT "race_formats_code_not_blank" CHECK (char_length(trim("race_formats"."code")) > 0),
	CONSTRAINT "race_formats_name_not_blank" CHECK (char_length(trim("race_formats"."name")) > 0),
	CONSTRAINT "race_formats_effective_range" CHECK ("race_formats"."effective_to_season" IS NULL OR "race_formats"."effective_from_season" IS NULL OR "race_formats"."effective_from_season" <= "race_formats"."effective_to_season")
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"year" integer PRIMARY KEY NOT NULL,
	"championship_name" text NOT NULL,
	"rounds" integer DEFAULT 0 NOT NULL,
	"notes" text,
	CONSTRAINT "seasons_year_range" CHECK ("seasons"."year" BETWEEN 1950 AND 2100),
	CONSTRAINT "seasons_rounds_non_negative" CHECK ("seasons"."rounds" >= 0)
);
--> statement-breakpoint
CREATE TABLE "session_types" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"sequence" integer NOT NULL,
	"is_championship_scoring" boolean DEFAULT false NOT NULL,
	CONSTRAINT "session_types_code_not_blank" CHECK (char_length(trim("session_types"."code")) > 0),
	CONSTRAINT "session_types_name_not_blank" CHECK (char_length(trim("session_types"."name")) > 0),
	CONSTRAINT "session_types_sequence_non_negative" CHECK ("session_types"."sequence" >= 0)
);
--> statement-breakpoint
CREATE TABLE "status_codes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"description" text NOT NULL,
	"category" "status_category" NOT NULL,
	"is_classified" boolean DEFAULT false NOT NULL,
	CONSTRAINT "status_codes_code_not_blank" CHECK (char_length(trim("status_codes"."code")) > 0),
	CONSTRAINT "status_codes_description_not_blank" CHECK (char_length(trim("status_codes"."description")) > 0)
);
--> statement-breakpoint
CREATE TABLE "tire_compounds" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"is_slick" boolean DEFAULT false NOT NULL,
	"is_wet" boolean DEFAULT false NOT NULL,
	CONSTRAINT "tire_compounds_code_not_blank" CHECK (char_length(trim("tire_compounds"."code")) > 0),
	CONSTRAINT "tire_compounds_name_not_blank" CHECK (char_length(trim("tire_compounds"."name")) > 0),
	CONSTRAINT "tire_compounds_surface_type" CHECK (NOT ("tire_compounds"."is_slick" AND "tire_compounds"."is_wet"))
);
--> statement-breakpoint
ALTER TABLE "circuit_configurations" ADD CONSTRAINT "circuit_configurations_circuit_id_circuits_id_fk" FOREIGN KEY ("circuit_id") REFERENCES "public"."circuits"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circuit_configurations" ADD CONSTRAINT "circuit_configurations_effective_from_season_seasons_year_fk" FOREIGN KEY ("effective_from_season") REFERENCES "public"."seasons"("year") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circuit_configurations" ADD CONSTRAINT "circuit_configurations_effective_to_season_seasons_year_fk" FOREIGN KEY ("effective_to_season") REFERENCES "public"."seasons"("year") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circuits" ADD CONSTRAINT "circuits_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "constructor_aliases" ADD CONSTRAINT "constructor_aliases_constructor_id_constructors_id_fk" FOREIGN KEY ("constructor_id") REFERENCES "public"."constructors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "constructors" ADD CONSTRAINT "constructors_nationality_country_id_countries_id_fk" FOREIGN KEY ("nationality_country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_aliases" ADD CONSTRAINT "driver_aliases_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_nationality_country_id_countries_id_fk" FOREIGN KEY ("nationality_country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_systems" ADD CONSTRAINT "points_systems_effective_from_season_seasons_year_fk" FOREIGN KEY ("effective_from_season") REFERENCES "public"."seasons"("year") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_systems" ADD CONSTRAINT "points_systems_effective_to_season_seasons_year_fk" FOREIGN KEY ("effective_to_season") REFERENCES "public"."seasons"("year") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_formats" ADD CONSTRAINT "race_formats_effective_from_season_seasons_year_fk" FOREIGN KEY ("effective_from_season") REFERENCES "public"."seasons"("year") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_formats" ADD CONSTRAINT "race_formats_effective_to_season_seasons_year_fk" FOREIGN KEY ("effective_to_season") REFERENCES "public"."seasons"("year") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "circuit_configurations_circuit_code_unique" ON "circuit_configurations" USING btree ("circuit_id","code");--> statement-breakpoint
CREATE INDEX "circuit_configurations_circuit_id_idx" ON "circuit_configurations" USING btree ("circuit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "circuits_slug_unique" ON "circuits" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "circuits_country_id_idx" ON "circuits" USING btree ("country_id");--> statement-breakpoint
CREATE UNIQUE INDEX "constructor_aliases_source_identifier_unique" ON "constructor_aliases" USING btree ("source","source_identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "constructor_aliases_constructor_source_alias_unique" ON "constructor_aliases" USING btree ("constructor_id","source","alias");--> statement-breakpoint
CREATE INDEX "constructor_aliases_constructor_id_idx" ON "constructor_aliases" USING btree ("constructor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "constructors_slug_unique" ON "constructors" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "constructors_nationality_country_id_idx" ON "constructors" USING btree ("nationality_country_id");--> statement-breakpoint
CREATE UNIQUE INDEX "countries_iso_alpha2_unique" ON "countries" USING btree ("iso_alpha2");--> statement-breakpoint
CREATE UNIQUE INDEX "countries_iso_alpha3_unique" ON "countries" USING btree ("iso_alpha3");--> statement-breakpoint
CREATE UNIQUE INDEX "countries_name_unique" ON "countries" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "driver_aliases_source_identifier_unique" ON "driver_aliases" USING btree ("source","source_identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "driver_aliases_driver_source_alias_unique" ON "driver_aliases" USING btree ("driver_id","source","alias");--> statement-breakpoint
CREATE INDEX "driver_aliases_driver_id_idx" ON "driver_aliases" USING btree ("driver_id");--> statement-breakpoint
CREATE UNIQUE INDEX "drivers_slug_unique" ON "drivers" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "drivers_permanent_number_unique" ON "drivers" USING btree ("permanent_number");--> statement-breakpoint
CREATE INDEX "drivers_nationality_country_id_idx" ON "drivers" USING btree ("nationality_country_id");--> statement-breakpoint
CREATE UNIQUE INDEX "points_systems_code_unique" ON "points_systems" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "race_formats_code_unique" ON "race_formats" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "session_types_code_unique" ON "session_types" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "status_codes_code_unique" ON "status_codes" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "tire_compounds_code_unique" ON "tire_compounds" USING btree ("code");