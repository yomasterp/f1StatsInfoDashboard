import { describe, expect, it } from "vitest";
import { canonicalizeArticleUrl } from "../../src/lib/news/url";

describe("article URL canonicalization", () => {
  it("removes fragments, tracking parameters, and trailing slashes", () => {
    expect(
      canonicalizeArticleUrl(
        "https://NEWS.example.com/story/?utm_source=feed&b=2&ref=home&a=1#section",
      ),
    ).toBe("https://news.example.com/story?a=1&b=2");
  });

  it("rejects non-web article protocols", () => {
    expect(() => canonicalizeArticleUrl("file:///private/article")).toThrow(
      "Article URLs must use HTTP or HTTPS",
    );
  });
});
