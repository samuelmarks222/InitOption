export const DEFAULT_DEMO_BALANCE = 10000;
const NEW_USER_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

type OnboardingProfile = {
  id?: string | null;
  created_at?: string | null;
  total_trades?: number | null;
  total_deposit?: number | null;
};

export const isNewUserProfile = (profile: OnboardingProfile | null | undefined) => {
  if (!profile?.id || !profile.created_at) return false;

  const createdAt = new Date(profile.created_at).getTime();
  if (!Number.isFinite(createdAt)) return false;

  const ageInMs = Date.now() - createdAt;
  return ageInMs <= NEW_USER_WINDOW_MS && Number(profile.total_trades ?? 0) === 0 && Number(profile.total_deposit ?? 0) === 0;
};

export const getDemoBalanceStorageKey = (userId: string) => `demo_balance:${userId}`;
export const getNewUserPromptStorageKey = (userId: string) => `new_user_prompt_seen:${userId}`;
export const getNewUserAccountChoiceStorageKey = (userId: string) => `new_user_account_choice_seen:${userId}`;

export const readDemoBalanceStorage = (userId: string) => {
  if (typeof window === "undefined") return DEFAULT_DEMO_BALANCE;

  try {
    const raw = window.localStorage.getItem(getDemoBalanceStorageKey(userId));
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_DEMO_BALANCE;
  } catch {
    return DEFAULT_DEMO_BALANCE;
  }
};

export const writeDemoBalanceStorage = (userId: string, value: number) => {
  if (typeof window === "undefined") return;

  const safeValue = Number.isFinite(value) && value >= 0 ? value : DEFAULT_DEMO_BALANCE;
  window.localStorage.setItem(getDemoBalanceStorageKey(userId), String(safeValue));
};

export const hasSeenNewUserPrompt = (userId: string) => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(getNewUserPromptStorageKey(userId)) === "true";
};

export const markNewUserPromptSeen = (userId: string) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getNewUserPromptStorageKey(userId), "true");
};

export const hasSeenNewUserAccountChoice = (userId: string) => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(getNewUserAccountChoiceStorageKey(userId)) === "true";
};

export const markNewUserAccountChoiceSeen = (userId: string) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getNewUserAccountChoiceStorageKey(userId), "true");
};
