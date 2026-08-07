const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const BASE_PATH = "trading-guide-media";

export interface GuideTopicDef {
  slug: string;
  name: string;
}

export interface GuideSectionDef {
  slug: string;
  name: string;
  topics: GuideTopicDef[];
}

export const GUIDE_SECTIONS: GuideSectionDef[] = [
  {
    slug: "chart-and-trading-screen",
    name: "Chart and Trading Screen",
    topics: [
      { slug: "chart-type", name: "Chart Type" },
      { slug: "indicators", name: "Indicators" },
      { slug: "drawings", name: "Drawings" },
      { slug: "other-settings", name: "Other Settings" },
      { slug: "hotkeys", name: "Hotkeys" },
      { slug: "expiration-modes", name: "Expiration Modes" },
      { slug: "multiple-charts", name: "Multiple Charts Display" },
    ],
  },
  {
    slug: "profile-and-account-screens",
    name: "Profile and Account Screens",
    topics: [
      { slug: "profile-overview", name: "Profile Overview" },
      { slug: "account-settings", name: "Account Settings" },
      { slug: "kyc-verification", name: "KYC Verification" },
      { slug: "personal-data", name: "Personal Data" },
    ],
  },
  {
    slug: "finance-and-funding-screens",
    name: "Finance and Funding Screens",
    topics: [
      { slug: "deposit", name: "Deposit" },
      { slug: "withdrawal", name: "Withdrawal" },
      { slug: "balance", name: "Balance" },
      { slug: "transaction-history", name: "Transaction History" },
    ],
  },
  {
    slug: "security-and-verification-screens",
    name: "Security and Verification Screens",
    topics: [
      { slug: "password-management", name: "Password Management" },
      { slug: "two-factor-authentication", name: "Two-Factor Authentication (2FA)" },
      { slug: "active-sessions", name: "Active Sessions" },
      { slug: "security-settings", name: "Security Settings" },
    ],
  },
  {
    slug: "chat-and-private-messages",
    name: "Chat and Private Messages",
    topics: [
      { slug: "general-chat", name: "General Chat" },
      { slug: "private-messages", name: "Private Messages" },
      { slug: "support-inbox", name: "Support Inbox" },
      { slug: "messaging-settings", name: "Messaging Settings" },
    ],
  },
  {
    slug: "market-and-asset-browser",
    name: "Market and Asset Browser",
    topics: [
      { slug: "asset-list", name: "Asset List" },
      { slug: "market-browser", name: "Market Browser" },
      { slug: "favorites", name: "Favorites" },
      { slug: "quote-selection", name: "Quote Selection" },
    ],
  },
  {
    slug: "additional-sections",
    name: "Additional Sections",
    topics: [
      { slug: "tournaments", name: "Tournaments" },
      { slug: "leaderboard", name: "Leaderboard" },
      { slug: "referral-program", name: "Referral Program" },
      { slug: "trading-guide", name: "Trading Guide" },
    ],
  },
];

export const getGuideMediaPath = (sectionSlug: string, topicSlug: string): string =>
  `${BASE_PATH}/${sectionSlug}/${topicSlug}.png`;

export const getGuideMediaUrl = (
  supabaseUrl: string,
  sectionSlug: string,
  topicSlug: string,
): string =>
  `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${getGuideMediaPath(sectionSlug, topicSlug)}`;
