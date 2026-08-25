import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  BarChart3,
  User,
  ShieldCheck,
  Wallet,
  Banknote,
  Trophy,
  ChevronDown,
  MessageSquare,
  Plus,
  X,
  Send,
  Paperclip,
  ArrowRight,
  HelpCircle,
  Search,
  Compass,
  PlayCircle,
  RotateCcw,
  ChevronRight,
  BookOpen,
  TrendingUp,
  CreditCard,
  ArrowUpFromLine,
  Copy,
  Star,
  Zap,
  Clock,
  CheckCircle2,
  FileText,
  Gift,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileTour, TourType } from "@/contexts/ProfileTourContext";
import { TOUR_LABELS } from "@/components/tour/GuidedTour";
import { toast } from "@/components/ui/use-toast";
import { api } from "@/integrations/api/client";
import { realtime } from "@/integrations/pusher/realtime";

interface HelpCenterOverlayProps {
  onClose?: () => void;
}

type HelpTab = "my_requests" | "create_request" | "faq" | "guides";
type FaqCategory = "trading" | "account" | "verification" | "payment" | "payouts" | "tournaments";
type GuideCategory =
  | "getting_started"
  | "trading"
  | "deposits"
  | "withdrawals"
  | "account_security"
  | "copy_trading"
  | "bonuses"
  | "tournaments";

interface SupportTicket {
  id: string;
  createdAt: string;
  category: string;
  subject: string;
  message: string;
  status: "Open" | "Answered" | "Closed";
  replies: Array<{
    id: string;
    sender: "user" | "support";
    text: string;
    timestamp: string;
  }>;
}

// ─── AUTHENTIC CUSTOM FINANCIAL & PLATFORM ICONS (Non-Generic) ───────────

export function TradingChartIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="24" height="24" rx="6" fill="#0D2818" stroke="#00C853" strokeWidth="1.2" strokeOpacity="0.4" />
      <line x1="7.5" y1="6" x2="7.5" y2="20" stroke="#FF5252" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="6" y="9" width="3" height="8" rx="0.8" fill="#FF5252" />
      <line x1="14" y1="5" x2="14" y2="22" stroke="#00E676" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="12.5" y="8" width="3" height="10" rx="0.8" fill="#00E676" />
      <line x1="20.5" y1="4" x2="20.5" y2="19" stroke="#00E676" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="19" y="5" width="3" height="11" rx="0.8" fill="#00E676" />
      <path d="M4 18L10.5 13L16.5 14.5L24 7" stroke="#69F0AE" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="7" r="1.8" fill="#FFFFFF" stroke="#00E676" strokeWidth="1" />
    </svg>
  );
}

export function RocketLaunchIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="24" height="24" rx="6" fill="#2A1B00" stroke="#FFD600" strokeWidth="1.2" strokeOpacity="0.4" />
      <path
        d="M17.5 5C17.5 5 21.5 7.5 21.5 11.5C21.5 14 20 16 18.5 17.5L10.5 9.5C12 8 14 6.5 16.5 6.5C16.5 6.5 17.5 5 17.5 5Z"
        fill="#FFD600"
      />
      <path d="M14.5 13.5L7.5 20.5C6.5 21.5 5 22 5 22C5 22 5.5 20.5 6.5 19.5L13.5 12.5L14.5 13.5Z" fill="#FFAB00" />
      <path d="M10.5 9.5L7 11.5L8.5 15L13.5 12.5L10.5 9.5Z" fill="#FF6D00" />
      <path d="M17.5 16.5L15.5 20L12 18.5L14.5 13.5L17.5 16.5Z" fill="#FF6D00" />
      <circle cx="16" cy="11" r="1.8" fill="#121824" stroke="#FFF" strokeWidth="0.8" />
      <path d="M7 21C6 22.5 4.5 23 4 23C4 23 4.5 21.5 6 20.5L7 21Z" fill="#FF3D00" />
    </svg>
  );
}

export function MpesaCardIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="24" height="24" rx="6" fill="#1C0B36" stroke="#B388FF" strokeWidth="1.2" strokeOpacity="0.4" />
      <rect x="5" y="7" width="18" height="12" rx="2.5" fill="#7C4DFF" />
      <rect x="5" y="10" width="18" height="2.5" fill="#311B92" />
      <rect x="8" y="14" width="3.5" height="2.5" rx="0.5" fill="#FFD700" />
      <circle cx="19" cy="18" r="4.5" fill="#00E676" stroke="#1C0B36" strokeWidth="1.2" />
      <path d="M17.5 18L18.5 19L20.5 17" stroke="#003300" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WithdrawMoneyIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="24" height="24" rx="6" fill="#2E1B00" stroke="#FFAB00" strokeWidth="1.2" strokeOpacity="0.4" />
      <rect x="5" y="9" width="18" height="13" rx="2.5" fill="#FF8F00" />
      <path d="M5 12H23" stroke="#FFE082" strokeWidth="1" strokeDasharray="2 2" />
      <circle cx="14" cy="15.5" r="2.8" fill="#FFF8E1" stroke="#FF6F00" strokeWidth="1" />
      <text x="14" y="17.2" fontSize="7" fontWeight="bold" textAnchor="middle" fill="#FF6F00">
        $
      </text>
      <path d="M14 8V3M14 3L11 6M14 3L17 6" stroke="#00E676" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SecurityShieldIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="24" height="24" rx="6" fill="#002233" stroke="#00B0FF" strokeWidth="1.2" strokeOpacity="0.4" />
      <path
        d="M14 5L7 8V13.5C7 18 10.2 21.8 14 23C17.8 21.8 21 18 21 13.5V8L14 5Z"
        fill="#0091EA"
        stroke="#80D8FF"
        strokeWidth="1.2"
      />
      <path
        d="M11 13.5L13 15.5L17 11.5"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CopyTradingIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="24" height="24" rx="6" fill="#300020" stroke="#FF4081" strokeWidth="1.2" strokeOpacity="0.4" />
      <circle cx="11" cy="11" r="3.5" fill="#F50057" />
      <path d="M6.5 19.5C6.5 16.5 8.5 15.5 11 15.5C13.5 15.5 15.5 16.5 15.5 19.5" stroke="#FF4081" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="19" cy="11" r="2.8" fill="#00E676" />
      <path d="M15.5 18C15.5 15.5 17 14.8 19 14.8C21 14.8 22.5 15.5 22.5 18" stroke="#00E676" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M12.5 8.5L16.5 8.5M16.5 8.5L14.5 6.5M16.5 8.5L14.5 10.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TrophyCupIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="24" height="24" rx="6" fill="#331A00" stroke="#FFC107" strokeWidth="1.2" strokeOpacity="0.4" />
      <path d="M7 8H5C4 8 3 9 3 10V12C3 13.5 4.2 14.5 5.5 14.5H7" stroke="#FFD54F" strokeWidth="1.3" />
      <path d="M21 8H23C24 8 25 9 25 10V12C25 13.5 23.8 14.5 22.5 14.5H21" stroke="#FFD54F" strokeWidth="1.3" />
      <path d="M7 6H21V12C21 15.8 17.8 18 14 18C10.2 18 7 15.8 7 12V6Z" fill="#FFC107" stroke="#FFE082" strokeWidth="1" />
      <path d="M14 18V21M10 23H18" stroke="#FFB300" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 8.5L15 10.5L17.2 10.7L15.5 12.2L16 14.3L14 13.2L12 14.3L12.5 12.2L10.8 10.7L13 10.5L14 8.5Z" fill="#FFFFFF" />
    </svg>
  );
}

export function BonusGiftIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="24" height="24" rx="6" fill="#330A00" stroke="#FF6D00" strokeWidth="1.2" strokeOpacity="0.4" />
      <rect x="5" y="11" width="18" height="12" rx="2" fill="#FF6D00" />
      <rect x="4" y="8" width="20" height="3.5" rx="1.5" fill="#FFAB00" />
      <rect x="12.5" y="8" width="3" height="15" fill="#FFFFFF" />
      <circle cx="11" cy="6.5" r="2" fill="#FF8F00" stroke="#FFF" strokeWidth="1" />
      <circle cx="17" cy="6.5" r="2" fill="#FF8F00" stroke="#FFF" strokeWidth="1" />
      <circle cx="19" cy="18" r="4.5" fill="#D500F9" stroke="#FFF" strokeWidth="1" />
      <text x="19" y="20.2" fontSize="6.5" fontWeight="black" textAnchor="middle" fill="#FFF">
        %
      </text>
    </svg>
  );
}

// ─── TOUR TYPE CONFIG ──────────────────────────────────────────────────────
const TOUR_TYPE_CONFIG: Array<{
  type: TourType;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  steps: number;
}> = [
  {
    type: "platform",
    label: "Full Platform Tour",
    description: "Complete walkthrough of all platform features",
    icon: RocketLaunchIcon,
    color: "#1175d5",
    steps: 12,
  },
  {
    type: "trading",
    label: "Trading Tour",
    description: "Charts, indicators, trade panel & execution",
    icon: TradingChartIcon,
    color: "#00c853",
    steps: 7,
  },
  {
    type: "deposit",
    label: "Deposit Tour",
    description: "M-Pesa & crypto deposit process",
    icon: MpesaCardIcon,
    color: "#7c3aed",
    steps: 4,
  },
  {
    type: "withdrawal",
    label: "Withdrawal Tour",
    description: "How to withdraw funds from your account",
    icon: WithdrawMoneyIcon,
    color: "#ffab00",
    steps: 4,
  },
  {
    type: "account",
    label: "Account Tour",
    description: "Profile, KYC verification & security",
    icon: SecurityShieldIcon,
    color: "#00b0ff",
    steps: 4,
  },
  {
    type: "copy_trading",
    label: "Copy Trading Tour",
    description: "Finding traders and configuring copy settings",
    icon: CopyTradingIcon,
    color: "#ff4081",
    steps: 4,
  },
];

