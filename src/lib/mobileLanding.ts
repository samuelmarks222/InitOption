const MOBILE_LOGIN_MEDIA_QUERIES = [
  "(max-width: 767px)",
  "(pointer: coarse) and (max-width: 940px)",
];

const SEARCH_CRAWLER_USER_AGENT_PATTERN =
  /googlebot|adsbot-google|google-inspectiontool|bingbot|slurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|facebot|ia_archiver/i;

type MediaMatcher = (query: string) => { matches: boolean };

const getNavigatorUserAgent = () =>
  typeof navigator !== "undefined" && typeof navigator.userAgent === "string" ? navigator.userAgent : "";

export const isSearchCrawlerUserAgent = (userAgent = getNavigatorUserAgent()) =>
  SEARCH_CRAWLER_USER_AGENT_PATTERN.test(userAgent);

export const shouldStartAtLoginOnMobile = (matchMediaFn?: MediaMatcher, userAgent?: string) => {
  if (isSearchCrawlerUserAgent(userAgent)) return false;

  const matcher =
    matchMediaFn ??
    (typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia.bind(window)
      : null);

  if (!matcher) return false;

  try {
    return MOBILE_LOGIN_MEDIA_QUERIES.some((query) => matcher(query).matches);
  } catch {
    return false;
  }
};
