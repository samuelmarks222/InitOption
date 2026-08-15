import { api } from "@/integrations/api/client";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  BookText,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Download,
  Globe2,
  Grid,
  Handshake,
  Headset,
  HelpCircle,
  Image as ImageIcon,
  LineChart,
  MessageCircle,
  Plus,
  PlaySquare,
  Settings,
  Smartphone,
  Star,
  Trophy,
  User,
  Wallet,
} from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { TradeDeskShortcut } from "@/components/navigation/TradeDeskShortcut";
import { NavigationSidebar, type WorkspaceModule } from "@/components/navigation/NavigationSidebar";
import TradingHeader from "@/components/trading/TradingHeader";
import type { AccountType, KycDocumentsLike } from "@/components/trading/AccountModals";
import { ProfileDrawer, type ProfileTab } from "@/components/profile/ProfileDrawer";
import { ProfileTourProvider } from "@/contexts/ProfileTourContext";
import TradingRouteProviders from "@/components/TradingRouteProviders";
import { useAuth } from "@/contexts/AuthContext";
import { getEffectiveLiveBalance } from "@/lib/live-balance";
import {
  DEFAULT_DEMO_BALANCE,
  readDemoBalanceStorage,
  writeDemoBalanceStorage,
} from "@/lib/onboarding";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";
import { normalizeWebsiteContent, type GuideMediaKey, type GuideMediaSettings } from "@/lib/websiteContent";

type IconType = ComponentType<{ className?: string; strokeWidth?: number }>;

type HelpPanel = "support" | "guides" | "support-chat" | "apps";
type GuideCategoryId = "platform" | "strategies" | "glossary" | "videos";
type VisualVariant = GuideMediaKey;
type GuideShellTarget =
  | { kind: "panel"; panel: HelpPanel }
  | { kind: "topic"; topicId: string; category?: GuideCategoryId };

const GUIDE_HERO_IMAGE = "/landing/poolito-initoption/hero-laptop-desk.jpg";
const GUIDE_FIGURE_FALLBACK = "/landing/poolito-initoption/imac-platform-alt.png";

interface GuideTopic {
  id: string;
  number: string;
  title: string;
  children?: GuideTopic[];
}

interface GuideContent {
  heading?: string;
  intro?: string;
  paragraphs?: string[];
  bullets?: string[];
  note?: string;
  figure?: {
    title: string;
    caption: string;
    variant: VisualVariant;
  };
  secondaryFigure?: {
    title: string;
    caption: string;
    variant: VisualVariant;
  };
  video?: {
    title: string;
    duration: string;
    image: "trading" | "mobile";
  };
}

const helpTabs: Array<{ id: HelpPanel | "reviews"; label: string; icon: IconType }> = [
  { id: "support", label: "Support Service", icon: Headset },
  { id: "guides", label: "Guides and Tutorials", icon: BookOpen },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "support-chat", label: "Support Chat", icon: MessageCircle },
  { id: "apps", label: "Applications", icon: Smartphone },
];

const guideCategories: Array<{
  id: GuideCategoryId;
  label: string;
  icon: IconType;
  description: string;
}> = [
  {
    id: "platform",
    label: "Platform Guide",
    icon: BookText,
    description: "Step-by-step trading desk walkthrough",
  },
  {
    id: "strategies",
    label: "Trading Strategies",
    icon: ClipboardList,
    description: "Risk control and decision routines",
  },
  {
    id: "glossary",
    label: "Trading Tutorial & Glossary",
    icon: BookOpen,
    description: "Trading words explained clearly",
  },
  {
    id: "videos",
    label: "Video Tutorials",
    icon: PlaySquare,
    description: "Short visual lessons for every feature",
  },
];

const platformTopics: GuideTopic[] = [
  { id: "introduction", number: "1", title: "Introduction" },
  {
    id: "registration",
    number: "2",
    title: "Registration",
    children: [
      { id: "signup-email", number: "2.1", title: "How to sign up with email" },
      { id: "signup-google", number: "2.2", title: "How to sign up with a Google account" },
    ],
  },
  {
    id: "interface",
    number: "3",
    title: "Interface",
    children: [
      { id: "platform-language", number: "3.1", title: "Choosing a platform language" },
      { id: "layout-theme", number: "3.2", title: "Switching a platform layout theme" },
      { id: "multi-chart", number: "3.3", title: "Multiple charts display" },
      { id: "trade-panel", number: "3.4", title: "Trade panel" },
      { id: "trading-assets", number: "3.5", title: "Trading assets" },
      { id: "chart-type", number: "3.6", title: "Chart type" },
      { id: "indicators", number: "3.7", title: "Indicators" },
      { id: "drawings", number: "3.8", title: "Drawings" },
      {
        id: "other-settings",
        number: "3.9",
        title: "Other settings",
        children: [
          { id: "market-watch", number: "3.9.1", title: "Enabling market watch" },
          { id: "chart-zoom", number: "3.9.2", title: "Chart zoom" },
          { id: "hide-balance", number: "3.9.3", title: "Hiding balance and personal data" },
          { id: "sound-notifications", number: "3.9.4", title: "Enabling sound notifications" },
          { id: "result-tooltips", number: "3.9.5", title: "Enabling trade result tooltips" },
          { id: "indicator-menu", number: "3.9.6", title: "Indicators menu" },
        ],
      },
      { id: "hotkeys", number: "3.10", title: "Hotkeys" },
      { id: "expiration-modes", number: "3.11", title: "Expiration modes" },
    ],
  },
  {
    id: "profile",
    number: "4",
    title: "Profile",
    children: [
      {
        id: "verification",
        number: "4.1",
        title: "Verification",
        children: [
          { id: "email-verification", number: "4.1.1", title: "Email verification" },
          { id: "identity-verification", number: "4.1.2", title: "Identity verification" },
          { id: "address-verification", number: "4.1.3", title: "Address verification" },
          { id: "bank-card-verification", number: "4.1.4", title: "Bank card verification" },
        ],
      },
      {
        id: "trading-profile",
        number: "4.2",
        title: "Trading profile",
        children: [
          { id: "profile-id", number: "4.2.1", title: "Finding the profile ID" },
          { id: "trading-statistics", number: "4.2.2", title: "Trading statistics" },
        ],
      },
      { id: "profile-settings", number: "4.3", title: "Profile settings" },
      {
        id: "security",
        number: "4.4",
        title: "Security",
        children: [
          { id: "change-password", number: "4.4.1", title: "Changing a password" },
          { id: "two-factor", number: "4.4.2", title: "Two-factor authentication" },
          { id: "login-history", number: "4.4.3", title: "Login history and active sessions" },
        ],
      },
      { id: "trading-history", number: "4.5", title: "Trading history" },
      { id: "password-recovery", number: "4.6", title: "Password recovery" },
    ],
  },
  {
    id: "finance",
    number: "5",
    title: "Finance",
    children: [
      {
        id: "deposit",
        number: "5.1",
        title: "Deposit",
        children: [
          { id: "making-deposit", number: "5.1.1", title: "Making a deposit" },
          { id: "mpesa-deposit", number: "5.1.1.1", title: "M-PESA deposit how-to" },
          { id: "crypto-deposit", number: "5.1.1.2", title: "Cryptocurrency deposit how-to" },
          { id: "deposit-bonus", number: "5.1.2", title: "Applying a deposit bonus" },
          { id: "deposit-troubleshooting", number: "5.1.3", title: "Deposit troubleshooting" },
        ],
      },
      {
        id: "withdrawal",
        number: "5.2",
        title: "Withdrawal",
        children: [
          { id: "creating-withdrawal", number: "5.2.1", title: "Creating a withdrawal request" },
          { id: "mpesa-withdrawal", number: "5.2.1.1", title: "M-PESA withdrawal how-to" },
          { id: "crypto-withdrawal", number: "5.2.1.2", title: "Cryptocurrency withdrawal how-to" },
          { id: "cancelling-withdrawal", number: "5.2.2", title: "Cancelling a withdrawal request" },
          { id: "withdrawal-status", number: "5.2.3", title: "Changing payment account details" },
          { id: "withdrawal-troubleshooting", number: "5.2.4", title: "Withdrawal troubleshooting" },
        ],
      },
    ],
  },
  { id: "demo-account", number: "6", title: "Demo account" },
  {
    id: "real-account",
    number: "7",
    title: "Real account",
    children: [
      {
        id: "placing-order",
        number: "7.1",
        title: "Placing a trading order",
        children: [
          { id: "cancel-open-trade", number: "7.1.1", title: "Cancelling an open trade" },
          { id: "double-up", number: "7.1.2", title: "Using the Double Up feature" },
          { id: "rollover", number: "7.1.3", title: "Using the Rollover feature" },
          { id: "trade-results", number: "7.1.4", title: "Trade order results" },
        ],
      },
      { id: "monitoring-trades", number: "7.2", title: "Monitoring your trades" },
    ],
  },
  { id: "trading-signals", number: "8", title: "Trading signals" },
  {
    id: "social-trading",
    number: "9",
    title: "Social trading",
    children: [
      { id: "top-ranked-trades", number: "9.1", title: "Top ranked trades" },
      { id: "traders-search", number: "9.2", title: "Traders search" },
      { id: "copying-trader", number: "9.3", title: "Copying a trader" },
      { id: "copied-traders", number: "9.4", title: "List of copied traders" },
      { id: "disable-copy", number: "9.5", title: "Disabling automatic copy" },
      { id: "copying-me", number: "9.6", title: "Copying me" },
      { id: "watched-traders", number: "9.7", title: "List of watched traders" },
      { id: "social-rating", number: "9.8", title: "Social trading setting" },
      { id: "social-rewards", number: "9.9", title: "Rewards for social trading" },
    ],
  },
  { id: "express-trades", number: "10", title: "Express trades" },
  {
    id: "tournaments",
    number: "11",
    title: "Tournaments",
    children: [
      { id: "participating-tournament", number: "11.1", title: "Participating in the tournament" },
      { id: "tournament-rebuy", number: "11.2", title: "Tournament rebuy feature" },
      { id: "claiming-prize", number: "11.3", title: "Claiming a tournament prize" },
    ],
  },
  {
    id: "pending-trades",
    number: "12",
    title: "Pending trades",
    children: [
      { id: "pending-by-time", number: "12.1", title: "Placing a by-time trade order" },
      { id: "pending-by-price", number: "12.2", title: "Placing a by-asset-price trade order" },
      { id: "cancel-pending", number: "12.3", title: "Cancelling a pending trade order" },
    ],
  },
  { id: "achievements", number: "13", title: "Achievements" },
  { id: "market", number: "14", title: "Market" },
  {
    id: "chat",
    number: "15",
    title: "Chat",
    children: [
      { id: "general-chat", number: "15.1", title: "General chat" },
      { id: "private-chats", number: "15.2", title: "Private chats" },
      { id: "channels", number: "15.3", title: "Channels" },
      { id: "notifications-chat", number: "15.4", title: "Notifications" },
    ],
  },
  { id: "help", number: "16", title: "Help" },
];

