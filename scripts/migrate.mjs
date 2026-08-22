import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { getDatabaseUrl } from "./database-environment.mjs";

const client = postgres(getDatabaseUrl(), {
  max: 1,
  onnotice: () => undefined,
});

try {
  await migrate(drizzle({ client }), { migrationsFolder: "drizzle" });
  console.log("Database migrations completed.");
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown migration error";
  console.error(`Database migration failed: ${message}`);
  process.exitCode = 1;
} finally {
  await client.end({ timeout: 5 });
}
