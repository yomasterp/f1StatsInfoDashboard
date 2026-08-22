import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { getDatabaseUrl } from "../../src/lib/database/config";

const database = postgres(getDatabaseUrl(), {
  max: 1,
  onnotice: () => undefined,
});
const fixtureSuffix = Date.now().toString();

afterAll(async () => {
  await database.end({ timeout: 5 });
});

describe("reference schema migration", () => {
  it("stores a complete normalized reference-data fixture", async () => {
    const rollback = new Error("rollback reference fixture");

    await expect(
      database.begin(async (transaction) => {
        await transaction`
          INSERT INTO seasons (year, championship_name, rounds)
          VALUES (2026, 'Formula One World Championship', 24)
        `;

        const [country] = await transaction<{ id: number }[]>`
          INSERT INTO countries (iso_alpha2, iso_alpha3, name, demonym)
          VALUES ('GB', 'GBR', ${`United Kingdom ${fixtureSuffix}`}, 'British')
          RETURNING id
        `;

        const [circuit] = await transaction<{ id: number }[]>`
          INSERT INTO circuits (slug, name, locality, country_id, latitude, longitude)
          VALUES (
            ${`silverstone-${fixtureSuffix}`},
            'Silverstone Circuit',
            'Silverstone',
            ${country.id},
            52.07861,
            -1.01694
          )
          RETURNING id
        `;

        const [driver] = await transaction<{ id: number }[]>`
          INSERT INTO drivers (slug, given_name, family_name, date_of_birth, nationality_country_id, permanent_number)
          VALUES (
            ${`driver-${fixtureSuffix}`},
            'Test',
            'Driver',
            '1990-01-01',
            ${country.id},
            44
          )
          RETURNING id
        `;

        const [constructor] = await transaction<{ id: number }[]>`
          INSERT INTO constructors (slug, name, nationality_country_id)
          VALUES (${`constructor-${fixtureSuffix}`}, 'Test Constructor', ${country.id})
          RETURNING id
        `;

        await transaction`
          INSERT INTO circuit_configurations (
            circuit_id,
            code,
            name,
            length_km,
            effective_from_season,
            effective_to_season
          )
          VALUES (${circuit.id}, 'grand-prix', 'Grand Prix Circuit', 5.891, 2026, 2026)
        `;
        await transaction`
          INSERT INTO driver_aliases (driver_id, source, source_identifier, alias)
          VALUES (${driver.id}, 'jolpica', ${`driver-source-${fixtureSuffix}`}, 'T. Driver')
        `;
        await transaction`
          INSERT INTO constructor_aliases (constructor_id, source, source_identifier, alias)
          VALUES (${constructor.id}, 'jolpica', ${`constructor-source-${fixtureSuffix}`}, 'Test Team')
        `;
        await transaction`
          INSERT INTO status_codes (code, description, category, is_classified)
          VALUES (${`finished-${fixtureSuffix}`}, 'Finished', 'classified', true)
        `;
        await transaction`
          INSERT INTO points_systems (code, name, effective_from_season, rules)
          VALUES (
            ${`standard-${fixtureSuffix}`},
            'Standard scoring',
            2026,
            ${JSON.stringify({ race: [25, 18, 15], fastestLap: 1 })}::jsonb
          )
        `;
        await transaction`
          INSERT INTO race_formats (code, name, has_sprint, schedule, effective_from_season)
          VALUES (
            ${`standard-${fixtureSuffix}`},
            'Standard weekend',
            false,
            ${JSON.stringify(["fp1", "fp2", "fp3", "qualifying", "race"])}::jsonb,
            2026
          )
        `;
        await transaction`
          INSERT INTO session_types (code, name, sequence, is_championship_scoring)
          VALUES (${`race-${fixtureSuffix}`}, 'Race', 7, true)
        `;
        await transaction`
          INSERT INTO tire_compounds (code, name, is_slick, is_wet)
          VALUES (${`soft-${fixtureSuffix}`}, 'Soft', true, false)
        `;

        const [{ count }] = await transaction<{ count: string }[]>`
          SELECT count(*) AS count
          FROM driver_aliases
          WHERE driver_id = ${driver.id}
        `;
        expect(Number(count)).toBe(1);

        throw rollback;
      }),
    ).rejects.toBe(rollback);
  });

  it("rejects invalid reference values", async () => {
    await expect(
      database`
        INSERT INTO seasons (year, championship_name, rounds)
        VALUES (1949, 'Invalid season', 1)
      `,
    ).rejects.toMatchObject({ code: "23514" });

    await expect(
      database`
        INSERT INTO countries (iso_alpha2, name)
        VALUES ('gb', 'Invalid country')
      `,
    ).rejects.toMatchObject({ code: "23514" });

    await expect(
      database`
        INSERT INTO tire_compounds (code, name, is_slick, is_wet)
        VALUES ('invalid-surface', 'Invalid surface', true, true)
      `,
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("enforces reference relationships and source identifiers", async () => {
    await expect(
      database`
        INSERT INTO circuits (slug, name, country_id)
        VALUES (${`invalid-circuit-${fixtureSuffix}`}, 'Invalid circuit', 999999999)
      `,
    ).rejects.toMatchObject({ code: "23503" });

    await expect(
      database.begin(async (transaction) => {
        const [country] = await transaction<{ id: number }[]>`
          INSERT INTO countries (iso_alpha2, name)
          VALUES ('US', ${`United States ${fixtureSuffix}`})
          RETURNING id
        `;
        const [driver] = await transaction<{ id: number }[]>`
          INSERT INTO drivers (slug, given_name, family_name, nationality_country_id)
          VALUES (${`alias-driver-${fixtureSuffix}`}, 'Alias', 'Driver', ${country.id})
          RETURNING id
        `;

        await transaction`
          INSERT INTO driver_aliases (driver_id, source, source_identifier, alias)
          VALUES (${driver.id}, 'jolpica', ${`duplicate-${fixtureSuffix}`}, 'Alias Driver')
        `;
        return transaction`
          INSERT INTO driver_aliases (driver_id, source, source_identifier, alias)
          VALUES (${driver.id}, 'jolpica', ${`duplicate-${fixtureSuffix}`}, 'Another Alias')
        `;
      }),
    ).rejects.toMatchObject({ code: "23505" });
  });
});
