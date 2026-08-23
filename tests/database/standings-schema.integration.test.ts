import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { getDatabaseUrl } from "../../src/lib/database/config";

const database = postgres(getDatabaseUrl(), {
  max: 1,
  onnotice: () => undefined,
});
const fixtureSuffix = Date.now().toString();

const seedStandingDependencies = async (
  transaction: postgres.TransactionSql,
  suffix: string,
) => {
  await transaction`
    INSERT INTO seasons (year, championship_name, rounds)
    VALUES (2084, 'Standings integration championship', 1)
  `;
  const [country] = await transaction<{ id: number }[]>`
    INSERT INTO countries (iso_alpha2, iso_alpha3, name)
    VALUES ('GB', 'GBR', ${`United Kingdom ${suffix}`})
    RETURNING id
  `;
  const [circuit] = await transaction<{ id: number }[]>`
    INSERT INTO circuits (slug, name, country_id)
    VALUES (${`standings-circuit-${suffix}`}, 'Standings Circuit', ${country.id})
    RETURNING id
  `;
  const [configuration] = await transaction<{ id: number }[]>`
    INSERT INTO circuit_configurations (
      circuit_id,
      code,
      name,
      effective_from_season,
      effective_to_season
    )
    VALUES (${circuit.id}, 'grand-prix', 'Grand Prix Circuit', 2084, 2084)
    RETURNING id
  `;
  const [raceFormat] = await transaction<{ id: number }[]>`
    INSERT INTO race_formats (
      code,
      name,
      has_sprint,
      schedule,
      effective_from_season,
      effective_to_season
    )
    VALUES (
      ${`standings-format-${suffix}`},
      'Sprint weekend',
      true,
      ${JSON.stringify(["sprint", "race"])}::jsonb,
      2084,
      2084
    )
    RETURNING id
  `;
  const [sprintType] = await transaction<{ id: number }[]>`
    INSERT INTO session_types (code, name, sequence, is_championship_scoring)
    VALUES (${`standings-sprint-${suffix}`}, 'Sprint', 1, true)
    RETURNING id
  `;
  const [raceType] = await transaction<{ id: number }[]>`
    INSERT INTO session_types (code, name, sequence, is_championship_scoring)
    VALUES (${`standings-race-${suffix}`}, 'Race', 2, true)
    RETURNING id
  `;
  const [race] = await transaction<{ id: number }[]>`
    INSERT INTO races (
      season_year,
      round,
      slug,
      official_name,
      circuit_configuration_id,
      race_format_id,
      weekend_start_date,
      weekend_end_date,
      status
    )
    VALUES (
      2084,
      1,
      ${`standings-grand-prix-${suffix}`},
      'Standings Grand Prix',
      ${configuration.id},
      ${raceFormat.id},
      '2084-05-01',
      '2084-05-03',
      'completed'
    )
    RETURNING id
  `;
  const [sprintSession] = await transaction<{ id: number }[]>`
    INSERT INTO sessions (
      race_id,
      session_type_id,
      sequence,
      actual_start,
      completed_at,
      status,
      completed_laps
    )
    VALUES (
      ${race.id},
      ${sprintType.id},
      1,
      '2084-05-02T11:00:00Z',
      '2084-05-02T12:00:00Z',
      'completed',
      19
    )
    RETURNING id
  `;
  const [raceSession] = await transaction<{ id: number }[]>`
    INSERT INTO sessions (
      race_id,
      session_type_id,
      sequence,
      actual_start,
      completed_at,
      status,
      completed_laps
    )
    VALUES (
      ${race.id},
      ${raceType.id},
      2,
      '2084-05-03T11:00:00Z',
      '2084-05-03T13:00:00Z',
      'completed',
      58
    )
    RETURNING id
  `;
  const [driverOne] = await transaction<{ id: number }[]>`
    INSERT INTO drivers (slug, given_name, family_name, nationality_country_id)
    VALUES (${`standings-driver-one-${suffix}`}, 'First', 'Driver', ${country.id})
    RETURNING id
  `;
  const [driverTwo] = await transaction<{ id: number }[]>`
    INSERT INTO drivers (slug, given_name, family_name, nationality_country_id)
    VALUES (${`standings-driver-two-${suffix}`}, 'Second', 'Driver', ${country.id})
    RETURNING id
  `;
  const [constructorOne] = await transaction<{ id: number }[]>`
    INSERT INTO constructors (slug, name, nationality_country_id)
    VALUES (${`standings-constructor-one-${suffix}`}, 'First Constructor', ${country.id})
    RETURNING id
  `;
  const [constructorTwo] = await transaction<{ id: number }[]>`
    INSERT INTO constructors (slug, name, nationality_country_id)
    VALUES (${`standings-constructor-two-${suffix}`}, 'Second Constructor', ${country.id})
    RETURNING id
  `;
  const [importRun] = await transaction<{ id: number }[]>`
    INSERT INTO import_runs (source, scope, status, completed_at, records_processed)
    VALUES ('jolpica', ${`standings-${suffix}`}, 'succeeded', now(), 4)
    RETURNING id
  `;

  return {
    constructorOneId: constructorOne.id,
    constructorTwoId: constructorTwo.id,
    driverOneId: driverOne.id,
    driverTwoId: driverTwo.id,
    importRunId: importRun.id,
    raceSessionId: raceSession.id,
    sprintSessionId: sprintSession.id,
  };
};

