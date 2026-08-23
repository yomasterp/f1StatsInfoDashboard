import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { getDatabaseUrl } from "../../src/lib/database/config";

const database = postgres(getDatabaseUrl(), {
  max: 1,
  onnotice: () => undefined,
});
const fixtureSuffix = Date.now().toString();

const seedChampionshipResultDependencies = async (
  transaction: postgres.TransactionSql,
  suffix: string,
) => {
  await transaction`
    INSERT INTO seasons (year, championship_name, rounds)
    VALUES (2083, 'Championship result integration championship', 1)
  `;
  const [country] = await transaction<{ id: number }[]>`
    INSERT INTO countries (iso_alpha2, iso_alpha3, name)
    VALUES ('DE', 'DEU', ${`Germany ${suffix}`})
    RETURNING id
  `;
  const [driverOne] = await transaction<{ id: number }[]>`
    INSERT INTO drivers (slug, given_name, family_name, nationality_country_id)
    VALUES (${`championship-driver-one-${suffix}`}, 'First', 'Driver', ${country.id})
    RETURNING id
  `;
  const [driverTwo] = await transaction<{ id: number }[]>`
    INSERT INTO drivers (slug, given_name, family_name, nationality_country_id)
    VALUES (${`championship-driver-two-${suffix}`}, 'Second', 'Driver', ${country.id})
    RETURNING id
  `;
  const [constructorOne] = await transaction<{ id: number }[]>`
    INSERT INTO constructors (slug, name, nationality_country_id)
    VALUES (${`championship-constructor-one-${suffix}`}, 'First Constructor', ${country.id})
    RETURNING id
  `;
  const [constructorTwo] = await transaction<{ id: number }[]>`
    INSERT INTO constructors (slug, name, nationality_country_id)
    VALUES (${`championship-constructor-two-${suffix}`}, 'Second Constructor', ${country.id})
    RETURNING id
  `;
  const [importRun] = await transaction<{ id: number }[]>`
    INSERT INTO import_runs (source, scope, status, completed_at, records_processed)
    VALUES ('jolpica', ${`championship-results-${suffix}`}, 'succeeded', now(), 4)
    RETURNING id
  `;

  return {
    constructorOneId: constructorOne.id,
    constructorTwoId: constructorTwo.id,
    driverOneId: driverOne.id,
    driverTwoId: driverTwo.id,
    importRunId: importRun.id,
  };
};

afterAll(async () => {
  await database.end({ timeout: 5 });
});