const strategyTopics: GuideTopic[] = [
  { id: "strategy-intro", number: "1", title: "Strategy basics" },
  { id: "risk-management", number: "2", title: "Risk management" },
  { id: "trend-following", number: "3", title: "Trend following" },
  { id: "support-resistance", number: "4", title: "Support and resistance" },
  { id: "breakout-plan", number: "5", title: "Breakout planning" },
  { id: "news-discipline", number: "6", title: "Trading around news" },
  { id: "journal-review", number: "7", title: "Reviewing your journal" },
];

const glossaryTopics: GuideTopic[] = [
  { id: "glossary-intro", number: "1", title: "Market terms" },
  { id: "candles-glossary", number: "2", title: "Candles and timeframes" },
  { id: "payout-glossary", number: "3", title: "Payout and return" },
  { id: "volatility-glossary", number: "4", title: "Volatility" },
  { id: "order-glossary", number: "5", title: "Orders and expiry" },
  { id: "bonus-glossary", number: "6", title: "Bonus turnover" },
];

const videoTopics: GuideTopic[] = [
  { id: "video-start", number: "1", title: "How to start trading" },
  { id: "video-signup", number: "2", title: "How to sign up" },
  { id: "video-chart", number: "3", title: "How to read the chart" },
  { id: "video-deposit", number: "4", title: "How to deposit" },
  { id: "video-withdraw", number: "5", title: "How to withdraw" },
  { id: "video-chat", number: "6", title: "How to use chats" },
  { id: "video-security", number: "7", title: "How to use security settings" },
  { id: "video-tournaments", number: "8", title: "How to use tournaments" },
];

const topicsByCategory: Record<GuideCategoryId, GuideTopic[]> = {
  platform: platformTopics,
  strategies: strategyTopics,
  glossary: glossaryTopics,
  videos: videoTopics,
};

