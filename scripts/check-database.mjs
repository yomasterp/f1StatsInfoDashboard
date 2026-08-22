import "dotenv/config";
import postgres from "postgres";
import { getDatabaseUrl } from "./database-environment.mjs";

const client = postgres(getDatabaseUrl(), {
  max: 1,
  onnotice: () => undefined,
});

try {
  const [connection] = await client`
    SELECT current_database() AS "databaseName", version() AS "serverVersion"
  `;

  console.log(`Connected to ${connection.databaseName}.`);
  console.log(connection.serverVersion.split(",")[0]);
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown database connection error";
  console.error(`Database connection check failed: ${message}`);
  process.exitCode = 1;
} finally {
  await client.end({ timeout: 5 });
}
