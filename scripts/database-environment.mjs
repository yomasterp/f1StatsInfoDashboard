import { z } from "zod";

const databaseUrlSchema = z
  .string()
  .trim()
  .min(1, "DATABASE_URL is required")
  .url("DATABASE_URL must be a valid URL")
  .refine(
    (value) => {
      const protocol = new URL(value).protocol;
      return protocol === "postgres:" || protocol === "postgresql:";
    },
    "DATABASE_URL must use the postgres:// or postgresql:// protocol",
  );

export function getDatabaseUrl() {
  return databaseUrlSchema.parse(process.env.DATABASE_URL);
}
