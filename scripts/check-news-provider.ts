import "dotenv/config";
import { createNewsProvider } from "../src/lib/news/provider";

async function main() {
  const provider = createNewsProvider();
  const articles = await provider.fetchArticles();

  console.log(
    `${provider.name} connection succeeded with ${articles.length} usable articles.`,
  );
  for (const article of articles.slice(0, 5)) {
    console.log(
      `- ${article.publishedAt.toISOString()} | ${article.sourceName} | ${article.title}`,
    );
  }
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Unknown news provider error";
  console.error(`News provider connection failed: ${message}`);
  process.exitCode = 1;
});
