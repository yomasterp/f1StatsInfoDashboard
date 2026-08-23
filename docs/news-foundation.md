# News foundation

The news subsystem discovers Formula 1 article metadata through a replaceable provider interface. It does not fetch news during a page request and does not store full article bodies.

## Local configuration

Register a NewsData.io key, then add it to the repository-root `.env`:

```env
NEWS_PROVIDER=newsdata
NEWSDATA_API_KEY=your-newsdata-key
NEWSDATA_API_BASE_URL=https://newsdata.io/api/1
NEWSDATA_API_QUERY='"Formula 1" OR F1'
NEWSDATA_API_LANGUAGE=en
NEWSDATA_API_CATEGORY=sports
```

Only `NEWSDATA_API_KEY` is required when the default `newsdata` provider is selected. Never use a `NEXT_PUBLIC_` variable for this credential. `.env` is ignored; `.env.example` contains safe placeholders. The provider is called only by server-side commands, so the key is not shipped to browsers.

The existing NewsAPI adapter remains available for local development only. To use it, set `NEWS_PROVIDER=newsapi` and configure the `NEWS_API_*` variables shown in `.env.example`.

## Commands

Apply the schema before importing:

```powershell
npm run db:migrate
```

Check connectivity and response validation without writing articles:

```powershell
npm run news:check
```

Import metadata into PostgreSQL:

```powershell
npm run news:import
```

The import command takes a PostgreSQL advisory lock for its scope, creates an `import_runs` audit record, validates the provider response, normalizes URLs, and upserts publishers and articles. A repeated canonical URL refreshes the article instead of inserting a duplicate.

## Stored data

`news_sources` stores the provider, provider source identifier, publisher name, domain, homepage, and freshness state.

`news_articles` stores the publisher relationship, canonical URL, headline, short provider description, author, optional image URL, language, publication timestamp, first/last seen timestamps, and import-run provenance.

Provider content fields are validated as part of the response envelope but intentionally discarded. NewsData.io image URLs are also discarded because publisher image rights can vary. A future `/news` page must attribute the publisher and link to the original article rather than reproducing the article.

## Provider and quota boundaries

NewsData.io currently permits its free API data in commercial projects, but the free feed is delayed and its quota and terms can change. Check the current [NewsData.io site and usage FAQ](https://newsdata.io/), [documentation](https://newsdata.io/documentation), and [pricing](https://newsdata.io/pricing) before scheduling imports or deploying the application. Display only the title, short description, publisher, author, date/time, and original link unless broader rights are confirmed.

The NewsAPI Developer plan remains local-development-only. Check the current [NewsAPI pricing](https://newsapi.org/pricing), [API documentation](https://newsapi.org/docs), and [terms](https://newsapi.org/terms) before using that optional adapter.

Do not run a frequent scheduler on the free plan. A later scheduling branch should calculate a quota-aware interval, report the last successful refresh, and add bounded retries for transient failures.
