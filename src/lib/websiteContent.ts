import { DEFAULT_PLATFORM_NAME } from "./platformMetadataShared.js";
import {
  STARTER_BLOG_POSTS,
  getStarterBlogCategories,
} from "./blogStarterContent.js";
import type { BlogCategoryDefinition, BlogPostDefinition } from "./blogPosts.js";

export interface WebsiteFeatureCardContent {
  title: string;
  text: string;
}

export interface WebsiteStepContent {
  title: string;
  text: string;
  cta: string;
}

export interface WebsiteFaqItem {
  question: string;
  answer: string;
}

export interface WebsiteSocialLinkItem {
  platform: string;
  handle: string;
  url: string;
}

export interface WebsiteTradingDefaults {
  chartBackgroundImage: string;
  chartBackgroundOpacity: number;
}

export interface WebsitePublicPageSectionContent {
  title: string;
  paragraphs: string[];
  bullets: string[];
}

export interface WebsitePublicPageContent {
  eyebrow: string;
  title: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string;
  sections: WebsitePublicPageSectionContent[];
  faqItems: WebsiteFaqItem[];
}

export const GUIDE_MEDIA_KEYS = [
  "chart",
  "profile",
  "finance",
  "security",
  "chat",
  "market",
  "orders",
  "tournament",
  "settings",
  "mobile",
  "signals",
  "wallet",
  "support",
  "videoTrading",
  "videoMobile",
] as const;

export type GuideMediaKey = (typeof GUIDE_MEDIA_KEYS)[number];
export type GuideMediaSettings = Partial<Record<GuideMediaKey, string>>;

