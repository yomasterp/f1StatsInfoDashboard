import { z } from "zod";
import type { NewsDataConfig } from "./config";
import { NewsProviderError } from "./errors";
import type {
  FetchNewsOptions,
  NewsArticleCandidate,
  NewsProvider,
} from "./types";
import { canonicalizeArticleUrl } from "./url";

const newsDataTimestampSchema = z.string().trim().refine((value) => {
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    ? `${value.replace(" ", "T")}Z`
    : value;
  return !Number.isNaN(Date.parse(normalized));
}, "Publication timestamp must be parseable");

const newsDataArticleSchema = z.object({
  article_id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  link: z.string().url(),
  creator: z.union([z.array(z.string()), z.string()]).nullable().optional(),
  description: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  pubDate: newsDataTimestampSchema,
  image_url: z.string().url().nullable().optional(),
  source_id: z.string().trim().min(1),
  source_name: z.string().trim().min(1),
  source_url: z.string().url().nullable().optional(),
  language: z.string().nullable().optional(),
});

const newsDataSuccessSchema = z.object({
  status: z.literal("success"),
  totalResults: z.number().int().nonnegative(),
  results: z.array(newsDataArticleSchema),
  nextPage: z.string().nullable().optional(),
});

const newsDataErrorSchema = z.object({
  status: z.literal("error"),
  code: z.string().optional(),
  message: z.string().optional(),
  results: z
    .union([
      z.string(),
      z.object({
        code: z.string().optional(),
        message: z.string().optional(),
      }),
    ])
    .optional(),
});

export class NewsDataError extends NewsProviderError {
  constructor(message: string, code: string, httpStatus?: number) {
    super(message, "newsdata", code, httpStatus);
    this.name = "NewsDataError";
  }
}

function normalizeTimestamp(value: string): Date {
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    ? `${value.replace(" ", "T")}Z`
    : value;
  return new Date(normalized);
}

function normalizeAuthor(
  creator: z.infer<typeof newsDataArticleSchema>["creator"],
): string | null {
  if (Array.isArray(creator)) {
    const authors = creator.map((author) => author.trim()).filter(Boolean);
    return authors.length > 0 ? authors.join(", ") : null;
  }

  return creator?.trim() || null;
}

function normalizeArticle(
  article: z.infer<typeof newsDataArticleSchema>,
  configuredLanguage: string,
): NewsArticleCandidate {
  const canonicalUrl = canonicalizeArticleUrl(article.link);
  const articleUrl = new URL(canonicalUrl);
  const sourceHomepageUrl = article.source_url
    ? new URL(article.source_url).origin
    : articleUrl.origin;

  return {
    provider: "newsdata",
    providerRecordIdentifier: article.article_id,
    sourceIdentifier: article.source_id,
    sourceName: article.source_name,
    sourceDomain: new URL(sourceHomepageUrl).hostname.toLowerCase(),
    sourceHomepageUrl,
    canonicalUrl,
    title: article.title,
    summary: article.description?.trim() || null,
    author: normalizeAuthor(article.creator),
    // NewsData permits metadata display, but publisher image rights vary.
    imageUrl: null,
    language: configuredLanguage,
    publishedAt: normalizeTimestamp(article.pubDate),
  };
}

function getProviderError(
  payload: z.infer<typeof newsDataErrorSchema>,
): { code: string; message: string } {
  const details = typeof payload.results === "object" ? payload.results : undefined;
  return {
    code: payload.code ?? details?.code ?? "provider-error",
    message:
      payload.message ??
      details?.message ??
      (typeof payload.results === "string" ? payload.results : "NewsData request failed"),
  };
}

export class NewsDataProvider implements NewsProvider {
  readonly name = "newsdata";

  constructor(
    private readonly config: NewsDataConfig,
    private readonly fetchImplementation: typeof fetch = fetch,
  ) {}

  async fetchArticles(
    options: FetchNewsOptions = {},
  ): Promise<NewsArticleCandidate[]> {
    const endpoint = new URL(`${this.config.baseUrl}/latest`);
    endpoint.searchParams.set("apikey", this.config.apiKey);
    endpoint.searchParams.set("q", this.config.query);
    endpoint.searchParams.set("language", this.config.language);
    endpoint.searchParams.set("category", this.config.category);

    if (options.page !== undefined) {
      endpoint.searchParams.set("page", options.page.toString());
    }

    const response = await this.fetchImplementation(endpoint, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new NewsDataError(
        "NewsData returned an invalid JSON response",
        "invalid-json",
        response.status,
      );
    }

    const providerError = newsDataErrorSchema.safeParse(payload);
    if (providerError.success) {
      const details = getProviderError(providerError.data);
      throw new NewsDataError(details.message, details.code, response.status);
    }

    const parsed = newsDataSuccessSchema.safeParse(payload);
    if (!parsed.success) {
      throw new NewsDataError(
        "NewsData returned a response that failed validation",
        "invalid-response",
        response.status,
      );
    }

    if (!response.ok) {
      throw new NewsDataError(
        `NewsData request failed with HTTP ${response.status}`,
        "http-error",
        response.status,
      );
    }

    return parsed.data.results.map((article) =>
      normalizeArticle(article, this.config.language),
    );
  }
}
