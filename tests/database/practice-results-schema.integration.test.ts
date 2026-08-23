import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { getDatabaseUrl } from "../../src/lib/database/config";

const database = postgres(getDatabaseUrl(), {
  max: 1,
  onnotice: () => undefined,
});
const fixtureSuffix = Date.now().toString();

const seedPracticeResultDependencies = async (
  transaction: postgres.TransactionSql,
  suffix: string,
) => {
  await transaction`
    INSERT INTO seasons (year, championship_name, rounds)
    VALUES (2085, 'Practice result integration championship', 1)
  `;
  const [country] = await transaction<{ id: number }[]>`
    INSERT INTO countries (iso_alpha2, iso_alpha3, name)
    VALUES ('IT', 'ITA', ${`Italy ${suffix}`})
    RETURNING id
  `;
  const [circuit] = await transaction<{ id: number }[]>`
    INSERT INTO circuits (slug, name, country_id)
    VALUES (${`practice-circuit-${suffix}`}, 'Practice Circuit', ${country.id})
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
    VALUES (${circuit.id}, 'grand-prix', 'Grand Prix Circuit', 2085, 2085)
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
      ${`practice-format-${suffix}`},
      'Standard weekend',
      false,
      ${JSON.stringify(["practice_1", "practice_2", "practice_3", "qualifying", "race"])}::jsonb,
      2085,
      2085
    )
    RETURNING id
  `;
  const [practiceType] = await transaction<{ id: number }[]>`
    INSERT INTO session_types (code, name, sequence, is_championship_scoring)
    VALUES (${`practice-session-${suffix}`}, 'Practice 1', 1, false)
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
      2085,
      1,
      ${`practice-grand-prix-${suffix}`},
      'Practice Grand Prix',
      ${configuration.id},
      ${raceFormat.id},
      '2085-09-01',
      '2085-09-03',
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
      completed_laps
    )
    VALUES (
      ${race.id},
      ${practiceType.id},
      1,
      '2085-09-01T11:00:00Z',
      '2085-09-01T12:00:00Z',
      'completed',
      62
    )
    RETURNING id
  `;
  const [driverOne] = await transaction<{ id: number }[]>`
    INSERT INTO drivers (slug, given_name, family_name, nationality_country_id)
    VALUES (${`practice-driver-one-${suffix}`}, 'First', 'Driver', ${country.id})
    RETURNING id
  `;
  const [driverTwo] = await transaction<{ id: number }[]>`
    INSERT INTO drivers (slug, given_name, family_name, nationality_country_id)
    VALUES (${`practice-driver-two-${suffix}`}, 'Second', 'Driver', ${country.id})
    RETURNING id
  `;
  const [constructorOne] = await transaction<{ id: number }[]>`
    INSERT INTO constructors (slug, name, nationality_country_id)
    VALUES (${`practice-constructor-one-${suffix}`}, 'First Constructor', ${country.id})
    RETURNING id
  `;
  const [constructorTwo] = await transaction<{ id: number }[]>`
    INSERT INTO constructors (slug, name, nationality_country_id)
    VALUES (${`practice-constructor-two-${suffix}`}, 'Second Constructor', ${country.id})
    RETURNING id
  `;
  const [statusCode] = await transaction<{ id: number }[]>`
    INSERT INTO status_codes (code, description, category, is_classified)
    VALUES (${`practice-no-time-${suffix}`}, 'No representative time', 'not_classified', false)
    RETURNING id
  `;
  const [importRun] = await transaction<{ id: number }[]>`
    INSERT INTO import_runs (source, scope, status, completed_at, records_processed)
    VALUES ('fastf1', ${`practice-result-${suffix}`}, 'succeeded', now(), 2)
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

describe("practice results schema migration", () => {
  it("stores a complete timed practice classification", async () => {
    const rollback = new Error("rollback practice result fixture");

    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedPracticeResultDependencies(
          transaction,
          fixtureSuffix,
        );
        const [result] = await transaction<
          {
            classification_position: number;
            best_lap_time_ms: number;
            gap_to_leader_ms: number;
            source: string;
          }[]
        >`
          INSERT INTO practice_results (
            session_id,
            driver_id,
            constructor_id,
            classification_position,
            best_lap_time_ms,
            best_lap_number,
            gap_to_leader_ms,
            laps_completed,
            import_run_id,
            source,
            source_identifier
          )
          VALUES (
            ${dependencies.sessionId},
            ${dependencies.driverOneId},
            ${dependencies.constructorOneId},
            1,
            81234,
            18,
            0,
            31,
            ${dependencies.importRunId},
            'fastf1',
            ${`practice-1-${fixtureSuffix}`}
          )
          RETURNING classification_position, best_lap_time_ms, gap_to_leader_ms, source
        `;

        expect(result).toEqual({
          classification_position: 1,
          best_lap_time_ms: 81234,
          gap_to_leader_ms: 0,
          source: "fastf1",
        });

        throw rollback;
      }),
    ).rejects.toBe(rollback);
  });

  it("stores a positive leader gap for a slower classified driver", async () => {
    const rollback = new Error("rollback practice gap fixture");

    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedPracticeResultDependencies(
          transaction,
          fixtureSuffix,
        );
        const [result] = await transaction<
          { classification_position: number; gap_to_leader_ms: number }[]
        >`
          INSERT INTO practice_results (
            session_id,
            driver_id,
            constructor_id,
            classification_position,
            best_lap_time_ms,
            best_lap_number,
            gap_to_leader_ms,
            laps_completed
          )
          VALUES (
            ${dependencies.sessionId},
            ${dependencies.driverTwoId},
            ${dependencies.constructorTwoId},
            2,
            81567,
            21,
            333,
            30
          )
          RETURNING classification_position, gap_to_leader_ms
        `;

        expect(result).toEqual({
          classification_position: 2,
          gap_to_leader_ms: 333,
        });

        throw rollback;
      }),
    ).rejects.toBe(rollback);
  });

  it("preserves a no-time entry without inventing lap data", async () => {
    const rollback = new Error("rollback unavailable practice fixture");

    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedPracticeResultDependencies(
          transaction,
          fixtureSuffix,
        );
        const [result] = await transaction<
          {
            classification_position: null;
            best_lap_time_ms: null;
            best_lap_number: null;
            gap_to_leader_ms: null;
            laps_completed: number;
          }[]
        >`
          INSERT INTO practice_results (
            session_id,
            driver_id,
            constructor_id,
            status_code_id,
            laps_completed,
            notes
          )
          VALUES (
            ${dependencies.sessionId},
            ${dependencies.driverOneId},
            ${dependencies.constructorOneId},
            ${dependencies.statusCodeId},
            0,
            'Installation issue prevented a representative lap'
          )
          RETURNING
            classification_position,
            best_lap_time_ms,
            best_lap_number,
            gap_to_leader_ms,
            laps_completed
        `;

        expect(result).toEqual({
          classification_position: null,
          best_lap_time_ms: null,
          best_lap_number: null,
          gap_to_leader_ms: null,
          laps_completed: 0,
        });

        throw rollback;
      }),
    ).rejects.toBe(rollback);
  });

  it("prevents duplicate drivers in one practice classification", async () => {
    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedPracticeResultDependencies(
          transaction,
          fixtureSuffix,
        );

        await transaction`
          INSERT INTO practice_results (session_id, driver_id, constructor_id)
          VALUES (
            ${dependencies.sessionId},
            ${dependencies.driverOneId},
            ${dependencies.constructorOneId}
          )
        `;
        return transaction`
          INSERT INTO practice_results (session_id, driver_id, constructor_id)
          VALUES (
            ${dependencies.sessionId},
            ${dependencies.driverOneId},
            ${dependencies.constructorTwoId}
          )
        `;
      }),
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("prevents duplicate source records", async () => {
    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedPracticeResultDependencies(
          transaction,
          fixtureSuffix,
        );
        const sourceIdentifier = `duplicate-practice-${fixtureSuffix}`;

        await transaction`
          INSERT INTO practice_results (
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
            'fastf1',
            ${sourceIdentifier}
          )
        `;
        return transaction`
          INSERT INTO practice_results (
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
            'fastf1',
            ${sourceIdentifier}
          )
        `;
      }),
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("rejects invalid positions, lap data, gaps, and lap counts", async () => {
    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedPracticeResultDependencies(
          transaction,
          fixtureSuffix,
        );

        return transaction`
          INSERT INTO practice_results (
            session_id,
            driver_id,
            constructor_id,
            classification_position,
            best_lap_time_ms,
            best_lap_number,
            gap_to_leader_ms,
            laps_completed
          )
          VALUES (
            ${dependencies.sessionId},
            ${dependencies.driverOneId},
            ${dependencies.constructorOneId},
            0,
            0,
            0,
            -1,
            -1
          )
        `;
      }),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("requires a best-lap time before storing its lap number", async () => {
    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedPracticeResultDependencies(
          transaction,
          fixtureSuffix,
        );

        return transaction`
          INSERT INTO practice_results (
            session_id,
            driver_id,
            constructor_id,
            best_lap_number
          )
          VALUES (
            ${dependencies.sessionId},
            ${dependencies.driverOneId},
            ${dependencies.constructorOneId},
            12
          )
        `;
      }),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("requires a best-lap time before storing a leader gap", async () => {
    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedPracticeResultDependencies(
          transaction,
          fixtureSuffix,
        );

        return transaction`
          INSERT INTO practice_results (
            session_id,
            driver_id,
            constructor_id,
            gap_to_leader_ms
          )
          VALUES (
            ${dependencies.sessionId},
            ${dependencies.driverOneId},
            ${dependencies.constructorOneId},
            250
          )
        `;
      }),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("requires source fields to be supplied together", async () => {
    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedPracticeResultDependencies(
          transaction,
          fixtureSuffix,
        );

        return transaction`
          INSERT INTO practice_results (
            session_id,
            driver_id,
            constructor_id,
            source
          )
          VALUES (
            ${dependencies.sessionId},
            ${dependencies.driverOneId},
            ${dependencies.constructorOneId},
            'fastf1'
          )
        `;
      }),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("requires valid session, driver, constructor, status, and import references", async () => {
    await expect(
      database`
        INSERT INTO practice_results (
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
