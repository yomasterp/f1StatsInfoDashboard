import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { getDatabaseUrl } from "../../src/lib/database/config";

const database = postgres(getDatabaseUrl(), {
  max: 1,
  onnotice: () => undefined,
});
const fixtureSuffix = Date.now().toString();

const seedLapTimeDependencies = async (
  transaction: postgres.TransactionSql,
  suffix: string,
) => {
  await transaction`
    INSERT INTO seasons (year, championship_name, rounds)
    VALUES (2082, 'Lap time integration championship', 1)
  `;
  const [country] = await transaction<{ id: number }[]>`
    INSERT INTO countries (iso_alpha2, iso_alpha3, name)
    VALUES ('ES', 'ESP', ${`Spain ${suffix}`})
    RETURNING id
  `;
  const [circuit] = await transaction<{ id: number }[]>`
    INSERT INTO circuits (slug, name, country_id)
    VALUES (${`lap-circuit-${suffix}`}, 'Lap Circuit', ${country.id})
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
    VALUES (${circuit.id}, 'grand-prix', 'Grand Prix Circuit', 2082, 2082)
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
      ${`lap-format-${suffix}`},
      'Standard weekend',
      false,
      ${JSON.stringify(["practice_1", "qualifying", "race"])}::jsonb,
      2082,
      2082
    )
    RETURNING id
  `;
  const [practiceType] = await transaction<{ id: number }[]>`
    INSERT INTO session_types (code, name, sequence, is_championship_scoring)
    VALUES (${`lap-practice-${suffix}`}, 'Practice 1', 1, false)
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
      2082,
      1,
      ${`lap-grand-prix-${suffix}`},
      'Lap Grand Prix',
      ${configuration.id},
      ${raceFormat.id},
      '2082-06-01',
      '2082-06-03',
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
      '2082-06-01T11:00:00Z',
      '2082-06-01T12:00:00Z',
      'completed',
      32
    )
    RETURNING id
  `;
  const [driverOne] = await transaction<{ id: number }[]>`
    INSERT INTO drivers (slug, given_name, family_name, nationality_country_id)
    VALUES (${`lap-driver-one-${suffix}`}, 'First', 'Driver', ${country.id})
    RETURNING id
  `;
  const [driverTwo] = await transaction<{ id: number }[]>`
    INSERT INTO drivers (slug, given_name, family_name, nationality_country_id)
    VALUES (${`lap-driver-two-${suffix}`}, 'Second', 'Driver', ${country.id})
    RETURNING id
  `;
  const [softCompound] = await transaction<{ id: number }[]>`
    INSERT INTO tire_compounds (code, name, is_slick, is_wet)
    VALUES (${`soft-${suffix}`}, 'Soft', true, false)
    RETURNING id
  `;
  const [importRun] = await transaction<{ id: number }[]>`
    INSERT INTO import_runs (source, scope, status, completed_at, records_processed)
    VALUES ('fastf1', ${`lap-times-${suffix}`}, 'succeeded', now(), 2)
    RETURNING id
  `;

  return {
    driverOneId: driverOne.id,
    driverTwoId: driverTwo.id,
    importRunId: importRun.id,
    sessionId: session.id,
    softCompoundId: softCompound.id,
  };
};

afterAll(async () => {
  await database.end({ timeout: 5 });
});

