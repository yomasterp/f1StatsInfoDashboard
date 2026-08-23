import "dotenv/config";
import { getDatabaseUrl } from "../src/lib/database/config";
import { runNewsImport } from "../src/lib/news/importer";
import { createNewsProvider } from "../src/lib/news/provider";

async function main() {
  const provider = createNewsProvider();
  const counts = await runNewsImport({
    databaseUrl: getDatabaseUrl(),
    provider,
  });

  console.log(
    `News import completed: ${counts.received} received, ${counts.inserted} inserted, ${counts.updated} updated.`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown news import error";
  console.error(`News import failed: ${message}`);
  process.exitCode = 1;
});
