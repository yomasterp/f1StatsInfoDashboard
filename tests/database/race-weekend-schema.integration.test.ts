import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { getDatabaseUrl } from "../../src/lib/database/config";

const database = postgres(getDatabaseUrl(), {
  max: 1,
  onnotice: () => undefined,
});
const fixtureSuffix = Date.now().toString();

const seedRaceDependencies = async (
  transaction: postgres.TransactionSql,
  suffix: string,
) => {
  await transaction`
    INSERT INTO seasons (year, championship_name, rounds)
    VALUES (2090, 'Race weekend integration championship', 2)
  `;
  const [country] = await transaction<{ id: number }[]>`
    INSERT INTO countries (iso_alpha2, iso_alpha3, name)
    VALUES ('CA', 'CAN', ${`Canada ${suffix}`})
    RETURNING id
  `;
  const [circuit] = await transaction<{ id: number }[]>`
    INSERT INTO circuits (slug, name, country_id)
    VALUES (${`weekend-circuit-${suffix}`}, 'Weekend Circuit', ${country.id})
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
    VALUES (${circuit.id}, 'grand-prix', 'Grand Prix Circuit', 2090, 2090)
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
      ${`weekend-format-${suffix}`},
      'Standard weekend',
      false,
      ${JSON.stringify(["practice", "qualifying", "race"])}::jsonb,
      2090,
      2090
    )
    RETURNING id
  `;
  const [qualifyingType] = await transaction<{ id: number }[]>`
    INSERT INTO session_types (code, name, sequence, is_championship_scoring)
    VALUES (${`qualifying-${suffix}`}, 'Qualifying', 1, false)
    RETURNING id
  `;
  const [raceType] = await transaction<{ id: number }[]>`
    INSERT INTO session_types (code, name, sequence, is_championship_scoring)
    VALUES (${`race-${suffix}`}, 'Race', 2, true)
    RETURNING id
  `;

  return {
    configurationId: configuration.id,
    qualifyingTypeId: qualifyingType.id,
    raceFormatId: raceFormat.id,
    raceTypeId: raceType.id,
  };
};

afterAll(async () => {
  await database.end({ timeout: 5 });
});

describe("race weekend schema migration", () => {
  it("stores a race weekend and its independently timed sessions", async () => {
    const rollback = new Error("rollback race weekend fixture");

    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedRaceDependencies(
          transaction,
          fixtureSuffix,
        );
        const [race] = await transaction<{
          id: number;
          status: "scheduled";
        }[]>`
          INSERT INTO races (
            season_year,
            round,
            slug,
            official_name,
            circuit_configuration_id,
            race_format_id,
            weekend_start_date,
            weekend_end_date,
            scheduled_start
          )
          VALUES (
            2090,
            1,
            ${`test-grand-prix-${fixtureSuffix}`},
            'Test Grand Prix',
            ${dependencies.configurationId},
            ${dependencies.raceFormatId},
            '2090-06-01',
            '2090-06-03',
            '2090-06-03T18:00:00Z'
          )
          RETURNING id, status
        `;

        expect(race.status).toBe("scheduled");

        await transaction`
          INSERT INTO sessions (
            race_id,
            session_type_id,
            sequence,
            planned_start,
            actual_start,
            completed_at,
            status
          )
          VALUES (
            ${race.id},
            ${dependencies.qualifyingTypeId},
            1,
            '2090-06-02T18:00:00Z',
            '2090-06-02T18:05:00Z',
            '2090-06-02T19:02:00Z',
            'completed'
          )
        `;
        await transaction`
          INSERT INTO sessions (
            race_id,
            session_type_id,
            sequence,
            planned_start,
            scheduled_laps,
            status
          )
          VALUES (
            ${race.id},
            ${dependencies.raceTypeId},
            2,
            '2090-06-03T18:00:00Z',
            70,
            'scheduled'
          )
        `;

        const [{ count }] = await transaction<{ count: string }[]>`
          SELECT count(*) AS count FROM sessions WHERE race_id = ${race.id}
        `;
        expect(Number(count)).toBe(2);

        throw rollback;
      }),
    ).rejects.toBe(rollback);
  });

  it("rejects invalid race rounds and weekend date ranges", async () => {
    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedRaceDependencies(
          transaction,
          fixtureSuffix,
        );

        return transaction`
          INSERT INTO races (
            season_year,
            round,
            slug,
            official_name,
            circuit_configuration_id,
            race_format_id,
            weekend_start_date,
            weekend_end_date
          )
          VALUES (
            2090,
            0,
            ${`invalid-round-${fixtureSuffix}`},
            'Invalid Round',
            ${dependencies.configurationId},
            ${dependencies.raceFormatId},
            '2090-06-03',
            '2090-06-01'
          )
        `;
      }),
    ).rejects.toMatchObject({ code: "23514" });

    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedRaceDependencies(
          transaction,
          fixtureSuffix,
        );

        return transaction`
          INSERT INTO races (
            season_year,
            round,
            slug,
            official_name,
            circuit_configuration_id,
            race_format_id,
            weekend_start_date,
            weekend_end_date
          )
          VALUES (
            2090,
            1,
            ${`invalid-dates-${fixtureSuffix}`},
            'Invalid Dates',
            ${dependencies.configurationId},
            ${dependencies.raceFormatId},
            '2090-06-03',
            '2090-06-01'
          )
        `;
      }),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("rejects duplicate rounds within a season", async () => {
    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedRaceDependencies(
          transaction,
          fixtureSuffix,
        );

        await transaction`
          INSERT INTO races (
            season_year,
            round,
            slug,
            official_name,
            circuit_configuration_id,
            race_format_id,
            weekend_start_date,
            weekend_end_date
          )
          VALUES (
            2090,
            1,
            ${`first-race-${fixtureSuffix}`},
            'First Race',
            ${dependencies.configurationId},
            ${dependencies.raceFormatId},
            '2090-06-01',
            '2090-06-03'
          )
        `;
        return transaction`
          INSERT INTO races (
            season_year,
            round,
            slug,
            official_name,
            circuit_configuration_id,
            race_format_id,
            weekend_start_date,
            weekend_end_date
          )
          VALUES (
            2090,
            1,
            ${`second-race-${fixtureSuffix}`},
            'Second Race',
            ${dependencies.configurationId},
            ${dependencies.raceFormatId},
            '2090-07-01',
            '2090-07-03'
          )
        `;
      }),
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("rejects sessions that complete before their actual start", async () => {
    await expect(
      database.begin(async (transaction) => {
        const dependencies = await seedRaceDependencies(
          transaction,
          fixtureSuffix,
        );
        const [race] = await transaction<{ id: number }[]>`
          INSERT INTO races (
            season_year,
            round,
            slug,
            official_name,
            circuit_configuration_id,
            race_format_id,
            weekend_start_date,
            weekend_end_date
          )
          VALUES (
            2090,
            1,
            ${`invalid-session-race-${fixtureSuffix}`},
            'Invalid Session Race',
            ${dependencies.configurationId},
            ${dependencies.raceFormatId},
            '2090-08-01',
            '2090-08-03'
          )
          RETURNING id
        `;

        return transaction`
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
            ${dependencies.raceTypeId},
            1,
            '2090-08-03T18:00:00Z',
            '2090-08-03T17:00:00Z',
            'completed'
          )
        `;
      }),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("requires sessions to reference an existing race and session type", async () => {
    await expect(
      database`
        INSERT INTO sessions (race_id, session_type_id, sequence)
        VALUES (999999999, 999999999, 1)
      `,
    ).rejects.toMatchObject({ code: "23503" });
  });
});
