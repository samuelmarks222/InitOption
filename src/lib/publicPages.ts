import { DEFAULT_PLATFORM_NAME } from "./platformMetadataShared.js";
import { normalizeWebsiteContent } from "./websiteContent.js";

export type PublicPageKey =
  | "about"
  | "how-it-works"
  | "trading-guide"
  | "faq"
  | "terms"
  | "privacy"
  | "risk-disclaimer";

export interface PublicPageSection {
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface PublicFaqItem {
  question: string;
  answer: string;
}

export interface PublicPageDefinition {
  key: PublicPageKey;
  path: `/${string}`;
  eyebrow: string;
  title: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string;
  sections: PublicPageSection[];
  faqItems?: PublicFaqItem[];
}

const cloneSections = (sections: PublicPageSection[]) =>
  sections.map((section) => ({
    ...section,
    paragraphs: [...section.paragraphs],
    bullets: section.bullets ? [...section.bullets] : undefined,
  }));

export const PUBLIC_PAGE_DEFINITIONS: Record<PublicPageKey, PublicPageDefinition> = {
  about: {
    key: "about",
    path: "/about",
    eyebrow: "About",
    title: "About {platformName}",
    description:
      "{platformName} is a modern OTC trading platform focused on clean charting, fast withdrawals, high payouts, and a fair trading environment for every session.",
    seoTitle: "About {platformName} - Our Story & Mission",
    seoDescription:
      "Learn about {platformName}, the modern OTC trading platform. We offer a clean web terminal, high payouts, and a fair trading environment.",
    keywords: "about init option, OTC trading platform, high profit trading platform, modern web terminal",
    sections: [
      {
        title: "Our mission",
        paragraphs: [
          "{platformName} was built to give traders a cleaner, faster path into OTC trading with a web terminal that feels simple from the first click.",
          "We focus on clear chart visibility, responsive execution, and a fair trading environment that supports both beginners and active users.",
        ],
      },
      {
        title: "Why traders choose {platformName}",
        paragraphs: [
          "Every part of the platform is designed to reduce friction between market analysis, trade placement, and account actions.",
        ],
        bullets: [
          "High payouts with up to 95% profit on supported trades",
          "Fast withdrawals and secure funding options",
          "Real-time charts on mobile and desktop",
          "Weekly tournaments with public prize pools",
        ],
      },
      {
        title: "A clean and fair trading experience",
        paragraphs: [
          "Our goal is to keep the platform readable, transparent, and easy to navigate, from the homepage and FAQ to the trading terminal itself.",
          "That means fewer distractions, faster onboarding, and a structure users can trust while learning or trading live.",
        ],
      },
    ],
  },
  "how-it-works": {
    key: "how-it-works",
    path: "/how-it-works",
    eyebrow: "How It Works",
    title: "How to trade OTC markets on {platformName}",
    description:
      "New to trading? Follow the steps from account creation and instant demo access to live trade placement and withdrawals on {platformName}.",
    seoTitle: "How to Trade OTC Markets | Step-by-Step Guide - {platformName}",
    seoDescription:
      "New to trading? Our simple guide explains how to get started with {platformName}, from demo to live trading.",
    keywords: "how to trade OTC markets, best trading platform for beginners, free demo trading account, mobile trading",
    sections: [
      {
        title: "Step 1: Create your account",
        paragraphs: [
          "Sign up on {platformName} to unlock the dashboard, public trading tools, and access to the account funding area when you are ready.",
        ],
      },
      {
        title: "Step 2: Start with demo access",
        paragraphs: [
          "Use the instant demo environment to explore the platform, read chart movement, and learn how the investment and expiry controls work together.",
        ],
      },
      {
        title: "Step 3: Choose your asset and timeframe",
        paragraphs: [
          "Select the OTC market you want to trade, review the payout percentage, and choose the amount and duration that match your plan.",
        ],
      },
      {
        title: "Step 4: Place a higher or lower trade",
        paragraphs: [
          "Confirm your direction, place the trade, and monitor the live chart while the position remains active until expiry.",
        ],
      },
      {
        title: "Step 5: Review results and withdraw",
        paragraphs: [
          "After the trade ends, review the outcome in your account and use the funding area when you are ready to manage withdrawals.",
        ],
      },
    ],
  },
  "trading-guide": {
    key: "trading-guide",
    path: "/trading-guide",
    eyebrow: "Education",
    title: "Trading guide for new and active users",
    description:
      "Read a practical guide to OTC trading basics, chart review, demo usage, and risk awareness before using {platformName}.",
    seoTitle: "OTC Trading Guide for Beginners | {platformName}",
    seoDescription:
      "Read the {platformName} trading guide covering OTC markets, demo accounts, chart usage, and risk-aware trade planning.",
    keywords: "trading guide, OTC trading basics, demo trading guide, real-time chart guide",
    sections: [
      {
        title: "Start with the demo environment",
        paragraphs: [
          "A demo account is useful for learning the interface, testing market selection, and understanding how chart and trade controls work together.",
        ],
      },
      {
        title: "Read the chart before entering a position",
        paragraphs: [
          "Users should spend time reviewing price movement, short-term behavior, and timing windows instead of reacting to a single move.",
        ],
        bullets: [
          "Check the selected pair carefully",
          "Review the chart timeframe before acting",
          "Confirm trade amount and duration before submission",
          "Avoid overtrading during uncertain price action",
        ],
      },
      {
        title: "Use risk-aware trade sizing",
        paragraphs: [
          "Smaller positions can help reduce pressure while learning the platform. Users should only trade with amounts they understand and can manage responsibly.",
        ],
      },
      {
        title: "Keep records and review outcomes",
        paragraphs: [
          "The most useful trading routine includes reviewing past positions, checking account history, and learning from both winning and losing sessions.",
        ],
      },
    ],
  },
  faq: {
    key: "faq",
    path: "/faq",
    eyebrow: "FAQ",
    title: "Frequently asked questions",
    description: "Find answers about deposits, withdrawals, bonuses, tournaments, and OTC trading on {platformName}.",
    seoTitle: "Frequently Asked Questions | {platformName}",
    seoDescription:
      "Find answers about deposits, withdrawals, bonuses, tournaments, and trading on {platformName}.",
    keywords: "init option faq, demo account, fast withdrawals, welcome bonus, weekly trading tournaments",
    sections: [
      {
        title: "Answers for new and active traders",
        paragraphs: [
          "This FAQ page covers the account, funding, tournament, and trading questions visitors ask most often before opening a live account.",
        ],
        bullets: [
          "Account creation and demo access",
          "Deposits and withdrawals",
          "Bonuses and promotions",
          "Trading tournaments and platform usage",
        ],
      },
    ],
    faqItems: [
      {
        question: "How do I get the welcome bonus?",
        answer: "Make your first deposit of at least $30 and you will automatically receive a 70% bonus.",
      },
      {
        question: "Can I use a free demo account before trading live?",
        answer:
          "Yes. Demo access is available instantly so you can practice on the platform before using real funds.",
      },
      {
        question: "How do withdrawals work on {platformName}?",
        answer:
          "Withdrawal requests are made from the account funding area, where users can also track request status and completed payouts.",
      },
      {
        question: "Does {platformName} offer weekly trading tournaments?",
        answer:
          "Yes. The tournaments page lists active and upcoming competitions with entry fees, prize pools, and countdown schedules.",
      },
      {
        question: "Can I trade from my phone?",
        answer:
          "Yes. The platform is mobile-friendly, so you can monitor real-time charts and place trades from desktop or mobile.",
      },
      {
        question: "How do I place a trade?",
        answer:
          "Choose an asset, select the expiry, set the investment amount, pick your direction, and confirm the trade from the chart screen.",
      },
    ],
  },
  terms: {
    key: "terms",
    path: "/terms",
    eyebrow: "Legal",
    title: "Terms and conditions",
    description:
      "Review the public platform terms that describe account use, access expectations, and user responsibilities on {platformName}.",
    seoTitle: "Terms & Conditions | {platformName}",
    seoDescription: "Read the terms of service for {platformName}.",
    keywords: "trading platform terms, account terms and conditions, platform usage policy",
    sections: [
      {
        title: "General use",
        paragraphs: [
          "{platformName} provides access to public platform information, account tools, and trading-related interface features subject to applicable rules and platform policies.",
          "By using the site, visitors agree to act lawfully, provide accurate account information, and avoid abuse of platform resources.",
        ],
      },
      {
        title: "Account responsibilities",
        paragraphs: [
          "Users are responsible for keeping account credentials secure and reviewing platform notices related to account changes, verification, and risk disclosures.",
        ],
      },
      {
        title: "Bonus usage and withdrawal policy",
        paragraphs: [
          "Welcome bonuses and promotional bonuses are provided for trading purposes only and are not immediately withdrawable.",
          "Any profit generated using bonus funds remains locked until the required trading turnover conditions are completed.",
        ],
        bullets: [
          "Trading requirement: users must complete a minimum turnover target, such as 30x the bonus amount, before withdrawals are unlocked.",
          "Example: a $100 bonus may require $3,000 in total traded volume before withdrawal eligibility is granted.",
          "Mixed funds rule: if real funds and bonus funds are used together, withdrawal access may still remain restricted until bonus conditions are fulfilled.",
          "Abuse prevention: creating multiple accounts for bonus claims, using arbitrage or risk-free exploitation strategies, and immediate cash-out attempts may lead to bonus cancellation, profit forfeiture, or account suspension.",
          "Bonus expiry: bonus conditions may expire after a defined period if turnover requirements are not met.",
        ],
      },
      {
        title: "Service changes",
        paragraphs: [
          "Platform features, markets, and account workflows may change over time as the product evolves or compliance requirements are updated.",
        ],
      },
    ],
  },
  privacy: {
    key: "privacy",
    path: "/privacy",
    eyebrow: "Policy",
    title: "Privacy policy",
    description:
      "Review how {platformName} handles account information, support data, and platform activity in the public privacy policy.",
    seoTitle: "Privacy Policy | {platformName}",
    seoDescription: "Learn how we protect your personal information on {platformName}.",
    keywords: "privacy policy trading platform, account privacy policy, data handling policy",
    sections: [
      {
        title: "Information we use",
        paragraphs: [
          "{platformName} may process information related to account access, support interactions, and platform operations in order to provide core product functionality.",
        ],
      },
      {
        title: "Why information is processed",
        paragraphs: [
          "Data may be used to support account access, improve platform reliability, respond to support requests, and maintain system security.",
        ],
      },
      {
        title: "User control and security",
        paragraphs: [
          "Users should keep credentials secure and review account settings regularly. Sensitive account actions should always be performed carefully and only through official platform pages.",
        ],
      },
    ],
  },
  "risk-disclaimer": {
    key: "risk-disclaimer",
    path: "/risk-disclaimer",
    eyebrow: "Disclosure",
    title: "Risk disclaimer",
    description:
      "Read the risk disclaimer for {platformName} and understand that trading decisions involve uncertainty and should be approached carefully.",
    seoTitle: "Risk Disclaimer | {platformName}",
    seoDescription:
      "Review the {platformName} risk disclaimer and understand the importance of careful trade planning, demo practice, and responsible decision-making.",
    keywords: "trading risk disclaimer, OTC trading risk, demo account risk notice",
    sections: [
      {
        title: "Trading involves risk",
        paragraphs: [
          "Any trading activity involves uncertainty. Users should understand that market outcomes can change quickly and should never treat past behavior as a guarantee of future results.",
        ],
      },
      {
        title: "Education comes first",
        paragraphs: [
          "A demo environment, clear platform guidance, and careful review of account settings can help users understand the product before making live decisions.",
        ],
      },
      {
        title: "Responsible use",
        paragraphs: [
          "Users should act responsibly, understand the tools they are using, and avoid taking positions they do not fully understand.",
        ],
      },
    ],
  },
};

const EDITABLE_PUBLIC_PAGE_KEYS = {
  about: "about",
  "how-it-works": "howItWorks",
  faq: "faq",
} as const;

type EditablePublicPageKey = (typeof EDITABLE_PUBLIC_PAGE_KEYS)[keyof typeof EDITABLE_PUBLIC_PAGE_KEYS];

const getEditablePublicPageKey = (pageKey: PublicPageKey): EditablePublicPageKey | null =>
  EDITABLE_PUBLIC_PAGE_KEYS[pageKey as keyof typeof EDITABLE_PUBLIC_PAGE_KEYS] ?? null;

const resolvePublicPageOverride = (
  pageKey: PublicPageKey,
  rawWebsiteContent: unknown,
  platformName: string,
) => {
  const editableKey = getEditablePublicPageKey(pageKey);
  if (!editableKey) return null;

  return normalizeWebsiteContent(rawWebsiteContent, platformName).publicPages[editableKey];
};

export const resolvePublicPageDefinition = (
  pageKey: PublicPageKey,
  rawWebsiteContent?: unknown,
  platformName = DEFAULT_PLATFORM_NAME,
): PublicPageDefinition => {
  const page = PUBLIC_PAGE_DEFINITIONS[pageKey];
  const override = resolvePublicPageOverride(pageKey, rawWebsiteContent, platformName);

  if (!override) {
    return {
      ...page,
      sections: cloneSections(page.sections),
      faqItems: page.faqItems ? page.faqItems.map((item) => ({ ...item })) : undefined,
    };
  }

  return {
    ...page,
    eyebrow: override.eyebrow,
    title: override.title,
    description: override.description,
    seoTitle: override.seoTitle,
    seoDescription: override.seoDescription,
    keywords: override.keywords,
    sections: override.sections.map((section) => ({
      title: section.title,
      paragraphs: [...section.paragraphs],
      bullets: section.bullets.length ? [...section.bullets] : undefined,
    })),
    faqItems: override.faqItems.length ? override.faqItems.map((item) => ({ ...item })) : page.faqItems,
  };
};

export const PUBLIC_PAGE_LIST = Object.values(PUBLIC_PAGE_DEFINITIONS);

export const getPublicPageByPath = (
  pathname: string,
  rawWebsiteContent?: unknown,
  platformName = DEFAULT_PLATFORM_NAME,
) => {
  const page = PUBLIC_PAGE_LIST.find((entry) => entry.path === pathname);
  return page ? resolvePublicPageDefinition(page.key, rawWebsiteContent, platformName) : null;
};
