import { describe, expect, it } from "vitest";
import { getDatabaseUrl } from "../../src/lib/database/config";

describe("getDatabaseUrl", () => {
  it("accepts a PostgreSQL connection string", () => {
    expect(
      getDatabaseUrl({
        DATABASE_URL: "postgresql://f1_app:password@localhost:5432/f1_race_dashboard",
      }),
    ).toBe("postgresql://f1_app:password@localhost:5432/f1_race_dashboard");
  });

  it("rejects a missing connection string", () => {
    expect(() => getDatabaseUrl({})).toThrow("DATABASE_URL is required");
  });

  it("rejects non-PostgreSQL protocols", () => {
    expect(() => getDatabaseUrl({ DATABASE_URL: "https://example.com/database" })).toThrow(
      "DATABASE_URL must use the postgres:// or postgresql:// protocol",
    );
  });
});
