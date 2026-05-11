const MOBILE_LOGIN_MEDIA_QUERIES = [
  "(max-width: 767px)",
  "(pointer: coarse) and (max-width: 940px)",
];

type MediaMatcher = (query: string) => { matches: boolean };

export const shouldStartAtLoginOnMobile = (matchMediaFn?: MediaMatcher) => {
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