// ─── FAQ DATA ──────────────────────────────────────────────────────────────
const FAQ_CATEGORIES: Array<{
  id: FaqCategory;
  title: string;
  countLabel: string;
  countNum: number;
  icon: React.ElementType;
}> = [
  { id: "trading", title: "Trading Platform", countLabel: "11 questions", countNum: 11, icon: TradingChartIcon },
  { id: "account", title: "My account", countLabel: "4 questions", countNum: 4, icon: RocketLaunchIcon },
  { id: "verification", title: "Verification", countLabel: "5 questions", countNum: 5, icon: SecurityShieldIcon },
  { id: "payment", title: "Payment", countLabel: "4 questions", countNum: 4, icon: MpesaCardIcon },
  { id: "payouts", title: "Payouts", countLabel: "5 questions", countNum: 5, icon: WithdrawMoneyIcon },
  { id: "tournaments", title: "Tournaments", countLabel: "7 questions", countNum: 7, icon: TrophyCupIcon },
];

const FAQ_DATA: Record<FaqCategory, Array<{ id: string; question: string; answer: string }>> = {
  trading: [
    {
      id: "t1",
      question: "What are digital options?",
      answer:
        "Digital options are a modern, high-yield financial derivative that allows traders to speculate on the price movement of financial assets (currency pairs, crypto, commodities, stocks) over a pre-determined timeframe. You forecast whether the asset price will be higher (Up) or lower (Down) than your entry strike price at expiration. If your forecast is correct by even a single point, you earn a fixed profit payout percentage (up to 95%+).",
    },
    {
      id: "t2",
      question: "What is the expiration period of a trade?",
      answer:
        "The expiration period is the exact time at which your trade closes and is evaluated. On our trading platform, expiration intervals range from ultra-short 5-second turbo options up to 4-hour extended positions. You can choose flexible expiration timers (e.g., 1m, 5m, 15m) or select a fixed settlement clock time.",
    },
    {
      id: "t3",
      question: "What is the gist of digital options trading?",
      answer:
        "The core principle is defined risk and fixed returns. Unlike traditional stock or spot forex trading where profit size depends on how far the price moves, digital options offer a guaranteed, fixed percentage payout if your directional forecast is correct at settlement, regardless of the pip distance.",
    },
    {
      id: "t4",
      question: "What are the possible results of the placed trades?",
      answer:
        "There are three possible outcomes for any trade:\n1. Profit (Win): Your directional forecast is correct at expiration time. Your original trade investment plus your payout profit (e.g. +92%) is instantly added to your balance.\n2. Loss: Your forecast was incorrect at expiration time, and the invested amount for that specific trade is lost.\n3. Return (Tie): The settlement price at expiration matches the entry price exactly. In this case, 100% of your invested capital is refunded to your account balance.",
    },
    {
      id: "t5",
      question: "Does your trading platform have a demo account in order to understand the process of working with digital options without spending your own money?",
      answer:
        "Yes! Every registered trader receives a free Demo Account pre-funded with $10,000 in virtual trading capital. The demo environment operates on live, real-time market data identical to the real account. You can test indicators, practice strategies, and refill your demo balance anytime for free with zero financial risk.",
    },
    {
      id: "t6",
      question: "What determines profit size?",
      answer:
        "Profit payouts depend on the asset chosen, market volatility, liquidity during current trading hours, and your account status tier (Standard, Pro, VIP). Major currency pairs (like EUR/USD or GBP/USD) during active market sessions typically offer payouts ranging between 85% to 98%.",
    },
    {
      id: "t7",
      question: "What are the varieties of digital options?",
      answer:
        "We offer standard High/Low options, Turbo options (5s - 60s rapid trades), Pending Orders (orders that trigger automatically when market price touches a target level or specified time), and 24/7 OTC (Over-The-Counter) options for weekend trading.",
    },
    {
      id: "t8",
      question: "What is a trading platform and why is it needed?",
      answer:
        "A trading platform is a specialized software terminal connecting traders to global financial exchanges. It streams real-time prices, renders technical candlestick charts, supports technical analysis indicators (RSI, MACD, Moving Averages, Bollinger Bands), and executes trades instantaneously.",
    },
    {
      id: "t9",
      question: "How to learn quickly how to make money in the digital options market?",
      answer:
        "To build consistent trading skills:\n1. Practice daily on the free Demo Account.\n2. Master 1 or 2 technical indicators (like RSI or Stochastic) to identify market trends.\n3. Enforce strict risk management (never invest more than 2% to 5% of your balance per trade).\n4. Utilize trading signals and economic calendar data built into the platform.",
    },
    {
      id: "t10",
      question: "Is the download of the program to a computer or smartphone required?",
      answer:
        "No downloads or installations are needed! The platform is 100% web-based and runs smoothly on Chrome, Safari, Firefox, or Edge across Desktop, Mobile, and Tablet devices. You can also save it as a Progressive Web App (PWA) on your phone home screen.",
    },
    {
      id: "t11",
      question: "At what expense does the Company pay profit to the Client in case of successful trade?",
      answer:
        "The company functions as a market liquidity clearing firm. Profits are generated from global liquidity provider order matching, spread optimization, and liquidity risk pools maintained by our institutional clearing partners.",
    },
  ],
  account: [
    {
      id: "a1",
      question: "Can I close my account? How to do it?",
      answer:
        "Yes, you can close or delete your account at any time. Go to the Settings / My Account section in the platform, scroll down to the bottom security options, and click 'Delete My account'. This will permanently disable your login credentials and remove stored personal data.",
    },
    {
      id: "a2",
      question: "If I made a mistake during entering data into my individual account, how can I fix this?",
      answer:
        "You can update your First Name, Last Name, Nickname, Date of Birth, Country, and Address directly in the My Account settings tab. If you entered an incorrect email address during registration, please submit a ticket via the 'Create request' tab so support staff can verify and update it.",
    },
    {
      id: "a3",
      question: "What data is required to register on the Company website?",
      answer:
        "Registration requires only a valid email address and a password. You can start practicing on the Demo account immediately. Full personal information and ID verification documents are only required prior to requesting real-money withdrawals.",
    },
    {
      id: "a4",
      question: "In what currency is my account opened? Can I change the currency of my account?",
      answer:
        "Accounts default to USD ($), but you can change your display currency (such as KES, USDT, EUR, GBP, BRL, INR) at any time inside the Live Account dropdown menu by clicking the 'CHANGE' button next to Currency.",
    },
  ],
  verification: [
    {
      id: "v1",
      question: "What is account verification?",
      answer:
        "Account verification (KYC) is a mandatory anti-fraud security protocol designed to confirm the identity of our clients and safeguard funds against unauthorized access, identity theft, and money laundering.",
    },
    {
      id: "v2",
      question: "How to understand that I need to go through account verification?",
      answer:
        "Verification is requested when you initiate higher-volume withdrawals or when updating financial payout details. You will receive an in-app notice and an alert in your account profile when document submission is required.",
    },
    {
      id: "v3",
      question: "How do I know that I successfully passed verification?",
      answer:
        "Once your documents are verified by our compliance team, a green 'Verified' status badge will appear on your account profile, and a confirmation email will be delivered to your inbox.",
    },
    {
      id: "v4",
      question: "Is it possible to indicate other people's (fake) data when registering on the website?",
      answer:
        "No. Providing false, artificial, or third-party details is strictly prohibited. The full legal name on your identity documents must match the name registered on your payout accounts (Bank accounts, M-Pesa, or Crypto wallets).",
    },
    {
      id: "v5",
      question: "How long does the verification process take?",
      answer:
        "Document reviews are processed by our automated verification engine and compliance specialists within 15 minutes to 2 hours after submission.",
    },
  ],
  payment: [
    {
      id: "p1",
      question: "Is there a minimum amount that I can deposit to my account at registration?",
      answer:
        "The minimum deposit threshold is just $10.00 (or local currency equivalent). All deposits are processed instantly with zero platform transaction fees.",
    },
    {
      id: "p2",
      question: "How can I deposit?",
      answer:
        "Click the green '+ Deposit' button at the top right of the terminal. Choose your preferred payment method — M-Pesa / Mobile Money, Crypto (USDT TRC-20, BTC, ETH, SOL), or E-Wallets. Enter your deposit amount and complete the transaction prompt.",
    },
    {
      id: "p3",
      question: "Do I need to deposit the account of the trading platform and how often do I need to do this?",
      answer:
        "You can practice on the free $10,000 Demo Account indefinitely. You only fund your account when you choose to trade live for real profits. There are no mandatory monthly or maintenance deposit obligations.",
    },
    {
      id: "p4",
      question: "What is the minimum deposit amount?",
      answer:
        "The minimum deposit is $10.00 for all supported payment methods including M-Pesa and automated crypto gateways.",
    },
  ],
  payouts: [
    {
      id: "po1",
      question: "How to withdraw money from my account?",
      answer:
        "Navigate to the Withdrawal tab in the Account menu. Enter your withdrawal amount ($10 minimum), select your verified payout destination (M-Pesa or Crypto Wallet), fill in your recipient details, and click 'Confirm'.",
    },
    {
      id: "po2",
      question: "How long does it take to withdraw funds?",
      answer:
        "Automated M-Pesa mobile money payouts and crypto withdrawals complete within 15 to 60 minutes. In rare cases requiring security checks, processing takes up to 24 hours.",
    },
    {
      id: "po3",
      question: "What is the minimum withdrawal amount?",
      answer: "The minimum withdrawal amount is $10.00.",
    },
    {
      id: "po4",
      question: "Is there any fee for depositing or withdrawing funds from my account?",
      answer: "No. Our platform imposes 0% commission on both deposits and withdrawals.",
    },
    {
      id: "po5",
      question: "Do I need to provide any documents to make a withdrawal?",
      answer:
        "Standard payouts to your registered mobile number or wallet address do not require extra paperwork unless requested by compliance for identity verification.",
    },
  ],
  tournaments: [
    {
      id: "tr1",
      question: "What is a tournament?",
      answer:
        "Tournaments are competitive trading contests where participants trade on equal virtual tournament balances to achieve the highest balance percentage. Top traders on the leaderboard win real cash prize funds credited directly to their live balance.",
    },
    {
      id: "tr2",
      question: "Are there free tournaments?",
      answer:
        "Yes! We regularly host free-entry tournaments (Daily Freebies) with real cash prize pools that anyone can join for free without paying an entry fee.",
    },
    {
      id: "tr3",
      question: "What is the price of entering a tournament?",
      answer:
        "Entry fees vary by event: Freebies cost $0, while premium paid tournaments have entry fees ranging from $1 to $50 depending on the total prize pool.",
    },
    {
      id: "tr4",
      question: "What is a rebuy?",
      answer:
        "A rebuy allows you to reset your tournament starting balance back to $1,000 if your virtual contest balance drops below the initial starting level during an active event.",
    },
    {
      id: "tr5",
      question: "How a winner is determined?",
      answer:
        "Winners are determined automatically by ranking all participants according to their final net virtual balance in the tournament workspace when the contest timer expires.",
    },
    {
      id: "tr6",
      question: "If I win, when will I receive my prize?",
      answer:
        "Cash prizes are credited directly to winners' real live balances within 1 hour after the tournament countdown timer reaches zero.",
    },
    {
      id: "tr7",
      question: "What are the reasons for disqualification?",
      answer:
        "Disqualification occurs if a participant uses automated arbitrage bots, exploits system glitches, or operates multiple accounts in the same tournament event.",
    },
  ],
};

