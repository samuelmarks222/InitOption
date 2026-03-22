type LiveBalanceProfile = {
  balance?: number | null;
  total_deposit?: number | null;
};

export const hasFundedLiveAccount = (profile?: LiveBalanceProfile | null) => Number(profile?.total_deposit ?? 0) > 0;

export const shouldNormalizeSeededLiveBalance = (profile?: LiveBalanceProfile | null) =>
  Number(profile?.balance ?? 0) > 0 && !hasFundedLiveAccount(profile);

export const getEffectiveLiveBalance = (profile?: LiveBalanceProfile | null) =>
  shouldNormalizeSeededLiveBalance(profile) ? 0 : Math.max(0, Number(profile?.balance ?? 0));