const contentById: Record<string, GuideContent> = {
  introduction: {
    heading: "1. Introduction",
    intro:
      "Welcome to the platform guide. This manual explains the trading desk, account tools, charts, finance actions, support areas, and safety settings in a clear step-by-step format.",
    paragraphs: [
      "Use the topic list on the left to open a section. Each guide is written for real users, so the focus is practical: where to click, what the setting does, and what to check before you trade.",
      "The guide is also useful for support teams because every topic uses the same language users see inside the trading workspace.",
    ],
    figure: { title: "Trading desk overview", caption: "Fig. 1. Platform guide", variant: "chart" },
    video: { title: "How to Start Trading", duration: "00:48", image: "trading" },
  },
  registration: {
    intro:
      "Registration creates your secure account and gives you access to the demo balance, live account tools, profile setup, and finance sections.",
    paragraphs: [
      "You can register with an email address or use Google sign-in. After the account is created, verify your email before using full account features.",
    ],
    figure: { title: "Registration flow", caption: "Fig. 2. Registration", variant: "profile" },
    video: { title: "How to Sign Up", duration: "01:03", image: "mobile" },
  },
  "signup-email": {
    intro:
      "To sign up with email, open the registration page, enter your email, create a password, accept the required terms, and submit the form.",
    paragraphs: [
      "A confirmation email is sent automatically. Open the message and click the verification link before using sensitive account actions such as withdrawals.",
    ],
    figure: { title: "Email signup form", caption: "Fig. 3. Signing up with email", variant: "profile" },
    video: { title: "How to Sign Up with Email", duration: "01:03", image: "mobile" },
  },
  "signup-google": {
    intro:
      "To sign up with Google, select the Google button on the registration screen and continue through the secure Google confirmation window.",
    paragraphs: [
      "After Google returns you to the platform, complete your profile details and check that your email status shows verified.",
    ],
    figure: { title: "Google account sign-up", caption: "Fig. 4. Signing up with Google", variant: "profile" },
    video: { title: "How to Sign Up with Google", duration: "01:03", image: "mobile" },
  },
  interface: {
    intro:
      "The interface is designed around the chart. The asset tabs, chart tools, account switcher, trade panel, side navigation, and support areas stay close to the action.",
    figure: { title: "Interface layout", caption: "Fig. 5. Trading interface", variant: "chart" },
  },
  "platform-language": {
    intro:
      "To change language, open settings from your profile area and choose the preferred language from the language dropdown.",
    note:
      "The selected language affects platform labels and help content. Chat content depends on the language used by the person sending the message.",
    figure: { title: "Language settings", caption: "Fig. 6. Choosing a platform language", variant: "settings" },
  },
  "layout-theme": {
    intro:
      "The platform supports visual themes for different lighting conditions. Open settings, choose a theme, and apply it to the full dashboard area.",
    paragraphs: [
      "Use Default for the standard dark dashboard, Graphite for high-contrast black, Midnight for a deeper low-light view, and Ivory in bright rooms.",
    ],
    figure: { title: "Theme controls", caption: "Fig. 7. Switching a platform layout theme", variant: "settings" },
  },
  "multi-chart": {
    intro:
      "Multiple charts let you monitor more than one asset at the same time. Open the layout switcher and choose the chart arrangement that fits your screen.",
    paragraphs: [
      "If you prefer a wider view, you can also use separate browser tabs and keep each asset in a single large chart.",
    ],
    figure: { title: "Multi-chart layout", caption: "Fig. 8. Multiple charts display", variant: "chart" },
    video: { title: "How to Use the Multi Chart Mode", duration: "00:44", image: "trading" },
  },
  "trade-panel": {
    intro:
      "The trade panel contains the controls used to select duration, investment amount, expected payout, and trade direction.",
    bullets: [
      "Choose the asset first so payout and schedule are correct.",
      "Set the duration before choosing direction.",
      "Check the investment amount before confirming the trade.",
    ],
    figure: { title: "Trade panel", caption: "Fig. 9. Location of the trade panel", variant: "orders" },
    video: { title: "How to Use the Trade Panel", duration: "01:21", image: "trading" },
  },
  "trading-assets": {
    intro:
      "Assets are grouped by market type, favorites, and availability. Use search to find a pair quickly and open it in a chart tab.",
    paragraphs: [
      "Favorite assets appear in quick access so you can switch faster during active sessions.",
    ],
    figure: { title: "Asset selector", caption: "Fig. 10. Choosing an asset by category", variant: "market" },
    secondaryFigure: { title: "Asset search", caption: "Fig. 11. Using instant search", variant: "market" },
    video: { title: "How to Use Trading Assets", duration: "00:52", image: "trading" },
  },
  "chart-type": {
    intro:
      "The platform supports chart styles such as candles, bars, area line, and smoothed candles. Choose the style that makes price action easiest for you to read.",
    paragraphs: [
      "Candles show open, high, low, and close for each period. Area charts are useful for simple trend direction. Heikin-Ashi smooths noisy movement.",
    ],
    figure: { title: "Chart type selector", caption: "Fig. 12. Choosing the chart type", variant: "chart" },
    video: { title: "How to Use Different Chart Types", duration: "01:47", image: "trading" },
  },
  indicators: {
    intro:
      "Indicators are technical analysis tools that help traders evaluate momentum, trend, volatility, and market structure.",
    paragraphs: [
      "Open the indicators menu, choose a tool, and adjust its period, source, color, thickness, and style from the settings icon beside the indicator name.",
    ],
    figure: { title: "Indicator menu", caption: "Fig. 13. Enabling indicators", variant: "signals" },
    secondaryFigure: { title: "Indicator settings", caption: "Fig. 14. Indicator settings", variant: "settings" },
    video: { title: "How to Use Indicators", duration: "01:00", image: "trading" },
  },
  drawings: {
    intro:
      "Drawings are chart analysis tools such as horizontal lines, trend lines, Fibonacci levels, and rectangles.",
    paragraphs: [
      "Open the drawing menu, choose a tool, place it on the chart, and then drag or resize it from its handles. Drawings are saved per asset so they remain visible when you return.",
    ],
    figure: { title: "Drawing menu", caption: "Fig. 15. Drawings", variant: "chart" },
    secondaryFigure: { title: "Rectangle drawing", caption: "Fig. 16. Adding a drawing to the chart", variant: "orders" },
    video: { title: "How to Use Drawings", duration: "01:16", image: "trading" },
  },
  "other-settings": {
    intro:
      "The three-dot settings area contains additional chart and workflow controls, including watch lists, zoom, privacy display, sounds, and result hints.",
    figure: { title: "Other settings menu", caption: "Fig. 17. Other settings menu", variant: "settings" },
    video: { title: "How to Use Other Settings", duration: "01:31", image: "trading" },
  },
  "market-watch": {
    intro:
      "Market watch shows a compact view of selected assets, payouts, and movement so you can compare opportunities without opening every chart.",
    figure: { title: "Market watch", caption: "Fig. 18. Enabling market watch", variant: "market" },
  },
  "chart-zoom": {
    intro:
      "Chart zoom controls the visible candle spacing. Zoom in for precise entries and zoom out for wider market context.",
    figure: { title: "Chart zoom", caption: "Fig. 19. Chart zoom controls", variant: "chart" },
  },
  "hide-balance": {
    intro:
      "Privacy mode hides your balance and personal details on shared screens or recordings.",
    figure: { title: "Privacy controls", caption: "Fig. 20. Hiding balance and personal data", variant: "settings" },
  },
  "sound-notifications": {
    intro:
      "Sound notifications can alert you when trades close, support messages arrive, or price alerts are triggered.",
    figure: { title: "Sound controls", caption: "Fig. 21. Enabling sound notifications", variant: "settings" },
  },
  "result-tooltips": {
    intro:
      "Trade result tooltips show a quick result summary after a position closes so you can check the outcome without opening history.",
    figure: { title: "Result tooltip", caption: "Fig. 22. Trade result tooltip", variant: "orders" },
  },
  "indicator-menu": {
    intro:
      "The indicators menu lists current indicators, available indicators, settings, and removal controls.",
    figure: { title: "Indicators menu", caption: "Fig. 23. Indicators menu", variant: "signals" },
  },
  hotkeys: {
    intro:
      "Hotkeys help experienced users move faster. They are best used after you fully understand how the trade panel behaves.",
    bullets: ["Use hotkeys only on your own device.", "Confirm investment amount before using fast-entry actions."],
    figure: { title: "Hotkeys", caption: "Fig. 24. Hotkeys", variant: "settings" },
  },
  "expiration-modes": {
    intro:
      "Expiration modes define how trade closing time is selected. Choose a duration that matches the market speed and your strategy.",
    figure: { title: "Expiration modes", caption: "Fig. 25. Expiration modes", variant: "orders" },
  },
  profile: {
    intro:
      "The profile area contains verification, personal details, security controls, trading statistics, and account history.",
    figure: { title: "Profile menu", caption: "Fig. 26. Profile area", variant: "profile" },
  },
  verification: {
    intro:
      "Verification protects the account and confirms that the profile belongs to a real user. Complete email, identity, address, and payment verification where required.",
    figure: { title: "Verification status", caption: "Fig. 27. Verification", variant: "security" },
    video: { title: "How to Verify Your Account", duration: "00:48", image: "mobile" },
  },
  "email-verification": {
    intro:
      "After signup, the platform sends a verification email automatically. Open the email and click the confirmation link.",
    paragraphs: [
      "If the message does not arrive, check spam first. You can request another email from the profile verification area.",
    ],
    figure: { title: "Email verification", caption: "Fig. 28. Email verification", variant: "profile" },
    video: { title: "How to Verify Your Email", duration: "00:48", image: "mobile" },
  },
  "identity-verification": {
    intro:
      "Identity verification starts when you complete the required profile fields and upload clear document images.",
    note:
      "Documents should be colored, uncropped, readable, and fully visible. Do not cover any edge or number on the document.",
    figure: { title: "Identity verification", caption: "Fig. 29. Identity verification process", variant: "security" },
    video: { title: "How to Verify Your Account", duration: "00:48", image: "mobile" },
  },
  "address-verification": {
    intro:
      "Address verification may require proof of residence such as a utility bill or bank statement with matching profile details.",
    figure: { title: "Address verification", caption: "Fig. 30. Address verification", variant: "security" },
  },
  "bank-card-verification": {
    intro:
      "Payment account verification helps protect withdrawals and makes sure funds are returned to the correct owner.",
    figure: { title: "Payment verification", caption: "Fig. 31. Bank card or payment account verification", variant: "wallet" as VisualVariant },
  },
  "trading-profile": {
    intro:
      "The trading profile contains account ID, statistics, order history, activity details, and general performance information.",
    figure: { title: "Trading profile", caption: "Fig. 32. Trading profile", variant: "profile" },
  },
  "profile-id": {
    intro:
      "Your profile ID is available in the profile card. Support may ask for this ID when helping with account or finance requests.",
    figure: { title: "Profile ID", caption: "Fig. 33. Finding the profile ID", variant: "profile" },
  },
  "trading-statistics": {
    intro:
      "Trading statistics help you review performance, favorite assets, win rate, return, and activity over a selected period.",
    figure: { title: "Trading statistics", caption: "Fig. 34. Trading statistics", variant: "signals" },
  },
  "profile-settings": {
    intro:
      "Profile settings let you manage notification preferences, profile image, display name, account visibility, and language preferences.",
    figure: { title: "Profile settings", caption: "Fig. 35. Profile settings", variant: "settings" },
    video: { title: "How to Customize Your Profile", duration: "01:10", image: "mobile" },
  },
  security: {
    intro:
      "Security settings protect your account with password controls, two-factor authentication, login history, and active session management.",
    figure: { title: "Security settings", caption: "Fig. 36. Security location", variant: "security" },
    video: { title: "How to Use Security Settings", duration: "01:12", image: "trading" },
  },
  "change-password": {
    intro:
      "To change your password, open Profile, choose Security, enter the old password, then enter the new password twice.",
    figure: { title: "Changing password", caption: "Fig. 37. Changing a password", variant: "security" },
    video: { title: "How to Change Password", duration: "00:34", image: "mobile" },
  },
  "two-factor": {
    intro:
      "Two-factor authentication adds a second confirmation step when signing in. Enable it from Security and store backup access safely.",
    figure: { title: "Two-factor authentication", caption: "Fig. 38. Two-factor authentication", variant: "security" },
  },
  "login-history": {
    intro:
      "Login history shows device, browser, country, and time details for recent account access.",
    paragraphs: ["If a session looks unfamiliar, end active sessions and change your password immediately."],
    figure: { title: "Login history", caption: "Fig. 39. Login history and active sessions", variant: "security" },
  },
  "trading-history": {
    intro:
      "Trading history helps you analyze past activity, filter closed trades, review results, find order IDs, and export records.",
    figure: { title: "Trading history", caption: "Fig. 40. Trading history section", variant: "orders" },
    video: { title: "How to Use the Trading History", duration: "01:01", image: "trading" },
  },
  "password-recovery": {
    intro:
      "If you forget your password, open password recovery from the login page and enter your email address.",
    paragraphs: ["A reset email is sent to your inbox. Follow the link and create a new password."],
    figure: { title: "Password recovery", caption: "Fig. 41. Password recovery", variant: "security" },
  },
  finance: {
    intro:
      "Finance contains deposits, withdrawals, bonuses, payment details, and balance movement history.",
    bullets: [
      "Use your own payment account only.",
      "Confirm the phone number or wallet address before submitting.",
      "Complete verification before requesting large withdrawals.",
    ],
    figure: { title: "Finance location", caption: "Fig. 42. Finance section", variant: "finance" },
  },
  deposit: {
    intro:
      "The deposit area lets you fund the live account with an available payment method and see the exact amount before submission.",
    figure: { title: "Deposit desk", caption: "Fig. 43. Deposit", variant: "finance" },
  },
  "making-deposit": {
    intro:
      "Choose a payment method, enter the amount, review the exchange or network details, and confirm the request.",
    figure: { title: "Making a deposit", caption: "Fig. 44. Making a deposit", variant: "finance" },
  },
  "mpesa-deposit": {
    intro:
      "For M-PESA deposits, enter the USD amount and your phone number. The platform requests the KES equivalent through the payment provider.",
    note: "Always confirm the phone number before approving the payment prompt.",
    figure: { title: "M-PESA deposit", caption: "Fig. 45. M-PESA deposit", variant: "finance" },
  },
  "crypto-deposit": {
    intro:
      "For crypto deposits, choose the coin and network, copy the deposit address, and send the exact amount from your wallet.",
    note: "Crypto transactions cannot be reversed. Confirm the network and address carefully.",
    figure: { title: "Crypto deposit", caption: "Fig. 46. Cryptocurrency deposit", variant: "finance" },
  },
  "deposit-bonus": {
    intro:
      "Deposit bonuses can increase trading balance, but they may add turnover requirements before bonus-related funds are withdrawable.",
    figure: { title: "Deposit bonus", caption: "Fig. 47. Applying a deposit bonus", variant: "wallet" as VisualVariant },
  },
  "deposit-troubleshooting": {
    intro:
      "If a deposit is delayed, check payment status, confirm the phone number or wallet address, and contact support with the transaction ID.",
    figure: { title: "Deposit troubleshooting", caption: "Fig. 48. Deposit troubleshooting", variant: "support" as VisualVariant },
  },
  withdrawal: {
    intro:
      "Withdrawals are submitted from Finance. Choose the payout method, enter the amount, confirm destination details, and submit the request.",
    figure: { title: "Withdrawal desk", caption: "Fig. 49. Withdrawal", variant: "finance" },
  },
  "creating-withdrawal": {
    intro:
      "Create a withdrawal by selecting a method, entering the amount, reviewing bonus turnover if active, and confirming the destination.",
    figure: { title: "Withdrawal request", caption: "Fig. 50. Creating a withdrawal request", variant: "finance" },
  },
  "mpesa-withdrawal": {
    intro:
      "For M-PESA withdrawals, enter the payout phone number and amount. The request is reviewed and sent in the KES equivalent.",
    figure: { title: "M-PESA withdrawal", caption: "Fig. 51. M-PESA withdrawal", variant: "finance" },
  },
  "crypto-withdrawal": {
    intro:
      "For crypto withdrawals, paste the wallet address, choose the network, and confirm the request.",
    note: "Wallet addresses must be exact. A wrong address can permanently lose funds.",
    figure: { title: "Crypto withdrawal", caption: "Fig. 52. Cryptocurrency withdrawal", variant: "finance" },
  },
  "withdrawal-troubleshooting": {
    intro:
      "If a withdrawal fails, check verification, bonus turnover, destination details, and minimum withdrawal rules.",
    figure: { title: "Withdrawal troubleshooting", caption: "Fig. 53. Withdrawal troubleshooting", variant: "finance" },
  },
  "demo-account": {
    intro:
      "The demo account mirrors the live trading workspace using virtual funds. It is designed for learning and practice before using real money.",
    paragraphs: [
      "Demo balance is separate from live balance. Reset or practice on demo without affecting your live account.",
    ],
    figure: { title: "Demo account", caption: "Fig. 54. Demo account", variant: "chart" },
    video: { title: "How to Use a Demo Account", duration: "01:21", image: "trading" },
  },
  "real-account": {
    intro:
      "The real account is used for live trading with deposited funds. Review asset payout, duration, investment amount, and trade direction before each order.",
    figure: { title: "Real account", caption: "Fig. 55. Real account", variant: "orders" },
  },
  "placing-order": {
    intro:
      "To place a trade, choose an asset, select the duration, enter the amount, and choose the expected direction.",
    bullets: [
      "Use Up when your analysis expects price to close higher.",
      "Use Down when your analysis expects price to close lower.",
      "Do not trade if the amount or duration is not what you intended.",
    ],
    figure: { title: "Placing a trading order", caption: "Fig. 56. Placing a trading order", variant: "orders" },
    video: { title: "How to Use the Trade Panel", duration: "01:21", image: "trading" },
  },
  "double-up": {
    intro:
      "Double Up creates a duplicate trade with the same settings. Use it carefully because it increases exposure.",
    figure: { title: "Double Up", caption: "Fig. 57. Using the Double Up feature", variant: "orders" },
  },
  rollover: {
    intro:
      "Rollover extends the open trade duration where available. Availability depends on asset rules and the remaining time.",
    figure: { title: "Rollover", caption: "Fig. 58. Using the Rollover feature", variant: "orders" },
  },
  "trade-results": {
    intro:
      "When a trade closes, the result is shown as won, lost, or returned depending on the closing price and platform rules.",
    figure: { title: "Trade result", caption: "Fig. 59. Trade order results", variant: "orders" },
  },
  "monitoring-trades": {
    intro:
      "Open trades and closed trades can be monitored from the trade history or trade panel without leaving the workspace.",
    figure: { title: "Monitoring trades", caption: "Fig. 60. Monitoring your trades", variant: "orders" },
  },
  "trading-signals": {
    intro:
      "Signals provide structured market ideas when a verified signal feed is available. They should support your analysis, not replace it.",
    note: "Only use verified signals backed by real platform data. Random confidence scores should not be trusted.",
    figure: { title: "Trading signals", caption: "Fig. 61. Trading signals", variant: "signals" },
    video: { title: "How to Use Trading Features", duration: "02:05", image: "trading" },
  },
  "social-trading": {
    intro:
      "Social trading lets users monitor experienced traders, compare public statistics, and learn from trading behavior.",
    figure: { title: "Social trading", caption: "Fig. 62. Social trading", variant: "signals" },
    video: { title: "How to Use Social Trading", duration: "02:32", image: "mobile" },
  },
  "top-ranked-trades": {
    intro:
      "Top ranked trades show active traders by recent performance and trading activity. Use this as research, not as a guarantee.",
    figure: { title: "Top ranked trades", caption: "Fig. 63. Top ranked trades", variant: "signals" },
  },
  "express-trades": {
    intro:
      "Express trades combine selected assets into one structured entry. They require careful risk management because multiple outcomes are connected.",
    figure: { title: "Express trades", caption: "Fig. 64. Express trades", variant: "orders" },
  },
  tournaments: {
    intro:
      "Tournaments let traders compete on a separate tournament balance. Ranking is based on tournament performance, not live account balance.",
    figure: { title: "Tournaments", caption: "Fig. 65. Tournaments", variant: "tournament" },
    video: { title: "How to Use Tournaments", duration: "01:47", image: "trading" },
  },
  "participating-tournament": {
    intro:
      "To join a tournament, open the tournament page, review entry conditions, and confirm participation.",
    figure: { title: "Participating in a tournament", caption: "Fig. 66. Participating in the tournament", variant: "tournament" },
  },
  "tournament-rebuy": {
    intro:
      "A rebuy adds tournament balance if the tournament allows it. Review the cost and tournament rules before confirming.",
    figure: { title: "Tournament rebuy", caption: "Fig. 67. Tournament rebuy feature", variant: "tournament" },
  },
  "claiming-prize": {
    intro:
      "If you win a prize, open tournament history and claim it from the completed tournament record.",
    figure: { title: "Claim prize", caption: "Fig. 68. Claiming a tournament prize", variant: "tournament" },
  },
  "pending-trades": {
    intro:
      "Pending trades are orders scheduled to open when a chosen time or price condition is reached.",
    figure: { title: "Pending trades", caption: "Fig. 69. Pending trades", variant: "orders" },
    video: { title: "How to Use Pending Trades", duration: "01:07", image: "trading" },
  },
  "pending-by-time": {
    intro:
      "A by-time pending order opens at a selected time if the required conditions are still valid.",
    figure: { title: "By-time order", caption: "Fig. 70. Placing a by-time order", variant: "orders" },
  },
  "pending-by-price": {
    intro:
      "A by-price pending order opens when the asset reaches the selected price level.",
    note:
      "The order may not open if payout, balance, asset availability, or market conditions change before the level is reached.",
    figure: { title: "By-price order", caption: "Fig. 71. Placing a by-asset-price order", variant: "orders" },
  },
  achievements: {
    intro:
      "Achievements track account milestones and learning progress. They are separate from financial performance.",
    figure: { title: "Achievements", caption: "Fig. 72. Achievements", variant: "profile" },
  },
  market: {
    intro:
      "Market contains platform offers, promos, bonuses, and other account features. Review rules before activating any offer.",
    figure: { title: "Market", caption: "Fig. 73. Market section", variant: "market" },
  },
  chat: {
    intro:
      "Chat lets users communicate in general rooms, support conversations, and private trader messages.",
    paragraphs: [
      "Follow chat rules, avoid sharing sensitive account details, and report suspicious messages to support.",
    ],
    figure: { title: "Chat list", caption: "Fig. 74. Chat section", variant: "chat" },
    video: { title: "How to Use Chats", duration: "01:14", image: "mobile" },
  },
  "general-chat": {
    intro:
      "General chat is a public room where users can talk about platform use and trading topics.",
    figure: { title: "General chat", caption: "Fig. 75. General chat", variant: "chat" },
  },
  "private-chats": {
    intro:
      "Private chats allow users to message another trader directly from the chat interface or profile entry.",
    figure: { title: "Private chats", caption: "Fig. 76. Private chats", variant: "chat" },
  },
  help: {
    intro:
      "Help connects you to support service, guides, tutorials, reviews, support chat, and application information.",
    figure: { title: "Help center", caption: "Fig. 77. Help", variant: "support" as VisualVariant },
  },
  "strategy-intro": {
    heading: "1. Strategy basics",
    intro:
      "A good strategy is a repeatable process: choose a market condition, define entry rules, control risk, and review the result.",
    bullets: ["Trade only setups you can explain.", "Use small risk per trade.", "Record the reason for each entry."],
    figure: { title: "Strategy checklist", caption: "Fig. 1. Strategy basics", variant: "signals" },
  },
  "risk-management": {
    intro:
      "Risk management decides how much you can lose before you ever place a trade. It is the foundation of long-term discipline.",
    bullets: ["Avoid oversized trades.", "Set a daily stop limit.", "Do not recover losses with emotional entries."],
    figure: { title: "Risk dashboard", caption: "Fig. 2. Risk management", variant: "signals" },
  },
  "trend-following": {
    intro:
      "Trend-following setups look for price movement that continues in the same direction after a pullback or confirmation candle.",
    figure: { title: "Trend structure", caption: "Fig. 3. Trend following", variant: "chart" },
  },
  "support-resistance": {
    intro:
      "Support and resistance are price zones where the market has reacted before. Use them to plan where not to chase trades.",
    figure: { title: "Support and resistance", caption: "Fig. 4. Support and resistance", variant: "chart" },
  },
  "breakout-plan": {
    intro:
      "Breakout planning waits for price to move beyond a defined zone. Confirmation helps avoid false moves.",
    figure: { title: "Breakout plan", caption: "Fig. 5. Breakout planning", variant: "chart" },
  },
  "news-discipline": {
    intro:
      "News can create fast moves and wider spreads. Reduce size or avoid trading if volatility is too high for your plan.",
    figure: { title: "News discipline", caption: "Fig. 6. Trading around news", variant: "market" },
  },
  "journal-review": {
    intro:
      "A journal turns trading from guessing into reviewable behavior. Save setup, reason, result, and what you would improve.",
    figure: { title: "Trading journal", caption: "Fig. 7. Journal review", variant: "profile" },
  },
  "glossary-intro": {
    heading: "1. Market terms",
    intro:
      "This glossary explains the main trading words used across the platform in simple language.",
    figure: { title: "Glossary", caption: "Fig. 1. Market terms", variant: "market" },
  },
  "candles-glossary": {
    intro:
      "A candle shows the open, high, low, and close price for a selected timeframe.",
    figure: { title: "Candles", caption: "Fig. 2. Candles and timeframes", variant: "chart" },
  },
  "payout-glossary": {
    intro:
      "Payout is the percentage shown before a trade. It tells you the potential return if the trade closes correctly.",
    figure: { title: "Payout", caption: "Fig. 3. Payout and return", variant: "orders" },
  },
  "volatility-glossary": {
    intro:
      "Volatility describes how much price moves. High volatility creates opportunity, but also increases risk.",
    figure: { title: "Volatility", caption: "Fig. 4. Volatility", variant: "signals" },
  },
  "order-glossary": {
    intro:
      "An order is an instruction to enter a trade. Expiry is the time when the platform checks the final result.",
    figure: { title: "Orders and expiry", caption: "Fig. 5. Orders and expiry", variant: "orders" },
  },
  "bonus-glossary": {
    intro:
      "Bonus turnover is the required trading volume linked to bonus funds. Review it before withdrawing.",
    figure: { title: "Bonus turnover", caption: "Fig. 6. Bonus turnover", variant: "wallet" as VisualVariant },
  },
};

