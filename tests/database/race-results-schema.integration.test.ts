import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { getDatabaseUrl } from "../../src/lib/database/config";

const database = postgres(getDatabaseUrl(), {
  max: 1,
  onnotice: () => undefined,
});
const fixtureSuffix = Date.now().toString();

const seedRaceResultDependencies = async (
  transaction: postgres.TransactionSql,
  suffix: string,
) => {
  await transaction`
    INSERT INTO seasons (year, championship_name, rounds)
    VALUES (2089, 'Race result integration championship', 1)
  `;
  const [country] = await transaction<{ id: number }[]>`
    INSERT INTO countries (iso_alpha2, iso_alpha3, name)
    VALUES ('AU', 'AUS', ${`Australia ${suffix}`})
    RETURNING id
  `;
  const [circuit] = await transaction<{ id: number }[]>`
    INSERT INTO circuits (slug, name, country_id)
    VALUES (${`result-circuit-${suffix}`}, 'Result Circuit', ${country.id})
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
    VALUES (${circuit.id}, 'grand-prix', 'Grand Prix Circuit', 2089, 2089)
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
      ${`result-format-${suffix}`},
      'Standard weekend',
      false,
      ${JSON.stringify(["qualifying", "race"])}::jsonb,
      2089,
      2089
    )
    RETURNING id
  `;
  const [raceType] = await transaction<{ id: number }[]>`
    INSERT INTO session_types (code, name, sequence, is_championship_scoring)
    VALUES (${`result-race-${suffix}`}, 'Race', 1, true)
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
      2089,
      1,
      ${`result-grand-prix-${suffix}`},
      'Result Grand Prix',
      ${configuration.id},
      ${raceFormat.id},
      '2089-04-01',
      '2089-04-03',
      'completed'
    )
    RETURNING id
  `;
  const [session] = await transaction<{ id: number }[]>`
    INSERT INTO sessions (
      race_id,
      session_type_id,
      sequence,
      actual_start,
      completed_at,
      status,
      scheduled_laps,
      completed_laps
    )
    VALUES (
      ${race.id},
      ${raceType.id},
      1,
      '2089-04-03T05:00:00Z',
      '2089-04-03T06:30:00Z',
      'completed',
      58,
      58
    )
    RETURNING id
  `;
  const [driverOne] = await transaction<{ id: number }[]>`
    INSERT INTO drivers (slug, given_name, family_name, nationality_country_id)
    VALUES (${`result-driver-one-${suffix}`}, 'First', 'Driver', ${country.id})
    RETURNING id
  `;
  const [driverTwo] = await transaction<{ id: number }[]>`
    INSERT INTO drivers (slug, given_name, family_name, nationality_country_id)
    VALUES (${`result-driver-two-${suffix}`}, 'Second', 'Driver', ${country.id})
    RETURNING id
  `;
  const [constructorOne] = await transaction<{ id: number }[]>`
    INSERT INTO constructors (slug, name, nationality_country_id)
    VALUES (${`result-constructor-one-${suffix}`}, 'First Constructor', ${country.id})
    RETURNING id
  `;
  const [constructorTwo] = await transaction<{ id: number }[]>`
    INSERT INTO constructors (slug, name, nationality_country_id)
    VALUES (${`result-constructor-two-${suffix}`}, 'Second Constructor', ${country.id})
    RETURNING id
  `;
  const [statusCode] = await transaction<{ id: number }[]>`
    INSERT INTO status_codes (code, description, category, is_classified)
    VALUES (${`result-finished-${suffix}`}, 'Finished', 'classified', true)
    RETURNING id
  `;
  const [importRun] = await transaction<{ id: number }[]>`
    INSERT INTO import_runs (source, scope, status, completed_at, records_processed)
    VALUES ('jolpica', ${`race-result-${suffix}`}, 'succeeded', now(), 2)
    RETURNING id
  `;

  return {
    constructorOneId: constructorOne.id,
    constructorTwoId: constructorTwo.id,
    driverOneId: driverOne.id,
    driverTwoId: driverTwo.id,
    importRunId: importRun.id,
    sessionId: session.id,
    statusCodeId: statusCode.id,
  };
};

afterAll(async () => {
  await database.end({ timeout: 5 });
});

