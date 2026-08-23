import postgres from "postgres";
import { NewsProviderError } from "./errors";
import type {
  NewsArticleCandidate,
  NewsImportCounts,
  NewsProvider,
} from "./types";

const importScope = "news:formula-one:latest";
const advisoryLockKey = "f1-dashboard:news:formula-one";

export type ImportNewsOptions = {
  databaseUrl: string;
  provider: NewsProvider;
  observedAt?: Date;
};

function sanitizeImportError(error: unknown) {
  if (error instanceof NewsProviderError) {
    return {
      name: error.name,
      provider: error.provider,
      message: error.message,
      code: error.code,
      httpStatus: error.httpStatus,
    };
  }

  return {
    name: error instanceof Error ? error.name : "UnknownError",
    message: error instanceof Error ? error.message : "Unknown news import error",
  };
}

export async function upsertNewsArticles(
  transaction: postgres.TransactionSql,
  articles: NewsArticleCandidate[],
  importRunId: number,
  observedAt: Date,
): Promise<NewsImportCounts> {
  let inserted = 0;
  let updated = 0;

  for (const article of articles) {
    const [source] = await transaction<{ id: number }[]>`
      INSERT INTO news_sources (
        provider,
        provider_source_identifier,
        name,
        domain,
        homepage_url,
        updated_at
      )
      VALUES (
        ${article.provider},
        ${article.sourceIdentifier},
        ${article.sourceName},
        ${article.sourceDomain},
        ${article.sourceHomepageUrl},
        ${observedAt}
      )
      ON CONFLICT (provider, domain) DO UPDATE SET
        provider_source_identifier = COALESCE(
          EXCLUDED.provider_source_identifier,
          news_sources.provider_source_identifier
        ),
        name = EXCLUDED.name,
        homepage_url = EXCLUDED.homepage_url,
        is_active = true,
        updated_at = EXCLUDED.updated_at
      RETURNING id
    `;

    const [result] = await transaction<{ inserted: boolean }[]>`
      INSERT INTO news_articles (
        news_source_id,
        provider,
        provider_record_identifier,
        canonical_url,
        title,
        summary,
        author,
        image_url,
        language,
        published_at,
        first_seen_at,
        last_seen_at,
        import_run_id
      )
      VALUES (
        ${source.id},
        ${article.provider},
        ${article.providerRecordIdentifier},
        ${article.canonicalUrl},
        ${article.title},
        ${article.summary},
        ${article.author},
        ${article.imageUrl},
        ${article.language},
        ${article.publishedAt},
        ${observedAt},
        ${observedAt},
        ${importRunId}
      )
      ON CONFLICT (canonical_url) DO UPDATE SET
        news_source_id = EXCLUDED.news_source_id,
        provider_record_identifier = EXCLUDED.provider_record_identifier,
        title = EXCLUDED.title,
        summary = EXCLUDED.summary,
        author = EXCLUDED.author,
        image_url = EXCLUDED.image_url,
        language = EXCLUDED.language,
        published_at = EXCLUDED.published_at,
        last_seen_at = EXCLUDED.last_seen_at,
        import_run_id = EXCLUDED.import_run_id
      RETURNING (xmax = 0) AS inserted
    `;

    if (result.inserted) {
      inserted += 1;
    } else {
      updated += 1;
    }
  }

  return { received: articles.length, inserted, updated };
}

export async function runNewsImport({
  databaseUrl,
  provider,
  observedAt = new Date(),
}: ImportNewsOptions): Promise<NewsImportCounts> {
  const database = postgres(databaseUrl, {
    max: 1,
    onnotice: () => undefined,
  });
  const startedAt = Date.now();
  let lockAcquired = false;
  let importRunId: number | undefined;

  try {
    const [lock] = await database<{ acquired: boolean }[]>`
      SELECT pg_try_advisory_lock(hashtext(${advisoryLockKey})) AS acquired
    `;
    lockAcquired = lock.acquired;

    if (!lockAcquired) {
      await database`
        INSERT INTO import_runs (
          source,
          scope,
          status,
          completed_at,
          duration_ms,
          record_counts,
          error_details
        )
        VALUES (
          ${provider.name},
          ${importScope},
          'skipped',
          now(),
          0,
          ${JSON.stringify({ received: 0, inserted: 0, updated: 0 })}::jsonb,
          ${JSON.stringify({
            reason: "A news import for this scope is already running",
          })}::jsonb
        )
      `;
      return { received: 0, inserted: 0, updated: 0 };
    }

    const [importRun] = await database<{ id: number }[]>`
      INSERT INTO import_runs (source, scope, status)
      VALUES (${provider.name}, ${importScope}, 'running')
      RETURNING id
    `;
    importRunId = importRun.id;

    const articles = await provider.fetchArticles();
    const counts = await database.begin((transaction) =>
      upsertNewsArticles(transaction, articles, importRun.id, observedAt),
    );

    await database`
      UPDATE import_runs
      SET status = 'succeeded',
          completed_at = now(),
          duration_ms = ${Date.now() - startedAt},
          records_processed = ${counts.received},
          record_counts = ${JSON.stringify(counts)}::jsonb
      WHERE id = ${importRun.id}
    `;

    return counts;
  } catch (error) {
    if (importRunId !== undefined) {
      await database`
        UPDATE import_runs
        SET status = 'failed',
            completed_at = now(),
            duration_ms = ${Date.now() - startedAt},
            error_details = ${JSON.stringify(sanitizeImportError(error))}::jsonb
        WHERE id = ${importRunId}
      `;
    }
    throw error;
  } finally {
    if (lockAcquired) {
      await database`
        SELECT pg_advisory_unlock(hashtext(${advisoryLockKey}))
      `;
    }
    await database.end({ timeout: 5 });
  }
}
