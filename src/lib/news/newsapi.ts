import { z } from "zod";
import type { NewsApiConfig } from "./config";
import { NewsProviderError } from "./errors";
import type {
  FetchNewsOptions,
  NewsArticleCandidate,
  NewsProvider,
} from "./types";
import { canonicalizeArticleUrl } from "./url";

const newsApiArticleSchema = z.object({
  source: z.object({
    id: z.string().nullable(),
    name: z.string().trim().min(1),
  }),
  author: z.string().trim().min(1).nullable(),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1).nullable(),
  url: z.string().url(),
  urlToImage: z.string().url().nullable(),
  publishedAt: z.string().datetime({ offset: true }),
  content: z.string().nullable().optional(),
});

const newsApiResponseSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ok"),
    totalResults: z.number().int().nonnegative(),
    articles: z.array(newsApiArticleSchema),
  }),
  z.object({
    status: z.literal("error"),
    code: z.string().trim().min(1),
    message: z.string().trim().min(1),
  }),
]);

export class NewsApiError extends NewsProviderError {
  constructor(
    message: string,
    readonly code: string,
    readonly httpStatus?: number,
  ) {
    super(message, "newsapi", code, httpStatus);
    this.name = "NewsApiError";
  }
}

function normalizeArticle(
  article: z.infer<typeof newsApiArticleSchema>,
  language: string,
): NewsArticleCandidate {
  const canonicalUrl = canonicalizeArticleUrl(article.url);
  const articleUrl = new URL(canonicalUrl);

  return {
    provider: "newsapi",
    providerRecordIdentifier: canonicalUrl,
    sourceIdentifier: article.source.id,
    sourceName: article.source.name,
    sourceDomain: articleUrl.hostname,
    sourceHomepageUrl: articleUrl.origin,
    canonicalUrl,
    title: article.title,
    summary: article.description,
    author: article.author,
    imageUrl: article.urlToImage,
    language,
    publishedAt: new Date(article.publishedAt),
  };
}

export class NewsApiProvider implements NewsProvider {
  readonly name = "newsapi";

  constructor(
    private readonly config: NewsApiConfig,
    private readonly fetchImplementation: typeof fetch = fetch,
  ) {}

  async fetchArticles(
    options: FetchNewsOptions = {},
  ): Promise<NewsArticleCandidate[]> {
    const endpoint = new URL(`${this.config.baseUrl}/everything`);
    endpoint.searchParams.set("q", this.config.query);
    endpoint.searchParams.set("searchIn", "title,description");
    endpoint.searchParams.set("language", this.config.language);
    endpoint.searchParams.set("sortBy", "publishedAt");
    endpoint.searchParams.set("pageSize", this.config.pageSize.toString());
    endpoint.searchParams.set("page", (options.page ?? 1).toString());

    if (options.from) {
      endpoint.searchParams.set("from", options.from.toISOString());
    }

    const response = await this.fetchImplementation(endpoint, {
      headers: {
        Accept: "application/json",
        "X-Api-Key": this.config.apiKey,
      },
      signal: AbortSignal.timeout(15_000),
    });

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new NewsApiError(
        "NewsAPI returned an invalid JSON response",
        "invalid-json",
        response.status,
      );
    }

    const parsed = newsApiResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new NewsApiError(
        "NewsAPI returned a response that failed validation",
        "invalid-response",
        response.status,
      );
    }

    if (parsed.data.status === "error") {
      throw new NewsApiError(
        parsed.data.message,
        parsed.data.code,
        response.status,
      );
    }

    if (!response.ok) {
      throw new NewsApiError(
        `NewsAPI request failed with HTTP ${response.status}`,
        "http-error",
        response.status,
      );
    }

    return parsed.data.articles
      .filter((article) => article.title !== "[Removed]")
      .map((article) => normalizeArticle(article, this.config.language));
  }
}
