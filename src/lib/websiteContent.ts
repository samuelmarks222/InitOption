import { DEFAULT_PLATFORM_NAME } from "./platformMetadataShared.ts";

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

export interface WebsiteContent {
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
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toStringValue = (value: unknown, fallback = "") =>
  typeof value === "string" && value.trim().length > 0 ? value : fallback;

const toStringArray = (value: unknown, fallback: string[]) =>
  Array.isArray(value)
    ? fallback.map((defaultValue, index) => toStringValue(value[index], defaultValue))
    : fallback;

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

export const createDefaultWebsiteContent = (platformName = DEFAULT_PLATFORM_NAME): WebsiteContent => ({
  hero: {
    badge: "Digital options platform",
    title: "Trade OTC markets with speed, clarity, and full control.",
    description: `${platformName} gives traders a clean web terminal, instant demo access, and a faster path from practice to live execution across desktop and mobile.`,
    primaryButtonLabel: "Create account",
    secondaryButtonLabel: "Open demo account",
    trustItems: ["Instant demo access", "Responsive mobile terminal", "Secure funding workflow"],
  },
  features: {
    paymentLogos: ["VISA", "Mastercard", "USDT", "Bitcoin"],
    cards: [
      {
        title: "Clear trading workspace",
        text: "Keep price action, payout, timer, and direction buttons visible in one focused layout.",
      },
      {
        title: "Fast market execution",
        text: "Move from asset selection to order placement without losing sight of the chart.",
      },
      {
        title: "Simple account funding",
        text: "Deposits, withdrawals, and balance actions stay inside one consistent product flow.",
      },
      {
        title: "Built for every screen",
        text: "The platform remains readable and responsive across desktop, tablet, and mobile devices.",
      },
    ],
  },
  markets: {
    title: "Read the market and place the trade in one view.",
    description: `${platformName} combines chart action, entry logic, timer control, and higher or lower execution in one focused trading surface.`,
    actionCardTitle: "Trade action",
    actionCardText: "Select amount, choose time, and take direction without losing sight of the chart.",
    upButtonLabel: "Price will rise",
    downButtonLabel: "Price will fall",
  },
  mobile: {
    title: "Trade from mobile with the same terminal feel.",
    description: "The mobile layout keeps chart visibility, payout state, and execution controls clear on smaller screens.",
    installLabel: "Available on Android",
  },
  review: {
    title: `Why traders choose ${platformName}`,
    subtitle: "Feedback from platform users",
    quote:
      "The platform feels clean, fast, and easier to trust. I can move from demo practice to live trading without the layout changing on me.",
    reviewerName: "Michael R.",
    reviewerRole: "OTC trader",
    rating: "4.9",
  },
  steps: {
    title: "Start trading in 3 steps",
    subtitle: "Create an account, practice in demo mode, then move into live execution when ready.",
    items: [
      {
        title: "Create account",
        text: "Open your trading profile and get direct access to the demo workspace.",
        cta: "Start with a free account",
      },
      {
        title: "Practice on demo",
        text: "Use the demo balance to understand timing, chart movement, and payout before funding.",
        cta: "Train in demo mode",
      },
      {
        title: "Deposit and trade",
        text: "Fund the account and move into live OTC trading once your strategy is ready.",
        cta: "Go to deposit page",
      },
    ],
  },
  faq: {
    title: "Frequently asked questions",
    subtitle: "Key answers before a user signs up or funds an account.",
    items: [
      {
        question: "How do I start learning on Init Option?",
        answer: "Start in the demo account, watch the chart behavior, and practice directional entries before moving into a funded balance.",
      },
      {
        question: "Can I trade using my phone?",
        answer: "Yes. The public pages and the trading room are designed to stay readable and functional on mobile devices.",
      },
      {
        question: "How long do withdrawals take?",
        answer: "Withdrawal timing depends on the payment methods you enable and any account review requirements configured by the platform.",
      },
      {
        question: "What is the minimum deposit?",
        answer: "The minimum deposit depends on your platform settings, but users can begin learning immediately in demo mode without funding first.",
      },
      {
        question: "What does the platform show before I place a trade?",
        answer: "Users can see the asset, chart, current payout, trade amount, timer, and direction buttons before executing an order.",
      },
      {
        question: "Are there fees for deposits or withdrawals?",
        answer: "Fees depend on the payment provider enabled on the platform and any external processor charges.",
      },
      {
        question: "Can I withdraw money from the demo account?",
        answer: "No. Demo accounts are for practice only and do not support real withdrawals.",
      },
      {
        question: "Is Init Option available in every country?",
        answer: "Availability depends on the laws and restrictions of the user's jurisdiction, so regional verification is always required.",
      },
    ],
  },
  finalCta: {
    title: `${platformName} makes OTC trading simple, fast, and accessible.`,
    primaryButtonLabel: "Open real account",
    secondaryButtonLabel: "Demo account",
  },
  footer: {
    description: `${platformName} is a digital options platform focused on a clean trading experience, fast onboarding, and accessible demo practice before live execution.`,
    riskWarning:
      "Risk warning: binary options and OTC trading can produce fast gains and fast losses. Use the demo environment first and only trade capital you can afford to lose.",
    pills: ["BTC", "ETH", "USDT", "EUR/USD", "GBP/JPY", "GOLD"],
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

  return {
    hero: {
      badge: toStringValue(hero.badge, defaults.hero.badge),
      title: toStringValue(hero.title, defaults.hero.title),
      description: toStringValue(hero.description, defaults.hero.description),
      primaryButtonLabel: toStringValue(hero.primaryButtonLabel, defaults.hero.primaryButtonLabel),
      secondaryButtonLabel: toStringValue(hero.secondaryButtonLabel, defaults.hero.secondaryButtonLabel),
      trustItems: toStringArray(hero.trustItems, defaults.hero.trustItems),
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
  };
};

export const serializeWebsiteContent = (content: WebsiteContent) => JSON.stringify(content);