// ─── GUIDES DATA ───────────────────────────────────────────────────────────
interface GuideArticle {
  id: string;
  number: string;
  title: string;
  summary: string;
  readTime: string;
  content: string[];
}

interface GuideSection {
  id: GuideCategory;
  title: string;
  icon: React.ElementType;
  color: string;
  articles: GuideArticle[];
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "getting_started",
    title: "Getting Started",
    icon: RocketLaunchIcon,
    color: "#eab308",
    articles: [
      {
        id: "gs1",
        number: "1.1",
        title: "Welcome to InitOption",
        summary: "Introduction to the platform and how it works",
        readTime: "2 min",
        content: [
          "InitOption is a professional digital options trading platform built for traders of all experience levels. Whether you are a complete beginner or an experienced trader, InitOption provides all the tools you need to analyze markets and trade efficiently.",
          "The platform operates 24/7 and provides access to hundreds of trading assets including forex pairs, cryptocurrencies, commodities, and stock indices. Every user gets a free $10,000 Demo Account to practice before committing real money.",
          "Our platform is fully web-based — no download or installation required. Simply log in from any modern browser on Desktop, Mobile, or Tablet and start trading within minutes of registration.",
        ],
      },
      {
        id: "gs2",
        number: "1.2",
        title: "Creating your account",
        summary: "How to register and get started",
        readTime: "2 min",
        content: [
          "Creating your InitOption account takes less than 60 seconds. Navigate to the registration page and enter a valid email address along with a strong password. You will receive a verification email — click the confirmation link to activate your account.",
          "After registration, you immediately get access to your $10,000 Demo Account. No personal documents, ID verification, or deposit is required to start practicing on the demo. You can explore every feature of the platform risk-free.",
          "When you are ready to trade with real money, complete your profile with your personal information and make your first deposit using M-Pesa, Cryptocurrency, or another supported payment method.",
        ],
      },
      {
        id: "gs3",
        number: "1.3",
        title: "Understanding your dashboard",
        summary: "Overview of the trading terminal layout",
        readTime: "3 min",
        content: [
          "The InitOption trading terminal is your central workspace. The main chart area occupies most of the screen and displays live candlestick price data for your selected trading asset.",
          "On the right side (Desktop) or bottom (Mobile), the trade panel lets you configure your trade: asset, amount, expiry time, and direction (Up or Down). Above the chart, the toolbar provides access to timeframes, chart types, indicators, and drawing tools.",
          "The header bar shows your current account balance, lets you switch between Live and Demo accounts, provides a deposit shortcut, and gives access to all account management features.",
        ],
      },
      {
        id: "gs4",
        number: "1.4",
        title: "Understanding account balances",
        summary: "Live balance, Demo balance, and how they work",
        readTime: "2 min",
        content: [
          "Your account has two separate balances: a Live Balance (real funds) and a Demo Balance (virtual $10,000). These balances are completely independent — trades placed on Demo use only virtual funds and do not affect your real money.",
          "Your Available Balance is the total funds ready to be invested, minus any amounts currently tied up in open active trades. Open trades temporarily reserve the investment amount until they settle at expiration.",
          "You can switch between Live and Demo accounts at any time using the account switcher at the top of the trading panel. We strongly recommend practicing new strategies on Demo before using real funds.",
        ],
      },
    ],
  },
  {
    id: "trading",
    title: "Trading",
    icon: TradingChartIcon,
    color: "#22c55e",
    articles: [
      {
        id: "tr_a1",
        number: "2.1",
        title: "How to place a trade",
        summary: "Step-by-step guide to opening a position",
        readTime: "3 min",
        content: [
          "Placing a trade on InitOption is simple and fast. First, select the asset you want to trade from the asset selector at the top of the terminal. Browse by category (Forex, Crypto, Commodities, Stocks) or use the search bar.",
          "Next, set your trade amount in the trade panel. This is the amount you are willing to invest in this specific trade. The platform will show you the potential profit payout percentage before you confirm.",
          "Choose your expiration time — how long until the trade closes and settles. You can pick from 5 seconds up to 4 hours depending on your strategy. Finally, click the green UP button if you predict the price will rise, or the red DOWN button if you predict it will fall.",
        ],
      },
      {
        id: "tr_a2",
        number: "2.2",
        title: "Understanding the trading panel",
        summary: "Trade amount, expiry, direction, and payout",
        readTime: "3 min",
        content: [
          "The trading panel contains all controls needed to build and confirm a trade. The Amount field determines how much of your balance you are risking on this trade. Most traders risk between 1% and 5% of their total balance per trade.",
          "The Expiry control determines when the trade closes. Short expirations (5s–60s) are called 'Turbo' trades and are suited for high-volatility assets. Longer expirations (5m–4h) are better for trend-following strategies using indicators.",
          "The Payout percentage shown in the panel represents your potential profit if your forecast is correct. A payout of 92% means a $100 trade would return $192 total ($100 investment + $92 profit) if you win.",
        ],
      },
      {
        id: "tr_a3",
        number: "2.3",
        title: "Understanding charts",
        summary: "Candlestick charts, timeframes, and chart types",
        readTime: "4 min",
        content: [
          "The price chart is the most important tool in trading. Each candle represents price action over a defined time period. A green (bullish) candle means the price closed higher than it opened. A red (bearish) candle means it closed lower.",
          "The Open, High, Low, and Close (OHLC) data shown by each candle reveals the full story of market sentiment during that period. The wicks (shadows) above and below the candle body show the extreme price points reached during the period.",
          "Choose your timeframe based on your trading style. Short timeframes (5s, 15s, 30s, 1m) show detailed price movement and are used for turbo trading. Longer timeframes (15m, 1h, 4h) reveal broader trends and are used by swing traders.",
        ],
      },
      {
        id: "tr_a4",
        number: "2.4",
        title: "Trade history",
        summary: "How to review and analyze your past trades",
        readTime: "2 min",
        content: [
          "Your complete trade history is available in the Trades section of your Account panel. Every trade is recorded with its asset, amount, direction, opening time, expiration time, entry price, exit price, result, and profit or loss.",
          "Use your trade history to analyze your performance over time. Look for patterns in winning and losing trades — what assets, timeframes, or market conditions correlate with your best results.",
          "Regularly reviewing your trade history is essential for improving your strategy. Identify which types of trades are most profitable and which are consistently losing, then adjust your approach accordingly.",
        ],
      },
    ],
  },
  {
    id: "deposits",
    title: "Deposits",
    icon: MpesaCardIcon,
    color: "#7c3aed",
    articles: [
      {
        id: "dep1",
        number: "3.1",
        title: "How to deposit",
        summary: "Step-by-step guide to funding your account",
        readTime: "3 min",
        content: [
          "To deposit funds, click the green '+ Deposit' button in the trading terminal header. The deposit panel will open, showing all available payment methods for your region.",
          "Select your preferred payment method — M-Pesa (recommended for Kenya), Cryptocurrency (USDT TRC-20, BTC, ETH, SOL), or other supported options. Enter your deposit amount (minimum $10) and follow the on-screen payment instructions.",
          "M-Pesa deposits are processed instantly — you'll receive a payment prompt on your registered mobile number within seconds. Cryptocurrency deposits are confirmed after the required blockchain confirmations and typically complete within 5–30 minutes.",
        ],
      },
      {
        id: "dep2",
        number: "3.2",
        title: "M-Pesa deposits",
        summary: "How to deposit using M-Pesa mobile money",
        readTime: "3 min",
        content: [
          "M-Pesa is the fastest and most convenient way to deposit if you are in Kenya or another supported M-Pesa market. Select M-Pesa from the payment methods list and enter the amount you wish to deposit.",
          "You will be prompted to enter your M-Pesa registered phone number. Double-check the number — it must be the number registered to your M-Pesa account. Click Confirm to initiate the payment.",
          "An M-Pesa payment STK Push prompt will appear on your mobile phone within seconds. Enter your M-Pesa PIN to authorize the payment. Your balance will be updated immediately after confirmation.",
        ],
      },
      {
        id: "dep3",
        number: "3.3",
        title: "Cryptocurrency deposits",
        summary: "How to deposit using USDT, BTC, ETH, and other crypto",
        readTime: "4 min",
        content: [
          "To deposit using cryptocurrency, select your preferred cryptocurrency (USDT TRC-20, BTC, ETH, SOL, or others shown) from the payment methods list. A unique deposit wallet address will be generated for your account.",
          "Send the exact cryptocurrency amount to the displayed wallet address from your personal crypto wallet or exchange. Make sure you select the correct network — sending USDT on the wrong network (e.g., ERC-20 instead of TRC-20) may result in lost funds.",
          "Crypto deposits require blockchain confirmations before crediting: usually 1–3 confirmations for most networks (approximately 5–30 minutes). Do not send an amount below the displayed minimum — transactions below minimum are not processed.",
        ],
      },
      {
        id: "dep4",
        number: "3.4",
        title: "Deposit status and failed deposits",
        summary: "Understanding deposit statuses and what to do if a deposit fails",
        readTime: "2 min",
        content: [
          "After initiating a deposit, you can track its status in the Payments section of your Account panel. Statuses include: Pending (waiting for confirmation), Processing (being verified), Completed (credited to balance), and Failed.",
          "M-Pesa deposits that fail are usually caused by an incorrect phone number, insufficient M-Pesa balance, or entering the wrong PIN. If your M-Pesa deposit fails, the amount is not deducted — simply try again.",
          "If a cryptocurrency deposit is not credited within 60 minutes after the blockchain confirms the transaction, submit a support ticket with your transaction hash (TXID). Include the amount, cryptocurrency, and network used.",
        ],
      },
    ],
  },
  {
    id: "withdrawals",
    title: "Withdrawals",
    icon: WithdrawMoneyIcon,
    color: "#f59e0b",
    articles: [
      {
        id: "wd1",
        number: "4.1",
        title: "How to withdraw",
        summary: "Step-by-step guide to withdrawing your funds",
        readTime: "3 min",
        content: [
          "To withdraw funds, open your Account panel and select Withdrawal. Choose your withdrawal method — M-Pesa or Cryptocurrency — and enter the amount you wish to withdraw (minimum $10).",
          "Enter your recipient details: your M-Pesa phone number or cryptocurrency wallet address. Review all details carefully before confirming, as withdrawals cannot be reversed once submitted.",
          "After submission, your withdrawal request is reviewed and processed by our payments team. Standard processing time is 15–60 minutes for M-Pesa and crypto withdrawals. You'll receive a notification when the payment is sent.",
        ],
      },
      {
        id: "wd2",
        number: "4.2",
        title: "Withdrawal requirements",
        summary: "What you need to complete a withdrawal",
        readTime: "2 min",
        content: [
          "To request a withdrawal, your account must have a verified email address. For large withdrawals or your first withdrawal, you may be required to complete KYC identity verification by submitting a government-issued ID.",
          "Your withdrawal method should ideally match your deposit method for fraud prevention reasons. The name on your payout destination (M-Pesa, bank, or crypto wallet) must match the name registered on your InitOption account.",
          "Any active bonuses on your account may have wagering requirements that must be met before withdrawal. Check the Bonus section of your account for any applicable trading volume requirements before submitting a withdrawal request.",
        ],
      },
      {
        id: "wd3",
        number: "4.3",
        title: "Withdrawal status",
        summary: "Tracking your withdrawal progress",
        readTime: "2 min",
        content: [
          "Track all withdrawal requests in the Payments section of your Account panel. Each withdrawal shows its status: Pending (in queue), Processing (being handled), Completed (payment sent), or Rejected (see reason).",
          "If your withdrawal status shows Rejected, review the rejection reason displayed in the status details. Common reasons include: insufficient balance, unmet bonus conditions, missing KYC documents, or account security flags.",
          "For completed withdrawals that have not arrived after 60 minutes (M-Pesa) or 24 hours (Crypto), submit a support ticket with your withdrawal ID from the Payments section. Our team will investigate and resolve within 24 hours.",
        ],
      },
    ],
  },
  {
    id: "account_security",
    title: "Account & Security",
    icon: SecurityShieldIcon,
    color: "#06b6d4",
    articles: [
      {
        id: "ac1",
        number: "5.1",
        title: "Account settings",
        summary: "Managing your personal information",
        readTime: "2 min",
        content: [
          "Your account settings are accessible through the Account panel in the platform navigation. Here you can update your personal information including your full name, date of birth, country of residence, phone number, and address.",
          "Keep your personal information accurate and up to date. Your registered name must match the name on your government-issued ID to successfully complete KYC verification and process withdrawals without delays.",
          "You can also update your notification preferences — choose which alerts you want to receive via email for trade results, deposits, withdrawals, and promotional offers.",
        ],
      },
      {
        id: "ac2",
        number: "5.2",
        title: "Password and Two-Factor Authentication",
        summary: "Keeping your account secure",
        readTime: "3 min",
        content: [
          "Use a strong, unique password for your InitOption account. A strong password is at least 12 characters long, uses a mix of uppercase and lowercase letters, numbers, and symbols, and is not reused from other websites.",
          "Enable Two-Factor Authentication (2FA) for an additional security layer. With 2FA enabled, anyone attempting to log in to your account must also provide a time-based code from an authenticator app (Google Authenticator, Authy) — even if they know your password.",
          "To set up 2FA: go to Account Settings → Security → Enable Two-Factor Authentication. Scan the QR code with your authenticator app and verify with the generated code. Store your backup codes in a safe place in case you lose access to your device.",
        ],
      },
      {
        id: "ac3",
        number: "5.3",
        title: "KYC verification",
        summary: "Identity verification process and requirements",
        readTime: "3 min",
        content: [
          "KYC (Know Your Customer) verification is required to comply with financial regulations and protect our users from fraud. Verified accounts have higher withdrawal limits and access to all platform features.",
          "To complete KYC verification, navigate to Account Settings → Verification and upload the required documents: a clear photo or scan of a valid government-issued photo ID (passport, national ID card, or driver's license), and a selfie holding your ID (for some verification levels).",
          "Documents must be valid (not expired), clearly readable, and show all four corners of the document. Photos taken in good lighting with no glare are processed fastest. Our compliance team reviews submissions within 15 minutes to 2 hours during business hours.",
        ],
      },
      {
        id: "ac4",
        number: "5.4",
        title: "Security recommendations",
        summary: "Best practices to protect your account",
        readTime: "2 min",
        content: [
          "Never share your password, PIN, or 2FA codes with anyone — including people claiming to be InitOption support staff. Our support team will never ask for your password.",
          "Only access the platform from trusted devices and networks. Avoid logging in from public computers, shared devices, or unsecured public WiFi networks. Always log out after sessions on shared devices.",
          "Watch for phishing attempts — fraudulent emails or websites impersonating InitOption. Always verify you are on the correct website URL before entering your login credentials. Enable email alerts for new logins to your account.",
        ],
      },
    ],
  },
  {
    id: "copy_trading",
    title: "Copy Trading",
    icon: CopyTradingIcon,
    color: "#ec4899",
    articles: [
      {
        id: "ct1",
        number: "6.1",
        title: "What is Copy Trading?",
        summary: "How copy trading works on InitOption",
        readTime: "3 min",
        content: [
          "Copy Trading is a feature that allows you to automatically replicate trades from experienced, high-performing traders. When a trader you are copying opens a position, the same trade is instantly mirrored in your account at a proportional investment amount.",
          "Copy Trading is designed to help less experienced traders benefit from the strategies of verified expert traders while they are still learning the markets. You can copy multiple traders simultaneously and set independent copy settings for each.",
          "Important: Past performance of any trader does not guarantee future results. Copy Trading involves real financial risk. Always apply appropriate risk management settings and never invest more than you can afford to lose.",
        ],
      },
      {
        id: "ct2",
        number: "6.2",
        title: "Finding and following a trader",
        summary: "How to browse the trader directory and start copying",
        readTime: "3 min",
        content: [
          "Browse the Trader Directory to find traders to copy. Each trader profile shows their performance statistics: win rate, total profit, number of trades, average payout, active followers, and maximum drawdown (risk indicator).",
          "Review a trader's full performance history before following. Look for consistent performance over extended time periods (at least 30–90 days) rather than short periods of exceptional returns. High win rates (above 65%) with moderate average profits are often more sustainable than extreme short-term gains.",
          "To start copying, visit a trader's profile and click 'Copy Trader'. Set your copy investment amount (how much to allocate per copied trade), a maximum copy loss limit, and a stop-copying threshold. Click Confirm to begin — trades are mirrored in real time.",
        ],
      },
      {
        id: "ct3",
        number: "6.3",
        title: "Managing copied trades",
        summary: "Monitoring and stopping copy trading",
        readTime: "2 min",
        content: [
          "View all your active copy trading positions in your Account panel under Copy Trading. You can see each trader you are copying, your current allocation, total profit or loss from that trader, and all open mirrored trades.",
          "You can pause copying from a specific trader at any time without stopping other copy relationships. Pausing means new trades from that trader are not replicated, but existing open trades remain until they expire.",
          "To stop copying a trader completely, click 'Stop Copying' on their profile. All existing open mirrored trades will continue until expiry but no new trades will be copied. Your allocated copy funds are returned to your available balance.",
        ],
      },
    ],
  },
  {
    id: "bonuses",
    title: "Bonuses",
    icon: BonusGiftIcon,
    color: "#f97316",
    articles: [
      {
        id: "bn1",
        number: "7.1",
        title: "Welcome bonuses",
        summary: "First deposit bonuses and promotional offers",
        readTime: "2 min",
        content: [
          "InitOption offers promotional deposit bonuses to eligible new traders. Welcome bonuses typically add a percentage of extra trading funds on your first deposit, giving you more capital to practice and trade with.",
          "Bonus funds are credited to your account balance automatically when the bonus is activated. Check the active promotions page for current bonus offers and their eligibility requirements before depositing.",
          "Note: Bonus funds typically come with trading volume requirements that must be completed before bonus-related profits can be withdrawn. Read the specific terms of each bonus offer carefully.",
        ],
      },
      {
        id: "bn2",
        number: "7.2",
        title: "Referral bonuses",
        summary: "Earning rewards by inviting friends",
        readTime: "2 min",
        content: [
          "The InitOption Referral Program lets you earn rewards when you invite friends or colleagues to join the platform. You receive a unique referral link from the Referral Program section in the navigation menu.",
          "When someone registers using your referral link and completes a qualifying deposit, you earn a referral reward. The reward amount varies based on your referral's deposit size and trading activity.",
          "You can track all your referrals, pending rewards, and paid commissions in the Referral Program section. Rewards are credited directly to your live trading balance.",
        ],
      },
    ],
  },
  {
    id: "tournaments",
    title: "Tournaments",
    icon: TrophyCupIcon,
    color: "#d97706",
    articles: [
      {
        id: "tn1",
        number: "8.1",
        title: "How tournaments work",
        summary: "Overview of trading competitions on InitOption",
        readTime: "3 min",
        content: [
          "Tournaments are competitive trading events where all participants trade on equal virtual tournament balances. Unlike your regular live or demo account, all tournament traders start with the same virtual balance regardless of their real account size.",
          "During the tournament, participants trade on the tournament balance trying to achieve the highest possible balance by the time the tournament ends. The leaderboard updates in real time so you can track your ranking against other participants.",
          "When the tournament timer reaches zero, the leaderboard is finalized. Cash prizes from the prize pool are distributed to the top-ranked traders. Prize amounts depend on your final ranking and the tournament's prize structure.",
        ],
      },
      {
        id: "tn2",
        number: "8.2",
        title: "Joining a tournament",
        summary: "How to enter tournaments and start competing",
        readTime: "2 min",
        content: [
          "Browse available tournaments in the Tournaments section of the platform. Each tournament listing shows the entry fee, prize pool, number of participants, start time, and duration. Free tournaments show $0 entry fee.",
          "To join a tournament, click 'Join Tournament' and confirm your entry. For paid tournaments, the entry fee is deducted from your live account balance. For free tournaments, no payment is required.",
          "Once joined, your tournament balance is credited and you can begin trading. Switch to tournament mode using the account switcher — trades placed in tournament mode use your tournament balance only, not your live funds.",
        ],
      },
      {
        id: "tn3",
        number: "8.3",
        title: "Tournament prize distribution",
        summary: "How prizes are awarded to winners",
        readTime: "2 min",
        content: [
          "Prize distribution varies by tournament. Most tournaments pay prizes to the top 3, 5, or 10 traders by final ranking. The prize pool breakdown is displayed on the tournament details page before you enter.",
          "Prizes are credited directly to the winners' live trading balances within 1 hour after the tournament concludes. You will receive a notification when your prize has been credited.",
          "Some tournaments also offer additional rewards such as bonus credits, VIP status upgrades, or exclusive trading signals subscriptions for top performers. Check the individual tournament details for any special prizes.",
        ],
      },
    ],
  },
];

