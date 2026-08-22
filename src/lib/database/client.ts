import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getDatabaseUrl } from "./config";
import * as schema from "./schema";

export function createDatabaseClient(connectionString = getDatabaseUrl()) {
  const client = postgres(connectionString, {
    max: 1,
    onnotice: () => undefined,
  });

  return {
    client,
    db: drizzle({ client, schema }),
  };
}
