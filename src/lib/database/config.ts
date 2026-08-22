import { z } from "zod";

const environmentSchema = z.object({
  DATABASE_URL: z
    .string({ error: "DATABASE_URL is required" })
    .trim()
    .min(1, "DATABASE_URL is required"),
});

const databaseUrlSchema = z
  .string()
  .url("DATABASE_URL must be a valid URL")
  .refine(
    (value) => {
      const protocol = new URL(value).protocol;
      return protocol === "postgres:" || protocol === "postgresql:";
    },
    "DATABASE_URL must use the postgres:// or postgresql:// protocol",
  );

export function getDatabaseUrl(
  environment: Record<string, string | undefined> = process.env,
): string {
  const { DATABASE_URL } = environmentSchema.parse(environment);
  return databaseUrlSchema.parse(DATABASE_URL);
}
