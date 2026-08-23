import { describe, expect, it, vi } from "vitest";
import type { NewsDataConfig } from "../../src/lib/news/config";
import { NewsDataError, NewsDataProvider } from "../../src/lib/news/newsdata";
import fixture from "../fixtures/newsdata/formula-one.json";

const config: NewsDataConfig = {
  apiKey: "private-newsdata-key",
  baseUrl: "https://newsdata.example.test/api/1",
  query: '"Formula 1" OR F1',
  language: "en",
  category: "sports",
};

describe("NewsData provider", () => {
  it("validates and normalizes permitted metadata without retaining content or images", async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(fixture), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const provider = new NewsDataProvider(config, fetchImplementation);

    const articles = await provider.fetchArticles({ page: "next-page-token" });

    expect(articles).toHaveLength(2);
    expect(articles[0]).toEqual({
      provider: "newsdata",
      providerRecordIdentifier: "newsdata-f1-001",
      sourceIdentifier: "example_motorsport",
      sourceName: "Example Motorsport",
      sourceDomain: "news.example.com",
      sourceHomepageUrl: "https://news.example.com",
      canonicalUrl: "https://news.example.com/f1/development-package",
      title: "Formula 1 team reveals its next development package",
      summary: "A short provider-supplied summary of the Formula 1 report.",
      author: "Alex Reporter, Sam Editor",
      imageUrl: null,
      language: "en",
      publishedAt: new Date("2026-08-22T18:30:00Z"),
    });
    expect(articles[0]).not.toHaveProperty("content");

    const [requestUrl, requestInit] = fetchImplementation.mock.calls[0];
    const url = new URL(requestUrl.toString());
    expect(url.pathname).toBe("/api/1/latest");
    expect(url.searchParams.get("apikey")).toBe(config.apiKey);
    expect(url.searchParams.get("q")).toBe(config.query);
    expect(url.searchParams.get("language")).toBe("en");
    expect(url.searchParams.get("category")).toBe("sports");
    expect(url.searchParams.get("page")).toBe("next-page-token");
    expect(new Headers(requestInit?.headers).get("Accept")).toBe("application/json");
  });

  it("rejects malformed provider responses", async () => {
    const provider = new NewsDataProvider(
      config,
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({ status: "success", totalResults: 1, results: "invalid" }),
          { status: 200 },
        ),
      ),
    );

    await expect(provider.fetchArticles()).rejects.toMatchObject({
      name: "NewsDataError",
      provider: "newsdata",
      code: "invalid-response",
    });
  });

  it("returns sanitized provider errors without exposing the key", async () => {
    const provider = new NewsDataProvider(
      config,
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: "error",
            results: { code: "RateLimitExceeded", message: "Too many requests" },
          }),
          { status: 429 },
        ),
      ),
    );

    const error = await provider.fetchArticles().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(NewsDataError);
    expect(error).toMatchObject({
      provider: "newsdata",
      code: "RateLimitExceeded",
      httpStatus: 429,
    });
    expect(String(error)).not.toContain(config.apiKey);
  });

  it("rejects invalid JSON responses", async () => {
    const provider = new NewsDataProvider(
      config,
      vi.fn<typeof fetch>().mockResolvedValue(new Response("not-json", { status: 502 })),
    );

    await expect(provider.fetchArticles()).rejects.toMatchObject({
      code: "invalid-json",
      httpStatus: 502,
    });
  });
});
