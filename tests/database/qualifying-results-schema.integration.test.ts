import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { getDatabaseUrl } from "../../src/lib/database/config";

const database = postgres(getDatabaseUrl(), {
  max: 1,
  onnotice: () => undefined,
});
const fixtureSuffix = Date.now().toString();

const seedQualifyingResultDependencies = async (
  transaction: postgres.TransactionSql,
  suffix: string,
) => {
  await transaction`
    INSERT INTO seasons (year, championship_name, rounds)
    VALUES (2088, 'Qualifying result integration championship', 1)
  `;
  const [country] = await transaction<{ id: number }[]>`
    INSERT INTO countries (iso_alpha2, iso_alpha3, name)
    VALUES ('DE', 'DEU', ${`Germany ${suffix}`})
    RETURNING id
  `;
  const [circuit] = await transaction<{ id: number }[]>`
    INSERT INTO circuits (slug, name, country_id)
    VALUES (${`qualifying-circuit-${suffix}`}, 'Qualifying Circuit', ${country.id})
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
    VALUES (${circuit.id}, 'grand-prix', 'Grand Prix Circuit', 2088, 2088)
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
      ${`qualifying-format-${suffix}`},
      'Standard weekend',
      false,
      ${JSON.stringify(["qualifying", "race"])}::jsonb,
      2088,
      2088
    )
    RETURNING id
  `;
  const [qualifyingType] = await transaction<{ id: number }[]>`
    INSERT INTO session_types (code, name, sequence, is_championship_scoring)
    VALUES (${`qualifying-session-${suffix}`}, 'Qualifying', 1, false)
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
      2088,
      1,
      ${`qualifying-grand-prix-${suffix}`},
      'Qualifying Grand Prix',
      ${configuration.id},
      ${raceFormat.id},
      '2088-05-01',
      '2088-05-03',
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
      status
    )
    VALUES (
      ${race.id},
      ${qualifyingType.id},
      1,
      '2088-05-02T14:00:00Z',
      '2088-05-02T15:00:00Z',
      'completed'
    )
    RETURNING id
  `;
  const [driverOne] = await transaction<{ id: number }[]>`
    INSERT INTO drivers (slug, given_name, family_name, nationality_country_id)
    VALUES (${`qualifying-driver-one-${suffix}`}, 'First', 'Driver', ${country.id})
    RETURNING id
  `;
  const [driverTwo] = await transaction<{ id: number }[]>`
    INSERT INTO drivers (slug, given_name, family_name, nationality_country_id)
    VALUES (${`qualifying-driver-two-${suffix}`}, 'Second', 'Driver', ${country.id})
    RETURNING id
  `;
  const [constructorOne] = await transaction<{ id: number }[]>`
    INSERT INTO constructors (slug, name, nationality_country_id)
    VALUES (
      ${`qualifying-constructor-one-${suffix}`},
      'First Constructor',
      ${country.id}
    )
    RETURNING id
  `;
  const [constructorTwo] = await transaction<{ id: number }[]>`
    INSERT INTO constructors (slug, name, nationality_country_id)
    VALUES (
      ${`qualifying-constructor-two-${suffix}`},
      'Second Constructor',
      ${country.id}
    )
    RETURNING id
  `;
  const [statusCode] = await transaction<{ id: number }[]>`
    INSERT INTO status_codes (code, description, category, is_classified)
    VALUES (${`qualifying-no-time-${suffix}`}, 'No time', 'not_classified', false)
    RETURNING id
  `;
  const [importRun] = await transaction<{ id: number }[]>`
    INSERT INTO import_runs (source, scope, status, completed_at, records_processed)
    VALUES ('jolpica', ${`qualifying-result-${suffix}`}, 'succeeded', now(), 2)
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

describe("qualifying results schema migration", () => {
  it("stores phase times separately from qualifying and final grid positions", async () => {
    const rollback = new Error("rollback qualifying result fixture");

    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedQualifyingResultDependencies(
          transaction,
          fixtureSuffix,
        );
        const [result] = await transaction<
          {
            qualifying_position: number;
            final_grid_position: number;
            q3_time_ms: number;
            source: string;
          }[]
        >`
          INSERT INTO qualifying_results (
            session_id,
            driver_id,
            constructor_id,
            qualifying_position,
            final_grid_position,
            q1_time_ms,
            q2_time_ms,
            q3_time_ms,
            import_run_id,
            source,
            source_identifier,
            notes
          )
          VALUES (
            ${dependencies.sessionId},
            ${dependencies.driverOneId},
            ${dependencies.constructorOneId},
            1,
            4,
            81234,
            80123,
            79567,
            ${dependencies.importRunId},
            'jolpica',
            ${`qualifying-1-${fixtureSuffix}`},
            'Three-place grid penalty'
          )
          RETURNING qualifying_position, final_grid_position, q3_time_ms, source
        `;

        expect(result).toEqual({
          qualifying_position: 1,
          final_grid_position: 4,
          q3_time_ms: 79567,
          source: "jolpica",
        });

        throw rollback;
      }),
    ).rejects.toBe(rollback);
  });

  it("supports a historical single-period result with no final grid value", async () => {
    const rollback = new Error("rollback historical qualifying fixture");

    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedQualifyingResultDependencies(
          transaction,
          fixtureSuffix,
        );
        const [result] = await transaction<
          { q1_time_ms: number; q2_time_ms: null; final_grid_position: null }[]
        >`
          INSERT INTO qualifying_results (
            session_id,
            driver_id,
            constructor_id,
            qualifying_position,
            q1_time_ms
          )
          VALUES (
            ${dependencies.sessionId},
            ${dependencies.driverOneId},
            ${dependencies.constructorOneId},
            2,
            90500
          )
          RETURNING q1_time_ms, q2_time_ms, final_grid_position
        `;

        expect(result).toEqual({
          q1_time_ms: 90500,
          q2_time_ms: null,
          final_grid_position: null,
        });

        throw rollback;
      }),
    ).rejects.toBe(rollback);
  });

  it("prevents duplicate drivers in one qualifying classification", async () => {
    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedQualifyingResultDependencies(
          transaction,
          fixtureSuffix,
        );

        await transaction`
          INSERT INTO qualifying_results (
            session_id,
            driver_id,
            constructor_id,
            qualifying_position
          )
          VALUES (
            ${dependencies.sessionId},
            ${dependencies.driverOneId},
            ${dependencies.constructorOneId},
            1
          )
        `;
        return transaction`
          INSERT INTO qualifying_results (
            session_id,
            driver_id,
            constructor_id,
            qualifying_position
          )
          VALUES (
            ${dependencies.sessionId},
            ${dependencies.driverOneId},
            ${dependencies.constructorTwoId},
            2
          )
        `;
      }),
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("prevents duplicate source records", async () => {
    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedQualifyingResultDependencies(
          transaction,
          fixtureSuffix,
        );
        const sourceIdentifier = `duplicate-qualifying-${fixtureSuffix}`;

        await transaction`
          INSERT INTO qualifying_results (
            session_id,
            driver_id,
            constructor_id,
            source,
            source_identifier
          )
          VALUES (
            ${dependencies.sessionId},
            ${dependencies.driverOneId},
            ${dependencies.constructorOneId},
            'jolpica',
            ${sourceIdentifier}
          )
        `;
        return transaction`
          INSERT INTO qualifying_results (
            session_id,
            driver_id,
            constructor_id,
            source,
            source_identifier
          )
          VALUES (
            ${dependencies.sessionId},
            ${dependencies.driverTwoId},
            ${dependencies.constructorTwoId},
            'jolpica',
            ${sourceIdentifier}
          )
        `;
      }),
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("rejects invalid positions and phase times", async () => {
    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedQualifyingResultDependencies(
          transaction,
          fixtureSuffix,
        );

        return transaction`
          INSERT INTO qualifying_results (
            session_id,
            driver_id,
            constructor_id,
            qualifying_position,
            final_grid_position,
            q1_time_ms
          )
          VALUES (
            ${dependencies.sessionId},
            ${dependencies.driverOneId},
            ${dependencies.constructorOneId},
            0,
            -1,
            0
          )
        `;
      }),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("requires sequential knockout phase times", async () => {
    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedQualifyingResultDependencies(
          transaction,
          fixtureSuffix,
        );

        return transaction`
          INSERT INTO qualifying_results (
            session_id,
            driver_id,
            constructor_id,
            q1_time_ms,
            q3_time_ms
          )
          VALUES (
            ${dependencies.sessionId},
            ${dependencies.driverOneId},
            ${dependencies.constructorOneId},
            81234,
            79567
          )
        `;
      }),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("requires source fields to be supplied together", async () => {
    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedQualifyingResultDependencies(
          transaction,
          fixtureSuffix,
        );

        return transaction`
          INSERT INTO qualifying_results (
            session_id,
            driver_id,
            constructor_id,
            source
          )
          VALUES (
            ${dependencies.sessionId},
            ${dependencies.driverOneId},
            ${dependencies.constructorOneId},
            'jolpica'
          )
        `;
      }),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("requires valid session, driver, constructor, status, and import references", async () => {
    await expect(
      database`
        INSERT INTO qualifying_results (
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