const railItems: Array<{ label: string; target: GuideShellTarget; icon: IconType; badge?: string }> = [
  { label: "CHAT", target: { kind: "panel", panel: "support-chat" }, icon: Headset, badge: "9" },
  { label: "ACCOUNT", target: { kind: "topic", topicId: "profile" }, icon: User },
  { label: "TOURNAMENTS", target: { kind: "topic", topicId: "tournaments" }, icon: Trophy },
  { label: "LEADERS", target: { kind: "topic", topicId: "top-ranked-trades" }, icon: BarChart3 },
  { label: "... MORE", target: { kind: "topic", topicId: "market" }, icon: Grid },
];

const railBottomItems: Array<{ label: string; target: GuideShellTarget; icon: IconType }> = [
  { label: "SETTINGS", target: { kind: "topic", topicId: "profile-settings" }, icon: Settings },
  { label: "JOIN US", target: { kind: "topic", topicId: "social-rewards" }, icon: Handshake },
  { label: "HELP", target: { kind: "topic", topicId: "help" }, icon: HelpCircle },
];

const flattenTopics = (topics: GuideTopic[]): GuideTopic[] =>
  topics.flatMap((topic) => [topic, ...(topic.children ? flattenTopics(topic.children) : [])]);

const findTopic = (topics: GuideTopic[], id: string): GuideTopic | null => {
  for (const topic of topics) {
    if (topic.id === id) return topic;
    const child = topic.children ? findTopic(topic.children, id) : null;
    if (child) return child;
  }
  return null;
};

const collectOpenParents = (topics: GuideTopic[], selectedId: string, parents: string[] = []): string[] => {
  for (const topic of topics) {
    const nextParents = topic.children?.length ? [...parents, topic.id] : parents;
    if (topic.id === selectedId) return parents;
    if (topic.children) {
      const result = collectOpenParents(topic.children, selectedId, nextParents);
      if (result.length) return result;
    }
  }
  return [];
};

const buildContent = (topic: GuideTopic, platformName: string, category: GuideCategoryId): GuideContent => {
  const base = contentById[topic.id] ?? {};
  return {
    heading: base.heading ?? `${topic.number}. ${topic.title}`,
    intro:
      base.intro ??
      `${topic.title} is part of the ${platformName} ${category === "platform" ? "platform guide" : "learning center"}. This section explains what it does, where to find it, and how to use it safely.`,
    paragraphs: base.paragraphs ?? [
      "Open the relevant panel, review the visible details, and confirm the action only when the displayed information matches what you intended.",
    ],
    bullets: base.bullets,
    note: base.note,
    figure: base.figure ?? { title: topic.title, caption: `Fig. ${topic.number}. ${topic.title}`, variant: "chart" },
    secondaryFigure: base.secondaryFigure,
    video: base.video,
  };
};

