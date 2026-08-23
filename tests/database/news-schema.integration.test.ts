import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { getDatabaseUrl } from "../../src/lib/database/config";
import { upsertNewsArticles } from "../../src/lib/news/importer";
import type { NewsArticleCandidate } from "../../src/lib/news/types";

const database = postgres(getDatabaseUrl(), {
  max: 1,
  onnotice: () => undefined,
});
const fixtureSuffix = Date.now().toString();

const createCandidate = (
  suffix: string,
  overrides: Partial<NewsArticleCandidate> = {},
): NewsArticleCandidate => ({
  provider: "newsapi",
  providerRecordIdentifier: `https://news-${suffix}.example/article`,
  sourceIdentifier: `source-${suffix}`,
  sourceName: "Fixture Motorsport News",
  sourceDomain: `news-${suffix}.example`,
  sourceHomepageUrl: `https://news-${suffix}.example`,
  canonicalUrl: `https://news-${suffix}.example/article`,
  title: "Fixture Formula 1 headline",
  summary: "Fixture provider-supplied description.",
  author: "Fixture Reporter",
  imageUrl: null,
  language: "en",
  publishedAt: new Date("2087-06-01T12:00:00Z"),
  ...overrides,
});

afterAll(async () => {
  await database.end({ timeout: 5 });
});

describe("news schema and persistence", () => {
  it("idempotently inserts and refreshes normalized article metadata", async () => {
    const rollback = new Error("rollback news fixture");

    await expect(
      database.begin(async (transaction) => {
        const [firstRun] = await transaction<{ id: number }[]>`
          INSERT INTO import_runs (source, scope, status)
          VALUES ('newsapi', ${`news-fixture-first-${fixtureSuffix}`}, 'running')
          RETURNING id
        `;
        const article = createCandidate(fixtureSuffix);
        const firstSeenAt = new Date("2087-06-01T13:00:00Z");
        const firstCounts = await upsertNewsArticles(
          transaction,
          [article],
          firstRun.id,
          firstSeenAt,
        );

        const [secondRun] = await transaction<{ id: number }[]>`
          INSERT INTO import_runs (source, scope, status)
          VALUES ('newsapi', ${`news-fixture-second-${fixtureSuffix}`}, 'running')
          RETURNING id
        `;
        const lastSeenAt = new Date("2087-06-01T14:00:00Z");
        const secondCounts = await upsertNewsArticles(
          transaction,
          [{ ...article, title: "Corrected fixture headline" }],
          secondRun.id,
          lastSeenAt,
        );

        expect(firstCounts).toEqual({ received: 1, inserted: 1, updated: 0 });
        expect(secondCounts).toEqual({ received: 1, inserted: 0, updated: 1 });

        const [stored] = await transaction<
          {
            article_count: string;
            source_count: string;
            title: string;
            first_seen_at: Date;
            last_seen_at: Date;
            import_run_id: number;
          }[]
        >`
          SELECT
            (SELECT count(*) FROM news_articles WHERE canonical_url = ${article.canonicalUrl})
              AS article_count,
            (SELECT count(*) FROM news_sources WHERE domain = ${article.sourceDomain})
              AS source_count,
            title,
            first_seen_at,
            last_seen_at,
            import_run_id
          FROM news_articles
          WHERE canonical_url = ${article.canonicalUrl}
        `;

        expect(stored).toMatchObject({
          article_count: "1",
          source_count: "1",
          title: "Corrected fixture headline",
          first_seen_at: firstSeenAt,
          last_seen_at: lastSeenAt,
          import_run_id: Number(secondRun.id),
        });

        throw rollback;
      }),
    ).rejects.toBe(rollback);
  });

  it("rejects invalid article metadata and freshness ranges", async () => {
    await expect(
      database.begin(async (transaction) => {
        const [run] = await transaction<{ id: number }[]>`
          INSERT INTO import_runs (source, scope, status)
          VALUES ('newsapi', ${`news-invalid-run-${fixtureSuffix}`}, 'running')
          RETURNING id
        `;
        const [source] = await transaction<{ id: number }[]>`
          INSERT INTO news_sources (provider, name, domain, homepage_url)
          VALUES (
            'newsapi',
            'Invalid Fixture Source',
            ${`invalid-${fixtureSuffix}.example`},
            ${`https://invalid-${fixtureSuffix}.example`}
          )
          RETURNING id
        `;

        return transaction`
          INSERT INTO news_articles (
            news_source_id,
            provider,
            provider_record_identifier,
            canonical_url,
            title,
            language,
            published_at,
            first_seen_at,
            last_seen_at,
            import_run_id
          )
          VALUES (
            ${source.id},
            'newsapi',
            'invalid-record',
            'https://invalid.example/article',
            ' ',
            'EN',
            '2087-06-01T12:00:00Z',
            '2087-06-01T14:00:00Z',
            '2087-06-01T13:00:00Z',
            ${run.id}
          )
        `;
      }),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("enforces stable provider record identifiers independently of URLs", async () => {
    await expect(
      database.begin(async (transaction) => {
        const [run] = await transaction<{ id: number }[]>`
          INSERT INTO import_runs (source, scope, status)
          VALUES ('newsapi', ${`news-duplicate-run-${fixtureSuffix}`}, 'running')
          RETURNING id
        `;
        const [source] = await transaction<{ id: number }[]>`
          INSERT INTO news_sources (provider, name, domain, homepage_url)
          VALUES (
            'newsapi',
            'Duplicate Fixture Source',
            ${`duplicate-${fixtureSuffix}.example`},
            ${`https://duplicate-${fixtureSuffix}.example`}
          )
          RETURNING id
        `;
        const providerRecordIdentifier = `provider-record-${fixtureSuffix}`;

        await transaction`
          INSERT INTO news_articles (
            news_source_id,
            provider,
            provider_record_identifier,
            canonical_url,
            title,
            published_at,
            import_run_id
          )
          VALUES (
            ${source.id},
            'newsapi',
            ${providerRecordIdentifier},
            ${`https://duplicate-${fixtureSuffix}.example/first`},
            'First headline',
            '2087-06-01T12:00:00Z',
            ${run.id}
          )
        `;
        return transaction`
          INSERT INTO news_articles (
            news_source_id,
            provider,
            provider_record_identifier,
            canonical_url,
            title,
            published_at,
            import_run_id
          )
          VALUES (
            ${source.id},
            'newsapi',
            ${providerRecordIdentifier},
            ${`https://duplicate-${fixtureSuffix}.example/second`},
            'Second headline',
            '2087-06-01T13:00:00Z',
            ${run.id}
          )
        `;
      }),
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("requires valid source and import-run references", async () => {
    await expect(
      database`
        INSERT INTO news_articles (
          news_source_id,
          provider,
          provider_record_identifier,
          canonical_url,
          title,
          published_at,
          import_run_id
        )
        VALUES (
          999999999,
          'newsapi',
          'missing-reference',
          'https://missing.example/article',
          'Missing reference headline',
          '2087-06-01T12:00:00Z',
          999999999
        )
      `,
    ).rejects.toMatchObject({ code: "23503" });
  });
});