describe("lap times schema migration", () => {
  it("stores a complete timed lap with sector, tire, stint, and pit data", async () => {
    const rollback = new Error("rollback complete lap fixture");

    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedLapTimeDependencies(
          transaction,
          fixtureSuffix,
        );
        const [lap] = await transaction<
          {
            lap_time_ms: number;
            sector_1_time_ms: number;
            tire_age_laps: number;
            pit_in: boolean;
            is_accurate: boolean;
            source: string;
          }[]
        >`
          INSERT INTO lap_times (
            session_id,
            driver_id,
            lap_number,
            lap_time_ms,
            sector_1_time_ms,
            sector_2_time_ms,
            sector_3_time_ms,
            stint_number,
            tire_compound_id,
            tire_age_laps,
            is_fresh_tire,
            pit_in,
            pit_out,
            is_accurate,
            import_run_id,
            source,
            source_identifier
          )
          VALUES (
            ${dependencies.sessionId},
            ${dependencies.driverOneId},
            15,
            82123,
            27321,
            29111,
            25691,
            2,
            ${dependencies.softCompoundId},
            14,
            false,
            true,
            false,
            true,
            ${dependencies.importRunId},
            'fastf1',
            ${`lap-15-${fixtureSuffix}`}
          )
          RETURNING
            lap_time_ms,
            sector_1_time_ms,
            tire_age_laps,
            pit_in,
            is_accurate,
            source
        `;

        expect(lap).toEqual({
          lap_time_ms: 82123,
          sector_1_time_ms: 27321,
          tire_age_laps: 14,
          pit_in: true,
          is_accurate: true,
          source: "fastf1",
        });

        throw rollback;
      }),
    ).rejects.toBe(rollback);
  });

  it("preserves unavailable timing and tire data for a deleted lap", async () => {
    const rollback = new Error("rollback deleted lap fixture");

    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedLapTimeDependencies(
          transaction,
          fixtureSuffix,
        );
        const [lap] = await transaction<
          {
            lap_time_ms: null;
            tire_compound_id: null;
            pit_in: null;
            pit_out: null;
            is_deleted: boolean;
            deleted_reason: string;
          }[]
        >`
          INSERT INTO lap_times (
            session_id,
            driver_id,
            lap_number,
            is_deleted,
            deleted_reason
          )
          VALUES (
            ${dependencies.sessionId},
            ${dependencies.driverOneId},
            16,
            true,
            'Track limits'
          )
          RETURNING
            lap_time_ms,
            tire_compound_id,
            pit_in,
            pit_out,
            is_deleted,
            deleted_reason
        `;

        expect(lap).toEqual({
          lap_time_ms: null,
          tire_compound_id: null,
          pit_in: null,
          pit_out: null,
          is_deleted: true,
          deleted_reason: "Track limits",
        });

        throw rollback;
      }),
    ).rejects.toBe(rollback);
  });

  it("prevents duplicate laps for a driver within one session", async () => {
    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedLapTimeDependencies(
          transaction,
          fixtureSuffix,
        );

        await transaction`
          INSERT INTO lap_times (session_id, driver_id, lap_number)
          VALUES (${dependencies.sessionId}, ${dependencies.driverOneId}, 1)
        `;
        return transaction`
          INSERT INTO lap_times (session_id, driver_id, lap_number)
          VALUES (${dependencies.sessionId}, ${dependencies.driverOneId}, 1)
        `;
      }),
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("prevents duplicate imported source records", async () => {
    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedLapTimeDependencies(
          transaction,
          fixtureSuffix,
        );
        const sourceIdentifier = `duplicate-lap-${fixtureSuffix}`;

        await transaction`
          INSERT INTO lap_times (
            session_id,
            driver_id,
            lap_number,
            source,
            source_identifier
          )
          VALUES (
            ${dependencies.sessionId},
            ${dependencies.driverOneId},
            1,
            'fastf1',
            ${sourceIdentifier}
          )
        `;
        return transaction`
          INSERT INTO lap_times (
            session_id,
            driver_id,
            lap_number,
            source,
            source_identifier
          )
          VALUES (
            ${dependencies.sessionId},
            ${dependencies.driverTwoId},
            1,
            'fastf1',
            ${sourceIdentifier}
          )
        `;
      }),
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("rejects invalid lap numbers, timing values, stint numbers, and tire ages", async () => {
    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedLapTimeDependencies(
          transaction,
          fixtureSuffix,
        );

        return transaction`
          INSERT INTO lap_times (
            session_id,
            driver_id,
            lap_number,
            lap_time_ms,
            sector_1_time_ms,
            sector_2_time_ms,
            sector_3_time_ms,
            stint_number,
            tire_age_laps
          )
          VALUES (
            ${dependencies.sessionId},
            ${dependencies.driverOneId},
            0,
            0,
            0,
            0,
            0,
            0,
            -1
          )
        `;
      }),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("requires a non-blank deletion reason and a deleted-lap marker", async () => {
    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedLapTimeDependencies(
          transaction,
          fixtureSuffix,
        );

        return transaction`
          INSERT INTO lap_times (
            session_id,
            driver_id,
            lap_number,
            is_deleted,
            deleted_reason
          )
          VALUES (
            ${dependencies.sessionId},
            ${dependencies.driverOneId},
            1,
            false,
            'Track limits'
          )
        `;
      }),
    ).rejects.toMatchObject({ code: "23514" });

    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedLapTimeDependencies(
          transaction,
          fixtureSuffix,
        );

        return transaction`
          INSERT INTO lap_times (
            session_id,
            driver_id,
            lap_number,
            is_deleted,
            deleted_reason
          )
          VALUES (
            ${dependencies.sessionId},
            ${dependencies.driverOneId},
            1,
            true,
            '   '
          )
        `;
      }),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("requires paired source fields", async () => {
    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedLapTimeDependencies(
          transaction,
          fixtureSuffix,
        );

        return transaction`
          INSERT INTO lap_times (session_id, driver_id, lap_number, source)
          VALUES (${dependencies.sessionId}, ${dependencies.driverOneId}, 1, 'fastf1')
        `;
      }),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("requires valid session, driver, tire-compound, and import-run references", async () => {
    await expect(
      database`
        INSERT INTO lap_times (
          session_id,
          driver_id,
          lap_number,
          tire_compound_id,
          import_run_id
        )
        VALUES (999999999, 999999999, 1, 999999999, 999999999)
      `,
    ).rejects.toMatchObject({ code: "23503" });
  });
});