const getDefaultOpenSections = (topics: GuideTopic[]) => {
  const open = new Set<string>();
  topics.forEach((topic) => {
    if (topic.children?.length) open.add(topic.id);
  });
  return open;
};

const useGuideMedia = (platformName: string) => {
  const [guideMedia, setGuideMedia] = useState<GuideMediaSettings>({});

  useEffect(() => {
    let isMounted = true;

    const loadGuideMedia = async () => {
      const { data, error } = await api.from("platform_settings")
        .select("platform_name, website_content")
        .limit(1)
        .maybeSingle();

      if (!isMounted || error) {
        return;
      }

      const row = data as { platform_name?: string | null; website_content?: unknown } | null;
      const content = normalizeWebsiteContent(row?.website_content, row?.platform_name || platformName);
      setGuideMedia(content.guideMedia ?? {});
    };

    void loadGuideMedia();

    const handleBrandUpdated = () => void loadGuideMedia();
    window.addEventListener("brand_updated", handleBrandUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener("brand_updated", handleBrandUpdated);
    };
  }, [platformName]);

  return guideMedia;
};

const GuideMediaPlaceholder = ({ title }: { title: string }) => (
  <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-[14px] border border-dashed bg-white/5 px-6 py-10 text-center hover:bg-white/10 transition-colors duration-300" style={{ borderColor: "var(--border)" }}>
    <div className="rounded-lg bg-blue-500/10 p-3">
      <ImageIcon className="h-10 w-10" style={{ color: "hsl(var(--primary))" }} />
    </div>
    <div>
      <p className="text-sm font-semibold text-white">Guide image not assigned</p>
      <p className="mt-1.5 text-xs text-muted-foreground">Upload the real <span style={{ color: "hsl(var(--primary))" }}>{title}</span> image from Admin Settings.</p>
    </div>
  </div>
);

const GuideMockup = ({ title, mediaUrl }: { title: string; mediaUrl?: string }) => {
  if (!mediaUrl) {
    return <GuideMediaPlaceholder title={title} />;
  }

  return (
    <figure className="rounded-[14px] border overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300" style={{ borderColor: "var(--border)", background: "hsl(var(--card))" }}>
      <div className="p-1.5" style={{ background: "hsl(var(--background))" }}>
        <img src={mediaUrl} alt={title} className="h-auto w-full rounded-[10px] object-contain hover:scale-105 transition-transform duration-300" loading="lazy" />
      </div>
    </figure>
  );
};

const VideoPreview = ({
  title,
  duration,
  mediaUrl,
}: {
  title: string;
  duration: string;
  mediaUrl?: string;
}) => (
  <div className="mt-8 overflow-hidden rounded-[14px] border border-white/10 bg-[#0f1826] shadow-lg hover:shadow-2xl transition-all duration-300 group">
    <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-white/[0.02] to-[#0f1826]">
      {mediaUrl ? (
        <img src={mediaUrl} alt={title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90" loading="lazy" />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-gray-400">
          <PlaySquare className="h-12 w-12 text-[#1c81f8] opacity-80" />
          <p className="text-sm font-semibold text-white">Video thumbnail not assigned</p>
          <p className="max-w-sm text-xs text-gray-400">Upload this thumbnail from Admin Settings.</p>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
      <div className="absolute left-6 top-6 rounded-lg bg-[#1c81f8]/15 backdrop-blur-sm border border-[#1c81f8]/30 px-3 py-2 text-xs font-bold uppercase tracking-[0.15em] text-[#1c81f8]">
        Video Tutorial
      </div>
      <div className="absolute right-6 top-6 grid h-14 w-14 place-items-center rounded-full bg-[#1c81f8] text-white shadow-lg shadow-[#1c81f8]/50 group-hover:scale-110 transition-transform duration-300">
        <PlaySquare className="h-6 w-6" />
      </div>
    </div>
    <div className="px-5 py-5">
      <div className="text-base font-bold text-white leading-snug">{title}</div>
      <div className="mt-2.5 text-sm font-medium text-gray-400">{duration}</div>
    </div>
  </div>
);

const GuideTreeNode = ({
  topic,
  activeId,
  depth = 0,
  openIds,
  onToggle,
  onSelect,
}: {
  topic: GuideTopic;
  activeId: string;
  depth?: number;
  openIds: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}) => {
  const hasChildren = Boolean(topic.children?.length);
  const isOpen = openIds.has(topic.id);
  const isActive = topic.id === activeId;

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          onSelect(topic.id);
          if (hasChildren) onToggle(topic.id);
        }}
        className={[
          "group relative flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left leading-tight transition-all duration-200",
          isActive 
            ? "bg-[#1c81f8]/15 text-[#1c81f8] border border-[#1c81f8]/30" 
            : "text-gray-400 hover:bg-white/5 hover:text-white hover:border border border-transparent",
          depth === 0 ? "text-[16px] font-bold text-white mt-3 mb-1" : depth === 1 ? "text-[14px] font-semibold" : "text-[13px] font-medium",
        ].join(" ")}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        <span className="min-w-0 flex-1">
          <span className={`font-semibold ${depth === 0 ? "text-[#1c81f8]" : ""}`}>{topic.number}.</span> {topic.title}
        </span>
        {hasChildren ? (
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180 text-[#1c81f8]" : "text-gray-400"}`} />
        ) : null}
        {isActive && depth === 0 && <div className="absolute left-0 top-1/2 h-[60%] w-1 -translate-y-1/2 rounded-r-full bg-[#1c81f8]"/>}
      </button>
      {hasChildren && isOpen ? (
        <div className="mt-1 space-y-1">
          {topic.children?.map((child) => (
            <GuideTreeNode
              key={child.id}
              topic={child}
              activeId={activeId}
              depth={depth + 1}
              openIds={openIds}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};

const SupportPanel = ({ platformName }: { platformName: string }) => (
  <div className="rounded-[16px] border p-8" style={{ background: "hsl(var(--card))", borderColor: "var(--border)" }}>
    <div className="flex items-start gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <Headset className="h-6 w-6" style={{ color: "hsl(var(--primary))" }}/>
          <h1 className="text-3xl sm:text-4xl font-bold text-white">Support Service</h1>
        </div>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted-foreground">
          Choose the topic that matches your issue. {platformName} support can help with account access, deposits,
          withdrawals, verification, platform settings, and trading workspace questions.
        </p>
      </div>
    </div>
    <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {[
        { title: "Account access", icon: User, text: "Login, profile, security, and verification support." },
        { title: "Finance help", icon: Wallet, text: "Deposits, withdrawals, bonus turnover, and payment details." },
        { title: "Trading desk", icon: LineChart, text: "Chart tools, assets, trades, alerts, and indicators." },
        { title: "Fast support chat", icon: MessageCircle, text: "Open a real support conversation from the platform." },
      ].map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.title} className="rounded-[16px] border bg-white/5 p-5" style={{ borderColor: "var(--border)" }}>
            <Icon className="h-8 w-8" style={{ color: "hsl(var(--primary))" }} />
            <h2 className="mt-5 text-xl font-bold text-white">{item.title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.text}</p>
          </div>
        );
      })}
    </div>
  </div>
);

const SupportChatPanel = () => (
  <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
    <div className="rounded-[18px] border p-6" style={{ background: "hsl(var(--card))", borderColor: "var(--border)" }}>
      <h1 className="text-3xl font-bold text-white">Support Chat</h1>
      <p className="mt-4 text-sm leading-7 text-muted-foreground">
        Start a support conversation from the trading workspace. Keep transaction IDs, phone numbers, and screenshots
        ready when the issue is about payments.
      </p>
      <button
        type="button"
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-[8px] px-5 py-3 text-sm font-bold text-white" style={{ background: "hsl(var(--primary))" }}
      >
        Open support chat
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
    <div className="rounded-[18px] border p-6" style={{ background: "hsl(var(--card))", borderColor: "var(--border)" }}>
      <div className="mb-5 flex items-center gap-3 border-b pb-4" style={{ borderColor: "var(--border)" }}>
        <span className="grid h-11 w-11 place-items-center rounded-full" style={{ background: "hsl(var(--primary))" }}>
          <MessageCircle className="h-5 w-5 text-white" />
        </span>
        <div>
          <div className="text-lg font-bold text-white">Support Chat (Online)</div>
          <div className="text-sm text-muted-foreground">Typical replies appear inside your chat inbox.</div>
        </div>
      </div>
      <div className="space-y-4">
        {[
          "Hello, how can we help today?",
          "Please include your account ID and the exact issue so we can check it quickly.",
          "For withdrawal questions, share the request ID and selected payout method.",
        ].map((message, index) => (
          <div key={message} className="rounded-[14px] bg-white/5 p-4 text-sm leading-6 text-muted-foreground" style={{ borderColor: "var(--border)" }}>
            <span className="font-bold text-white">{index === 0 ? "Support Service" : "Support note"}: </span>
            {message}
          </div>
        ))}
      </div>
    </div>
  </div>
);

const AppsPanel = () => (
  <div className="rounded-[18px] border p-8" style={{ background: "hsl(var(--card))", borderColor: "var(--border)" }}>
    <h1 className="text-4xl font-bold text-white">Applications</h1>
    <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
      Use the web platform on desktop or install it as a browser app on supported mobile devices for quicker access.
    </p>
    <div className="mt-8 grid gap-4 md:grid-cols-3">
      {[
        { title: "Desktop web", icon: Globe2, text: "Full trading workspace with charts, panels, and account tools." },
        { title: "Mobile web", icon: Smartphone, text: "Responsive trading experience for smaller screens." },
        { title: "Install app", icon: Download, text: "Use browser install prompts where supported by your device." },
      ].map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.title} className="rounded-[16px] border border-white/10 bg-white/5 p-5">
            <Icon className="h-9 w-9 text-[#1c81f8]" />
            <h2 className="mt-5 text-xl font-bold text-white">{item.title}</h2>
            <p className="mt-3 text-sm leading-6 text-gray-400">{item.text}</p>
          </div>
        );
      })}
    </div>
  </div>
);

