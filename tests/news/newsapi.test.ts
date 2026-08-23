import { describe, expect, it, vi } from "vitest";
import fixture from "../fixtures/newsapi/formula-one.json";
import type { NewsApiConfig } from "../../src/lib/news/config";
import { NewsApiError, NewsApiProvider } from "../../src/lib/news/newsapi";

const config: NewsApiConfig = {
  apiKey: "private-test-key",
  baseUrl: "https://newsapi.example.test/v2",
  query: '"Formula 1" OR "F1"',
  language: "en",
  pageSize: 50,
};

describe("NewsAPI provider", () => {
  it("validates and normalizes article metadata without retaining full content", async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(fixture), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const provider = new NewsApiProvider(config, fetchImplementation);

    const articles = await provider.fetchArticles({
      from: new Date("2026-08-20T00:00:00Z"),
      page: 2,
    });

    expect(articles).toHaveLength(2);
    expect(articles[0]).toEqual({
      provider: "newsapi",
      providerRecordIdentifier:
        "https://news.example.com/f1/development-package",
      sourceIdentifier: "example-motorsport",
      sourceName: "Example Motorsport",
      sourceDomain: "news.example.com",
      sourceHomepageUrl: "https://news.example.com",
      canonicalUrl: "https://news.example.com/f1/development-package",
      title: "Formula 1 team reveals its next development package",
      summary: "A short provider-supplied summary of the Formula 1 report.",
      author: "Alex Reporter",
      imageUrl: "https://news.example.com/images/development-package.jpg",
      language: "en",
      publishedAt: new Date("2026-08-22T18:30:00Z"),
    });
    expect(articles[0]).not.toHaveProperty("content");

    const [requestUrl, requestInit] = fetchImplementation.mock.calls[0];
    const url = new URL(requestUrl.toString());
    expect(url.searchParams.get("from")).toBe("2026-08-20T00:00:00.000Z");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.toString()).not.toContain(config.apiKey);
    expect(new Headers(requestInit?.headers).get("X-Api-Key")).toBe(config.apiKey);
  });

  it("rejects malformed provider responses", async () => {
    const provider = new NewsApiProvider(
      config,
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ status: "ok", articles: "invalid" }), {
          status: 200,
        }),
      ),
    );

    await expect(provider.fetchArticles()).rejects.toMatchObject({
      name: "NewsApiError",
      code: "invalid-response",
    });
  });

  it("returns sanitized provider errors without exposing the key", async () => {
    const provider = new NewsApiProvider(
      config,
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: "error",
            code: "rateLimited",
            message: "Too many requests",
          }),
          { status: 429 },
        ),
      ),
    );

    const error = await provider.fetchArticles().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(NewsApiError);
    expect(error).toMatchObject({ code: "rateLimited", httpStatus: 429 });
    expect(String(error)).not.toContain(config.apiKey);
  });
});