describe("driver and constructor championship results schema migration", () => {
  it("stores a driver's final classification with exact totals and countback evidence", async () => {
    const rollback = new Error("rollback driver championship result fixture");

    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedChampionshipResultDependencies(
          transaction,
          fixtureSuffix,
        );
        const [result] = await transaction<
          { position: number; points: string; wins: number; countback_details: unknown }[]
        >`
          INSERT INTO driver_championship_results (
            season_year,
            driver_id,
            position,
            points,
            wins,
            countback_details,
            import_run_id,
            source,
            source_identifier
          )
          VALUES (
            2083,
            ${dependencies.driverOneId},
            1,
            312.5,
            8,
            ${JSON.stringify({ finishes: { "1": 8, "2": 3, "3": 1 } })}::jsonb,
            ${dependencies.importRunId},
            'jolpica',
            ${`driver-final-${fixtureSuffix}`}
          )
          RETURNING position, points, wins, countback_details
        `;

        expect(result.position).toBe(1);
        expect(result.points).toBe("312.500");
        expect(result.wins).toBe(8);
        expect(JSON.parse(String(result.countback_details))).toEqual({
          finishes: { "1": 8, "2": 3, "3": 1 },
        });

        throw rollback;
      }),
    ).rejects.toBe(rollback);
  });

  it("stores a constructor's final classification with exact totals", async () => {
    const rollback = new Error("rollback constructor championship result fixture");

    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedChampionshipResultDependencies(
          transaction,
          fixtureSuffix,
        );
        const [result] = await transaction<
          { season_year: number; position: number; points: string; wins: number }[]
        >`
          INSERT INTO constructor_championship_results (
            season_year,
            constructor_id,
            position,
            points,
            wins,
            import_run_id
          )
          VALUES (
            2083,
            ${dependencies.constructorOneId},
            1,
            612.5,
            12,
            ${dependencies.importRunId}
          )
          RETURNING season_year, position, points, wins
        `;

        expect(result).toEqual({
          season_year: 2083,
          position: 1,
          points: "612.500",
          wins: 12,
        });

        throw rollback;
      }),
    ).rejects.toBe(rollback);
  });

  it("prevents duplicate entrants within a final season classification", async () => {
    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedChampionshipResultDependencies(
          transaction,
          fixtureSuffix,
        );

        await transaction`
          INSERT INTO driver_championship_results (season_year, driver_id, position)
          VALUES (2083, ${dependencies.driverOneId}, 1)
        `;
        return transaction`
          INSERT INTO driver_championship_results (season_year, driver_id, position)
          VALUES (2083, ${dependencies.driverOneId}, 2)
        `;
      }),
    ).rejects.toMatchObject({ code: "23505" });

    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedChampionshipResultDependencies(
          transaction,
          fixtureSuffix,
        );

        await transaction`
          INSERT INTO constructor_championship_results (
            season_year,
            constructor_id,
            position
          )
          VALUES (2083, ${dependencies.constructorOneId}, 1)
        `;
        return transaction`
          INSERT INTO constructor_championship_results (
            season_year,
            constructor_id,
            position
          )
          VALUES (2083, ${dependencies.constructorOneId}, 2)
        `;
      }),
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("prevents duplicate imported source records", async () => {
    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedChampionshipResultDependencies(
          transaction,
          fixtureSuffix,
        );
        const sourceIdentifier = `duplicate-driver-final-${fixtureSuffix}`;

        await transaction`
          INSERT INTO driver_championship_results (
            season_year,
            driver_id,
            position,
            source,
            source_identifier
          )
          VALUES (2083, ${dependencies.driverOneId}, 1, 'jolpica', ${sourceIdentifier})
        `;
        return transaction`
          INSERT INTO driver_championship_results (
            season_year,
            driver_id,
            position,
            source,
            source_identifier
          )
          VALUES (2083, ${dependencies.driverTwoId}, 2, 'jolpica', ${sourceIdentifier})
        `;
      }),
    ).rejects.toMatchObject({ code: "23505" });

    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedChampionshipResultDependencies(
          transaction,
          fixtureSuffix,
        );
        const sourceIdentifier = `duplicate-constructor-final-${fixtureSuffix}`;

        await transaction`
          INSERT INTO constructor_championship_results (
            season_year,
            constructor_id,
            position,
            source,
            source_identifier
          )
          VALUES (2083, ${dependencies.constructorOneId}, 1, 'jolpica', ${sourceIdentifier})
        `;
        return transaction`
          INSERT INTO constructor_championship_results (
            season_year,
            constructor_id,
            position,
            source,
            source_identifier
          )
          VALUES (2083, ${dependencies.constructorTwoId}, 2, 'jolpica', ${sourceIdentifier})
        `;
      }),
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("rejects invalid driver championship positions, points, and win totals", async () => {
    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedChampionshipResultDependencies(
          transaction,
          fixtureSuffix,
        );

        return transaction`
          INSERT INTO driver_championship_results (
            season_year,
            driver_id,
            position,
            points,
            wins
          )
          VALUES (2083, ${dependencies.driverOneId}, 0, -0.001, -1)
        `;
      }),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("rejects invalid constructor championship positions, points, and win totals", async () => {
    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedChampionshipResultDependencies(
          transaction,
          fixtureSuffix,
        );

        return transaction`
          INSERT INTO constructor_championship_results (
            season_year,
            constructor_id,
            position,
            points,
            wins
          )
          VALUES (2083, ${dependencies.constructorOneId}, 0, -0.001, -1)
        `;
      }),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("requires paired provenance fields for both final-result tables", async () => {
    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedChampionshipResultDependencies(
          transaction,
          fixtureSuffix,
        );

        return transaction`
          INSERT INTO driver_championship_results (
            season_year,
            driver_id,
            position,
            source
          )
          VALUES (2083, ${dependencies.driverOneId}, 1, 'jolpica')
        `;
      }),
    ).rejects.toMatchObject({ code: "23514" });

    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedChampionshipResultDependencies(
          transaction,
          fixtureSuffix,
        );

        return transaction`
          INSERT INTO constructor_championship_results (
            season_year,
            constructor_id,
            position,
            source_identifier
          )
          VALUES (
            2083,
            ${dependencies.constructorOneId},
            1,
            ${`constructor-final-${fixtureSuffix}`}
          )
        `;
      }),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("requires valid season, entrant, and import-run references", async () => {
    await expect(
      database`
        INSERT INTO driver_championship_results (
          season_year,
          driver_id,
          position,
          import_run_id
        )
        VALUES (9999, 999999999, 1, 999999999)
      `,
    ).rejects.toMatchObject({ code: "23503" });

    await expect(
      database`
        INSERT INTO constructor_championship_results (
          season_year,
          constructor_id,
          position,
          import_run_id
        )
        VALUES (9999, 999999999, 1, 999999999)
      `,
    ).rejects.toMatchObject({ code: "23503" });
  });
});