const TradingGuidePage = () => {
  const navigate = useNavigate();
  const { logoUrl, platformName, initials } = useSiteBranding();
  const { data: websiteContent } = useWebsiteContent();
  const { profile, user } = useAuth();
  const guideMedia = useGuideMedia(platformName);
  const [activePanel, setActivePanel] = useState<HelpPanel>("guides");
  const [activeCategory, setActiveCategory] = useState<GuideCategoryId>("platform");
  const [selectedTopicId, setSelectedTopicId] = useState("introduction");
  const [openIds, setOpenIds] = useState<Set<string>>(() => getDefaultOpenSections(platformTopics));
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceModule>(null);
  const [accountType, setAccountType] = useState<AccountType>("live");
  const [demoBalance, setDemoBalance] = useState(DEFAULT_DEMO_BALANCE);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileInitialTab, setProfileInitialTab] = useState<ProfileTab>("personal");

  const balance = getEffectiveLiveBalance(profile);
  const currentBalance = balance;

  useEffect(() => {
    if (!user?.id) {
      setDemoBalance(DEFAULT_DEMO_BALANCE);
      return;
    }
    setDemoBalance(readDemoBalanceStorage(user.id));
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    writeDemoBalanceStorage(user.id, demoBalance);
  }, [demoBalance, user?.id]);

  const handleSwitchAccount = (nextType: AccountType) => {
    setAccountType(nextType);
  };

  const handleOpenProfile = (tab: ProfileTab = "personal") => {
    setProfileInitialTab(tab);
    setIsProfileOpen(true);
  };

  const handleDemoBalanceUpdate = (value: number) => {
    const nextValue = Number(value);
    setDemoBalance(Number.isFinite(nextValue) && nextValue > 0 ? nextValue : DEFAULT_DEMO_BALANCE);
  };

  const openDepositPage = () => {
    setAccountType("live");
    navigate("/deposit");
  };

  const openWithdrawPage = () => {
    setAccountType("live");
    navigate("/withdraw");
  };

  const currentTopics = topicsByCategory[activeCategory];
  const flatTopics = useMemo(() => flattenTopics(currentTopics), [currentTopics]);
  const selectedTopic = findTopic(currentTopics, selectedTopicId) ?? flatTopics[0];
  const selectedIndex = Math.max(0, flatTopics.findIndex((topic) => topic.id === selectedTopic.id));
  const selectedContent = buildContent(selectedTopic, platformName, activeCategory);
  const previousTopic = flatTopics[selectedIndex - 1];
  const nextTopic = flatTopics[selectedIndex + 1];

  const selectTopic = (id: string) => {
    setSelectedTopicId(id);
    setOpenIds((current) => {
      const next = new Set(current);
      collectOpenParents(currentTopics, id).forEach((parentId) => next.add(parentId));
      return next;
    });
  };

  const switchCategory = (categoryId: GuideCategoryId) => {
    const topics = topicsByCategory[categoryId];
    setActiveCategory(categoryId);
    setSelectedTopicId(topics[0].id);
    setOpenIds(getDefaultOpenSections(topics));
    setActivePanel("guides");
  };

  const openGuideTopic = (topicId: string, categoryId: GuideCategoryId = "platform") => {
    const topics = topicsByCategory[categoryId];
    setActivePanel("guides");
    setActiveCategory(categoryId);
    setSelectedTopicId(topicId);
    setOpenIds(() => {
      const next = getDefaultOpenSections(topics);
      collectOpenParents(topics, topicId).forEach((parentId) => next.add(parentId));
      return next;
    });
  };

  const openShellTarget = (target: GuideShellTarget) => {
    if (target.kind === "panel") {
      setActivePanel(target.panel);
      return;
    }

    openGuideTopic(target.topicId, target.category);
  };

  const isShellTargetActive = (target: GuideShellTarget) => {
    if (target.kind === "panel") {
      return activePanel === target.panel;
    }

    return (
      activePanel === "guides" &&
      activeCategory === (target.category ?? "platform") &&
      selectedTopic.id === target.topicId
    );
  };

  const handleTabClick = (id: HelpPanel | "reviews") => {
    if (id === "reviews") {
      navigate("/reviews");
      return;
    }
    setActivePanel(id);
  };

  useEffect(() => {
    if (activeWorkspace === null || activeWorkspace === "help" || activeWorkspace === "guides") return;
    navigate("/trade");
    setActiveWorkspace(null);
  }, [activeWorkspace, navigate]);

  const showSidebar = activePanel === "guides";
  const primaryFigureUrl =
    guideMedia[selectedContent.figure?.variant ?? "chart"] ||
    guideMedia.chart ||
    GUIDE_FIGURE_FALLBACK;
  const secondaryFigureUrl = selectedContent.secondaryFigure
    ? guideMedia[selectedContent.secondaryFigure.variant] || guideMedia.mobile || GUIDE_FIGURE_FALLBACK
    : null;
  const featuredTopics = flatTopics.slice(0, 4);
  const sidebarTopics = flatTopics.slice(0, 8);
  const guideTags = [
    activeCategory === "platform" ? "Platform" : guideCategories.find((category) => category.id === activeCategory)?.label,
    "Charts",
    "Risk",
    "Demo",
    "Withdrawals",
    "Signals",
  ].filter(Boolean);

  if (showSidebar) {
    return (
      <div className="poolito-page poolito-guide-page min-h-screen overflow-x-hidden">
        <Navbar />

        <main>
          <section className="poolito-guide-hero" aria-labelledby="poolito-guide-title">
            <div className="poolito-guide-hero-pattern" aria-hidden="true" />
            <div className="poolito-guide-hero-inner">
              <div>
                <h1 id="poolito-guide-title">
                  Trading <span>Guide</span>
                </h1>
                <div className="poolito-guide-breadcrumb">
                  <Link to="/">Home</Link>
                  <span>//</span>
                  <strong>Our Guide</strong>
                </div>
              </div>
              <img src={GUIDE_HERO_IMAGE} alt={`${platformName} trading guide preview`} />
            </div>
          </section>

          <section className="poolito-guide-main">
            <div className="poolito-guide-shell">
              <div className="poolito-guide-grid">
                <div className="poolito-guide-feed">
                  <article className="poolito-guide-article">
                    <div className="poolito-guide-image">
                      <img
                        src={primaryFigureUrl}
                        alt={selectedContent.figure?.title || selectedContent.heading || "Trading guide"}
                        onError={(event) => {
                          event.currentTarget.src = GUIDE_FIGURE_FALLBACK;
                        }}
                      />
                    </div>

                    <div className="poolito-guide-meta">
                      <span>
                        <BookOpen size={15} />
                        Guide: <strong>{guideCategories.find((category) => category.id === activeCategory)?.label}</strong>
                      </span>
                      <span>
                        <CheckCircle2 size={15} />
                        Updated for {platformName}
                      </span>
                    </div>

                    <h2>{selectedContent.heading}</h2>
                    <p>{selectedContent.intro}</p>

                    {selectedContent.paragraphs?.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}

                    {selectedContent.bullets?.length ? (
                      <ul className="poolito-guide-bullets">
                        {selectedContent.bullets.map((bullet) => (
                          <li key={bullet}>
                            <CheckCircle2 size={19} />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {selectedContent.note ? (
                      <div className="poolito-guide-note">
                        <strong>Note:</strong> {selectedContent.note}
                      </div>
                    ) : null}

                    {secondaryFigureUrl ? (
                      <div className="poolito-guide-secondary-image">
                        <img
                          src={secondaryFigureUrl}
                          alt={selectedContent.secondaryFigure?.title || "Trading guide supporting visual"}
                          onError={(event) => {
                            event.currentTarget.src = GUIDE_FIGURE_FALLBACK;
                          }}
                        />
                      </div>
                    ) : null}

                    <div className="poolito-guide-card-actions">
                      {previousTopic ? (
                        <button type="button" onClick={() => selectTopic(previousTopic.id)}>
                          <ArrowRight size={18} className="poolito-guide-prev-icon" />
                          Previous
                        </button>
                      ) : <span />}
                      {nextTopic ? (
                        <button type="button" onClick={() => selectTopic(nextTopic.id)}>
                          Next Guide <ArrowRight size={18} />
                        </button>
                      ) : null}
                    </div>
                  </article>

                  {featuredTopics.length ? (
                    <div className="poolito-guide-featured">
                      {featuredTopics.map((topic) => (
                        <button
                          key={topic.id}
                          type="button"
                          className={topic.id === selectedTopic.id ? "is-active" : ""}
                          onClick={() => selectTopic(topic.id)}
                        >
                          <span>{topic.number}</span>
                          <strong>{topic.title}</strong>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <aside className="poolito-guide-sidebar">
                  <section className="poolito-guide-author">
                    <img src={GUIDE_HERO_IMAGE} alt={`${platformName} guide desk`} />
                    <h3>{platformName} Academy</h3>
                    <p>Step-by-step lessons for using charts, demo mode, wallet tools, platform settings, and trading routines.</p>
                  </section>

                  <section className="poolito-guide-widget">
                    <h3>Category</h3>
                    <div className="poolito-guide-category-list">
                      {guideCategories.map((category) => {
                        const Icon = category.icon;
                        return (
                          <button
                            key={category.id}
                            type="button"
                            className={category.id === activeCategory ? "is-active" : ""}
                            onClick={() => switchCategory(category.id)}
                          >
                            <span><Icon className="poolito-guide-list-icon" /> {category.label}</span>
                            <strong>{topicsByCategory[category.id].length.toString().padStart(2, "0")}</strong>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section className="poolito-guide-widget">
                    <h3>Recent Guides</h3>
                    <div className="poolito-guide-recent-list">
                      {sidebarTopics.map((topic) => (
                        <button
                          key={topic.id}
                          type="button"
                          className={topic.id === selectedTopic.id ? "is-active" : ""}
                          onClick={() => selectTopic(topic.id)}
                        >
                          <span>{topic.number}</span>
                          <strong>{topic.title}</strong>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="poolito-guide-widget">
                    <h3>Tags</h3>
                    <div className="poolito-guide-tags">
                      {guideTags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                  </section>

                  <section className="poolito-guide-search">
                    <Link to="/trade">Open Trading Desk <ArrowRight size={16} /></Link>
                    <Link to="/blog">Read Blog <ArrowRight size={16} /></Link>
                  </section>
                </aside>
              </div>
            </div>
          </section>
        </main>

        <Footer content={websiteContent} />

        <style>{`
          .poolito-guide-page {
            --poolito-dark: #06383c;
            --poolito-deep: #032f32;
            --poolito-green: #109b42;
            --poolito-muted: #62667f;
            --poolito-line: rgba(6, 56, 60, 0.16);
            background: #ffffff;
            color: var(--poolito-dark);
            font-family: Arial, system-ui, sans-serif;
          }

          .poolito-guide-hero {
            position: relative;
            overflow: hidden;
            min-height: 370px;
            padding: 170px 0 76px;
            background:
              linear-gradient(90deg, rgba(3, 47, 50, 0.98) 0%, rgba(3, 47, 50, 0.9) 48%, rgba(3, 47, 50, 0.62) 100%),
              url("${GUIDE_HERO_IMAGE}") center right / cover no-repeat;
          }

          .poolito-guide-hero-pattern {
            position: absolute;
            inset: 0;
            pointer-events: none;
            opacity: 0.22;
            background-image: radial-gradient(rgba(255, 255, 255, 0.18) 2px, transparent 2px);
            background-size: 18px 18px;
            mask-image: linear-gradient(90deg, #000 0%, transparent 58%);
          }

          .poolito-guide-hero::after {
            content: "";
            position: absolute;
            inset: auto 0 0;
            height: 4px;
            background: var(--poolito-green);
          }

          .poolito-guide-hero-inner {
            position: relative;
            z-index: 1;
            width: min(100% - 48px, 1340px);
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 36px;
          }

          .poolito-guide-hero h1 {
            margin: 0;
            color: #ffffff;
            font-size: clamp(44px, 5vw, 68px);
            line-height: 1;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0;
          }

          .poolito-guide-hero h1 span,
          .poolito-guide-breadcrumb span,
          .poolito-guide-breadcrumb strong {
            color: var(--poolito-green);
          }

          .poolito-guide-breadcrumb {
            margin-top: 22px;
            display: flex;
            align-items: center;
            gap: 12px;
            color: #ffffff;
            font-size: 16px;
            font-weight: 950;
            text-transform: uppercase;
          }

          .poolito-guide-breadcrumb a {
            color: inherit;
            text-decoration: none;
          }

          .poolito-guide-hero-inner > img {
            width: min(34vw, 430px);
            max-height: 250px;
            object-fit: cover;
            border-radius: 0 90px 0 0;
            opacity: 0.82;
            box-shadow: 0 24px 50px rgba(0, 0, 0, 0.22);
          }

          .poolito-guide-main {
            padding: 86px 0 104px;
            background:
              radial-gradient(circle at 93% 15%, rgba(16, 155, 66, 0.08), transparent 24%),
              #ffffff;
          }

          .poolito-guide-shell {
            width: min(100% - 48px, 1340px);
            margin: 0 auto;
          }

          .poolito-guide-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 330px;
            gap: 48px;
            align-items: start;
          }

          .poolito-guide-feed {
            display: grid;
            gap: 44px;
          }

          .poolito-guide-article {
            min-width: 0;
          }

          .poolito-guide-image,
          .poolito-guide-secondary-image {
            overflow: hidden;
            border-radius: 18px;
            background: #eef2f3;
            box-shadow: 0 18px 38px rgba(6, 56, 60, 0.12);
          }

          .poolito-guide-image img,
          .poolito-guide-secondary-image img {
            display: block;
            width: 100%;
            aspect-ratio: 1.72 / 1;
            object-fit: cover;
          }

          .poolito-guide-secondary-image {
            margin-top: 30px;
          }

          .poolito-guide-meta {
            margin-top: 24px;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 18px;
            color: var(--poolito-dark);
            font-size: 14px;
            font-weight: 950;
            text-transform: uppercase;
          }

          .poolito-guide-meta span {
            display: inline-flex;
            align-items: center;
            gap: 8px;
          }

          .poolito-guide-meta svg,
          .poolito-guide-meta strong {
            color: var(--poolito-green);
          }

          .poolito-guide-article h2 {
            margin: 14px 0 0;
            color: var(--poolito-dark);
            font-size: clamp(34px, 3.4vw, 50px);
            line-height: 1.08;
            font-weight: 950;
            letter-spacing: 0;
          }

          .poolito-guide-article p {
            max-width: 930px;
            margin: 22px 0 0;
            color: var(--poolito-muted);
            font-size: 16px;
            line-height: 1.74;
            font-weight: 700;
          }

          .poolito-guide-bullets {
            margin: 28px 0 0;
            padding: 0;
            display: grid;
            gap: 14px;
            list-style: none;
          }

          .poolito-guide-bullets li {
            display: flex;
            gap: 12px;
            color: var(--poolito-muted);
            font-size: 16px;
            line-height: 1.65;
            font-weight: 750;
          }

          .poolito-guide-bullets svg {
            margin-top: 4px;
            flex: 0 0 auto;
            color: var(--poolito-green);
          }

          .poolito-guide-note {
            margin-top: 30px;
            border-left: 5px solid var(--poolito-green);
            background: rgba(16, 155, 66, 0.08);
            padding: 20px 24px;
            color: var(--poolito-dark);
            font-size: 16px;
            line-height: 1.65;
            font-weight: 750;
          }

          .poolito-guide-card-actions {
            margin-top: 38px;
            padding-top: 26px;
            border-top: 1px solid var(--poolito-line);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 18px;
          }

          .poolito-guide-card-actions button {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            border: 0;
            padding: 0;
            background: transparent;
            color: var(--poolito-dark);
            font-size: 14px;
            font-weight: 950;
            text-transform: uppercase;
            cursor: pointer;
          }

          .poolito-guide-card-actions svg {
            color: var(--poolito-green);
          }

          .poolito-guide-prev-icon {
            transform: rotate(180deg);
          }

          .poolito-guide-featured {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            border: 1px solid var(--poolito-line);
            background: #f4f7f6;
          }

          .poolito-guide-featured button {
            min-height: 112px;
            border: 0;
            border-right: 1px solid var(--poolito-line);
            background: transparent;
            padding: 18px;
            text-align: left;
            cursor: pointer;
          }

          .poolito-guide-featured button:last-child {
            border-right: 0;
          }

          .poolito-guide-featured span {
            display: block;
            color: var(--poolito-green);
            font-size: 14px;
            font-weight: 950;
          }

          .poolito-guide-featured strong {
            display: block;
            margin-top: 10px;
            color: var(--poolito-dark);
            font-size: 16px;
            line-height: 1.3;
            font-weight: 950;
          }

          .poolito-guide-featured .is-active {
            background: var(--poolito-green);
          }

          .poolito-guide-featured .is-active span,
          .poolito-guide-featured .is-active strong {
            color: #ffffff;
          }

          .poolito-guide-sidebar {
            display: grid;
            gap: 34px;
            align-self: stretch;
          }

          .poolito-guide-author img {
            width: 100%;
            aspect-ratio: 1.25 / 1;
            object-fit: cover;
            border-radius: 0 64px 0 0;
          }

          .poolito-guide-author h3,
          .poolito-guide-widget h3 {
            margin: 22px 0 0;
            color: var(--poolito-dark);
            font-size: 26px;
            line-height: 1.2;
            font-weight: 950;
            letter-spacing: 0;
          }

          .poolito-guide-widget h3 {
            position: relative;
            margin-top: 0;
            padding-left: 28px;
          }

          .poolito-guide-widget h3::before {
            content: "//";
            position: absolute;
            left: 0;
            top: 0;
            color: var(--poolito-green);
          }

          .poolito-guide-author p {
            margin: 14px 0 0;
            color: var(--poolito-muted);
            font-size: 15px;
            line-height: 1.7;
            font-weight: 700;
          }

          .poolito-guide-category-list,
          .poolito-guide-recent-list {
            margin-top: 22px;
            display: grid;
          }

          .poolito-guide-category-list button,
          .poolito-guide-recent-list button {
            min-height: 52px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            border: 0;
            border-bottom: 1px dashed rgba(6, 56, 60, 0.24);
            background: transparent;
            color: var(--poolito-muted);
            font-size: 15px;
            font-weight: 750;
            text-align: left;
            cursor: pointer;
          }

          .poolito-guide-recent-list button {
            justify-content: flex-start;
          }

          .poolito-guide-category-list span,
          .poolito-guide-category-list strong,
          .poolito-guide-recent-list span {
            display: inline-flex;
            align-items: center;
            gap: 8px;
          }

          .poolito-guide-list-icon {
            width: 17px;
            height: 17px;
          }

          .poolito-guide-category-list strong,
          .poolito-guide-category-list .is-active,
          .poolito-guide-recent-list .is-active {
            color: var(--poolito-green);
          }

          .poolito-guide-recent-list span {
            width: 42px;
            height: 42px;
            justify-content: center;
            border-radius: 4px;
            color: var(--poolito-green);
            background: rgba(16, 155, 66, 0.08);
            font-weight: 950;
          }

          .poolito-guide-recent-list strong {
            min-width: 0;
            color: inherit;
            font-size: 15px;
            line-height: 1.35;
            font-weight: 950;
          }

          .poolito-guide-tags {
            margin-top: 22px;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }

          .poolito-guide-tags span {
            min-height: 36px;
            display: inline-flex;
            align-items: center;
            border: 1px solid rgba(6, 56, 60, 0.14);
            border-radius: 4px;
            background: #eef2f3;
            padding: 0 12px;
            color: var(--poolito-muted);
            font-size: 14px;
            font-weight: 850;
          }

          .poolito-guide-search {
            display: grid;
            gap: 12px;
          }

          .poolito-guide-search a {
            min-height: 48px;
            display: inline-flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            border-radius: 999px;
            background: var(--poolito-green);
            padding: 0 20px;
            color: #ffffff;
            font-size: 14px;
            font-weight: 950;
            text-decoration: none;
            text-transform: uppercase;
          }

          @media (max-width: 1060px) {
            .poolito-guide-grid {
              grid-template-columns: 1fr;
            }

            .poolito-guide-sidebar {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }

          @media (max-width: 760px) {
            .poolito-guide-hero {
              min-height: 320px;
              padding: 228px 0 58px;
            }

            .poolito-guide-hero-inner,
            .poolito-guide-shell {
              width: min(100% - 32px, 1340px);
            }

            .poolito-guide-hero-inner > img {
              display: none;
            }

            .poolito-guide-main {
              padding: 58px 0 76px;
            }

            .poolito-guide-sidebar,
            .poolito-guide-featured {
              grid-template-columns: 1fr;
            }

            .poolito-guide-grid {
              grid-template-columns: 1fr;
            }

            .poolito-guide-featured button,
            .poolito-guide-featured button:last-child {
              border-right: 0;
              border-bottom: 1px solid var(--poolito-line);
            }

            .poolito-guide-card-actions {
              align-items: flex-start;
              flex-direction: column;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <TradingRouteProviders>
    <ProfileTourProvider>
    <div className="trading-terminal h-[100dvh] flex flex-col overflow-hidden font-sans text-white" style={{ background: "var(--trading-workspace-bg)" }}>
      <TradingHeader
        balance={currentBalance}
        demoBalance={demoBalance}
        accountType={accountType}
        onSwitchAccount={handleSwitchAccount}
        openTabs={[]}
        onAddAssetClick={() => {}}
        onOpenDeposit={openDepositPage}
        onOpenWithdrawal={openWithdrawPage}
        onOpenProfile={handleOpenProfile}
        onUpdateDemoBalance={handleDemoBalanceUpdate}
        onResetDemoBalance={() => handleDemoBalanceUpdate(DEFAULT_DEMO_BALANCE)}
        onOpenSettings={() => handleOpenProfile("settings")}
        onOpenHistory={() => {}}
      />

      <ProfileDrawer
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        initialTab={profileInitialTab}
      />

      <div className="flex-1 flex w-full overflow-hidden min-h-0" style={{ background: "var(--trading-workspace-bg)" }}>
        <div className="hidden shrink-0 transition-[width] duration-300 ease-out xl:block">
          <NavigationSidebar
            activeWorkspace={activeWorkspace}
            onSelectWorkspace={setActiveWorkspace}
            collapsed={!leftPanelOpen}
            onToggleCollapsed={() => setLeftPanelOpen((current) => !current)}
          />
        </div>

        {showSidebar && (
          <>
            <aside
              className="hidden w-[260px] shrink-0 border-r xl:flex xl:flex-col"
              style={{ borderColor: "var(--trading-border-color)", background: "var(--trading-workspace-bg)" }}
            >
              <div className="flex items-center gap-2 border-b px-5 py-4" style={{ borderColor: "var(--trading-border-color)" }}>
                {guideCategories.map((cat) => {
                  const CatIcon = cat.icon;
                  const isCatActive = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => switchCategory(cat.id)}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs transition-all duration-200 ${
                        isCatActive
                          ? "shadow-sm"
                          : "text-slate-500 hover:bg-white/5 hover:text-white"
                      }`}
                    style={isCatActive ? { background: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))" } : {}}
                      title={cat.label}
                    >
                      <CatIcon className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-5 [scrollbar-color:#3a465f_transparent] [scrollbar-width:thin]">
                <div className="space-y-1">
                  {currentTopics.map((topic) => (
                    <GuideTreeNode
                      key={topic.id}
                      topic={topic}
                      activeId={selectedTopic.id}
                      openIds={openIds}
                      onToggle={(id) =>
                        setOpenIds((current) => {
                          const next = new Set(current);
                          if (next.has(id)) next.delete(id);
                          else next.add(id);
                          return next;
                        })
                      }
                      onSelect={selectTopic}
                    />
                  ))}
                </div>
              </div>
            </aside>

            <button
              type="button"
              onClick={() => setShowMobileSidebar(!showMobileSidebar)}
              className="fixed bottom-6 left-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#1c81f8] text-white shadow-lg xl:hidden"
            >
              <Grid className="h-5 w-5" />
            </button>

            {showMobileSidebar && (
              <div className="fixed inset-0 z-50 xl:hidden">
                <div className="absolute inset-0 bg-black/60" onClick={() => setShowMobileSidebar(false)} />
                <aside className="relative ml-auto h-full w-[300px] max-w-[85vw] overflow-y-auto border-l p-5" style={{ background: "var(--trading-workspace-bg)", borderColor: "var(--trading-border-color)" }}>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm font-bold uppercase tracking-wider text-[#1c81f8]">Topics</span>
                    <button type="button" onClick={() => setShowMobileSidebar(false)} className="text-slate-400 hover:text-white">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-4">
                    {guideCategories.map((cat) => {
                      const CatIcon = cat.icon;
                      const isCatActive = activeCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => { switchCategory(cat.id); setShowMobileSidebar(false); }}
                          className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                            isCatActive
                              ? "bg-[#1c81f8] text-white"
                              : "border border-white/10 text-slate-400"
                          }`}
                        >
                          <CatIcon className="h-3.5 w-3.5" />
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="space-y-1">
                    {currentTopics.map((topic) => (
                      <GuideTreeNode
                        key={topic.id}
                        topic={topic}
                        activeId={selectedTopic.id}
                        openIds={openIds}
                        onToggle={(id) =>
                          setOpenIds((current) => {
                            const next = new Set(current);
                            if (next.has(id)) next.delete(id);
                            else next.add(id);
                            return next;
                          })
                        }
                        onSelect={(id) => { selectTopic(id); setShowMobileSidebar(false); }}
                      />
                    ))}
                  </div>
                </aside>
              </div>
            )}
          </>
        )}

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-wrap gap-3 border-b pb-6 sm:hidden" style={{ borderColor: "var(--trading-border-color)" }}>
              {helpTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.id === activePanel || (tab.id === "reviews" && false);
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabClick(tab.id)}
                    className={`inline-flex min-h-[44px] items-center gap-2.5 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? "text-white border"
                        : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white border"
                    }`}
                    style={isActive ? { background: "linear-gradient(to right, hsl(var(--primary)), hsl(var(--primary) / 0.8))", borderColor: "hsl(var(--primary) / 0.5)", boxShadow: "0 0 30px hsl(var(--primary) / 0.3)" } : { borderColor: "var(--border)" }}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {activePanel === "support" ? <SupportPanel platformName={platformName} /> : null}
            {activePanel === "support-chat" ? <SupportChatPanel /> : null}
            {activePanel === "apps" ? <AppsPanel /> : null}

            {activePanel === "guides" ? (
              <>
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-x-auto xl:hidden">
                    {guideCategories.map((cat) => {
                      const CatIcon = cat.icon;
                      const isCatActive = activeCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => switchCategory(cat.id)}
                          className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                            isCatActive
                              ? "bg-[#1c81f8] text-white"
                              : "border border-white/10 text-slate-400"
                          }`}
                        >
                          <CatIcon className="h-3.5 w-3.5" />
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-8">
                  <article className="rounded-[16px] border px-6 py-8 sm:px-10 lg:px-14" style={{ background: "hsl(var(--card))", borderColor: "var(--border)" }}>
                    <div className="mx-auto max-w-3xl">
                      <div className="mb-2 flex items-center gap-2">
                        <div className="h-1 w-1 rounded-full" style={{ background: "hsl(var(--primary))" }}/>
                        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "hsl(var(--primary))" }}>Guide</span>
                      </div>
                      <h1 className="text-4xl sm:text-5xl font-bold leading-[1.1] tracking-tight text-white mt-2">
                        {selectedContent.heading}
                      </h1>
                      <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{selectedContent.intro}</p>
                      {selectedContent.paragraphs?.map((paragraph) => (
                        <p key={paragraph} className="mt-4 text-base leading-relaxed text-muted-foreground">{paragraph}</p>
                      ))}
                      {selectedContent.bullets?.length ? (
                        <ul className="mt-7 space-y-3">
                          {selectedContent.bullets.map((bullet) => (
                            <li key={bullet} className="flex gap-3 text-base leading-relaxed text-muted-foreground">
                              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 flex-shrink-0" style={{ color: "hsl(var(--primary))" }} />
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {selectedContent.note ? (
                        <div className="mt-8 rounded-[12px] border px-6 py-4 text-base font-medium leading-7 flex items-start gap-3" style={{ background: "hsl(var(--primary) / 0.1)", borderColor: "hsl(var(--primary) / 0.3)", color: "hsl(var(--primary) / 0.9)" }}>
                          <div className="mt-1 h-1.5 w-1.5 rounded-full shrink-0 flex-shrink-0" style={{ background: "hsl(var(--primary))" }}/>
                          <div><span className="font-semibold">Note:</span> {selectedContent.note}</div>
                        </div>
                      ) : null}
                      {selectedContent.figure ? (
                        <figure className="mt-8">
                          <GuideMockup title={selectedContent.figure.title} mediaUrl={guideMedia[selectedContent.figure.variant]} />
                          <figcaption className="mt-3 text-sm italic text-muted-foreground">{selectedContent.figure.caption}</figcaption>
                        </figure>
                      ) : null}
                      {selectedContent.secondaryFigure ? (
                        <figure className="mt-8">
                          <GuideMockup title={selectedContent.secondaryFigure.title} mediaUrl={guideMedia[selectedContent.secondaryFigure.variant]} />
                          <figcaption className="mt-3 text-sm italic text-muted-foreground">{selectedContent.secondaryFigure.caption}</figcaption>
                        </figure>
                      ) : null}
                      {selectedContent.video ? (
                        <VideoPreview title={selectedContent.video.title} duration={selectedContent.video.duration} mediaUrl={selectedContent.video.image === "trading" ? guideMedia.videoTrading : guideMedia.videoMobile} />
                      ) : null}
                      <div className="mt-10 flex flex-col sm:flex-row gap-3 pt-8 border-t" style={{ borderColor: "var(--border)" }}>
                        {previousTopic ? (
                          <button type="button" onClick={() => selectTopic(previousTopic.id)}
                            className="group flex-1 rounded-[10px] border bg-white/5 px-5 py-3.5 text-sm font-semibold text-muted-foreground hover:bg-white/10 transition-all duration-300 flex items-center gap-2 hover:text-white"
                            style={{ borderColor: "var(--border)" }}
                          >
                            <ArrowRight className="h-4 w-4 rotate-180 transition-transform group-hover:-translate-x-1" />
                            <div className="text-left">
                              <div className="text-xs text-gray-400 mb-0.5">Previous</div>
                              <div>{previousTopic.number}. {previousTopic.title}</div>
                            </div>
                          </button>
                        ) : <div />}
                        {nextTopic ? (
                          <button type="button" onClick={() => selectTopic(nextTopic.id)}
                            className="group flex-1 rounded-[10px] border px-5 py-3.5 text-sm font-semibold hover:brightness-110 transition-all duration-300 flex items-center gap-2 justify-end"
                            style={{ background: "hsl(var(--primary) / 0.1)", borderColor: "hsl(var(--primary) / 0.5)", color: "hsl(var(--primary))" }}
                          >
                            <div className="text-left sm:text-right">
                              <div className="text-xs mb-0.5" style={{ color: "hsl(var(--primary) / 0.7)" }}>Next</div>
                              <div>{nextTopic.number}. {nextTopic.title}</div>
                            </div>
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                </div>
              </>
            ) : null}

            <footer className="mt-16 pt-8 border-t flex flex-wrap justify-center gap-6 text-xs text-muted-foreground" style={{ borderColor: "var(--border)" }}>
              {[
                ["About us", "/about"],
                ["Help", "/trading-guide"],
                ["Terms and Conditions", "/terms"],
                ["AML and KYC policy", "/risk-disclaimer"],
                ["Privacy policy", "/privacy"],
                ["Payment policy", "/terms"],
                ["Information disclosure", "/risk-disclaimer"],
              ].map(([label, to]) => (
                <Link key={label} to={to} className="hover:text-white transition-colors duration-200">
                  {label}
                </Link>
              ))}
            </footer>
          </div>
        </main>
      </div>
    </div>
    </ProfileTourProvider>
    </TradingRouteProviders>
  );
};

export default TradingGuidePage;