// ─── POPULAR QUICK LINKS ───────────────────────────────────────────────────
const POPULAR_GUIDES = [
  { label: "Getting Started", category: "getting_started" as GuideCategory },
  { label: "How to Trade", category: "trading" as GuideCategory },
  { label: "Deposits & Payments", category: "deposits" as GuideCategory },
  { label: "Withdrawals", category: "withdrawals" as GuideCategory },
  { label: "Account & Security", category: "account_security" as GuideCategory },
  { label: "Copy Trading", category: "copy_trading" as GuideCategory },
  { label: "Tournaments", category: "tournaments" as GuideCategory },
  { label: "Bonuses", category: "bonuses" as GuideCategory },
];

// ─── SUPPORT TICKET STORAGE ────────────────────────────────────────────────
const STORAGE_TICKETS_KEY = "initoption_support_tickets";

// ─── SEARCH FUNCTION ───────────────────────────────────────────────────────
interface SearchResult {
  id: string;
  question: string;
  answer: string;
  category: string;
  categoryLabel: string;
  faqCategory?: FaqCategory;
}

function searchAllFaqs(query: string): SearchResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const results: SearchResult[] = [];
  const catLabels: Record<FaqCategory, string> = {
    trading: "Trading Platform",
    account: "My Account",
    verification: "Verification",
    payment: "Payment",
    payouts: "Payouts",
    tournaments: "Tournaments",
  };
  (Object.keys(FAQ_DATA) as FaqCategory[]).forEach((cat) => {
    FAQ_DATA[cat].forEach((item) => {
      if (item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q)) {
        results.push({
          id: item.id,
          question: item.question,
          answer: item.answer,
          category: cat,
          categoryLabel: catLabels[cat],
          faqCategory: cat,
        });
      }
    });
  });
  return results.slice(0, 8);
}

