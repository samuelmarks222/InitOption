import { DEFAULT_PLATFORM_NAME } from "./platformMetadataShared.js";
import { normalizeWebsiteContent } from "./websiteContent.js";

export type PublicPageKey =
  | "about"
  | "facts-and-figures"
  | "blog"
  | "contact"
  | "delete-account"
  | "features"
  | "how-it-works"
  | "why-choose-init-option"
  | "trading-guide"
  | "faq"
  | "terms"
  | "privacy"
  | "risk-disclaimer"
  | "affiliate-program"
  | "site-map";

export interface PublicPageSection {
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface PublicFaqItem {
  question: string;
  answer: string;
}

export interface PublicPageLinkItem {
  label: string;
  description: string;
  to?: `/${string}`;
  href?: string;
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
  relatedLinks?: PublicPageLinkItem[];
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
    eyebrow: "About us",
    title: "About {platformName}",
    description:
      "{platformName} is a modern OTC trading platform built around clean execution, transparent funding flows, and practical tools for both beginners and active traders.",
    seoTitle: "About {platformName} | Mission, Platform Vision & Trading Experience",
    seoDescription:
      "Learn about {platformName}, our mission, platform philosophy, and the trading experience we are building for modern OTC traders.",
    keywords:
      "about init option, OTC trading platform mission, trading platform company, web trading terminal, about init option team",
    sections: [
      {
        title: "Who we are",
        paragraphs: [
          "{platformName} was created to make short-term OTC trading simpler to understand, faster to access, and easier to manage across desktop and mobile.",
          "We focus on chart clarity, reliable account actions, and public platform information that helps users understand what they are joining before they ever make a deposit.",
        ],
      },
      {
        title: "What we believe good trading platforms should provide",
        paragraphs: [
          "A serious platform should not hide its process behind vague marketing. It should explain how the product works, how funding works, how tournaments work, and what users should know before they trade live.",
        ],
        bullets: [
          "Clear onboarding from signup to demo to live execution",
          "Transparent withdrawal guidance and visible account controls",
          "Responsive charting tools with practical indicators and drawing tools",
          "Public legal, privacy, risk, and support pages that are easy to find",
          "A competition layer through weekly tournaments and rankings",
        ],
      },
      {
        title: "Our mission",
        paragraphs: [
          "Our mission is to combine a clean trading terminal, straightforward payment handling, public educational content, and fast support into one platform that users can trust and understand.",
          "That means reducing friction, improving readability, and keeping the experience useful for both the first-time demo user and the active trader managing live sessions every week.",
        ],
      },
    ],
    relatedLinks: [
      {
        label: "Facts and figures",
        to: "/facts-and-figures",
        description: "Review the platform statistics, growth metrics, and performance indicators published for visitors.",
      },
      {
        label: "How it works",
        to: "/how-it-works",
        description: "Follow the full path from registration and demo mode to live trading and withdrawals.",
      },
      {
        label: "Trading guide",
        to: "/trading-guide",
        description: "Read the educational guide covering charts, indicators, strategy basics, and risk management.",
      },
    ],
  },
  "facts-and-figures": {
    key: "facts-and-figures",
    path: "/facts-and-figures",
    eyebrow: "Transparency",
    title: "Facts and figures",
    description:
      "Review the key numbers that describe the scale, activity, security, and operating performance of {platformName}.",
    seoTitle: "{platformName} Facts and Figures | Platform Statistics & Performance",
    seoDescription:
      "See the published platform statistics for {platformName}, including trading activity, uptime, supported assets, payouts, tournaments, and support metrics.",
    keywords:
      "init option facts and figures, trading platform stats, otc trading volume, tournament prize pool, platform uptime",
    sections: [
      {
        title: "Core platform statistics",
        paragraphs: [
          "{platformName} is built around measurable platform activity, operational visibility, and transparent public information. These figures are designed to help visitors understand the scale and reliability of the platform before they trade.",
        ],
        bullets: [
          "Active traders: over 5,000 active monthly traders, with approximately 340% year-on-year growth",
          "Daily trading volume: more than $500,000 in combined daily trade volume across supported assets",
          "Total trades executed: over 1.2 million completed trades since launch",
          "Average user win rate: approximately 67% across completed trades",
          "Maximum payout: up to 95% profit on supported winning trades",
          "Supported markets: 100+ instruments across forex, crypto, stocks, and commodities",
        ],
      },
      {
        title: "Funding, support, and tournament performance",
        paragraphs: [
          "Funding speed, tournament scale, and support responsiveness all shape how users experience the platform after signup. These figures give a clearer picture of what users can expect operationally.",
        ],
        bullets: [
          "Fastest M-PESA withdrawal: credited in under 2 minutes",
          "Average crypto withdrawal time: around 15 minutes from request to blockchain confirmation",
          "Average support response time: under 5 minutes via live chat",
          "Tournament prizes awarded: more than $150,000 distributed to winners",
          "Weekly tournaments: 4 tournaments every week, including one free-entry event",
          "Referral and affiliate activity: over 1,200 active referral partners earning recurring commissions",
        ],
      },
      {
        title: "Security and reliability",
        paragraphs: [
          "Reliability matters just as much as speed. Users need to know that the platform can protect accounts, process requests cleanly, and maintain steady availability across high-activity periods.",
        ],
        bullets: [
          "Platform uptime: 99.97% over the last 12 months",
          "Encryption: TLS 1.3 used for data in transit",
          "Withdrawal protection: two-factor authentication available and recommended for sensitive actions",
          "Client fund handling: segregated operational workflows for user balances and company operations",
        ],
      },
    ],
  },
  blog: {
    key: "blog",
    path: "/blog",
    eyebrow: "Insights",
    title: "{platformName} blog, education, and platform updates",
    description:
      "Explore in-depth trading education, tournament updates, platform releases, market analysis, and account guidance from {platformName}.",
    seoTitle: "{platformName} Blog | Trading Strategies, Market Analysis & Platform Updates",
    seoDescription:
      "Read advanced trading education, platform updates, tournament results, and market analysis from the {platformName} blog.",
    keywords:
      "init option blog, trading strategies blog, market analysis, platform updates, tournament results, otc trading education",
    sections: [
      {
        title: "What the blog covers",
        paragraphs: [
          "The {platformName} blog is designed to do more than announce product changes. It acts as a public education and discovery hub where users can learn how the platform works, study trading concepts, review tournament news, and follow important updates.",
        ],
        bullets: [
          "Trading strategies for beginners and intermediate users",
          "Market analysis and economic event context",
          "Platform updates, indicator releases, and interface changes",
          "Tournament results, ranking stories, and competition summaries",
        ],
      },
      {
        title: "Why this content matters",
        paragraphs: [
          "Strong public content improves user trust because visitors can compare pages, read practical guidance, and understand key workflows before they create an account.",
          "It also improves discoverability by giving search engines clear, structured content around the topics users actually search for.",
        ],
      },
      {
        title: "How the blog is managed",
        paragraphs: [
          "The admin blog panel supports rich article editing, featured-image uploads, draft management, category management, SEO title and description control, and post scheduling. This allows the editorial team to publish consistently without relying on code changes for every article.",
        ],
      },
    ],
    relatedLinks: [
      {
        label: "Trading guide",
        to: "/trading-guide",
        description: "Read the practical education page covering chart reading, strategies, and risk control.",
      },
      {
        label: "FAQ",
        to: "/faq",
        description: "Find answers about deposits, bonuses, tournaments, withdrawals, and platform usage.",
      },
      {
        label: "Tournaments",
        to: "/tournaments",
        description: "Browse active and upcoming competitions together with public prize and schedule details.",
      },
      {
        label: "Contact support",
        to: "/contact",
        description: "Reach support if you need help with account, trading, technical, or funding issues.",
      },
    ],
  },
  contact: {
    key: "contact",
    path: "/contact",
    eyebrow: "Support",
    title: "Contact us",
    description:
      "Reach the {platformName} support, finance, partnership, and legal teams through the correct channel for faster help.",
    seoTitle: "Contact {platformName} | Support, Finance, Partnerships & Legal",
    seoDescription:
      "Contact {platformName} support, finance, partnerships, and legal teams. Find live chat, email, and issue reporting details.",
    keywords:
      "contact init option, init option support, finance email, affiliate contact, live chat trading platform",
    sections: [
      {
        title: "Live chat support",
        paragraphs: [
          "Live chat is the fastest way to reach the team. Use the chat icon in the platform for account questions, trade issues, deposit problems, chart concerns, and general assistance.",
          "Average live chat response time is under 5 minutes, and the support team operates 24 hours a day, 7 days a week.",
        ],
      },
      {
        title: "Support email contacts",
        paragraphs: [
          "If your issue is non-urgent or requires attachments, use the appropriate email address so it reaches the right team quickly.",
        ],
        bullets: [
          "General support: support@initoption.com",
          "Finance and withdrawals: finance@initoption.com",
          "Partnerships and affiliates: partners@initoption.com",
          "Legal and compliance: legal@initoption.com",
          "Press and media: press@initoption.com",
        ],
      },
      {
        title: "Technical issue reporting",
        paragraphs: [
          "If you report a bug, failed trade, chart glitch, or account-action problem, include your user ID, the affected page, a screenshot if possible, and the approximate time the issue happened.",
          "Providing specific information helps the technical team investigate much faster and reduces back-and-forth with support.",
        ],
      },
      {
        title: "Community and social channels",
        paragraphs: [
          "Users who want updates, tournament announcements, and public trading tips can also follow the official social channels.",
        ],
        bullets: [
          "Telegram: t.me/initoption",
          "Twitter / X: @initoption",
        ],
      },
    ],
  },
  "delete-account": {
    key: "delete-account",
    path: "/delete-account",
    eyebrow: "Account control",
    title: "Delete account request",
    description:
      "Review the public delete-account process for {platformName} and the information support needs to process an account closure request safely.",
    seoTitle: "Delete Account Request | {platformName}",
    seoDescription:
      "Learn how to request account deletion on {platformName}, what information to provide, and what to review before closure.",
    keywords:
      "delete init option account, close trading account, remove account, account closure support",
    sections: [
      {
        title: "How to request account deletion",
        paragraphs: [
          "Send your request from the email address linked to the account whenever possible. This helps the support team confirm ownership quickly and reduces delays.",
          "Your request should clearly state that you want the account to be closed or deleted and should identify any pending issues that need to be resolved before closure.",
        ],
      },
      {
        title: "Information to include",
        paragraphs: [
          "Include enough information to help support confirm the correct account without compromising security.",
        ],
        bullets: [
          "Your account email address",
          "Your full name or account identifier",
          "A direct request to close or delete the account",
          "Any unresolved withdrawal, verification, or support issue that should be reviewed first",
        ],
      },
      {
        title: "Before you submit the request",
        paragraphs: [
          "Review pending withdrawals, active tournament balances, open support tickets, and any bonus conditions that may still be attached to the account before you ask for closure.",
        ],
      },
    ],
    relatedLinks: [
      {
        label: "Send deletion request",
        href: "mailto:support@initoption.com?subject=Delete%20account%20request",
        description: "Email the support team using a clear subject line for account deletion.",
      },
      {
        label: "Privacy policy",
        to: "/privacy",
        description: "Review how account and personal information is handled by the platform.",
      },
      {
        label: "Terms and conditions",
        to: "/terms",
        description: "Check the platform rules that apply to account ownership and account actions.",
      },
    ],
  },
  "how-it-works": {
    key: "how-it-works",
    path: "/how-it-works",
    eyebrow: "How it works",
    title: "How it works",
    description:
      "Learn how to register, choose demo or live mode, select an asset, place a trade, and manage withdrawals on {platformName}.",
    seoTitle: "How {platformName} Works | Demo, Live Trading, Assets & Withdrawals",
    seoDescription:
      "Understand the full {platformName} trading flow, from account creation and demo access to asset selection, trade placement, and withdrawals.",
    keywords:
      "how init option works, demo account, live trading, how to place a trade, trading platform guide",
    sections: [
      {
        title: "Step 1: Create your account",
        paragraphs: [
          "Sign up using your email address and password. After registration, verify your email so your account is fully active.",
          "The process is designed to take less than a minute, and no card is needed to access the demo environment.",
        ],
      },
      {
        title: "Step 2: Choose demo or live mode",
        paragraphs: [
          "The demo account starts with virtual funds and uses real market prices, making it suitable for testing strategies and learning the interface with no financial risk.",
          "The live account allows users to fund via supported methods such as M-PESA or crypto and trade for real profit.",
        ],
        bullets: [
          "Demo account: practice with virtual funds in real market conditions",
          "Live account: deposit real funds and trade for withdrawable returns",
        ],
      },
      {
        title: "Step 3: Select an asset",
        paragraphs: [
          "Choose from forex pairs, cryptocurrencies, stocks, and commodities. Each asset shows pricing context and available profit percentages so the user can compare opportunities before committing.",
        ],
      },
      {
        title: "Step 4: Place your trade",
        paragraphs: [
          "Choose whether you expect the price to move up or down by expiry, set the amount, select the duration, and confirm the trade. Once a position is placed, it cannot be cancelled or edited.",
        ],
      },
      {
        title: "Step 5: Monitor results and withdraw",
        paragraphs: [
          "If the prediction is correct, the stake and profit are credited automatically. If it is wrong, only the trade amount is lost.",
          "Withdrawals can then be requested through the funding area using the available payment options and approval flow.",
        ],
      },
      {
        title: "Pro tips for new users",
        paragraphs: [
          "Starting with demo mode, using indicators responsibly, and setting a daily loss limit are among the simplest ways to improve early discipline.",
        ],
        bullets: [
          "Begin with the demo terminal before risking live funds",
          "Use indicators like RSI, MACD, and moving averages to support analysis",
          "Set a daily loss limit and avoid chasing losses",
          "Join tournaments only after you understand the core trading flow",
        ],
      },
    ],
  },
  "trading-guide": {
    key: "trading-guide",
    path: "/trading-guide",
    eyebrow: "Education",
    title: "Trading guide",
    description:
      "Study the core ideas behind trading, candlestick charts, indicators, strategies, and risk management before trading live on {platformName}.",
    seoTitle: "{platformName} Trading Guide | Charts, Strategies & Risk Management",
    seoDescription:
      "Read the complete {platformName} trading guide covering trading basics, chart reading, indicators, strategies, and risk management.",
    keywords:
      "trading guide, candlestick guide, RSI strategy, MACD strategy, support resistance guide, risk management",
    sections: [
      {
        title: "What trading is",
        paragraphs: [
          "Trading involves predicting market price movements and making informed decisions based on analysis. Success depends on understanding market trends, using proper risk management, and maintaining discipline.",
          "The key to successful trading is education, practice, and consistent application of proven strategies.",
        ],
      },
      {
        title: "Understanding CALL and PUT",
        paragraphs: [
          "CALL means you expect the asset price to finish higher than its current level by expiry. PUT means you expect it to finish lower.",
          "These decisions should be based on chart structure, indicator confirmation, volatility, and timing rather than impulse.",
        ],
      },
      {
        title: "How to read candlestick charts",
        paragraphs: [
          "Each candle shows four prices: open, high, low, and close. A green candle means the close finished above the open. A red candle means the close finished below the open.",
          "The wick shows the highest and lowest price reached during the candle period. This helps traders understand rejection, volatility, and failed pushes around important levels.",
        ],
        bullets: [
          "Bullish candle: close above open",
          "Bearish candle: close below open",
          "Wicks: the extreme prices reached within that period",
          "Doji: near-equal open and close, often signaling hesitation or indecision",
        ],
      },
      {
        title: "Core strategies new users should understand",
        paragraphs: [
          "No single strategy works in every market, but several basic frameworks help users avoid random entries and build repeatable decision rules.",
        ],
        bullets: [
          "Trend following: trade in the direction of the dominant move",
          "Support and resistance: watch how price behaves around repeated reaction zones",
          "News trading: understand that economic events can increase volatility sharply",
          "Scalping: use shorter timeframes only if you can stay disciplined under speed",
          "RSI reversal: look for exhaustion and reversal context, not RSI alone",
        ],
      },
      {
        title: "Indicator usage",
        paragraphs: [
          "{platformName} supports professional indicators such as RSI, MACD, moving averages, and Bollinger Bands. These tools should help confirm momentum or structure, not replace chart reading.",
          "The best starting point is to use one or two indicators consistently rather than loading the chart with too many competing signals.",
        ],
      },
      {
        title: "Risk management rules",
        paragraphs: [
          "Strong risk management is what protects an account from a few poor decisions turning into a major drawdown. This matters more than finding a perfect setup.",
        ],
        bullets: [
          "Never risk more than a small percentage of your balance on a single trade",
          "Use the demo account before trading live",
          "Set a daily loss limit",
          "Avoid martingale or doubling-up behavior to chase losses",
          "Withdraw profits regularly instead of reinvesting everything blindly",
        ],
      },
      {
        title: "Common mistakes to avoid",
        paragraphs: [
          "The most expensive beginner mistakes are usually behavioral: overtrading, revenge trading, ignoring structure, and trading emotionally.",
          "A simpler routine with fewer trades and more review usually produces better long-term learning than constant activity.",
        ],
      },
    ],
  },
  faq: {
    key: "faq",
    path: "/faq",
    eyebrow: "FAQ",
    title: "Frequently asked questions",
    description:
      "Find complete answers about accounts, deposits, withdrawals, bonuses, tournaments, security, and technical issues on {platformName}.",
    seoTitle: "{platformName} FAQ | Accounts, Deposits, Withdrawals, Bonuses & Tournaments",
    seoDescription:
      "Get clear answers about accounts, demo mode, payments, withdrawals, bonuses, tournaments, security, and technical issues on {platformName}.",
    keywords:
      "init option faq, demo account faq, mpesa deposit, crypto withdrawal, welcome bonus, tournaments, account security",
    sections: [
      {
        title: "What this FAQ covers",
        paragraphs: [
          "This FAQ is designed to answer the most common pre-trade and post-signup questions clearly so users can understand the platform without guessing.",
        ],
        bullets: [
          "Accounts and registration",
          "Deposits and withdrawals",
          "Bonuses and promotions",
          "Trading behavior and expiry rules",
          "Tournaments and prize handling",
          "Security and technical issues",
        ],
      },
    ],
    faqItems: [
      {
        question: "How do I create an account?",
        answer:
          "Click Create account, enter your email and password, then verify your email address. After verification, you can access the demo environment immediately.",
      },
      {
        question: "Is the demo account really free?",
        answer:
          "Yes. The demo account is free and begins with virtual funds so users can practice without risking real money.",
      },
      {
        question: "Do I need to verify my identity?",
        answer:
          "Identity verification is generally required for larger withdrawals or when the compliance team requests it for account safety or regulatory review.",
      },
      {
        question: "What is the minimum deposit?",
        answer:
          "The platform supports low minimum deposits, such as approximately $5 via M-PESA and around $10 through supported crypto methods.",
      },
      {
        question: "Which payment methods are accepted?",
        answer:
          "Funding currently supports M-PESA and crypto methods processed through supported payment providers and platform integrations.",
      },
      {
        question: "What is the minimum withdrawal?",
        answer:
          "Minimum withdrawals depend on method, but M-PESA and crypto each have their own low-entry withdrawal threshold displayed in the funding area.",
      },
      {
        question: "How long do withdrawals take?",
        answer:
          "M-PESA withdrawals are typically much faster, while crypto withdrawals depend on blockchain confirmation speed and internal review conditions.",
      },
      {
        question: "How does the welcome bonus work?",
        answer:
          "Welcome bonuses are credited after eligible first deposits and remain subject to turnover requirements before they or related profit become withdrawable.",
      },
      {
        question: "Can I cancel a trade after placing it?",
        answer:
          "No. Once the trade is confirmed, it is final and cannot be cancelled or modified.",
      },
      {
        question: "How do I join a tournament?",
        answer:
          "Open the tournaments page, select an available event, review its rules and entry fee, and confirm the registration from your account.",
      },
      {
        question: "Is my money safe?",
        answer:
          "The platform uses encrypted connections, account protection measures, and internal controls designed to help secure account access and funding actions.",
      },
      {
        question: "What should I do if the chart is not loading?",
        answer:
          "Refresh the page, clear cache, disable conflicting browser extensions if necessary, and contact support if the issue continues.",
      },
    ],
  },
  terms: {
    key: "terms",
    path: "/terms",
    eyebrow: "Legal",
    title: "Terms and conditions",
    description:
      "Read the binding platform terms covering account eligibility, trading rules, bonus conditions, tournament rules, and service limitations.",
    seoTitle: "{platformName} Terms and Conditions | Trading, Bonuses, Tournaments & Accounts",
    seoDescription:
      "Read the full {platformName} terms and conditions covering eligibility, account rules, bonuses, tournaments, prohibited activity, and liability limits.",
    keywords:
      "terms and conditions trading platform, bonus terms, tournament terms, init option legal terms",
    sections: [
      {
        title: "1. Introduction and acceptance",
        paragraphs: [
          "By using {platformName}, users agree to the platform terms, public policies, and any future updates that materially affect platform usage.",
          "These terms define the agreement between the platform and the user regarding access, account operation, trading features, funding, and related services.",
        ],
      },
      {
        title: "2. Eligibility and account registration",
        paragraphs: [
          "Users must meet age, legal capacity, and jurisdiction requirements before opening an account. Registration information must be accurate and kept up to date.",
        ],
        bullets: [
          "Users must be legally permitted to use the platform in their jurisdiction",
          "Users must provide accurate registration details",
          "Users are responsible for account credential security",
        ],
      },
      {
        title: "3. Trading rules and account funding",
        paragraphs: [
          "Trading outcomes are based on fixed expiry conditions and cannot be changed after confirmation. Users should review asset, amount, direction, and expiry before placing each trade.",
          "Deposits and withdrawals are subject to platform limits, payment method rules, compliance checks, and operational review conditions where necessary.",
        ],
      },
      {
        title: "4. Bonuses and promotions",
        paragraphs: [
          "Bonuses are optional promotional credits. They are not immediately withdrawable and remain locked until turnover conditions have been satisfied.",
        ],
        bullets: [
          "Bonuses may require a 10x or higher turnover before withdrawal eligibility",
          "Profit generated from bonus-linked activity may remain restricted until turnover is complete",
          "Bonus misuse, self-referral abuse, and arbitrage-style exploitation may result in cancellation or suspension",
          "Bonus availability and expiry can vary by promotion",
        ],
      },
      {
        title: "5. Tournaments, prohibited activity, and fees",
        paragraphs: [
          "Tournament participation is governed by event-specific rules covering entry fees, rebuys, balance resets, winner determination, and disqualification conditions.",
          "The platform prohibits manipulation, multiple-account abuse, bot trading where restricted, fraud, money laundering, and any conduct that undermines fair operation.",
        ],
      },
      {
        title: "6. Risk, liability, and service updates",
        paragraphs: [
          "Trading involves financial risk and users remain responsible for their decisions. The platform does not provide personal financial advice.",
          "Platform features, payout structures, payment methods, and interface behavior may be updated over time as product and compliance needs evolve.",
        ],
      },
      {
        title: "7. Governing law and contact",
        paragraphs: [
          "Legal questions, policy issues, and account disputes may be directed to the legal and compliance team using the published contact channels.",
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
      "Learn how {platformName} collects, uses, stores, and protects user data across account access, support, security, and compliance workflows.",
    seoTitle: "{platformName} Privacy Policy | Data Collection, Security & User Rights",
    seoDescription:
      "Read the {platformName} privacy policy covering data collection, payment processing, support records, cookies, storage, and user privacy rights.",
    keywords:
      "privacy policy trading platform, init option privacy policy, user rights, cookies policy, data retention",
    sections: [
      {
        title: "1. What data we collect",
        paragraphs: [
          "{platformName} may collect registration information, support communications, account activity, device information, payment-related records, and verification documents where required.",
        ],
      },
      {
        title: "2. How data is collected and used",
        paragraphs: [
          "Data can be collected during registration, platform interaction, support requests, payment processing, and optional consent-driven marketing activity.",
          "It is used to operate the platform, secure accounts, process transactions, prevent abuse, improve service reliability, and meet legal obligations.",
        ],
      },
      {
        title: "3. Sharing, retention, and international handling",
        paragraphs: [
          "Information may be shared with payment processors, identity verification providers, hosting providers, and legal authorities where required by law or platform safety obligations.",
          "Certain records may be retained after account closure for fraud prevention, compliance, or dispute management purposes.",
        ],
      },
      {
        title: "4. User rights and security",
        paragraphs: [
          "Users may request access to their information, ask for corrections, raise deletion questions where applicable, and contact the platform regarding privacy concerns.",
          "The platform uses encrypted transport, access controls, and ongoing operational safeguards to reduce unauthorized access risk.",
        ],
      },
      {
        title: "5. Cookies and analytics",
        paragraphs: [
          "Essential cookies may be used for login continuity, preference storage, and site operation. Additional analytics or marketing tools may depend on platform configuration and user consent requirements.",
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
      "Read the full risk disclosure for {platformName} and understand the financial, technical, and behavioral risks involved in trading.",
    seoTitle: "{platformName} Risk Disclaimer | Trading Risk, Volatility & User Responsibility",
    seoDescription:
      "Understand the key risks of trading on {platformName}, including capital loss, volatility, technical interruptions, and personal responsibility.",
    keywords:
      "risk disclaimer, trading risk warning, platform risk disclosure, capital risk",
    sections: [
      {
        title: "Capital risk",
        paragraphs: [
          "Trading carries a high level of risk and may not be suitable for every user. You can lose all of the capital committed to a trade, and you should never trade money you cannot afford to lose.",
        ],
      },
      {
        title: "No guarantee of profit",
        paragraphs: [
          "Past results, win-rate examples, strategy discussions, and educational content do not guarantee future performance. Market conditions change constantly and can invalidate short-term assumptions quickly.",
        ],
      },
      {
        title: "Volatility, leverage, and timing pressure",
        paragraphs: [
          "Short-duration trading can be highly sensitive to news releases, liquidity changes, and sentiment shifts. Fast price movement can affect outcomes dramatically within seconds or minutes.",
          "Where leverage or amplified exposure concepts apply, risk increases further and should be approached cautiously.",
        ],
      },
      {
        title: "Technical and jurisdictional risks",
        paragraphs: [
          "Internet interruptions, device failure, delayed requests, or third-party service issues may affect the user’s ability to act on time.",
          "It is also the user’s responsibility to ensure that using the platform is lawful in their own jurisdiction.",
        ],
      },
      {
        title: "No financial advice and behavioral responsibility",
        paragraphs: [
          "Nothing on the platform, support channels, or public educational pages should be treated as personal financial advice.",
          "Users remain responsible for their own decisions and should avoid trading while stressed, angry, impulsive, or trying to recover losses emotionally.",
        ],
      },
    ],
  },
  "affiliate-program": {
    key: "affiliate-program",
    path: "/affiliate-program",
    eyebrow: "Partners",
    title: "Affiliate program",
    description:
      "Earn recurring commission by referring new users to {platformName} through the platform affiliate and referral program.",
    seoTitle: "{platformName} Affiliate Program | Recurring Referral Commission",
    seoDescription:
      "Join the {platformName} affiliate program and earn recurring commission on qualifying deposits from referred users.",
    keywords:
      "init option affiliate program, referral commission, trading affiliate, partner program, recurring commission",
    sections: [
      {
        title: "How the affiliate program works",
        paragraphs: [
          "Affiliates receive a unique referral link that can be shared through websites, communities, social channels, or other approved promotion methods.",
          "When a referred user registers through that link and makes qualifying deposits, the affiliate earns commission based on the agreed referral structure.",
        ],
      },
      {
        title: "Commission and payouts",
        paragraphs: [
          "The program is designed around recurring value rather than one-off rewards, helping strong affiliates benefit as their referred audience keeps using the platform.",
        ],
        bullets: [
          "Recurring commission on qualifying referred deposits",
          "No artificial cap on growth for successful affiliates",
          "Withdrawal options that align with the platform funding methods",
          "A dashboard view for clicks, referrals, conversion, and commission totals",
        ],
      },
      {
        title: "Rules and restrictions",
        paragraphs: [
          "Affiliates must not self-refer, spam, misrepresent the product, or use fraudulent traffic or deposit behavior. Abuse may result in forfeited commissions and partner suspension.",
        ],
      },
      {
        title: "How to join",
        paragraphs: [
          "The affiliate flow begins from the account area. After acceptance, users can access their referral tools, link tracking, and commission records from the dashboard.",
        ],
      },
    ],
  },
  features: {
    key: "features",
    path: "/features",
    eyebrow: "Platform features",
    title: "Trading platform features",
    description:
      "Explore the tools that make {platformName} useful for demo practice, live trading, chart analysis, account funding, and fast withdrawal workflows.",
    seoTitle: "Trading Platform Features | Charts, Indicators & Fast Withdrawals | {platformName}",
    seoDescription:
      "Explore {platformName} trading platform features: real-time candlestick charts, technical indicators, drawing tools, demo account access, and M-PESA and crypto withdrawal workflows.",
    keywords:
      "trading platform features, online trading tools, best trading terminal, candlestick charts, technical indicators, demo trading account, fast withdrawals trading",
    sections: [
      {
        title: "Why {platformName} is built for practical trading",
        paragraphs: [
          "{platformName} combines professional chart tools with a clean, browser-based trading terminal. Beginners can start in demo mode, while active traders can use indicators, drawing tools, asset filters, and account controls from one focused workspace.",
          "The goal is to keep the core trading workflow clear: choose an asset, read the chart, set the amount, select an expiry, and manage the account from a transparent dashboard.",
        ],
      },
      {
        title: "Real-time candlestick charts",
        paragraphs: [
          "Candlestick charts help traders understand open, high, low, and close behavior across different timeframes. {platformName} supports short-term chart reading with live price updates, visible market movement, and chart settings that can be adjusted to match the trader's preference.",
        ],
        bullets: [
          "Multiple chart timeframes from seconds to daily views",
          "Candlestick, Heikin-Ashi, area, and bar-style chart views",
          "Custom chart colors, spacing, grid settings, and price-line display",
          "A clean trading workspace designed for fast reading and execution",
        ],
      },
      {
        title: "Technical indicators and drawing tools",
        paragraphs: [
          "Technical indicators and drawings help traders move from guessing to structured analysis. Users can study trend, momentum, volatility, and price-action behavior before placing a trade.",
        ],
        bullets: [
          "Popular indicators such as RSI, MACD, moving averages, Bollinger Bands, Stochastic, CCI, ADX, Aroon, Momentum, ATR, and volume tools",
          "Drawing tools for trend lines, horizontal levels, vertical markers, Fibonacci analysis, channels, rectangles, and triangles",
          "Indicator settings for periods, colors, sources, line thickness, and visibility",
          "Chart tools designed for both beginner practice and active trade preparation",
        ],
      },
      {
        title: "Free demo account and low-friction practice",
        paragraphs: [
          "A demo trading account gives users a safer way to learn the terminal before using real funds. Demo mode helps beginners test chart reading, expiry choices, stake sizes, and emotional discipline without financial pressure.",
          "Demo practice is especially useful for traders learning candlesticks, support and resistance, indicator confirmation, and risk-management rules.",
        ],
        bullets: [
          "Virtual funds for practice",
          "No time limit for learning the platform",
          "A practical space to test strategies before going live",
          "A better starting point for beginners who need repetition before real trading",
        ],
      },
      {
        title: "Funding, withdrawals, bonuses, and tournaments",
        paragraphs: [
          "{platformName} supports account workflows for local and crypto-focused users, including M-PESA and crypto funding paths where available. The platform also includes welcome-bonus logic, public tournament pages, and account history tools so users can track what is happening.",
        ],
        bullets: [
          "M-PESA deposit and withdrawal workflows for eligible Kenyan traders",
          "Crypto funding support for users who prefer digital assets",
          "Fast withdrawal workflows with clear account history",
          "Weekly tournament pages, prize-pool information, and public competition discovery",
        ],
      },
    ],
    relatedLinks: [
      { label: "Why choose Init Option", to: "/why-choose-init-option", description: "Compare the main reasons traders choose the platform." },
      { label: "How it works", to: "/how-it-works", description: "Follow the account journey from signup to demo and live trading." },
      { label: "Trading guide", to: "/trading-guide", description: "Learn chart basics, strategy structure, and risk management." },
      { label: "Blog", to: "/blog", description: "Read detailed tutorials on trading platforms, demo accounts, M-PESA, crypto, and withdrawals." },
    ],
  },
  "why-choose-init-option": {
    key: "why-choose-init-option",
    path: "/why-choose-init-option",
    eyebrow: "Why choose us",
    title: "Why choose {platformName}",
    description:
      "See why traders choose {platformName} for demo access, beginner-friendly tools, M-PESA and crypto funding options, fast withdrawal workflows, and weekly tournaments.",
    seoTitle: "Why Choose {platformName} | Fast, Fair & Beginner-Friendly Trading",
    seoDescription:
      "Discover why traders choose {platformName}: free demo account, fast M-PESA and crypto withdrawal workflows, welcome bonus, professional chart tools, and weekly tournaments.",
    keywords:
      "best trading platform, why choose Init Option, trading platform comparison, beginner friendly trading platform, free demo account, fast withdrawals trading",
    sections: [
      {
        title: "Built for users who want a clear trading path",
        paragraphs: [
          "A good trading platform should make the first steps understandable and the account workflow transparent. {platformName} is designed around a simple path: learn in demo, understand the chart, manage risk, deposit only when ready, and track account activity from one place.",
          "That clarity matters for beginners, but it also matters for active traders who need a focused terminal instead of a cluttered interface.",
        ],
      },
      {
        title: "Free demo account with no pressure to rush",
        paragraphs: [
          "Demo mode lets traders practice with virtual funds before live trading. This helps users test strategies, learn candlestick behavior, understand indicators, and build confidence without putting real money at risk.",
        ],
        bullets: [
          "Practice chart reading before live trading",
          "Test strategies across different assets and timeframes",
          "Learn the trading panel, expiry controls, and account flow",
          "Build discipline before switching to real funds",
        ],
      },
      {
        title: "Fast withdrawal workflows and familiar funding options",
        paragraphs: [
          "Withdrawal speed is one of the strongest trust signals for traders. {platformName} supports account workflows built around clear payout requests, status visibility, and funding methods such as M-PESA and crypto where available.",
        ],
        bullets: [
          "M-PESA support for eligible Kenyan traders",
          "Crypto funding options for digital-asset users",
          "Account history views for deposits, withdrawals, and statuses",
          "Verification and payout checks designed to reduce confusion",
        ],
      },
      {
        title: "Professional tools made easier to use",
        paragraphs: [
          "Many platforms overload beginners with complex screens. {platformName} keeps the terminal focused while still offering serious tools: candlestick charts, technical indicators, drawing tools, asset lists, account modes, and public educational content.",
        ],
        bullets: [
          "Real-time charting for short-term market reading",
          "Popular technical indicators for trend, momentum, volatility, and volume",
          "Drawing tools for support, resistance, trendlines, and Fibonacci analysis",
          "A browser-based terminal that works across desktop and mobile devices",
        ],
      },
      {
        title: "Bonuses, tournaments, and support",
        paragraphs: [
          "{platformName} includes public tournament pages, account bonus logic, and support flows that help users understand more than just the trading screen. Traders can explore competitions, review platform guides, and contact support when they need help.",
        ],
        bullets: [
          "Welcome bonus support for eligible accounts",
          "Weekly tournaments with public discovery pages",
          "Support pages, FAQ content, and risk information",
          "Transparent educational pages for users researching the platform before registration",
        ],
      },
    ],
    relatedLinks: [
      { label: "Platform features", to: "/features", description: "Review the charts, indicators, tools, and account workflows." },
      { label: "About Init Option", to: "/about", description: "Learn the platform mission and product direction." },
      { label: "FAQ", to: "/faq", description: "Find answers about deposits, withdrawals, bonuses, and tournaments." },
      { label: "Create account", to: "/register", description: "Open an account and start with demo mode." },
    ],
  },
  "site-map": {
    key: "site-map",
    path: "/site-map",
    eyebrow: "Discovery",
    title: "{platformName} site map",
    description:
      "Browse the full public page directory for {platformName}, including education, support, tournaments, policies, and account entry points.",
    seoTitle: "{platformName} Site Map | Public Pages, Guides, Policies & Entry Points",
    seoDescription:
      "Use the {platformName} site map to discover every major public page, including facts, guides, tournaments, legal pages, and account entry links.",
    keywords:
      "init option site map, public pages, legal pages, blog, tournaments, trading guides, support pages",
    sections: [
      {
        title: "Why this site map exists",
        paragraphs: [
          "The site map helps users and search engines move through the full public content structure without missing key support, legal, education, or conversion pages.",
        ],
      },
      {
        title: "What you can find here",
        paragraphs: [
          "From the homepage to the blog, tournaments, legal pages, and account-entry routes, this page connects the main public surface of the platform in one place.",
        ],
      },
    ],
    relatedLinks: [
      { label: "Homepage", to: "/", description: "Return to the main public landing page." },
      { label: "About", to: "/about", description: "Learn the platform story, mission, and product direction." },
      { label: "Facts and figures", to: "/facts-and-figures", description: "Review published operating and platform statistics." },
      { label: "Platform features", to: "/features", description: "Explore charts, indicators, drawing tools, demo access, and withdrawal workflows." },
      { label: "Why choose Init Option", to: "/why-choose-init-option", description: "Compare the reasons traders choose the platform." },
      { label: "How it works", to: "/how-it-works", description: "Follow the platform journey from signup to live trading." },
      { label: "Trading guide", to: "/trading-guide", description: "Study chart basics, strategies, and risk management guidance." },
      { label: "FAQ", to: "/faq", description: "Find answers about funding, bonuses, tournaments, and technical issues." },
      { label: "Blog", to: "/blog", description: "Read educational articles, tournament results, and platform updates." },
      { label: "Contact", to: "/contact", description: "Reach support, finance, legal, and partnership channels." },
      { label: "Tournaments", to: "/tournaments", description: "Browse the public tournament schedule and active competitions." },
      { label: "Affiliate program", to: "/affiliate-program", description: "Explore the recurring referral and partner program." },
      { label: "Terms and conditions", to: "/terms", description: "Read the platform rules and user responsibilities." },
      { label: "Privacy policy", to: "/privacy", description: "Review how information is collected, used, and protected." },
      { label: "Risk disclaimer", to: "/risk-disclaimer", description: "Understand the platform’s risk disclosure before trading live." },
      { label: "Delete account request", to: "/delete-account", description: "Follow the public account closure request process." },
      { label: "Sign in", to: "/login", description: "Go to the account sign-in page." },
      { label: "Create account", to: "/register", description: "Open the registration page for new users." },
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
      relatedLinks: page.relatedLinks ? page.relatedLinks.map((item) => ({ ...item })) : undefined,
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
    relatedLinks: page.relatedLinks ? page.relatedLinks.map((item) => ({ ...item })) : undefined,
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
