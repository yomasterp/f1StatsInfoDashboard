import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { getDatabaseUrl } from "../../src/lib/database/config";

const database = postgres(getDatabaseUrl(), {
  max: 1,
  onnotice: () => undefined,
});
const fixtureSuffix = Date.now().toString();

const seedSprintResultDependencies = async (
  transaction: postgres.TransactionSql,
  suffix: string,
) => {
  await transaction`
    INSERT INTO seasons (year, championship_name, rounds)
    VALUES (2086, 'Sprint result integration championship', 1)
  `;
  const [country] = await transaction<{ id: number }[]>`
    INSERT INTO countries (iso_alpha2, iso_alpha3, name)
    VALUES ('BR', 'BRA', ${`Brazil ${suffix}`})
    RETURNING id
  `;
  const [circuit] = await transaction<{ id: number }[]>`
    INSERT INTO circuits (slug, name, country_id)
    VALUES (${`sprint-circuit-${suffix}`}, 'Sprint Circuit', ${country.id})
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
    VALUES (${circuit.id}, 'grand-prix', 'Grand Prix Circuit', 2086, 2086)
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
      ${`sprint-format-${suffix}`},
      'Sprint weekend',
      true,
      ${JSON.stringify(["qualifying", "sprint", "race"])}::jsonb,
      2086,
      2086
    )
    RETURNING id
  `;
  const [sprintType] = await transaction<{ id: number }[]>`
    INSERT INTO session_types (code, name, sequence, is_championship_scoring)
    VALUES (${`sprint-session-${suffix}`}, 'Sprint', 2, true)
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
      2086,
      1,
      ${`sprint-grand-prix-${suffix}`},
      'Sprint Grand Prix',
      ${configuration.id},
      ${raceFormat.id},
      '2086-11-01',
      '2086-11-03',
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
      ${sprintType.id},
      2,
      '2086-11-02T14:00:00Z',
      '2086-11-02T14:35:00Z',
      'completed',
      24,
      24
    )
    RETURNING id
  `;
  const [driverOne] = await transaction<{ id: number }[]>`
    INSERT INTO drivers (slug, given_name, family_name, nationality_country_id)
    VALUES (${`sprint-driver-one-${suffix}`}, 'First', 'Driver', ${country.id})
    RETURNING id
  `;
  const [driverTwo] = await transaction<{ id: number }[]>`
    INSERT INTO drivers (slug, given_name, family_name, nationality_country_id)
    VALUES (${`sprint-driver-two-${suffix}`}, 'Second', 'Driver', ${country.id})
    RETURNING id
  `;
  const [constructorOne] = await transaction<{ id: number }[]>`
    INSERT INTO constructors (slug, name, nationality_country_id)
    VALUES (${`sprint-constructor-one-${suffix}`}, 'First Constructor', ${country.id})
    RETURNING id
  `;
  const [constructorTwo] = await transaction<{ id: number }[]>`
    INSERT INTO constructors (slug, name, nationality_country_id)
    VALUES (${`sprint-constructor-two-${suffix}`}, 'Second Constructor', ${country.id})
    RETURNING id
  `;
  const [statusCode] = await transaction<{ id: number }[]>`
    INSERT INTO status_codes (code, description, category, is_classified)
    VALUES (${`sprint-finished-${suffix}`}, 'Finished', 'classified', true)
    RETURNING id
  `;
  const [retiredStatusCode] = await transaction<{ id: number }[]>`
    INSERT INTO status_codes (code, description, category, is_classified)
    VALUES (${`sprint-retired-${suffix}`}, 'Retired', 'retired', false)
    RETURNING id
  `;
  const [importRun] = await transaction<{ id: number }[]>`
    INSERT INTO import_runs (source, scope, status, completed_at, records_processed)
    VALUES ('jolpica', ${`sprint-result-${suffix}`}, 'succeeded', now(), 2)
    RETURNING id
  `;

  return {
    constructorOneId: constructorOne.id,
    constructorTwoId: constructorTwo.id,
    driverOneId: driverOne.id,
    driverTwoId: driverTwo.id,
    importRunId: importRun.id,
    sessionId: session.id,
    retiredStatusCodeId: retiredStatusCode.id,
    statusCodeId: statusCode.id,
  };
};