// ─── GUIDE ARTICLE READER ──────────────────────────────────────────────────
const GuideArticleReader = ({
  article,
  sectionTitle,
  onBack,
}: {
  article: GuideArticle;
  sectionTitle: string;
  onBack: () => void;
}) => (
  <div className="animate-fadeIn">
    <button
      type="button"
      onClick={onBack}
      className="flex items-center gap-2 text-[13px] font-bold text-white/40 hover:text-white/80 transition-colors mb-6"
    >
      <ChevronRight className="h-3.5 w-3.5 rotate-180" />
      Back to {sectionTitle}
    </button>
    <div className="flex items-center gap-3 mb-1">
      <span className="text-[11px] font-black uppercase tracking-[0.1em] text-white/35">{article.number}</span>
      <span className="text-[11px] font-black uppercase tracking-[0.1em] text-white/35">·</span>
      <div className="flex items-center gap-1 text-[11px] text-white/35">
        <Clock className="h-3 w-3" />
        <span>{article.readTime} read</span>
      </div>
    </div>
    <h2 className="text-[22px] font-black text-white mb-6">{article.title}</h2>
    <div className="space-y-4">
      {article.content.map((para, i) => (
        <p key={i} className="text-[14px] leading-[1.75] text-white/70">
          {para}
        </p>
      ))}
    </div>
  </div>
);

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────
export const HelpCenterOverlay = ({ onClose }: HelpCenterOverlayProps) => {
  const { user, profile } = useAuth();
  const { startTourOfType, restartTour, tourProgress } = useProfileTour();
  const [activeTab, setActiveTab] = useState<HelpTab>("faq");
  const [selectedCategory, setSelectedCategory] = useState<FaqCategory>("trading");
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>("t1");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedGuideCategory, setSelectedGuideCategory] = useState<GuideCategory | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<GuideArticle | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Support Ticket Form State
  const [ticketCategory, setTicketCategory] = useState("Trading Platform");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketAttachment, setTicketAttachment] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tickets List State
  const [tickets, setTickets] = useState<SupportTicket[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_TICKETS_KEY);
      if (saved) {
        const parsed: SupportTicket[] = JSON.parse(saved);
        return parsed.filter((t) => t.id !== "TK-928104");
      }
    } catch {
      // fallback
    }
    return [];
  });


  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState("");

  // Sync tickets to LocalStorage fallback
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TICKETS_KEY, JSON.stringify(tickets));
    } catch {
      // silent
    }
  }, [tickets]);

  // Fetch real tickets & messages from Database
  const fetchDbTickets = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [ticketsRes, threadsRes] = await Promise.all([
        api.from("support_tickets").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        api.from("support_threads").select("*").eq("user_id", user.id).order("last_message_at", { ascending: false }),
      ]);

      const dbTickets = ticketsRes.data ?? [];
      const dbThreads = threadsRes.data ?? [];

      const allIds = Array.from(new Set([
        ...dbTickets.map((t) => t.id),
        ...dbThreads.map((t) => t.id),
      ]));

      let messagesMap = new Map<string, Array<{ id: string; sender: "user" | "support"; text: string; timestamp: string }>>();

      if (allIds.length > 0) {
        const messagesRes = await api
          .from("support_messages")
          .select("*")
          .in("thread_id", allIds)
          .order("created_at", { ascending: true });

        const messagesData = messagesRes.data ?? [];
        messagesData.forEach((msg) => {
          const list = messagesMap.get(msg.thread_id) || [];
          list.push({
            id: msg.id,
            sender: msg.sender_role === "staff" ? "support" : "user",
            text: msg.message,
            timestamp: msg.created_at,
          });
          messagesMap.set(msg.thread_id, list);
        });
      }

      const mergedTickets: SupportTicket[] = [];

      dbTickets.forEach((t) => {
        const msgs = messagesMap.get(t.id) || [];
        const statusLabel = t.status === "open" ? "Open" : t.status === "resolved" ? "Closed" : t.status === "pending" ? "Answered" : (t.status as any);
        mergedTickets.push({
          id: t.id,
          createdAt: t.created_at,
          category: t.category,
          subject: t.subject,
          message: t.message,
          status: statusLabel,
          replies: msgs.length > 0 ? msgs : [
            {
              id: `init-${t.id}`,
              sender: "user",
              text: t.message,
              timestamp: t.created_at,
            },
          ],
        });
      });

      dbThreads.forEach((th) => {
        if (!mergedTickets.some((t) => t.id === th.id)) {
          const msgs = messagesMap.get(th.id) || [];
          const statusLabel = th.status === "open" ? "Open" : th.status === "resolved" ? "Closed" : th.status === "pending" ? "Answered" : (th.status as any);
          mergedTickets.push({
            id: th.id,
            createdAt: th.created_at,
            category: th.category,
            subject: th.subject,
            message: msgs[0]?.text || th.subject,
            status: statusLabel,
            replies: msgs,
          });
        }
      });

      setTickets(mergedTickets);
    } catch (err) {
      console.warn("Failed to load DB support tickets:", err);
    }
  }, [user?.id]);

  // Real-time Database Listener & Fetch Initial Tickets
  useEffect(() => {
    void fetchDbTickets();

    if (!user?.id) return;

    const channel = realtime
      .channel(`user-support-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => {
        void fetchDbTickets();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "support_threads" }, () => {
        void fetchDbTickets();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "support_messages" }, () => {
        void fetchDbTickets();
      })
      .subscribe();

    return () => {
      void realtime.removeChannel(channel);
    };
  }, [user?.id, fetchDbTickets]);

  // Sync activeTicket with latest replies when tickets state changes
  useEffect(() => {
    if (!activeTicket) return;
    const latest = tickets.find((t) => t.id === activeTicket.id);
    if (latest && (latest.replies.length !== activeTicket.replies.length || latest.status !== activeTicket.status)) {
      setActiveTicket(latest);
    }
  }, [tickets, activeTicket]);

  // Live search
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(() => {
      setSearchResults(searchAllFaqs(q));
      setIsSearching(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Listen for open-help-center event (from tour completion screen)
  useEffect(() => {
    const handler = () => setActiveTab("guides");
    window.addEventListener("initoption:open-help-center", handler);
    return () => window.removeEventListener("initoption:open-help-center", handler);
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim()) {
      toast({ title: "Please enter a subject for your request.", variant: "destructive" });
      return;
    }
    if (!ticketMessage.trim() || ticketMessage.trim().length < 10) {
      toast({ title: "Please provide a detailed description (at least 10 characters).", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const ticketId = `TK-${Math.floor(100000 + Math.random() * 900000)}`;
    const nowIso = new Date().toISOString();

    const newTicket: SupportTicket = {
      id: ticketId,
      createdAt: nowIso,
      category: ticketCategory,
      subject: ticketSubject.trim(),
      message: ticketMessage.trim(),
      status: "Open",
      replies: [
        {
          id: `r-${Date.now()}`,
          sender: "user",
          text: ticketMessage.trim(),
          timestamp: nowIso,
        },
      ],
    };

    setTickets((prev) => [newTicket, ...prev]);

    // Push to Database so Admin Support Inbox sees it in real time
    if (user?.id) {
      try {
        const userName = profile?.display_name?.trim() || profile?.username?.trim() || user.email || "Trader";

        // Insert into support_tickets table
        await api.from("support_tickets").insert({
          id: ticketId,
          user_id: user.id,
          category: ticketCategory,
          subject: ticketSubject.trim(),
          message: ticketMessage.trim(),
          priority: "normal",
          status: "open",
          created_at: nowIso,
          updated_at: nowIso,
        });

        // Insert into support_threads table
        await api.from("support_threads").insert({
          id: ticketId,
          user_id: user.id,
          category: ticketCategory,
          subject: ticketSubject.trim(),
          status: "open",
          created_at: nowIso,
          updated_at: nowIso,
          last_message_at: nowIso,
        });

        // Insert initial message into support_messages
        await api.from("support_messages").insert({
          thread_id: ticketId,
          sender_id: user.id,
          sender_name: userName,
          sender_role: "user",
          message: ticketMessage.trim(),
          created_at: nowIso,
        });
      } catch (err) {
        console.warn("Could not sync ticket to database:", err);
      }
    }

    setIsSubmitting(false);
    setTicketSubject("");
    setTicketMessage("");
    setTicketAttachment(null);
    toast({
      title: "Support ticket submitted!",
      description: `Ticket ${ticketId} created. Our support team will respond shortly.`,
    });
    setActiveTab("my_requests");
  };

  const handleSendReply = async () => {
    if (!activeTicket || !replyText.trim()) return;

    const replyMsg = replyText.trim();
    const nowIso = new Date().toISOString();
    const replyId = `r-${Date.now()}`;

    const newReply = {
      id: replyId,
      sender: "user" as const,
      text: replyMsg,
      timestamp: nowIso,
    };

    const updatedTickets = tickets.map((t) => {
      if (t.id === activeTicket.id) {
        return { ...t, status: "Open" as const, replies: [...t.replies, newReply] };
      }
      return t;
    });

    setTickets(updatedTickets);
    setActiveTicket((prev) => (prev ? { ...prev, status: "Open", replies: [...prev.replies, newReply] } : null));
    setReplyText("");

    // Database Sync
    if (user?.id) {
      try {
        const userName = profile?.display_name?.trim() || profile?.username?.trim() || user.email || "Trader";

        await api.from("support_messages").insert({
          thread_id: activeTicket.id,
          sender_id: user.id,
          sender_name: userName,
          sender_role: "user",
          message: replyMsg,
          created_at: nowIso,
        });

        await api.from("support_threads").update({
          status: "open",
          last_message_at: nowIso,
          updated_at: nowIso,
        }).eq("id", activeTicket.id);

        await api.from("support_tickets").update({
          status: "open",
          updated_at: nowIso,
        }).eq("id", activeTicket.id);
      } catch (err) {
        console.warn("Could not sync reply to database:", err);
      }
    }

    toast({ title: "Reply sent to support staff." });
  };

  const handleLaunchTour = (type: TourType) => {
    const progress = tourProgress?.[type];
    if (progress?.started && !progress?.completed) {
      restartTour(type);
    } else {
      startTourOfType(type);
    }
    onClose?.();
  };

  const currentFaqs = useMemo(() => FAQ_DATA[selectedCategory] || [], [selectedCategory]);

  const currentGuideSection = useMemo(
    () => GUIDE_SECTIONS.find((s) => s.id === selectedGuideCategory) || null,
    [selectedGuideCategory],
  );

  const getTourButtonLabel = (type: TourType) => {
    const progress = tourProgress?.[type];
    if (progress?.completed) return "Restart Tour";
    if (progress?.started && !progress?.completed && !progress?.skipped) return "Resume Tour";
    return "Start Tour";
  };

  const getTourIcon = (type: TourType) => {
    const progress = tourProgress?.[type];
    if (progress?.completed) return RotateCcw;
    if (progress?.started && !progress?.completed && !progress?.skipped) return PlayCircle;
    return PlayCircle;
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#161b26] text-white overflow-hidden select-none">
      {/* ── TOP NAVIGATION BAR ── */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-[#1b2232] border-b border-[#252e42] shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {(
            [
              { id: "faq", label: "FAQ" },
              { id: "guides", label: "Guides" },
              { id: "my_requests", label: "My Requests" },
              { id: "create_request", label: "Create Request" },
            ] as { id: HelpTab; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-[4px] text-[13px] font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-[#273248] text-white shadow-sm border border-white/10"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-colors ml-2"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 lg:px-12 deposit-scrollbar">
        <div className="max-w-[1280px] mx-auto space-y-10">

          {/* ════════════════ HERO HEADER & SEARCH SECTION (Visible on FAQ & Guides) ════════════════ */}
          {(activeTab === "faq" || activeTab === "guides") && !selectedGuideCategory && (
            <div className="text-center max-w-[840px] mx-auto pt-2 pb-6 space-y-4 animate-fadeIn">
              <h1 className="text-[28px] sm:text-[34px] font-black text-white uppercase tracking-wider">
                How can we help you?
              </h1>
              <p className="text-[14px] sm:text-[15px] font-medium text-white/60 leading-relaxed max-w-[620px] mx-auto">
                Find answers, explore platform guides, or take an interactive guided tour of InitOption.
              </p>

              {/* Large Prominent Hero Search Bar */}
              <div className="relative max-w-[720px] mx-auto pt-2">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#00B8FF] pointer-events-none" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search the Help Center... (Try 'How do I withdraw?')"
                  className="w-full h-14 pl-14 pr-12 rounded-[10px] bg-[#1d2636] border border-[#00B8FF]/30 text-[15px] font-medium text-white placeholder-white/40 outline-none focus:border-[#00B8FF] focus:ring-1 focus:ring-[#00B8FF] shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}

                {/* Search Results Dropdown */}
                {searchQuery.trim().length >= 2 && (
                  <div className="absolute left-0 right-0 top-full mt-2 rounded-[10px] bg-[#1d2636] border border-[#00B8FF]/30 overflow-hidden shadow-2xl z-50 text-left">
                    {isSearching ? (
                      <div className="p-4 text-center text-[13px] text-white/40">Searching…</div>
                    ) : searchResults.length === 0 ? (
                      <div className="p-4 text-center text-[13px] text-white/40">
                        No results found for "{searchQuery}"
                      </div>
                    ) : (
                      <div className="divide-y divide-white/5 max-h-[320px] overflow-y-auto deposit-scrollbar">
                        {searchResults.map((result) => (
                          <button
                            key={result.id}
                            type="button"
                            onClick={() => {
                              if (result.faqCategory) {
                                setActiveTab("faq");
                                setSelectedCategory(result.faqCategory);
                                setExpandedFaqId(result.id);
                                setSearchQuery("");
                              }
                            }}
                            className="w-full text-left p-4 hover:bg-white/5 transition-colors flex items-start gap-3"
                          >
                            <HelpCircle className="h-4 w-4 text-[#00B8FF] shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[13.5px] font-bold text-white leading-tight">{result.question}</p>
                              <p className="text-[11px] text-[#00B8FF]/70 mt-1 font-semibold">{result.categoryLabel}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Popular Topics Chips */}
              <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                <span className="text-[11px] font-black uppercase tracking-wider text-white/35 mr-1">Popular topics:</span>
                {[
                  { label: "Trading", tab: "faq", category: "trading" },
                  { label: "Deposits", tab: "faq", category: "payment" },
                  { label: "Withdrawals", tab: "faq", category: "payouts" },
                  { label: "Security", tab: "faq", category: "verification" },
                  { label: "Copy Trading", tab: "guides", guideCategory: "copy_trading" },
                  { label: "Tournaments", tab: "faq", category: "tournaments" },
                ].map((topic) => (
                  <button
                    key={topic.label}
                    type="button"
                    onClick={() => {
                      if (topic.tab === "faq") {
                        setActiveTab("faq");
                        setSelectedCategory(topic.category as FaqCategory);
                      } else if (topic.tab === "guides") {
                        setActiveTab("guides");
                        setSelectedGuideCategory(topic.guideCategory as GuideCategory);
                        setSelectedArticle(null);
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-full bg-[#1b2333] border border-[#00B8FF]/20 text-[12px] font-bold text-white/75 hover:border-[#00B8FF]/50 hover:text-white hover:bg-[#00B8FF]/10 transition-all"
                  >
                    {topic.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        {/* ════════════════════════════════ TAB: FAQ ════════════════════════════════ */}
        {activeTab === "faq" && (
          <div className="space-y-8 animate-fadeIn">

            {/* Popular Guides chips */}
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.1em] text-white/30 mb-3">Popular Guides</p>
              <div className="flex flex-wrap gap-2">
                {POPULAR_GUIDES.map((g) => (
                  <button
                    key={g.category}
                    type="button"
                    onClick={() => {
                      setActiveTab("guides");
                      setSelectedGuideCategory(g.category);
                      setSelectedArticle(null);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[12.5px] font-bold text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <BookOpen className="h-3 w-3" />
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Header */}
            <div className="text-center space-y-1">
              <h1 className="text-[24px] sm:text-[28px] font-black text-white tracking-wide">
                Frequently Asked Questions
              </h1>
            </div>

            {/* FAQ Category Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {FAQ_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setExpandedFaqId(FAQ_DATA[cat.id]?.[0]?.id ?? null);
                    }}
                    className={`flex flex-col items-center justify-center p-4 rounded-[12px] transition-all text-center ${
                      isSelected
                        ? "bg-white text-[#161b26] shadow-[0_12px_30px_rgba(0,0,0,0.35)] scale-[1.03]"
                        : "bg-[#1f2738] text-white/70 hover:bg-[#273248] hover:text-white border border-white/5"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-full mb-2 ${
                        isSelected ? "bg-[#161b26]/10 text-[#161b26]" : "bg-white/5 text-white"
                      }`}
                    >
                      <Icon className="h-5 w-5" strokeWidth={2.2} />
                    </div>
                    <span className="text-[13px] font-extrabold leading-snug">{cat.title}</span>
                    <span className={`text-[11px] font-bold mt-0.5 ${isSelected ? "text-[#161b26]/60" : "text-white/40"}`}>
                      {cat.countLabel}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="border-t border-white/10" />

            {/* FAQ Accordion */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4 text-left">
              {currentFaqs.map((item) => {
                const isExpanded = expandedFaqId === item.id;
                return (
                  <div key={item.id} className="border-b border-white/10 pb-4">
                    <button
                      type="button"
                      onClick={() => setExpandedFaqId(isExpanded ? null : item.id)}
                      className="flex w-full items-start gap-3 text-left font-extrabold text-[14px] text-white/90 hover:text-white transition-colors"
                    >
                      <ChevronDown
                        className={`mt-0.5 h-4 w-4 shrink-0 text-white/50 transition-transform duration-200 ${
                          isExpanded ? "rotate-180 text-[#1175d5]" : ""
                        }`}
                      />
                      <span>{item.question}</span>
                    </button>
                    {isExpanded && (
                      <div className="mt-3 pl-7 pr-2 text-[13px] font-normal leading-relaxed text-white/65 whitespace-pre-line animate-fadeIn">
                        {item.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Contact Support CTA */}
            <div className="pb-4 flex justify-center">
              <div className="bg-[#1f293d] border border-white/10 rounded-[12px] p-4 sm:px-8 flex items-center gap-4 max-w-md w-full shadow-lg">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1175d5] text-white">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div className="text-left text-[13px]">
                  <p className="font-bold text-white/80">Didn't find an answer to your question?</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("create_request")}
                    className="mt-0.5 font-extrabold text-[#1175d5] hover:underline flex items-center gap-1"
                  >
                    Contact customer support
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════ TAB: GUIDES & OVERVIEW ════════════════════════════════ */}
        {activeTab === "guides" && (
          <div className="space-y-10">
            {!selectedGuideCategory && (
              <>
                {/* ── GET STARTED: Single Primary Platform Walkthrough Banner ── */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#00B8FF]">GET STARTED</span>
                  </div>
                  <div className="rounded-[14px] bg-[#1a2336] border border-[#00B8FF]/25 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:border-[#00B8FF]/45 transition-all shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-[#00B8FF]/10 border border-[#00B8FF]/25 text-[#00B8FF]">
                        <Compass className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-black uppercase tracking-wider text-[#00B8FF]">Interactive Walkthrough</span>
                        </div>
                        <h3 className="text-[19px] font-black text-white mb-1">New to InitOption? Take the Complete Platform Tour</h3>
                        <p className="text-[13px] font-medium text-white/60 leading-relaxed">
                          Learn trading terminal controls • deposits & funding • withdrawals • account verification • copy trading
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLaunchTour("platform")}
                      className="whitespace-nowrap shrink-0 flex items-center gap-2 rounded-[8px] bg-[#00B8FF] px-6 py-3.5 text-[14px] font-black text-black hover:bg-[#33c6ff] transition-all shadow-[0_4px_20px_rgba(0,184,255,0.3)]"
                    >
                      <PlayCircle className="h-4.5 w-4.5" />
                      Start Platform Tour
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* ── PLATFORM GUIDES GRID (Unified Financial Color Scheme - No Rainbow Cards!) ── */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[11px] font-black uppercase tracking-[0.14em] text-white/40">PLATFORM GUIDES</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { id: "trading", title: "Trading", description: "Learn the trading terminal, candlestick charts & execution", count: "7 guides", icon: TrendingUp },
                      { id: "deposits", title: "Deposits", description: "Fund your trading account with M-Pesa & crypto", count: "4 guides", icon: Wallet },
                      { id: "withdrawals", title: "Withdrawals", description: "Withdraw your funds to mobile money & wallets", count: "3 guides", icon: ArrowUpFromLine },
                      { id: "account_security", title: "Account & Security", description: "KYC verification, profile details & security controls", count: "4 guides", icon: ShieldCheck },
                      { id: "copy_trading", title: "Copy Trading", description: "Follow top traders and configure automated copy settings", count: "3 guides", icon: Users },
                      { id: "bonuses", title: "Bonuses", description: "Understand promo codes, deposit bonuses & requirements", count: "2 guides", icon: Gift },
                      { id: "tournaments", title: "Tournaments", description: "Learn about competitions, rankings & prize pools", count: "3 guides", icon: Trophy },
                    ].map((guide) => {
                      const Icon = guide.icon;
                      return (
                        <div
                          key={guide.id}
                          onClick={() => {
                            setSelectedGuideCategory(guide.id as GuideCategory);
                            setSelectedArticle(null);
                          }}
                          className="group flex flex-col justify-between bg-[#192130] border border-white/10 rounded-[12px] p-5 hover:border-[#00B8FF]/40 hover:bg-[#1d273a] transition-all cursor-pointer shadow-md"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#00B8FF]/10 border border-[#00B8FF]/20 text-[#00B8FF] group-hover:bg-[#00B8FF]/20 group-hover:border-[#00B8FF]/40 transition-all">
                                <Icon className="h-5 w-5" />
                              </div>
                              <span className="text-[12px] font-bold text-[#00B8FF] group-hover:translate-x-1 transition-transform flex items-center gap-1">
                                {guide.count}
                                <ArrowRight className="h-3.5 w-3.5" />
                              </span>
                            </div>
                            <h3 className="text-[16px] font-black text-white mb-1.5 group-hover:text-[#00B8FF] transition-colors">{guide.title}</h3>
                            <p className="text-[12.5px] font-medium text-white/55 leading-relaxed mb-2">{guide.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Guide Section Article List */}
            {selectedGuideCategory && currentGuideSection && !selectedArticle && (
              <div className="animate-fadeIn">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGuideCategory(null);
                    setSelectedArticle(null);
                  }}
                  className="flex items-center gap-2 text-[13px] font-bold text-white/40 hover:text-white/80 transition-colors mb-6"
                >
                  <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                  Back to Guides
                </button>

                {/* Sub-tour launch callout inside category view */}
                {selectedGuideCategory === "trading" && (
                  <div className="mb-6 rounded-[12px] bg-[#1a2336] border border-[#00B8FF]/25 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Compass className="h-5 w-5 text-[#00B8FF]" />
                      <div>
                        <p className="text-[13px] font-bold text-white">Want an interactive walkthrough of the Trading Terminal?</p>
                        <p className="text-[11px] text-white/45">Step-by-step tour highlighting live charts, timeframes, indicators & trade panel.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLaunchTour("trading")}
                      className="px-4 py-2 rounded-[6px] bg-[#00B8FF] text-black text-[12px] font-black hover:bg-[#33c6ff] transition-all flex items-center gap-1.5 shrink-0"
                    >
                      <PlayCircle className="h-3.5 w-3.5" />
                      Start Trading Tour
                    </button>
                  </div>
                )}

                {selectedGuideCategory === "deposits" && (
                  <div className="mb-6 rounded-[12px] bg-[#1a2336] border border-[#00B8FF]/25 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Compass className="h-5 w-5 text-[#00B8FF]" />
                      <div>
                        <p className="text-[13px] font-bold text-white">Want an interactive walkthrough of Deposits?</p>
                        <p className="text-[11px] text-white/45">Step-by-step tour covering M-Pesa & Crypto deposit steps.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLaunchTour("deposit")}
                      className="px-4 py-2 rounded-[6px] bg-[#00B8FF] text-black text-[12px] font-black hover:bg-[#33c6ff] transition-all flex items-center gap-1.5 shrink-0"
                    >
                      <PlayCircle className="h-3.5 w-3.5" />
                      Start Deposit Tour
                    </button>
                  </div>
                )}

                {selectedGuideCategory === "withdrawals" && (
                  <div className="mb-6 rounded-[12px] bg-[#1a2336] border border-[#00B8FF]/25 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Compass className="h-5 w-5 text-[#00B8FF]" />
                      <div>
                        <p className="text-[13px] font-bold text-white">Want an interactive walkthrough of Withdrawals?</p>
                        <p className="text-[11px] text-white/45">Step-by-step tour covering withdrawal requests & payouts.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLaunchTour("withdrawal")}
                      className="px-4 py-2 rounded-[6px] bg-[#00B8FF] text-black text-[12px] font-black hover:bg-[#33c6ff] transition-all flex items-center gap-1.5 shrink-0"
                    >
                      <PlayCircle className="h-3.5 w-3.5" />
                      Start Withdrawal Tour
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#00B8FF]/10 border border-[#00B8FF]/25 text-[#00B8FF]">
                    <currentGuideSection.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-[22px] font-black text-white">{currentGuideSection.title}</h2>
                    <p className="text-[12px] text-white/40">{currentGuideSection.articles.length} articles</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {currentGuideSection.articles.map((article) => (
                    <button
                      key={article.id}
                      type="button"
                      onClick={() => setSelectedArticle(article)}
                      className="w-full flex items-center gap-4 bg-[#192130] border border-white/8 rounded-[10px] p-4 text-left hover:border-[#00B8FF]/30 hover:bg-[#1d273a] transition-all"
                    >
                      <span className="text-[11px] font-black text-[#00B8FF]/60 w-7 shrink-0">{article.number}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold text-white">{article.title}</p>
                        <p className="text-[12px] text-white/45 mt-0.5">{article.summary}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-white/30">
                        <Clock className="h-3 w-3" />
                        <span className="text-[11px]">{article.readTime}</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Article Reader */}
            {selectedArticle && currentGuideSection && (
              <GuideArticleReader
                article={selectedArticle}
                sectionTitle={currentGuideSection.title}
                onBack={() => setSelectedArticle(null)}
              />
            )}
          </div>
        )}

        {/* ════════════════════════════════ TAB: CREATE REQUEST ════════════════════════════════ */}
        {activeTab === "create_request" && (
          <div className="max-w-[700px] mx-auto space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-[24px] font-black text-white">Create a Support Request</h2>
              <p className="text-[13px] font-bold text-white/50">
                Our support team is available 24/7. Submit your query and we will respond promptly.
              </p>
            </div>
            <form
              onSubmit={handleCreateTicket}
              className="bg-[#1f2738] p-6 sm:p-8 rounded-[12px] border border-white/10 space-y-5 shadow-xl text-left"
            >
              <div>
                <label className="block text-[12px] font-extrabold text-white/70 uppercase tracking-wider mb-2">
                  Category
                </label>
                <select
                  value={ticketCategory}
                  onChange={(e) => setTicketCategory(e.target.value)}
                  className="h-11 w-full rounded-[6px] border border-white/15 bg-[#161b26] px-4 text-sm font-bold text-white outline-none focus:border-[#1175d5] transition-colors"
                >
                  <option value="Trading Platform">Trading Platform & Execution</option>
                  <option value="Account & Verification">Account & KYC Verification</option>
                  <option value="Deposits & Payments">Deposits & Payments</option>
                  <option value="Payouts & Withdrawals">Payouts & Withdrawals</option>
                  <option value="Tournaments">Tournaments & Promotions</option>
                  <option value="Copy Trading">Copy Trading</option>
                  <option value="Technical Issue">Technical Issue</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-extrabold text-white/70 uppercase tracking-wider mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  placeholder="e.g. Question regarding M-Pesa deposit processing"
                  className="h-11 w-full rounded-[6px] border border-white/15 bg-[#161b26] px-4 text-sm font-bold text-white outline-none focus:border-[#1175d5] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[12px] font-extrabold text-white/70 uppercase tracking-wider mb-2">
                  Message Description
                </label>
                <textarea
                  rows={5}
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                  placeholder="Please describe your issue in detail. Include any relevant transaction IDs, dates, or error descriptions..."
                  className="w-full rounded-[6px] border border-white/15 bg-[#161b26] p-4 text-sm font-bold text-white outline-none focus:border-[#1175d5] transition-colors resize-none"
                />
              </div>
              <div>
                <label className="block text-[12px] font-extrabold text-white/70 uppercase tracking-wider mb-2">
                  Attachment (Optional Screenshot)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex h-11 items-center gap-2 rounded-[6px] border border-dashed border-white/20 bg-[#161b26] px-4 text-xs font-bold text-white/70 hover:text-white cursor-pointer transition-colors">
                    <Paperclip className="h-4 w-4 text-[#1175d5]" />
                    <span>{ticketAttachment ? ticketAttachment.name : "Attach Screenshot or File"}</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setTicketAttachment(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                  {ticketAttachment && (
                    <button
                      type="button"
                      onClick={() => setTicketAttachment(null)}
                      className="text-xs font-bold text-red-400 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-[6px] bg-[#1175d5] text-[15px] font-black text-white shadow-md transition-all hover:bg-[#0d69c2] active:scale-[0.99] disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  <span>{isSubmitting ? "Submitting..." : "Submit Support Request"}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ════════════════════════════════ TAB: MY REQUESTS ════════════════════════════════ */}
        {activeTab === "my_requests" && (
          <div className="max-w-[900px] mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[24px] font-black text-white text-left">My Support Requests</h2>
                <p className="text-[13px] font-bold text-white/50 text-left">
                  Track status and communicate with platform support.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("create_request")}
                className="flex items-center gap-2 rounded-[6px] bg-[#1175d5] px-4 py-2 text-xs font-bold text-white hover:bg-[#0d69c2]"
              >
                <Plus className="h-4 w-4" />
                New Request
              </button>
            </div>
            {tickets.length === 0 ? (
              <div className="bg-[#1f2738] p-12 rounded-[12px] border border-white/10 text-center space-y-4">
                <HelpCircle className="h-12 w-12 text-white/20 mx-auto" />
                <p className="text-[15px] font-bold text-white/60">No support requests submitted yet.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab("create_request")}
                  className="inline-flex items-center gap-2 rounded-[6px] bg-[#1175d5] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0d69c2]"
                >
                  Create request
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setActiveTicket(t)}
                    className="bg-[#1f2738] p-5 rounded-[10px] border border-white/10 hover:border-[#1175d5]/50 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[13px] font-bold text-[#1175d5]">{t.id}</span>
                        <span className="text-[11px] font-bold text-white/40">{t.category}</span>
                      </div>
                      <h3 className="text-[15px] font-bold text-white truncate">{t.subject}</h3>
                      <p className="text-[12px] text-white/50 line-clamp-1">{t.message}</p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-black uppercase ${
                          t.status === "Answered"
                            ? "bg-green-500/20 text-green-400"
                            : t.status === "Open"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-white/10 text-white/50"
                        }`}
                      >
                        {t.status}
                      </span>
                      <ChevronDown className="h-4 w-4 text-white/40 -rotate-90" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>

      {/* ── TICKET DETAIL DISCUSSION THREAD MODAL ── */}
      {activeTicket && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85dvh] w-full max-w-[650px] flex-col overflow-hidden rounded-[12px] bg-[#1a2130] border border-white/15 text-white shadow-2xl text-left">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-[#20293c]">
              <div>
                <span className="font-mono text-xs font-bold text-[#1175d5]">{activeTicket.id}</span>
                <h3 className="text-[16px] font-bold text-white">{activeTicket.subject}</h3>
              </div>
              <button type="button" onClick={() => setActiveTicket(null)} className="text-white/40 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 deposit-scrollbar">
              {activeTicket.replies.map((reply) => (
                <div
                  key={reply.id}
                  className={`flex flex-col ${reply.sender === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-[10px] p-4 text-[13px] leading-relaxed ${
                      reply.sender === "user"
                        ? "bg-[#1175d5] text-white rounded-br-none"
                        : "bg-[#253046] text-white/90 border border-white/10 rounded-bl-none"
                    }`}
                  >
                    <p className="font-bold text-[11px] opacity-75 mb-1">
                      {reply.sender === "user" ? "You" : "Support Team"}
                    </p>
                    <p>{reply.text}</p>
                  </div>
                  <span className="text-[10px] text-white/40 mt-1">
                    {new Date(reply.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-white/10 bg-[#161b26] flex items-center gap-3">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendReply()}
                placeholder="Type a message to support..."
                className="h-11 flex-1 rounded-[6px] border border-white/15 bg-[#20293c] px-4 text-sm font-bold text-white outline-none focus:border-[#1175d5]"
              />
              <button
                type="button"
                onClick={handleSendReply}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] bg-[#1175d5] text-white hover:bg-[#0d69c2]"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