export interface WebsiteContent {
  tradingDefaults: WebsiteTradingDefaults;
  guideMedia: GuideMediaSettings;
  blog: {
    categories: BlogCategoryDefinition[];
    posts: BlogPostDefinition[];
  };
  hero: {
    badge: string;
    title: string;
    description: string;
    primaryButtonLabel: string;
    secondaryButtonLabel: string;
    trustItems: string[];
  };
  features: {
    paymentLogos: string[];
    cards: WebsiteFeatureCardContent[];
  };
  markets: {
    title: string;
    description: string;
    actionCardTitle: string;
    actionCardText: string;
    upButtonLabel: string;
    downButtonLabel: string;
  };
  mobile: {
    title: string;
    description: string;
    installLabel: string;
  };
  review: {
    title: string;
    subtitle: string;
    quote: string;
    reviewerName: string;
    reviewerRole: string;
    rating: string;
  };
  steps: {
    title: string;
    subtitle: string;
    items: WebsiteStepContent[];
  };
  faq: {
    title: string;
    subtitle: string;
    items: WebsiteFaqItem[];
  };
  finalCta: {
    title: string;
    primaryButtonLabel: string;
    secondaryButtonLabel: string;
  };
  footer: {
    description: string;
    riskWarning: string;
    pills: string[];
  };
  socialLinks: {
    title: string;
    subtitle: string;
    items: WebsiteSocialLinkItem[];
  };
  publicPages: {
    about: WebsitePublicPageContent;
    howItWorks: WebsitePublicPageContent;
    faq: WebsitePublicPageContent;
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toStringValue = (value: unknown, fallback = "") =>
  typeof value === "string" && value.trim().length > 0 ? value : fallback;

const toImageSourceValue = (value: unknown, fallback = "") => {
  if (typeof value !== "string") return fallback;

  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (/^(https?:\/\/|data:image\/)/i.test(trimmed)) return trimmed;
  return fallback;
};

const toPercentValue = (value: unknown, fallback: number) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.max(0, Math.min(100, Math.round(numericValue))) : fallback;
};

const toStringArray = (value: unknown, fallback: string[]) =>
  Array.isArray(value)
    ? fallback.map((defaultValue, index) => toStringValue(value[index], defaultValue))
    : fallback;

const normalizeComparableText = (value: unknown) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ").toLowerCase() : "";

const isLegacyHomepageHero = (hero: Record<string, unknown>) => {
  const title = normalizeComparableText(hero.title);
  const description = normalizeComparableText(hero.description);

  return (
    title === "the smarter way to trade and earn."
    || title === "the smarter way to trade and earn"
    || (
      title.includes("trade and earn")
      && description.includes("start trading in seconds")
    )
  );
};

const normalizeFeatureCards = (value: unknown, fallback: WebsiteFeatureCardContent[]) =>
  fallback.map((defaultItem, index) => {
    const source = Array.isArray(value) && isRecord(value[index]) ? value[index] : {};
    return {
      title: toStringValue(source.title, defaultItem.title),
      text: toStringValue(source.text, defaultItem.text),
    };
  });

const normalizeStepItems = (value: unknown, fallback: WebsiteStepContent[]) =>
  fallback.map((defaultItem, index) => {
    const source = Array.isArray(value) && isRecord(value[index]) ? value[index] : {};
    return {
      title: toStringValue(source.title, defaultItem.title),
      text: toStringValue(source.text, defaultItem.text),
      cta: toStringValue(source.cta, defaultItem.cta),
    };
  });

const normalizeFaqItems = (value: unknown, fallback: WebsiteFaqItem[]) =>
  fallback.map((defaultItem, index) => {
    const source = Array.isArray(value) && isRecord(value[index]) ? value[index] : {};
    return {
      question: toStringValue(source.question, defaultItem.question),
      answer: toStringValue(source.answer, defaultItem.answer),
    };
  });

const normalizeSocialLinkItems = (value: unknown, fallback: WebsiteSocialLinkItem[]) => {
  if (!Array.isArray(value) || !value.length) {
    return fallback;
  }

  const normalizedItems = value
    .filter(isRecord)
    .map((source, index) => {
      const defaultItem = fallback[index] ?? { platform: "", handle: "", url: "" };

      return {
        platform: toStringValue(source.platform, defaultItem.platform),
        handle: toStringValue(source.handle, defaultItem.handle),
        url: toStringValue(source.url, defaultItem.url),
      };
    });

  return normalizedItems.length ? normalizedItems : fallback;
};

const normalizePublicPageSections = (value: unknown, fallback: WebsitePublicPageSectionContent[]) =>
  fallback.map((defaultItem, index) => {
    const source = Array.isArray(value) && isRecord(value[index]) ? value[index] : {};

    return {
      title: toStringValue(source.title, defaultItem.title),
      paragraphs: toStringArray(source.paragraphs, defaultItem.paragraphs),
      bullets: toStringArray(source.bullets, defaultItem.bullets),
    };
  });

const normalizePublicPageContent = (value: unknown, fallback: WebsitePublicPageContent): WebsitePublicPageContent => {
  const source = isRecord(value) ? value : {};

  return {
    eyebrow: toStringValue(source.eyebrow, fallback.eyebrow),
    title: toStringValue(source.title, fallback.title),
    description: toStringValue(source.description, fallback.description),
    seoTitle: toStringValue(source.seoTitle, fallback.seoTitle),
    seoDescription: toStringValue(source.seoDescription, fallback.seoDescription),
    keywords: toStringValue(source.keywords, fallback.keywords),
    sections: normalizePublicPageSections(source.sections, fallback.sections),
    faqItems: normalizeFaqItems(source.faqItems, fallback.faqItems),
  };
};

const normalizeGuideMedia = (value: unknown): GuideMediaSettings => {
  const source = isRecord(value) ? value : {};

  return GUIDE_MEDIA_KEYS.reduce<GuideMediaSettings>((accumulator, key) => {
    const mediaUrl = source[key];
    if (typeof mediaUrl === "string" && mediaUrl.trim()) {
      accumulator[key] = mediaUrl.trim();
    }
    return accumulator;
  }, {});
};

const normalizeBlogCategories = (value: unknown, fallback: BlogCategoryDefinition[]) =>
  Array.isArray(value) && value.length
    ? value
        .filter(isRecord)
        .map((entry, index) => ({
          id: toStringValue(entry.id, fallback[index]?.id ?? `blog-category-${index + 1}`),
          name: toStringValue(entry.name, fallback[index]?.name ?? `Category ${index + 1}`),
          slug: toStringValue(entry.slug, fallback[index]?.slug ?? `category-${index + 1}`),
          description: toStringValue(entry.description, fallback[index]?.description ?? ""),
        }))
    : fallback;

const normalizeBlogPosts = (
  value: unknown,
  fallbackPosts: BlogPostDefinition[],
) =>
  Array.isArray(value) && value.length
    ? value
        .filter(isRecord)
        .map((entry, index) => ({
          id: toStringValue(entry.id, fallbackPosts[index]?.id ?? `blog-post-${index + 1}`),
          title: toStringValue(entry.title, fallbackPosts[index]?.title ?? `Blog post ${index + 1}`),
          slug: toStringValue(entry.slug, fallbackPosts[index]?.slug ?? `blog-post-${index + 1}`),
          excerpt: toStringValue(entry.excerpt, fallbackPosts[index]?.excerpt ?? ""),
          contentHtml: toStringValue(entry.contentHtml, fallbackPosts[index]?.contentHtml ?? "<p></p>"),
          featuredImageUrl: toStringValue(entry.featuredImageUrl, fallbackPosts[index]?.featuredImageUrl ?? ""),
          featuredImageAlt: toStringValue(entry.featuredImageAlt, fallbackPosts[index]?.featuredImageAlt ?? ""),
          metaTitle: toStringValue(entry.metaTitle, fallbackPosts[index]?.metaTitle ?? ""),
          metaDescription: toStringValue(entry.metaDescription, fallbackPosts[index]?.metaDescription ?? ""),
          publishedAt: toStringValue(
            entry.publishedAt,
            fallbackPosts[index]?.publishedAt ?? new Date().toISOString(),
          ),
          updatedAt: toStringValue(
            entry.updatedAt,
            fallbackPosts[index]?.updatedAt ?? new Date().toISOString(),
          ),
          status:
            entry.status === "draft" || entry.status === "published"
              ? entry.status
              : (fallbackPosts[index]?.status ?? "draft"),
          authorName: toStringValue(entry.authorName, fallbackPosts[index]?.authorName ?? "Init Option Team"),
          categories: normalizeBlogCategories(
            entry.categories,
            fallbackPosts[index]?.categories ?? getStarterBlogCategories(),
          ),
        }))
    : fallbackPosts;

export const createDefaultWebsiteContent = (platformName = DEFAULT_PLATFORM_NAME): WebsiteContent => ({
  guideMedia: {},
  blog: {
    categories: getStarterBlogCategories(),
    posts: STARTER_BLOG_POSTS,
  },
  hero: {
    badge: "Trade financial markets with up to 95% profit",
    title: `${platformName} trading platform for market analysis, demo access, and fast withdrawals.`,
    description:
      `${platformName} brings real-time charts, instant demo trading, weekly tournaments, M-PESA and crypto funding, and a clean web terminal for beginners and active traders alike.`,
    primaryButtonLabel: "Create live account",
    secondaryButtonLabel: "Start instant demo",
    trustItems: [
      "70% welcome bonus on your first deposit",
      "Instant demo account with real-time charts",
      "Fast withdrawals and secure funding options",
    ],
  },
  features: {
    paymentLogos: ["VISA", "Mastercard", "M-PESA", "Plisio", "USDT (TRC20)", "Bitcoin"],
    cards: [
      {
        title: "High-profit trading",
        text: "Trade financial markets with clear payouts, real-time price action, and fast higher-or-lower execution from one focused screen.",
      },
      {
        title: "Weekly tournaments",
        text: "Join low-entry competitions with public prize pools, countdowns, and tournament pages designed for discovery.",
      },
      {
        title: "Instant demo access",
        text: "Open the demo terminal immediately to practice timing, trade placement, and chart reading before moving live.",
      },
      {
        title: "Web and mobile terminal",
        text: "Monitor the same markets on desktop or mobile with responsive charts, clear controls, and secure account funding.",
      },
    ],
  },
  markets: {
    title: "Analyze real-time charts and place trades from one modern trading terminal.",
    description: "",
    actionCardTitle: "Fast trade setup",
    actionCardText: "Choose your asset, set the amount and time, then place a higher or lower trade without leaving the chart.",
    upButtonLabel: "Higher",
    downButtonLabel: "Lower",
  },
  mobile: {
    title: "Trade from mobile without losing visibility.",
    description:
      "The mobile trading interface keeps the latest chart movement, payouts, and execution controls visible so users can react quickly on smaller screens.",
    installLabel: "Web terminal and Android-ready access",
  },
  review: {
    title: `Why traders choose ${platformName}`,
    subtitle: "Built for clean execution, fast account flow, and easier trading",
    quote:
      "I could move from demo to live without friction because the platform keeps payouts, chart movement, and execution tools in one clear place.",
    reviewerName: "Samuel T.",
    reviewerRole: "Trader",
    rating: "4.9",
  },
  steps: {
    title: "Start trading in 3 clear steps",
    subtitle: "Open your account, practice with demo funds, and move into live trading when you are ready.",
    items: [
      {
        title: "Create your account",
        text: `Sign up on ${platformName} and get immediate access to the dashboard, public trading tools, and demo balance.`,
        cta: "Open account now",
      },
      {
        title: "Practice with demo mode",
        text: "Use virtual funds to learn chart movement, timing, and trade placement before funding your live balance.",
        cta: "Launch demo terminal",
      },
      {
        title: "Deposit and trade live",
        text: "Fund your account, choose an asset and expiry, and place live trades with clear payout visibility.",
        cta: "Go to secure deposit",
      },
    ],
  },
  faq: {
    title: "Trading platform FAQ",
    subtitle: "Questions new visitors ask before opening a live trading account.",
    items: [
      {
        question: "How do I get the welcome bonus?",
        answer: "Make your first deposit of at least $30 and you will automatically receive a 70% bonus.",
      },
      {
        question: "Can I start with a free demo trading account?",
        answer:
          "Yes. You can begin with instant demo access to explore the chart, choose assets, and practice trade placement before going live.",
      },
      {
        question: "Which markets can I trade on the platform?",
        answer:
          "The platform supports trading across currencies, crypto, commodities, and selected stock-linked instruments.",
      },
      {
        question: "Are fast withdrawals available?",
        answer:
          "Yes. The funding area is built around quick deposit and withdrawal requests with clear status tracking for users.",
      },
      {
        question: "Does Init Option run trading tournaments?",
        answer:
          "Yes. Weekly tournaments with low entry fees, published prize pools, and countdown-based schedules are available when events are active.",
      },
      {
        question: "Can I trade from mobile?",
        answer:
          "Yes. The trading interface is responsive, so users can monitor charts and execute trades from both desktop and mobile devices.",
      },
      {
        question: "Is this trading platform suitable for beginners?",
        answer:
          "Yes. Beginners can use the demo account, how-it-works content, and FAQ guidance to learn the platform before using real funds.",
      },
      {
        question: "What should I review before placing a trade?",
        answer:
          "Before placing a trade, review the selected asset, direction, investment amount, expiry time, and current chart movement.",
      },
    ],
  },
  finalCta: {
    title: `${platformName} offers advanced trading tools, market analysis, risk management features, and educational resources for traders of all levels.`,
    primaryButtonLabel: "Open live account",
    secondaryButtonLabel: "Try demo account",
  },
  footer: {
    description:
      `${platformName} provides comprehensive trading solutions with advanced charting tools, multiple asset classes, competitive spreads, and 24/7 market access for serious traders.`,
    riskWarning:
      "Risk warning: Trading and similar high-risk products can lead to rapid gains or losses. Practice with demo funds first and only trade money you can afford to lose.",
    pills: ["Trading", "Real-Time Charts", "Demo Account", "Fast Withdrawals", "Trading Tournaments", "Mobile Trading"],
  },
  tradingDefaults: {
    chartBackgroundImage: "",
    chartBackgroundOpacity: 66,
  },
  socialLinks: {
    title: "Follow Init Option",
    subtitle: "Open our official channels for updates, support, and new trading content.",
    items: [
      {
        platform: "Telegram",
        handle: "@initoption",
        url: "https://t.me/initoption",
      },
      {
        platform: "WhatsApp",
        handle: "WhatsApp support",
        url: "https://wa.me/254700000000",
      },
      {
        platform: "Instagram",
        handle: "@initoption",
        url: "https://instagram.com/initoption",
      },
      {
        platform: "Facebook",
        handle: "Init Option",
        url: "https://facebook.com/initoption",
      },
      {
        platform: "YouTube",
        handle: "Init Option",
        url: "https://youtube.com/@initoption",
      },
      {
        platform: "X",
        handle: "@initoption",
        url: "https://x.com/initoption",
      },
      {
        platform: "TikTok",
        handle: "@initoption",
        url: "https://tiktok.com/@initoption",
      },
    ],
  },
  publicPages: {
    about: {
      eyebrow: "About",
      title: `About ${platformName}`,
      description:
        `${platformName} is a modern trading platform focused on clean charting, fast withdrawals, high payouts, and a fair trading environment for every session.`,
      seoTitle: `About ${platformName} - Our Story & Mission`,
      seoDescription:
        `Learn about ${platformName}, the modern trading platform. We offer a clean web terminal, high payouts, and a fair trading environment.`,
      keywords: "about init option, trading platform, high profit trading platform, modern web terminal",
      sections: [
        {
          title: "Our mission",
          paragraphs: [
            `${platformName} was built to give traders a cleaner, faster path into trading with a web terminal that feels simple from the first click.`,
            "We focus on clear chart visibility, responsive execution, and a fair trading environment that supports both beginners and active users.",
          ],
          bullets: [],
        },
        {
          title: `Why traders choose ${platformName}`,
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
          bullets: [],
        },
      ],
      faqItems: [],
    },
    howItWorks: {
      eyebrow: "How It Works",
      title: `How to trade on ${platformName}`,
      description:
        "New to trading? Follow the steps from account creation and instant demo access to live trade placement and withdrawals.",
      seoTitle: `How to Trade | Step-by-Step Guide - ${platformName}`,
      seoDescription:
        "New to trading? Our simple guide explains how to get started with Init Option, from demo to live trading.",
      keywords: "how to trade online, best trading platform for beginners, free demo trading account, mobile trading",
      sections: [
        {
          title: "Step 1: Create your account",
          paragraphs: [
            `Sign up on ${platformName} to unlock the dashboard, public trading tools, and access to the account funding area when you are ready.`,
          ],
          bullets: [],
        },
        {
          title: "Step 2: Start with demo access",
          paragraphs: [
            "Use the instant demo environment to explore the platform, read chart movement, and learn how the investment and expiry controls work together.",
          ],
          bullets: [],
        },
        {
          title: "Step 3: Choose your asset and timeframe",
          paragraphs: [
            "Select the market you want to trade, review the payout percentage, and choose the amount and duration that match your plan.",
          ],
          bullets: [],
        },
        {
          title: "Step 4: Place a higher or lower trade",
          paragraphs: [
            "Confirm your direction, place the trade, and monitor the live chart while the position remains active until expiry.",
          ],
          bullets: [],
        },
        {
          title: "Step 5: Review results and withdraw",
          paragraphs: [
            "After the trade ends, review the outcome in your account and use the funding area when you are ready to manage withdrawals.",
          ],
          bullets: [],
        },
      ],
      faqItems: [],
    },
    faq: {
      eyebrow: "FAQ",
      title: "Frequently asked questions",
      description:
        `Find answers about deposits, withdrawals, bonuses, tournaments, and trading on ${platformName}.`,
      seoTitle: `Frequently Asked Questions | ${platformName}`,
      seoDescription:
        "Find answers about deposits, withdrawals, bonuses, tournaments, and trading on Init Option.",
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
          question: "How do withdrawals work on Init Option?",
          answer:
            "Withdrawal requests are made from the account funding area, where users can also track request status and completed payouts.",
        },
        {
          question: "Does Init Option offer weekly trading tournaments?",
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
  },
});

export const normalizeWebsiteContent = (rawValue: unknown, platformName = DEFAULT_PLATFORM_NAME): WebsiteContent => {
  const defaults = createDefaultWebsiteContent(platformName);

  let parsedValue = rawValue;
  if (typeof rawValue === "string" && rawValue.trim()) {
    try {
      parsedValue = JSON.parse(rawValue) as unknown;
    } catch {
      parsedValue = null;
    }
  }

  const content = isRecord(parsedValue) ? parsedValue : {};
  const hero = isRecord(content.hero) ? content.hero : {};
  const features = isRecord(content.features) ? content.features : {};
  const markets = isRecord(content.markets) ? content.markets : {};
  const mobile = isRecord(content.mobile) ? content.mobile : {};
  const review = isRecord(content.review) ? content.review : {};
  const steps = isRecord(content.steps) ? content.steps : {};
  const faq = isRecord(content.faq) ? content.faq : {};
  const finalCta = isRecord(content.finalCta) ? content.finalCta : {};
  const footer = isRecord(content.footer) ? content.footer : {};
  const tradingDefaults = isRecord(content.tradingDefaults) ? content.tradingDefaults : {};
  const socialLinks = isRecord(content.socialLinks) ? content.socialLinks : {};
  const publicPages = isRecord(content.publicPages) ? content.publicPages : {};
  const blog = isRecord(content.blog) ? content.blog : {};
  const normalizedBlogCategories = normalizeBlogCategories(blog.categories, defaults.blog.categories);
  const shouldUseDefaultHero = isLegacyHomepageHero(hero);

  return {
    guideMedia: normalizeGuideMedia(content.guideMedia),
    blog: {
      categories: normalizedBlogCategories,
      posts: normalizeBlogPosts(blog.posts, defaults.blog.posts),
    },
    hero: {
      badge: shouldUseDefaultHero ? defaults.hero.badge : toStringValue(hero.badge, defaults.hero.badge),
      title: shouldUseDefaultHero ? defaults.hero.title : toStringValue(hero.title, defaults.hero.title),
      description: shouldUseDefaultHero ? defaults.hero.description : toStringValue(hero.description, defaults.hero.description),
      primaryButtonLabel: shouldUseDefaultHero
        ? defaults.hero.primaryButtonLabel
        : toStringValue(hero.primaryButtonLabel, defaults.hero.primaryButtonLabel),
      secondaryButtonLabel: shouldUseDefaultHero
        ? defaults.hero.secondaryButtonLabel
        : toStringValue(hero.secondaryButtonLabel, defaults.hero.secondaryButtonLabel),
      trustItems: shouldUseDefaultHero ? defaults.hero.trustItems : toStringArray(hero.trustItems, defaults.hero.trustItems),
    },
    features: {
      paymentLogos: toStringArray(features.paymentLogos, defaults.features.paymentLogos),
      cards: normalizeFeatureCards(features.cards, defaults.features.cards),
    },
    markets: {
      title: toStringValue(markets.title, defaults.markets.title),
      description: toStringValue(markets.description, defaults.markets.description),
      actionCardTitle: toStringValue(markets.actionCardTitle, defaults.markets.actionCardTitle),
      actionCardText: toStringValue(markets.actionCardText, defaults.markets.actionCardText),
      upButtonLabel: toStringValue(markets.upButtonLabel, defaults.markets.upButtonLabel),
      downButtonLabel: toStringValue(markets.downButtonLabel, defaults.markets.downButtonLabel),
    },
    mobile: {
      title: toStringValue(mobile.title, defaults.mobile.title),
      description: toStringValue(mobile.description, defaults.mobile.description),
      installLabel: toStringValue(mobile.installLabel, defaults.mobile.installLabel),
    },
    review: {
      title: toStringValue(review.title, defaults.review.title),
      subtitle: toStringValue(review.subtitle, defaults.review.subtitle),
      quote: toStringValue(review.quote, defaults.review.quote),
      reviewerName: toStringValue(review.reviewerName, defaults.review.reviewerName),
      reviewerRole: toStringValue(review.reviewerRole, defaults.review.reviewerRole),
      rating: toStringValue(review.rating, defaults.review.rating),
    },
    steps: {
      title: toStringValue(steps.title, defaults.steps.title),
      subtitle: toStringValue(steps.subtitle, defaults.steps.subtitle),
      items: normalizeStepItems(steps.items, defaults.steps.items),
    },
    faq: {
      title: toStringValue(faq.title, defaults.faq.title),
      subtitle: toStringValue(faq.subtitle, defaults.faq.subtitle),
      items: normalizeFaqItems(faq.items, defaults.faq.items),
    },
    finalCta: {
      title: toStringValue(finalCta.title, defaults.finalCta.title),
      primaryButtonLabel: toStringValue(finalCta.primaryButtonLabel, defaults.finalCta.primaryButtonLabel),
      secondaryButtonLabel: toStringValue(finalCta.secondaryButtonLabel, defaults.finalCta.secondaryButtonLabel),
    },
    footer: {
      description: toStringValue(footer.description, defaults.footer.description),
      riskWarning: toStringValue(footer.riskWarning, defaults.footer.riskWarning),
      pills: toStringArray(footer.pills, defaults.footer.pills),
    },
    tradingDefaults: {
      chartBackgroundImage: toImageSourceValue(
        tradingDefaults.chartBackgroundImage,
        defaults.tradingDefaults.chartBackgroundImage,
      ),
      chartBackgroundOpacity: toPercentValue(
        tradingDefaults.chartBackgroundOpacity,
        defaults.tradingDefaults.chartBackgroundOpacity,
      ),
    },
    socialLinks: {
      title: toStringValue(socialLinks.title, defaults.socialLinks.title),
      subtitle: toStringValue(socialLinks.subtitle, defaults.socialLinks.subtitle),
      items: normalizeSocialLinkItems(socialLinks.items, defaults.socialLinks.items),
    },
    publicPages: {
      about: normalizePublicPageContent(publicPages.about, defaults.publicPages.about),
      howItWorks: normalizePublicPageContent(publicPages.howItWorks, defaults.publicPages.howItWorks),
      faq: normalizePublicPageContent(publicPages.faq, defaults.publicPages.faq),
    },
  };
};

export const serializeWebsiteContent = (content: WebsiteContent) => JSON.stringify(content);
