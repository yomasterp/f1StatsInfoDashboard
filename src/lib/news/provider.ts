import {
  getNewsApiConfig,
  getNewsDataConfig,
  getNewsProviderName,
} from "./config";
import { NewsApiProvider } from "./newsapi";
import { NewsDataProvider } from "./newsdata";
import type { NewsProvider } from "./types";

export function createNewsProvider(
  environment: Record<string, string | undefined> = process.env,
  fetchImplementation: typeof fetch = fetch,
): NewsProvider {
  const providerName = getNewsProviderName(environment);

  if (providerName === "newsapi") {
    return new NewsApiProvider(getNewsApiConfig(environment), fetchImplementation);
  }

  return new NewsDataProvider(getNewsDataConfig(environment), fetchImplementation);
}
