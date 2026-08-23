import { z } from "zod";

const newsApiPlaceholderKey = "replace-with-your-newsapi-key";
const newsDataPlaceholderKey = "replace-with-your-newsdata-key";

const newsApiEnvironmentSchema = z.object({
  NEWS_API_KEY: z
    .string({ error: "NEWS_API_KEY is required" })
    .trim()
    .min(1, "NEWS_API_KEY is required")
    .refine(
      (value) => value !== newsApiPlaceholderKey,
      "NEWS_API_KEY must be replaced",
    ),
  NEWS_API_BASE_URL: z
    .string()
    .trim()
    .url("NEWS_API_BASE_URL must be a valid URL")
    .default("https://newsapi.org/v2"),
  NEWS_API_QUERY: z.string().trim().min(1).default('"Formula 1" OR "F1"'),
  NEWS_API_LANGUAGE: z
    .string()
    .trim()
    .regex(/^[a-z]{2}$/, "NEWS_API_LANGUAGE must be a lowercase two-letter code")
    .default("en"),
  NEWS_API_PAGE_SIZE: z.coerce.number().int().min(1).max(100).default(50),
});

const newsDataEnvironmentSchema = z.object({
  NEWSDATA_API_KEY: z
    .string({ error: "NEWSDATA_API_KEY is required" })
    .trim()
    .min(1, "NEWSDATA_API_KEY is required")
    .refine(
      (value) => value !== newsDataPlaceholderKey,
      "NEWSDATA_API_KEY must be replaced",
    ),
  NEWSDATA_API_BASE_URL: z
    .string()
    .trim()
    .url("NEWSDATA_API_BASE_URL must be a valid URL")
    .default("https://newsdata.io/api/1"),
  NEWSDATA_API_QUERY: z.string().trim().min(1).max(100).default('"Formula 1" OR F1'),
  NEWSDATA_API_LANGUAGE: z
    .string()
    .trim()
    .regex(/^[a-z]{2}$/, "NEWSDATA_API_LANGUAGE must be a lowercase two-letter code")
    .default("en"),
  NEWSDATA_API_CATEGORY: z.string().trim().min(1).default("sports"),
});

export type NewsApiConfig = {
  apiKey: string;
  baseUrl: string;
  query: string;
  language: string;
  pageSize: number;
};

export type NewsDataConfig = {
  apiKey: string;
  baseUrl: string;
  query: string;
  language: string;
  category: string;
};

export type NewsProviderName = "newsdata" | "newsapi";

export function getNewsApiConfig(
  environment: Record<string, string | undefined> = process.env,
): NewsApiConfig {
  const parsed = newsApiEnvironmentSchema.parse(environment);

  return {
    apiKey: parsed.NEWS_API_KEY,
    baseUrl: parsed.NEWS_API_BASE_URL.replace(/\/$/, ""),
    query: parsed.NEWS_API_QUERY,
    language: parsed.NEWS_API_LANGUAGE,
    pageSize: parsed.NEWS_API_PAGE_SIZE,
  };
}

export function getNewsDataConfig(
  environment: Record<string, string | undefined> = process.env,
): NewsDataConfig {
  const parsed = newsDataEnvironmentSchema.parse(environment);

  return {
    apiKey: parsed.NEWSDATA_API_KEY,
    baseUrl: parsed.NEWSDATA_API_BASE_URL.replace(/\/$/, ""),
    query: parsed.NEWSDATA_API_QUERY,
    language: parsed.NEWSDATA_API_LANGUAGE,
    category: parsed.NEWSDATA_API_CATEGORY,
  };
}

export function getNewsProviderName(
  environment: Record<string, string | undefined> = process.env,
): NewsProviderName {
  return z
    .enum(["newsdata", "newsapi"])
    .default("newsdata")
    .parse(environment.NEWS_PROVIDER);
}
