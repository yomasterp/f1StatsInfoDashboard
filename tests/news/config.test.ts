import { describe, expect, it } from "vitest";
import {
  getNewsApiConfig,
  getNewsDataConfig,
  getNewsProviderName,
} from "../../src/lib/news/config";

describe("NewsAPI configuration", () => {
  it("uses safe defaults around a configured API key", () => {
    expect(getNewsApiConfig({ NEWS_API_KEY: "test-news-api-key" })).toEqual({
      apiKey: "test-news-api-key",
      baseUrl: "https://newsapi.org/v2",
      query: '"Formula 1" OR "F1"',
      language: "en",
      pageSize: 50,
    });
  });

  it("normalizes a custom base URL and numeric page size", () => {
    expect(
      getNewsApiConfig({
        NEWS_API_KEY: "test-news-api-key",
        NEWS_API_BASE_URL: "https://example.test/v2/",
        NEWS_API_QUERY: "Formula One",
        NEWS_API_LANGUAGE: "de",
        NEWS_API_PAGE_SIZE: "25",
      }),
    ).toMatchObject({
      baseUrl: "https://example.test/v2",
      query: "Formula One",
      language: "de",
      pageSize: 25,
    });
  });

  it("rejects missing, placeholder, and unsafe option values", () => {
    expect(() => getNewsApiConfig({})).toThrow("NEWS_API_KEY is required");
    expect(() =>
      getNewsApiConfig({ NEWS_API_KEY: "replace-with-your-newsapi-key" }),
    ).toThrow("NEWS_API_KEY must be replaced");
    expect(() =>
      getNewsApiConfig({
        NEWS_API_KEY: "test-news-api-key",
        NEWS_API_LANGUAGE: "EN",
      }),
    ).toThrow("NEWS_API_LANGUAGE must be a lowercase two-letter code");
    expect(() =>
      getNewsApiConfig({
        NEWS_API_KEY: "test-news-api-key",
        NEWS_API_PAGE_SIZE: "101",
      }),
    ).toThrow();
  });
});

describe("NewsData configuration", () => {
  it("is the default provider and uses safe defaults around a configured key", () => {
    expect(getNewsProviderName({})).toBe("newsdata");
    expect(getNewsDataConfig({ NEWSDATA_API_KEY: "test-newsdata-key" })).toEqual({
      apiKey: "test-newsdata-key",
      baseUrl: "https://newsdata.io/api/1",
      query: '"Formula 1" OR F1',
      language: "en",
      category: "sports",
    });
  });

  it("normalizes provider options and supports the local NewsAPI selection", () => {
    expect(
      getNewsDataConfig({
        NEWSDATA_API_KEY: "test-newsdata-key",
        NEWSDATA_API_BASE_URL: "https://example.test/api/1/",
        NEWSDATA_API_QUERY: "Formula One",
        NEWSDATA_API_LANGUAGE: "de",
        NEWSDATA_API_CATEGORY: "top",
      }),
    ).toMatchObject({
      baseUrl: "https://example.test/api/1",
      query: "Formula One",
      language: "de",
      category: "top",
    });
    expect(getNewsProviderName({ NEWS_PROVIDER: "newsapi" })).toBe("newsapi");
  });

  it("rejects missing, placeholder, invalid provider, and unsafe values", () => {
    expect(() => getNewsDataConfig({})).toThrow("NEWSDATA_API_KEY is required");
    expect(() =>
      getNewsDataConfig({ NEWSDATA_API_KEY: "replace-with-your-newsdata-key" }),
    ).toThrow("NEWSDATA_API_KEY must be replaced");
    expect(() =>
      getNewsDataConfig({
        NEWSDATA_API_KEY: "test-newsdata-key",
        NEWSDATA_API_LANGUAGE: "EN",
      }),
    ).toThrow("NEWSDATA_API_LANGUAGE must be a lowercase two-letter code");
    expect(() =>
      getNewsDataConfig({
        NEWSDATA_API_KEY: "test-newsdata-key",
        NEWSDATA_API_QUERY: "x".repeat(101),
      }),
    ).toThrow();
    expect(() => getNewsProviderName({ NEWS_PROVIDER: "unknown" })).toThrow();
  });
});
