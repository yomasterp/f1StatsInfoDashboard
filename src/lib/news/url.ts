const trackingParameters = new Set([
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "ref",
  "ref_src",
]);

export function canonicalizeArticleUrl(value: string): string {
  const url = new URL(value);

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Article URLs must use HTTP or HTTPS");
  }

  url.hash = "";
  url.hostname = url.hostname.toLowerCase();

  for (const parameter of [...url.searchParams.keys()]) {
    const normalizedParameter = parameter.toLowerCase();
    if (
      normalizedParameter.startsWith("utm_") ||
      trackingParameters.has(normalizedParameter)
    ) {
      url.searchParams.delete(parameter);
    }
  }

  url.searchParams.sort();

  if (url.pathname.length > 1) {
    url.pathname = url.pathname.replace(/\/$/, "");
  }

  return url.toString();
}
