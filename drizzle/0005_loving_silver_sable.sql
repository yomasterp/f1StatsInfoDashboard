CREATE TABLE "news_articles" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"news_source_id" integer NOT NULL,
	"provider" text NOT NULL,
	"provider_record_identifier" text NOT NULL,
	"canonical_url" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"author" text,
	"image_url" text,
	"language" text DEFAULT 'en' NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"import_run_id" integer NOT NULL,
	CONSTRAINT "news_articles_provider_not_blank" CHECK (char_length(trim("news_articles"."provider")) > 0),
	CONSTRAINT "news_articles_provider_record_identifier_not_blank" CHECK (char_length(trim("news_articles"."provider_record_identifier")) > 0),
	CONSTRAINT "news_articles_canonical_url_not_blank" CHECK (char_length(trim("news_articles"."canonical_url")) > 0),
	CONSTRAINT "news_articles_title_not_blank" CHECK (char_length(trim("news_articles"."title")) > 0),
	CONSTRAINT "news_articles_language_code" CHECK (char_length("news_articles"."language") = 2 AND "news_articles"."language" = lower("news_articles"."language")),
	CONSTRAINT "news_articles_seen_range" CHECK ("news_articles"."last_seen_at" >= "news_articles"."first_seen_at")
);
--> statement-breakpoint
CREATE TABLE "news_sources" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"provider_source_identifier" text,
	"name" text NOT NULL,
	"domain" text NOT NULL,
	"homepage_url" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "news_sources_provider_not_blank" CHECK (char_length(trim("news_sources"."provider")) > 0),
	CONSTRAINT "news_sources_name_not_blank" CHECK (char_length(trim("news_sources"."name")) > 0),
	CONSTRAINT "news_sources_domain_not_blank" CHECK (char_length(trim("news_sources"."domain")) > 0),
	CONSTRAINT "news_sources_domain_lowercase" CHECK ("news_sources"."domain" = lower("news_sources"."domain")),
	CONSTRAINT "news_sources_homepage_url_not_blank" CHECK (char_length(trim("news_sources"."homepage_url")) > 0),
	CONSTRAINT "news_sources_provider_identifier_not_blank" CHECK ("news_sources"."provider_source_identifier" IS NULL OR char_length(trim("news_sources"."provider_source_identifier")) > 0)
);
--> statement-breakpoint
ALTER TABLE "news_articles" ADD CONSTRAINT "news_articles_news_source_id_news_sources_id_fk" FOREIGN KEY ("news_source_id") REFERENCES "public"."news_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_articles" ADD CONSTRAINT "news_articles_import_run_id_import_runs_id_fk" FOREIGN KEY ("import_run_id") REFERENCES "public"."import_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "news_articles_canonical_url_unique" ON "news_articles" USING btree ("canonical_url");--> statement-breakpoint
CREATE UNIQUE INDEX "news_articles_provider_record_unique" ON "news_articles" USING btree ("provider","provider_record_identifier");--> statement-breakpoint
CREATE INDEX "news_articles_published_at_idx" ON "news_articles" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "news_articles_source_published_at_idx" ON "news_articles" USING btree ("news_source_id","published_at");--> statement-breakpoint
CREATE INDEX "news_articles_import_run_id_idx" ON "news_articles" USING btree ("import_run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "news_sources_provider_domain_unique" ON "news_sources" USING btree ("provider","domain");--> statement-breakpoint
CREATE UNIQUE INDEX "news_sources_provider_identifier_unique" ON "news_sources" USING btree ("provider","provider_source_identifier");