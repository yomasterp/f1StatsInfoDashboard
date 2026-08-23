import { describe, expect, it, vi } from "vitest";
import { NewsApiProvider } from "../../src/lib/news/newsapi";
import { NewsDataProvider } from "../../src/lib/news/newsdata";
import { createNewsProvider } from "../../src/lib/news/provider";

describe("news provider factory", () => {
  it("creates NewsData by default", () => {
    const provider = createNewsProvider(
      { NEWSDATA_API_KEY: "test-newsdata-key" },
      vi.fn<typeof fetch>(),
    );

    expect(provider).toBeInstanceOf(NewsDataProvider);
    expect(provider.name).toBe("newsdata");
  });

  it("keeps NewsAPI available through an explicit local selection", () => {
    const provider = createNewsProvider(
      { NEWS_PROVIDER: "newsapi", NEWS_API_KEY: "test-newsapi-key" },
      vi.fn<typeof fetch>(),
    );

    expect(provider).toBeInstanceOf(NewsApiProvider);
    expect(provider.name).toBe("newsapi");
  });
});