afterAll(async () => {
  await database.end({ timeout: 5 });
});

describe("sprint results schema migration", () => {
  it("stores a complete classified sprint result", async () => {
    const rollback = new Error("rollback sprint result fixture");

    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedSprintResultDependencies(
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
          INSERT INTO sprint_results (
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
            8,
            24,
            2100000,
            1,
            18,
            71234,
            221.456,
            false,
            ${dependencies.importRunId},
            'jolpica',
            ${`sprint-1-${fixtureSuffix}`}
          )
          RETURNING points, fastest_lap_awarded, source
        `;

        expect(result).toEqual({
          points: "8.000",
          fastest_lap_awarded: false,
          source: "jolpica",
        });

        throw rollback;
      }),
    ).rejects.toBe(rollback);
  });

  it("supports earlier and later sprint scoring values without a hard-coded cap", async () => {
    const rollback = new Error("rollback evolving sprint points fixture");

    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedSprintResultDependencies(
          transaction,
          fixtureSuffix,
        );
        const results = await transaction<{ points: string }[]>`
          INSERT INTO sprint_results (
            session_id,
            driver_id,
            constructor_id,
            status_code_id,
            classified_position,
            points
          )
          VALUES
            (
              ${dependencies.sessionId},
              ${dependencies.driverOneId},
              ${dependencies.constructorOneId},
              ${dependencies.statusCodeId},
              1,
              3
            ),
            (
              ${dependencies.sessionId},
              ${dependencies.driverTwoId},
              ${dependencies.constructorTwoId},
              ${dependencies.statusCodeId},
              2,
              7
            )
          RETURNING points
        `;

        expect(results.map((result) => result.points)).toEqual(["3.000", "7.000"]);

        throw rollback;
      }),
    ).rejects.toBe(rollback);
  });

  it("supports an unclassified sprint entry with unavailable timing", async () => {
    const rollback = new Error("rollback incomplete sprint fixture");

    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedSprintResultDependencies(
          transaction,
          fixtureSuffix,
        );
        const [result] = await transaction<
          {
            finish_position: null;
            classified_position: null;
            elapsed_time_ms: null;
            points: string;
          }[]
        >`
          INSERT INTO sprint_results (
            session_id,
            driver_id,
            constructor_id,
            status_code_id,
            grid_position,
            laps_completed
          )
          VALUES (
            ${dependencies.sessionId},
            ${dependencies.driverOneId},
            ${dependencies.constructorOneId},
            ${dependencies.retiredStatusCodeId},
            0,
            0
          )
          RETURNING finish_position, classified_position, elapsed_time_ms, points
        `;

        expect(result).toEqual({
          finish_position: null,
          classified_position: null,
          elapsed_time_ms: null,
          points: "0.000",
        });

        throw rollback;
      }),
    ).rejects.toBe(rollback);
  });

  it("prevents duplicate drivers in one sprint classification", async () => {
    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedSprintResultDependencies(
          transaction,
          fixtureSuffix,
        );

        await transaction`
          INSERT INTO sprint_results (
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
          INSERT INTO sprint_results (
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
        const dependencies = await seedSprintResultDependencies(
          transaction,
          fixtureSuffix,
        );
        const sourceIdentifier = `duplicate-sprint-${fixtureSuffix}`;

        await transaction`
          INSERT INTO sprint_results (
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
          INSERT INTO sprint_results (
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

  it("rejects invalid positions, points, laps, and timing measurements", async () => {
    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedSprintResultDependencies(
          transaction,
          fixtureSuffix,
        );

        return transaction`
          INSERT INTO sprint_results (
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
        const dependencies = await seedSprintResultDependencies(
          transaction,
          fixtureSuffix,
        );

        return transaction`
          INSERT INTO sprint_results (
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

  it("requires valid session, driver, constructor, status, and import references", async () => {
    await expect(
      database`
        INSERT INTO sprint_results (
          session_id,
          driver_id,
          constructor_id,
          status_code_id,
          import_run_id
        )
        VALUES (999999999, 999999999, 999999999, 999999999, 999999999)
      `,
    ).rejects.toMatchObject({ code: "23503" });
  });
});
