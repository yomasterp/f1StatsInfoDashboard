export class NewsProviderError extends Error {
  constructor(
    message: string,
    readonly provider: string,
    readonly code: string,
    readonly httpStatus?: number,
  ) {
    super(message);
    this.name = "NewsProviderError";
  }
}
