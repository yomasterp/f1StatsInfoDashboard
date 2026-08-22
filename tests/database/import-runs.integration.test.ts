import "dotenv/config";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDatabaseUrl } from "../../src/lib/database/config";

const database = postgres(getDatabaseUrl(), {
  max: 1,
  onnotice: () => undefined,
});
const testSource = `integration-test-${Date.now()}`;

beforeAll(async () => {
  await database`SELECT 1 FROM import_runs LIMIT 1`;
});

afterAll(async () => {
  await database.end({ timeout: 5 });
});

describe("import_runs migration", () => {
  it("records the default running status without persisting test data", async () => {
    const rollback = new Error("rollback integration fixture");

    await expect(
      database.begin(async (transaction) => {
        const [run] = await transaction<{
          source: string;
          scope: string;
          status: "running";
          recordsProcessed: number;
        }[]>`
          INSERT INTO import_runs (source, scope)
          VALUES (${testSource}, 'migration-test')
          RETURNING
            source,
            scope,
            status,
            records_processed AS "recordsProcessed"
        `;

        expect(run).toEqual({
          source: testSource,
          scope: "migration-test",
          status: "running",
          recordsProcessed: 0,
        });

        throw rollback;
      }),
    ).rejects.toBe(rollback);

    const [{ count }] = await database<{ count: string }[]>`
      SELECT count(*) AS count FROM import_runs WHERE source = ${testSource}
    `;
    expect(Number(count)).toBe(0);
  });

  it("rejects negative import duration and record counts", async () => {
    await expect(
      database`
        INSERT INTO import_runs (source, scope, duration_ms)
        VALUES (${testSource}, 'migration-test', -1)
      `,
    ).rejects.toMatchObject({ code: "23514" });

    await expect(
      database`
        INSERT INTO import_runs (source, scope, records_processed)
        VALUES (${testSource}, 'migration-test', -1)
      `,
    ).rejects.toMatchObject({ code: "23514" });
  });
});