afterAll(async () => {
  await database.end({ timeout: 5 });
});

describe("driver and constructor standings schema migration", () => {
  it("stores a driver snapshot after each scoring session with countback evidence", async () => {
    const rollback = new Error("rollback driver standings fixture");

    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedStandingDependencies(
          transaction,
          fixtureSuffix,
        );
        const [sprintStanding] = await transaction<
          { points: string; wins: number; countback_details: unknown }[]
        >`
          INSERT INTO driver_standings (
            after_session_id,
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
            ${dependencies.sprintSessionId},
            ${dependencies.driverOneId},
            1,
            8,
            1,
            ${JSON.stringify({ finishes: { "1": 1, "2": 0 } })}::jsonb,
            ${dependencies.importRunId},
            'jolpica',
            ${`driver-sprint-${fixtureSuffix}`}
          )
          RETURNING points, wins, countback_details
        `;
        const [raceStanding] = await transaction<
          { after_session_id: number; points: string }[]
        >`
          INSERT INTO driver_standings (
            after_session_id,
            driver_id,
            position,
            points,
            wins
          )
          VALUES (
            ${dependencies.raceSessionId},
            ${dependencies.driverOneId},
            1,
            33,
            2
          )
          RETURNING after_session_id, points
        `;

        expect(sprintStanding.points).toBe("8.000");
        expect(sprintStanding.wins).toBe(1);
        expect(JSON.parse(String(sprintStanding.countback_details))).toEqual({
          finishes: { "1": 1, "2": 0 },
        });
        expect(raceStanding).toEqual({
          after_session_id: Number(dependencies.raceSessionId),
          points: "33.000",
        });

        throw rollback;
      }),
    ).rejects.toBe(rollback);
  });

  it("stores a constructor snapshot with exact points and countback evidence", async () => {
    const rollback = new Error("rollback constructor standings fixture");

    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedStandingDependencies(
          transaction,
          fixtureSuffix,
        );
        const [standing] = await transaction<
          { position: number; points: string; wins: number; source: string }[]
        >`
          INSERT INTO constructor_standings (
            after_session_id,
            constructor_id,
            position,
            points,
            wins,
            countback_details,
            import_run_id,
            source,
            source_identifier
          )
          VALUES (
            ${dependencies.raceSessionId},
            ${dependencies.constructorOneId},
            1,
            43.5,
            2,
            ${JSON.stringify({ finishes: { "1": 2, "2": 0 } })}::jsonb,
            ${dependencies.importRunId},
            'jolpica',
            ${`constructor-race-${fixtureSuffix}`}
          )
          RETURNING position, points, wins, source
        `;

        expect(standing).toEqual({
          position: 1,
          points: "43.500",
          wins: 2,
          source: "jolpica",
        });

        throw rollback;
      }),
    ).rejects.toBe(rollback);
  });

  it("prevents duplicate entrants in the same standings snapshot", async () => {
    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedStandingDependencies(
          transaction,
          fixtureSuffix,
        );

        await transaction`
          INSERT INTO driver_standings (after_session_id, driver_id, position)
          VALUES (${dependencies.raceSessionId}, ${dependencies.driverOneId}, 1)
        `;
        return transaction`
          INSERT INTO driver_standings (after_session_id, driver_id, position)
          VALUES (${dependencies.raceSessionId}, ${dependencies.driverOneId}, 2)
        `;
      }),
    ).rejects.toMatchObject({ code: "23505" });

    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedStandingDependencies(
          transaction,
          fixtureSuffix,
        );

        await transaction`
          INSERT INTO constructor_standings (
            after_session_id,
            constructor_id,
            position
          )
          VALUES (${dependencies.raceSessionId}, ${dependencies.constructorOneId}, 1)
        `;
        return transaction`
          INSERT INTO constructor_standings (
            after_session_id,
            constructor_id,
            position
          )
          VALUES (${dependencies.raceSessionId}, ${dependencies.constructorOneId}, 2)
        `;
      }),
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("prevents duplicate imported source records", async () => {
    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedStandingDependencies(
          transaction,
          fixtureSuffix,
        );
        const sourceIdentifier = `duplicate-driver-standing-${fixtureSuffix}`;

        await transaction`
          INSERT INTO driver_standings (
            after_session_id,
            driver_id,
            position,
            source,
            source_identifier
          )
          VALUES (
            ${dependencies.sprintSessionId},
            ${dependencies.driverOneId},
            1,
            'jolpica',
            ${sourceIdentifier}
          )
        `;
        return transaction`
          INSERT INTO driver_standings (
            after_session_id,
            driver_id,
            position,
            source,
            source_identifier
          )
          VALUES (
            ${dependencies.raceSessionId},
            ${dependencies.driverTwoId},
            2,
            'jolpica',
            ${sourceIdentifier}
          )
        `;
      }),
    ).rejects.toMatchObject({ code: "23505" });

    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedStandingDependencies(
          transaction,
          fixtureSuffix,
        );
        const sourceIdentifier = `duplicate-constructor-standing-${fixtureSuffix}`;

        await transaction`
          INSERT INTO constructor_standings (
            after_session_id,
            constructor_id,
            position,
            source,
            source_identifier
          )
          VALUES (
            ${dependencies.sprintSessionId},
            ${dependencies.constructorOneId},
            1,
            'jolpica',
            ${sourceIdentifier}
          )
        `;
        return transaction`
          INSERT INTO constructor_standings (
            after_session_id,
            constructor_id,
            position,
            source,
            source_identifier
          )
          VALUES (
            ${dependencies.raceSessionId},
            ${dependencies.constructorTwoId},
            2,
            'jolpica',
            ${sourceIdentifier}
          )
        `;
      }),
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("rejects invalid driver-standing positions, points, and win totals", async () => {
    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedStandingDependencies(
          transaction,
          fixtureSuffix,
        );

        return transaction`
          INSERT INTO driver_standings (
            after_session_id,
            driver_id,
            position,
            points,
            wins
          )
          VALUES (
            ${dependencies.raceSessionId},
            ${dependencies.driverOneId},
            0,
            -0.001,
            -1
          )
        `;
      }),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("rejects invalid constructor-standing positions, points, and win totals", async () => {
    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedStandingDependencies(
          transaction,
          fixtureSuffix,
        );

        return transaction`
          INSERT INTO constructor_standings (
            after_session_id,
            constructor_id,
            position,
            points,
            wins
          )
          VALUES (
            ${dependencies.raceSessionId},
            ${dependencies.constructorOneId},
            0,
            -0.001,
            -1
          )
        `;
      }),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("requires driver-standing provenance fields to be supplied together", async () => {
    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedStandingDependencies(
          transaction,
          fixtureSuffix,
        );

        return transaction`
          INSERT INTO driver_standings (
            after_session_id,
            driver_id,
            position,
            source
          )
          VALUES (
            ${dependencies.raceSessionId},
            ${dependencies.driverOneId},
            1,
            'jolpica'
          )
        `;
      }),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("requires constructor-standing provenance fields to be supplied together", async () => {
    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedStandingDependencies(
          transaction,
          fixtureSuffix,
        );

        return transaction`
          INSERT INTO constructor_standings (
            after_session_id,
            constructor_id,
            position,
            source_identifier
          )
          VALUES (
            ${dependencies.raceSessionId},
            ${dependencies.constructorOneId},
            1,
            ${`constructor-source-${fixtureSuffix}`}
          )
        `;
      }),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("requires valid session, entrant, and import-run references", async () => {
    await expect(
      database`
        INSERT INTO driver_standings (
          after_session_id,
          driver_id,
          position,
          import_run_id
        )
        VALUES (999999999, 999999999, 1, 999999999)
      `,
    ).rejects.toMatchObject({ code: "23503" });

    await expect(
      database`
        INSERT INTO constructor_standings (
          after_session_id,
          constructor_id,
          position,
          import_run_id
        )
        VALUES (999999999, 999999999, 1, 999999999)
      `,
    ).rejects.toMatchObject({ code: "23503" });
  });
});