describe("race results schema migration", () => {
  it("stores a complete classified race result", async () => {
    const rollback = new Error("rollback race result fixture");

    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedRaceResultDependencies(
          transaction,
          fixtureSuffix,
        );
        const [result] = await transaction<
          {
            points: string;
            fastest_lap_awarded: boolean;
            source: string;
          }[]
        >`
          INSERT INTO race_results (
            session_id,
            driver_id,
            constructor_id,
            status_code_id,
            grid_position,
            finish_position,
            classified_position,
            points,
            laps_completed,
            elapsed_time_ms,
            fastest_lap_rank,
            fastest_lap_number,
            fastest_lap_time_ms,
            fastest_lap_average_speed_kph,
            fastest_lap_awarded,
            import_run_id,
            source,
            source_identifier
          )
          VALUES (
            ${dependencies.sessionId},
            ${dependencies.driverOneId},
            ${dependencies.constructorOneId},
            ${dependencies.statusCodeId},
            2,
            1,
            1,
            25.5,
            58,
            5412345,
            1,
            42,
            81234,
            234.567,
            true,
            ${dependencies.importRunId},
            'jolpica',
            ${`result-1-${fixtureSuffix}`}
          )
          RETURNING points, fastest_lap_awarded, source
        `;

        expect(result).toEqual({
          points: "25.500",
          fastest_lap_awarded: true,
          source: "jolpica",
        });

        throw rollback;
      }),
    ).rejects.toBe(rollback);
  });

  it("prevents duplicate drivers in one race classification", async () => {
    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedRaceResultDependencies(
          transaction,
          fixtureSuffix,
        );

        await transaction`
          INSERT INTO race_results (
            session_id,
            driver_id,
            constructor_id,
            status_code_id
          )
          VALUES (
            ${dependencies.sessionId},
            ${dependencies.driverOneId},
            ${dependencies.constructorOneId},
            ${dependencies.statusCodeId}
          )
        `;
        return transaction`
          INSERT INTO race_results (
            session_id,
            driver_id,
            constructor_id,
            status_code_id
          )
          VALUES (
            ${dependencies.sessionId},
            ${dependencies.driverOneId},
            ${dependencies.constructorTwoId},
            ${dependencies.statusCodeId}
          )
        `;
      }),
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("prevents duplicate source records", async () => {
    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedRaceResultDependencies(
          transaction,
          fixtureSuffix,
        );
        const sourceIdentifier = `duplicate-result-${fixtureSuffix}`;

        await transaction`
          INSERT INTO race_results (
            session_id,
            driver_id,
            constructor_id,
            status_code_id,
            source,
            source_identifier
          )
          VALUES (
            ${dependencies.sessionId},
            ${dependencies.driverOneId},
            ${dependencies.constructorOneId},
            ${dependencies.statusCodeId},
            'jolpica',
            ${sourceIdentifier}
          )
        `;
        return transaction`
          INSERT INTO race_results (
            session_id,
            driver_id,
            constructor_id,
            status_code_id,
            source,
            source_identifier
          )
          VALUES (
            ${dependencies.sessionId},
            ${dependencies.driverTwoId},
            ${dependencies.constructorTwoId},
            ${dependencies.statusCodeId},
            'jolpica',
            ${sourceIdentifier}
          )
        `;
      }),
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("rejects invalid positions and measurements", async () => {
    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedRaceResultDependencies(
          transaction,
          fixtureSuffix,
        );

        return transaction`
          INSERT INTO race_results (
            session_id,
            driver_id,
            constructor_id,
            status_code_id,
            grid_position,
            classified_position,
            points,
            laps_completed,
            fastest_lap_time_ms
          )
          VALUES (
            ${dependencies.sessionId},
            ${dependencies.driverOneId},
            ${dependencies.constructorOneId},
            ${dependencies.statusCodeId},
            -1,
            0,
            -0.5,
            -1,
            0
          )
        `;
      }),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("requires source fields to be supplied together", async () => {
    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedRaceResultDependencies(
          transaction,
          fixtureSuffix,
        );

        return transaction`
          INSERT INTO race_results (
            session_id,
            driver_id,
            constructor_id,
            status_code_id,
            source
          )
          VALUES (
            ${dependencies.sessionId},
            ${dependencies.driverOneId},
            ${dependencies.constructorOneId},
            ${dependencies.statusCodeId},
            'jolpica'
          )
        `;
      }),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("requires valid session, driver, constructor, and status references", async () => {
    await expect(
      database`
        INSERT INTO race_results (
          session_id,
          driver_id,
          constructor_id,
          status_code_id
        )
        VALUES (999999999, 999999999, 999999999, 999999999)
      `,
    ).rejects.toMatchObject({ code: "23503" });
  });
});
