export type NewsArticleCandidate = {
  provider: string;
  providerRecordIdentifier: string;
  sourceIdentifier: string | null;
  sourceName: string;
  sourceDomain: string;
  sourceHomepageUrl: string;
  canonicalUrl: string;
  title: string;
  summary: string | null;
  author: string | null;
  imageUrl: string | null;
  language: string;
  publishedAt: Date;
};

export type FetchNewsOptions = {
  from?: Date;
  page?: number | string;
};

export interface NewsProvider {
  readonly name: string;
  fetchArticles(options?: FetchNewsOptions): Promise<NewsArticleCandidate[]>;
}

export type NewsImportCounts = {
  received: number;
  inserted: number;
  updated: number;
};
