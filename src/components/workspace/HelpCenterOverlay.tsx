import { useState, useMemo } from "react";
import {
  Search, BookOpen, PlayCircle, MessageCircle, ChevronRight, ArrowLeft,
  X, ThumbsUp, ThumbsDown, Clock, Tag, ChevronDown, ChevronUp,
  CheckCircle, Shield, HelpCircle, Send, Zap, TrendingUp, Award,
  Lock, CreditCard, Trophy, BarChart2, Target, Star
} from "lucide-react";

interface HelpCenterOverlayProps {
  onClose?: () => void;
}

type HelpCenterView = "home" | "article" | "guide" | "videos" | "chat";

// ─────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────

const ARTICLES = [
  {
    id: "verify-account",
    title: "How to verify my account?",
    category: "Account",
    categoryColor: "from-blue-500 to-cyan-400",
    categoryBg: "bg-blue-500/10",
    categoryText: "text-blue-400",
    icon: Shield,
    readTime: "4 min",
    content: `## Account Verification (KYC)\n\nAccount verification is required to process withdrawals and ensure platform security. Follow these steps:\n\n**Step 1 — Log in and open Account Settings**\nNavigate to Account > Personal Data from the left sidebar.\n\n**Step 2 — Fill in all required fields**\nEnsure the following information is complete and accurate:\n- Full legal name (as it appears on your ID)\n- Date of birth\n- Country of residence\n- Full residential address\n\n**Step 3 — Upload a Government-Issued ID**\nAccepted documents:\n- Valid passport\n- National ID card (front and back)\n- Driver's license (front and back)\n\nRequirements: The document must be valid (not expired), clearly readable, and all four corners must be visible.\n\n**Step 4 — Upload Proof of Address**\nAccepted documents:\n- Utility bill (gas, electric, water) dated within the last 3 months\n- Bank statement dated within the last 3 months\n- Official government correspondence\n\n**Step 5 — Submit for Review**\nClick "Submit Verification". Our compliance team reviews submissions within 24–48 business hours.\n\n**Status Tracking**\nYou can track your verification status at any time in Account > Personal Data. Possible statuses:\n- ⏳ Pending Review\n- ✅ Verified\n- ❌ Rejected (with reason)`,
  },
  {
    id: "withdraw-methods",
    title: "Withdrawal methods and limits",
    category: "Finance",
    categoryColor: "from-emerald-500 to-green-400",
    categoryBg: "bg-emerald-500/10",
    categoryText: "text-emerald-400",
    icon: CreditCard,
    readTime: "5 min",
    content: `## Withdrawal Methods and Limits\n\nWe support multiple withdrawal methods tailored to your region.\n\n**Bank Transfer** — Min $10, 3–5 business days, Free\n**Credit/Debit Card** — Min $10, 1–3 business days, Free\n**Cryptocurrency** — Min $5, within 24 hours, Network fee only\n**E-wallets** — Min $5, within 24 hours, Free\n\n**How to Request a Withdrawal**\n- Go to Account > Balance History or click Withdrawal in the header.\n- Select your withdrawal method.\n- Enter the withdrawal amount.\n- Confirm your payment details and submit.\n\n**Important Notes**\n- Withdrawals are processed to the same method used for your deposit.\n- Your account must be fully verified before processing withdrawals.\n- Withdrawal limits may vary based on your account level.\n\n**Withdrawal Limits by Account Level**\n- Standard: $5,000/day · $50,000/month\n- Silver: $10,000/day · $100,000/month\n- Gold: $25,000/day · $250,000/month\n- VIP: $100,000/day · Unlimited/month`,
  },
  {
    id: "how-to-trade",
    title: "How to place a binary options trade?",
    category: "Trading",
    categoryColor: "from-violet-500 to-purple-400",
    categoryBg: "bg-violet-500/10",
    categoryText: "text-violet-400",
    icon: TrendingUp,
    readTime: "6 min",
    content: `## Placing Your First Binary Options Trade\n\nBinary options trading is straightforward. You predict whether an asset's price will go UP or DOWN within a specific timeframe.\n\n**Step 1 — Select an Asset**\nUse the asset tabs at the top of the chart or click an indicator on the chart header to pick any stock, currency pair, or commodity.\n\n**Step 2 — Set the Trade Duration**\nClick the Time field in the Trading Panel on the right side. Durations range from 1 minute to 24 hours.\n\n**Step 3 — Set Investment Amount**\nEnter the amount you want to invest. The payout percentage (shown in green, e.g., "87%") represents your potential profit if you're correct.\n\n**Step 4 — Read the Chart**\nUse the candlestick chart to analyze market trends. Look for:\n- Support and resistance levels\n- Moving averages\n- RSI and MACD indicators\n\n**Step 5 — Place Your Trade**\n- Click Up ↑ if you believe the price will be higher at expiry.\n- Click Down ↓ if you believe the price will be lower at expiry.\n\n**Step 6 — Monitor Results**\nAt expiry, ✅ Win: investment + profit credited instantly. ❌ Lose: investment deducted.\n\n**Tips for New Traders**\n- Start with the Demo Account to practice risk-free.\n- Never invest more than 5% of your balance on a single trade.\n- Use signals and technical indicators to improve accuracy.`,
  },
  {
    id: "vip-status",
    title: "What is VIP status and how to achieve it?",
    category: "Account",
    categoryColor: "from-yellow-500 to-amber-400",
    categoryBg: "bg-yellow-500/10",
    categoryText: "text-yellow-400",
    icon: Award,
    readTime: "3 min",
    content: `## VIP Status Explained\n\nOur VIP program rewards high-volume and active traders with exclusive benefits.\n\n**VIP Levels**\n- Standard: $0+ deposit — Standard payouts\n- Silver: $1,000+ deposit — +2% payout bonus, priority support\n- Gold: $5,000+ deposit — +5% payout bonus, dedicated account manager\n- Platinum: $20,000+ deposit — +8% payout bonus, VIP webinars\n- Diamond: $50,000+ deposit — Custom conditions, highest payouts\n\n**Benefits Include**\n- Higher payout rates — Earn more on every profitable trade.\n- Dedicated Account Manager — Personal assistance from an experienced advisor.\n- Priority Support — Skip the queue with 24/7 priority access.\n- Exclusive Webinars — Access live expert trading strategy sessions.\n- Risk-free Trades — A set number of trades where losses are refunded.\n- Higher Withdrawal Limits — Process larger withdrawals faster.\n\n**How to Upgrade**\nYour VIP status is automatically calculated based on your cumulative deposit history. Contact your account manager to discuss upgrade promotions.`,
  },
  {
    id: "tournaments-rules",
    title: "Tournament rules and rewards",
    category: "Tournaments",
    categoryColor: "from-orange-500 to-red-400",
    categoryBg: "bg-orange-500/10",
    categoryText: "text-orange-400",
    icon: Trophy,
    readTime: "5 min",
    content: `## How Tournaments Work\n\nTournaments are competitive trading events where participants compete for prizes using a dedicated sandbox balance.\n\n**Joining a Tournament**\n- Click Tournaments in the left navigation panel.\n- Browse available tournaments and click Details on any card.\n- Review the rules, entry fee, schedule, and prize distribution.\n- Click Join Now — the entry fee is deducted from your real balance.\n- A special tournament balance (e.g., $100) is credited to your tournament account.\n\n**Rules**\n- All participants start with an identical tournament balance.\n- Trading is restricted to the tournament account only.\n- The leaderboard is ranked by final tournament balance at expiry.\n- Rebuys are available for a fee if your balance drops below the starting amount.\n\n**Disqualification**\nParticipants may be disqualified for using automated bots, creating multiple accounts, or any manipulation of results.\n\n**Prizes**\nPrize pool distribution is displayed on the tournament detail page. Winnings are automatically credited to your real account within minutes of tournament end.\n\n**Free Tournaments**\nSome tournaments have no entry fee. Check the Free Friday tournament every week for a chance to win real money at zero risk.`,
  },
  {
    id: "indicators-guide",
    title: "Understanding technical indicators",
    category: "Trading",
    categoryColor: "from-violet-500 to-purple-400",
    categoryBg: "bg-violet-500/10",
    categoryText: "text-violet-400",
    icon: BarChart2,
    readTime: "7 min",
    content: `## Technical Indicators Guide\n\nTechnical indicators help you analyze price trends and make more informed trading decisions.\n\n**Moving Average (MA)**\nSmooths out price data over a selected period to identify the direction of the trend.\n- When price is above the MA, the market may be in an uptrend (consider UP trades).\n- When below, consider DOWN trades.\n\n**Relative Strength Index (RSI)**\nMeasures price movements on a 0–100 scale.\n- RSI above 70 = overbought (price may drop → DOWN trade).\n- RSI below 30 = oversold (price may rise → UP trade).\n\n**MACD**\nShows the relationship between two moving averages.\n- MACD line crosses above signal line = bullish signal (UP).\n- Crosses below = bearish (DOWN).\n\n**Bollinger Bands**\nShows volatility through upper and lower bands.\n- Price touching upper band may indicate overbought.\n- Price touching lower band may indicate oversold.\n\n**Adding Indicators**\n- Click the Indicators button (∿) in the chart toolbar.\n- Select your desired indicator.\n- Adjust parameters and click Apply.\n\n**Best Practices**\n- Combine at least 2 indicators for confirmation.\n- Use RSI + MACD together for stronger reversal signals.`,
  },
  {
    id: "account-security",
    title: "Account security tips",
    category: "Security",
    categoryColor: "from-red-500 to-rose-400",
    categoryBg: "bg-red-500/10",
    categoryText: "text-red-400",
    icon: Lock,
    readTime: "3 min",
    content: `## Keeping Your Account Secure\n\nYour account security is our top priority. Follow these best practices to protect your funds and personal data.\n\n**Strong Password**\n- Use at least 12 characters mixing uppercase, lowercase, numbers, and symbols.\n- Avoid using birthdates, common words, or repeated characters.\n- Never share your password with anyone, including support staff.\n- Update your password every 3–6 months.\n\n**Two-Factor Authentication (2FA)**\nEnable 2FA in Account > Settings for an extra layer of security. When enabled, every login requires:\n- Your email + password.\n- A one-time code from your authenticator app (e.g., Google Authenticator).\n\n**Recognizing Phishing**\n- We will never ask for your password via email, chat, or phone.\n- Always verify the URL is yourbroker.trade before entering credentials.\n- Do not click links in unsolicited emails.\n\n**Device Security**\n- Use a personal, private device for trading.\n- Avoid logging in on public Wi-Fi networks.\n- Log out after every session on shared computers.`,
  },
  {
    id: "deposit-guide",
    title: "How to deposit funds",
    category: "Finance",
    categoryColor: "from-emerald-500 to-green-400",
    categoryBg: "bg-emerald-500/10",
    categoryText: "text-emerald-400",
    icon: CreditCard,
    readTime: "4 min",
    content: `## Depositing Funds\n\nDeposits are submitted as pending requests and only credit after a finance admin approves them.\n\n**Step 1 - Open the Deposit Form**\nClick the green + Deposit button in the top header, or go to Account > Deposit Funds.\n\n**Step 2 - Choose an Enabled Deposit Method**\n\n- Use one of the live payment methods shown in the deposit flow.\n- Automatic blockchain detection is not wired yet, so every transfer stays pending until manual review.\n- If no deposit method appears, ask an admin to enable a wallet address first.\n\n**Step 3 - Send the Funds and Submit the Request**\nCopy the wallet address, send the exact amount on the matching network, then confirm the transfer in the app. Your balance will stay unchanged until a finance admin approves the request.\n\n**Bonus Offers**\nPromo and welcome bonuses are only applied after the pending deposit request is approved.\n\n**Deposit Limits**\n- Each enabled payment method shows its own minimum and maximum before checkout.\n- Crypto methods use the network and wallet address shown in the deposit flow.`,
  },
];

const VIDEOS = [
  { id: "v1", title: "Getting Started: Your First Trade", duration: "6:24", category: "Basics", color: "from-blue-600 to-cyan-500", emoji: "📊" },
  { id: "v2", title: "How to Read Candlestick Charts", duration: "8:15", category: "Basics", color: "from-violet-600 to-purple-500", emoji: "🕯️" },
  { id: "v3", title: "Using the RSI Indicator", duration: "5:48", category: "Technical Analysis", color: "from-green-600 to-emerald-500", emoji: "📈" },
  { id: "v4", title: "MACD Strategy Explained", duration: "7:32", category: "Technical Analysis", color: "from-orange-600 to-red-500", emoji: "📉" },
  { id: "v5", title: "How Tournaments Work", duration: "4:10", category: "Platform", color: "from-yellow-500 to-amber-400", emoji: "🏆" },
  { id: "v6", title: "Setting Up Your Account", duration: "3:55", category: "Basics", color: "from-pink-600 to-rose-500", emoji: "👤" },
  { id: "v7", title: "Risk Management for Traders", duration: "9:20", category: "Strategy", color: "from-teal-600 to-cyan-400", emoji: "🛡️" },
  { id: "v8", title: "Using Trading Signals", duration: "6:00", category: "Platform", color: "from-indigo-600 to-blue-500", emoji: "🔔" },
  { id: "v9", title: "Bollinger Bands Strategy", duration: "7:45", category: "Technical Analysis", color: "from-fuchsia-600 to-pink-500", emoji: "🎯" },
];

const GUIDE_SECTIONS = [
  { id: "getting-started", title: "Getting Started", icon: Zap, color: "text-yellow-400", articles: ["deposit-guide", "verify-account", "how-to-trade"] },
  { id: "trading-basics", title: "Trading Basics", icon: TrendingUp, color: "text-blue-400", articles: ["how-to-trade", "indicators-guide"] },
  { id: "account-management", title: "Account & Finance", icon: Shield, color: "text-green-400", articles: ["vip-status", "withdraw-methods", "account-security"] },
  { id: "platform-features", title: "Platform Features", icon: Target, color: "text-purple-400", articles: ["tournaments-rules", "indicators-guide"] },
];

// ─────────────────────────────────────────────────────────
// ARTICLE DETAIL VIEW
// ─────────────────────────────────────────────────────────
const ArticleView = ({ article, onBack, onOpen }: { article: typeof ARTICLES[0]; onBack: () => void; onOpen: (id: string) => void }) => {
  const [feedback, setFeedback] = useState<null | "yes" | "no">(null);
  const related = ARTICLES.filter(a => a.category === article.category && a.id !== article.id).slice(0, 3);
  const Icon = article.icon;

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Article Hero */}
      <div className={`w-full px-10 py-12 bg-gradient-to-br ${article.categoryColor} relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.3),transparent)]" />
        <div className="relative z-10 max-w-[820px] mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <span className="text-white/80 text-[12px] font-bold uppercase tracking-widest">{article.category}</span>
            <span className="text-white/60 text-[12px] flex items-center gap-1.5 ml-4"><Clock className="w-3.5 h-3.5" />{article.readTime} read</span>
          </div>
          <h1 className="text-[28px] md:text-[32px] font-bold text-white leading-tight">{article.title}</h1>
        </div>
      </div>

      {/* Article Body */}
      <div className="max-w-[820px] mx-auto px-10 py-10 space-y-4">
        {article.content.split('\n').map((line, i) => {
          if (line.startsWith('## ')) return <h2 key={i} className="text-[22px] font-bold text-white mt-8 mb-3 border-b border-white/5 pb-3">{line.replace('## ', '')}</h2>;
          if (line.startsWith('### ') || line.startsWith('**Step ')) return <h3 key={i} className="text-[16px] font-bold text-white mt-6 mb-2">{line.replace(/^(### |\*\*)/g, '').replace(/\*\*$/, '')}</h3>;
          if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className={`text-[14px] font-bold mt-4 ${article.categoryText}`}>{line.replace(/\*\*/g, '')}</p>;
          if (line.startsWith('- ')) return (
            <div key={i} className="flex items-start gap-3 ml-2">
              <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 bg-gradient-to-br ${article.categoryColor}`} />
              <p className="text-[14px] text-gray-300 leading-relaxed">{line.replace('- ', '')}</p>
            </div>
          );
          if (line.trim() === '') return <div key={i} className="h-2" />;
          return <p key={i} className="text-[14px] text-gray-300 leading-relaxed">{line.replace(/\*\*(.*?)\*\*/g, '$1')}</p>;
        })}

        {/* Feedback Block */}
        <div className="mt-12 pt-8 border-t border-white/5">
          <div className="bg-[#1A1F26] rounded-2xl border border-white/5 p-6 flex items-center justify-between">
            <div>
              <div className="text-[15px] font-bold text-white mb-1">Was this article helpful?</div>
              <div className="text-[12px] text-gray-500">Your feedback helps us improve our documentation.</div>
            </div>
            {feedback ? (
              <div className="flex items-center gap-2 text-green-400 text-[13px] font-bold">
                <CheckCircle className="w-5 h-5" /> Thanks for your feedback!
              </div>
            ) : (
              <div className="flex gap-3">
                <button onClick={() => setFeedback("yes")} className="flex items-center gap-2 px-5 py-2.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/25 text-green-400 rounded-xl font-bold text-[13px] transition-all hover:scale-[1.03]"><ThumbsUp className="w-4 h-4" /> Yes</button>
                <button onClick={() => setFeedback("no")} className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 rounded-xl font-bold text-[13px] transition-all hover:scale-[1.03]"><ThumbsDown className="w-4 h-4" /> No</button>
              </div>
            )}
          </div>
        </div>

        {/* Related Articles */}
        {related.length > 0 && (
          <div className="mt-8">
            <h3 className="text-[15px] font-bold text-white mb-4 uppercase tracking-wider">Related Articles</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {related.map(a => {
                const RelIcon = a.icon;
                return (
                  <button key={a.id} onClick={() => onOpen(a.id)} className="bg-[#1A1F26] border border-white/5 hover:border-white/20 rounded-xl p-5 text-left group transition-all hover:scale-[1.02]">
                    <div className={`w-9 h-9 rounded-lg ${a.categoryBg} flex items-center justify-center mb-3`}>
                      <RelIcon className={`w-4 h-4 ${a.categoryText}`} />
                    </div>
                    <div className="text-[13px] font-bold text-white group-hover:text-blue-400 transition-colors">{a.title}</div>
                    <div className="text-[11px] text-gray-600 mt-1 flex items-center gap-1"><Clock className="w-3 h-3" />{a.readTime}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────
export const HelpCenterOverlay = ({ onClose }: HelpCenterOverlayProps) => {
  const [view, setView] = useState<HelpCenterView>("home");
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGuide, setExpandedGuide] = useState<string | null>("getting-started");
  const [videoFilter, setVideoFilter] = useState("All");
  const [chatMessages, setChatMessages] = useState<{ from: "user" | "bot"; text: string; time: string }[]>([
    { from: "bot", text: "👋 Hi! I'm the YourBroker Support Assistant. How can I help you today?", time: formatTime() },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  function formatTime() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const openArticle = (id: string) => { setActiveArticleId(id); setView("article"); setSearchQuery(""); };
  const activeArticle = ARTICLES.find(a => a.id === activeArticleId);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return ARTICLES.filter(a => a.title.toLowerCase().includes(q) || a.category.toLowerCase().includes(q));
  }, [searchQuery]);

  const handleSend = () => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatMessages(prev => [...prev, { from: "user", text: msg, time: formatTime() }]);
    setChatInput("");
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const lower = msg.toLowerCase();
      const reply = lower.includes("deposit") ? "You can deposit funds by clicking the green '+ Deposit' button in the header. Choose any enabled payment method shown there, send the transfer, and submit the request. Deposits stay pending until a finance admin approves them because automatic blockchain detection is not wired yet."
        : lower.includes("withdraw") ? "Withdrawals are processed within 1–5 business days. Your account must be verified to withdraw. Minimum withdrawal is $10. Visit Account > Balance History to submit a request."
        : lower.includes("tournament") ? "Tournaments let you compete with other traders using a sandbox balance. Entry fees vary. Go to the Tournaments section and click 'Details' on any event to join."
        : lower.includes("verif") ? "Account verification requires a government-issued ID and proof of address. Upload these in Account > Personal Data. Processing takes 24–48 hours."
        : lower.includes("vip") ? "VIP status is based on your cumulative deposit total. Benefits include higher payouts, a dedicated account manager, and priority support. Contact us to learn more."
        : "Thank you for your message! A member of our support team will review your query and respond shortly. For urgent matters, please include your account email.";
      setChatMessages(prev => [...prev, { from: "bot", text: reply, time: formatTime() }]);
    }, 1400);
  };

  const videoCategories = ["All", ...Array.from(new Set(VIDEOS.map(v => v.category)))];
  const filteredVideos = videoFilter === "All" ? VIDEOS : VIDEOS.filter(v => v.category === videoFilter);

  const NAV = [
    { id: "home", label: "Help Center" },
    { id: "guide", label: "Trading Guide" },
    { id: "videos", label: "Video Tutorials" },
    { id: "chat", label: "Live Support" },
  ] as const;

  return (
    <div className="absolute inset-0 z-40 bg-[#0E1217] flex flex-col overflow-hidden">
      {/* ── TOP NAV BAR ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between px-4 md:px-8 border-b border-white/5 bg-[#111518] shrink-0 gap-2 md:gap-0 pt-3 md:pt-0">
        
        {/* Mobile Top Row: Logo & Close */}
        <div className="flex items-center justify-between md:w-auto w-full">
          <div className="flex items-center gap-3 py-2 md:py-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <HelpCircle className="w-4 h-4 text-white" />
            </div>
            <span className="text-[15px] font-bold text-white">Help Center</span>
          </div>

          {/* Close Button immediately visible on Mobile */}
          <div className="flex items-center md:hidden">
            {onClose && (
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Nav tabs (Scrollable on mobile) */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory">
          {NAV.map(n => (
            <button
              key={n.id}
              onClick={() => setView(n.id)}
              className={`px-4 md:px-5 py-3 md:py-3.5 text-[13px] font-bold transition-colors relative whitespace-nowrap shrink-0 snap-start ${view === n.id ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
            >
              {n.label}
              {view === n.id && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-blue-500 to-violet-500 rounded-t" />}
            </button>
          ))}
        </div>

        {/* Close Button on Desktop */}
        <div className="hidden md:flex items-center gap-2 py-4">
          {onClose && (
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── ARTICLE VIEW ── */}
      {view === "article" && activeArticle && (
        <>
          <div className="flex items-center gap-3 px-4 md:px-8 py-3.5 border-b border-white/5 bg-[#111518] shrink-0">
            <button onClick={() => setView("home")} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-[13px] font-bold group">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back
            </button>
            <div className="hidden md:flex items-center gap-2 text-[13px] text-gray-600 min-w-0">
              <span>Help Center</span>
              <ChevronRight className="w-3 h-3" />
              <span className={activeArticle.categoryText}>{activeArticle.category}</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-gray-400 truncate max-w-[300px]">{activeArticle.title}</span>
            </div>
          </div>
          <ArticleView article={activeArticle} onBack={() => setView("home")} onOpen={openArticle} />
        </>
      )}

      {/* ── HOME VIEW ── */}
      {view === "home" && (
        <div className="flex-1 overflow-y-auto">
          {/* Hero Section */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0E1217] px-4 sm:px-6 md:px-10 pt-10 md:pt-14 pb-12 md:pb-16">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[80px] translate-x-1/3 -translate-y-1/3" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-violet-600/10 rounded-full blur-[80px] -translate-x-1/4 translate-y-1/4" />
            <div className="relative z-10 max-w-[900px] mx-auto text-center">
              <div className="inline-flex max-w-full items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-[11px] md:text-[12px] text-gray-400 font-bold mb-5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Support team online — average response 2 min
              </div>
              <h1 className="text-[28px] sm:text-[34px] md:text-[44px] font-bold text-white mb-3 leading-tight">
                Hello, how can we <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">help you?</span>
              </h1>
              <p className="text-[15px] md:text-[16px] text-gray-400 mb-8">Search our knowledge base or browse categories below</p>
              {/* Search */}
              <div className="relative max-w-[600px] mx-auto">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search for answers..."
                  className="w-full pl-12 md:pl-14 pr-4 md:pr-5 py-3.5 md:py-4 bg-white/5 border border-white/10 hover:border-white/20 focus:border-blue-500/60 rounded-2xl text-white text-[14px] md:text-[15px] outline-none transition-all placeholder-gray-600 backdrop-blur"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-10 space-y-10 md:space-y-14">
            {/* Search Results */}
            {searchQuery && (
              <div>
                <p className="text-[14px] text-gray-500 mb-5">{searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "<span className="text-white font-bold">{searchQuery}</span>"</p>
                {searchResults.length === 0 ? (
                  <div className="bg-[#1A1F26] rounded-2xl border border-white/5 p-10 text-center">
                    <Search className="w-10 h-10 text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-400 text-[14px]">No results found. <button onClick={() => setView("chat")} className="text-blue-400 hover:text-blue-300 underline">Chat with support</button></p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {searchResults.map(a => {
                      const Icon = a.icon;
                      return (
                        <button key={a.id} onClick={() => openArticle(a.id)} className="w-full flex items-center gap-3 md:gap-4 p-4 md:p-5 bg-[#1A1F26] rounded-xl border border-white/5 hover:border-blue-500/30 text-left group transition-all">
                          <div className={`w-10 h-10 rounded-xl ${a.categoryBg} flex items-center justify-center shrink-0`}>
                            <Icon className={`w-5 h-5 ${a.categoryText}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[14px] font-bold text-white group-hover:text-blue-400 transition-colors break-words">{a.title}</div>
                            <div className="text-[12px] text-gray-600 mt-0.5 flex items-center gap-2">
                              <span className={`${a.categoryText} font-bold text-[11px]`}>{a.category}</span>·<Clock className="w-3 h-3" />{a.readTime} read
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-blue-400 transition-colors shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {!searchQuery && (
              <>
                {/* Quick Access Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                  <button onClick={() => setView("guide")} className="group relative overflow-hidden bg-[#1A1F26] rounded-2xl border border-white/5 hover:border-blue-500/30 p-5 md:p-7 text-left transition-all hover:scale-[1.02] min-w-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-5 shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform">
                      <BookOpen className="w-7 h-7 text-white" />
                    </div>
                    <div className="text-[18px] font-bold text-white mb-1.5">Trading Guide</div>
                    <div className="text-[13px] text-gray-500 mb-4">Complete guide from basics to advanced trading strategies</div>
                    <div className="flex items-center gap-1.5 text-[12px] font-bold text-blue-400">Explore Guide <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" /></div>
                  </button>
                  <button onClick={() => setView("videos")} className="group relative overflow-hidden bg-[#1A1F26] rounded-2xl border border-white/5 hover:border-violet-500/30 p-5 md:p-7 text-left transition-all hover:scale-[1.02] min-w-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-5 shadow-lg shadow-violet-500/25 group-hover:scale-110 transition-transform">
                      <PlayCircle className="w-7 h-7 text-white" />
                    </div>
                    <div className="text-[18px] font-bold text-white mb-1.5">Video Tutorials</div>
                    <div className="text-[13px] text-gray-500 mb-4">Step-by-step visual guides for every platform feature</div>
                    <div className="flex items-center gap-1.5 text-[12px] font-bold text-violet-400">Watch Videos <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" /></div>
                  </button>
                </div>

                {/* Popular Articles */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-6 rounded-full bg-gradient-to-b from-blue-500 to-violet-500" />
                      <h2 className="text-[17px] font-bold text-white">Popular Articles</h2>
                    </div>
                    <span className="text-[12px] text-gray-600 font-bold">{ARTICLES.length} articles</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {ARTICLES.map(a => {
                      const Icon = a.icon;
                      return (
                        <button key={a.id} onClick={() => openArticle(a.id)} className="flex items-center gap-4 p-5 bg-[#1A1F26] rounded-xl border border-white/5 hover:border-white/15 text-left group transition-all hover:bg-[#1e2535]">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${a.categoryColor} flex items-center justify-center shrink-0 shadow-md`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-bold text-white group-hover:text-blue-400 transition-colors truncate">{a.title}</div>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-600">
                              <span className={`font-bold ${a.categoryText}`}>{a.category}</span>
                              <span>·</span>
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {a.readTime}</span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-blue-400 transition-colors shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Need Help Banner */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f4c35] via-[#0d3326] to-[#0E1217] border border-green-500/20 p-5 md:p-8">
                  <div className="absolute right-0 top-0 w-[200px] h-[200px] bg-green-500/10 rounded-full blur-[60px] translate-x-1/4 -translate-y-1/4" />
                  <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-5 md:gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-green-500/20 border border-green-500/30 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-8 h-8 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[19px] font-bold text-white mb-1">Still need help?</div>
                      <div className="text-[13px] text-green-300/70">Our support team is online 24/7 — average response time under 2 minutes.</div>
                    </div>
                    <button onClick={() => setView("chat")} className="w-full md:w-auto shrink-0 px-7 py-3.5 bg-green-500 hover:bg-green-400 text-white font-bold rounded-xl text-[14px] transition-all hover:scale-[1.03] shadow-lg shadow-green-500/25">
                      Chat Now
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── TRADING GUIDE VIEW ── */}
      {view === "guide" && (
        <div className="flex-1 overflow-y-auto">
          <div className="bg-gradient-to-br from-[#0f172a] to-[#0E1217] px-4 sm:px-6 md:px-10 py-8 md:py-10 border-b border-white/5">
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="w-5 h-5 text-blue-400" />
              <span className="text-[12px] text-blue-400 font-bold uppercase tracking-widest">Knowledge Base</span>
            </div>
            <h2 className="text-[28px] font-bold text-white">Trading Guide</h2>
            <p className="text-[14px] text-gray-500 mt-2">Everything you need to become a confident trader — from first steps to expert strategies.</p>
          </div>
          <div className="max-w-[800px] mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-10 space-y-3">
            {GUIDE_SECTIONS.map(section => {
              const SIcon = section.icon;
              const isOpen = expandedGuide === section.id;
              return (
                <div key={section.id} className={`rounded-2xl border overflow-hidden transition-all ${isOpen ? "border-blue-500/25 bg-[#13192b]" : "border-white/5 bg-[#1A1F26]"}`}>
                  <button onClick={() => setExpandedGuide(isOpen ? null : section.id)} className="w-full flex items-center gap-4 p-5 text-left">
                    <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 ${isOpen ? "bg-blue-500/15" : ""}`}>
                      <SIcon className={`w-5 h-5 ${section.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="text-[15px] font-bold text-white">{section.title}</div>
                      <div className="text-[12px] text-gray-600 mt-0.5">{section.articles.length} articles</div>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </button>
                  {isOpen && (
                    <div className="border-t border-white/5 divide-y divide-white/5">
                      {section.articles.map(id => {
                        const art = ARTICLES.find(a => a.id === id);
                        if (!art) return null;
                        const AIcon = art.icon;
                        return (
                          <button key={id} onClick={() => openArticle(id)} className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/5 transition-colors group text-left">
                            <div className={`w-8 h-8 rounded-lg ${art.categoryBg} flex items-center justify-center shrink-0`}>
                              <AIcon className={`w-4 h-4 ${art.categoryText}`} />
                            </div>
                            <div className="flex-1">
                              <div className="text-[13px] font-bold text-gray-300 group-hover:text-white transition-colors">{art.title}</div>
                              <div className="text-[11px] text-gray-600 mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" />{art.readTime} read</div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-blue-400 transition-colors" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── VIDEO TUTORIALS VIEW ── */}
      {view === "videos" && (
        <div className="flex-1 overflow-y-auto">
          <div className="bg-gradient-to-br from-[#170f2e] to-[#0E1217] px-4 sm:px-6 md:px-10 py-8 md:py-10 border-b border-white/5">
            <div className="flex items-center gap-3 mb-2">
              <PlayCircle className="w-5 h-5 text-violet-400" />
              <span className="text-[12px] text-violet-400 font-bold uppercase tracking-widest">Video Library</span>
            </div>
            <h2 className="text-[28px] font-bold text-white">Video Tutorials</h2>
            <p className="text-[14px] text-gray-500 mt-2">Watch expert-led tutorials covering every aspect of the platform.</p>
          </div>
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-10">
            <div className="flex gap-2 mb-8 flex-wrap">
              {videoCategories.map(cat => (
                <button key={cat} onClick={() => setVideoFilter(cat)}
                  className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all border ${videoFilter === cat ? "bg-violet-500/20 text-violet-400 border-violet-500/30 shadow-md shadow-violet-500/10" : "text-gray-500 border-white/10 hover:border-white/20 hover:text-white"}`}>
                  {cat}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredVideos.map(v => (
                <div key={v.id} className="group bg-[#1A1F26] rounded-2xl border border-white/5 hover:border-white/20 overflow-hidden cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl">
                  <div className={`h-[150px] bg-gradient-to-br ${v.color} relative flex items-center justify-center overflow-hidden`}>
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_bottom_left,rgba(255,255,255,0.4),transparent)]" />
                    <span className="text-[52px] drop-shadow-lg">{v.emoji}</span>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-xl scale-90 group-hover:scale-100 transition-transform">
                        <PlayCircle className="w-7 h-7 text-gray-900 fill-gray-900" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[11px] font-bold px-2 py-0.5 rounded-md backdrop-blur">{v.duration}</div>
                    <div className="absolute top-2 left-2 bg-black/50 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur uppercase tracking-wide">{v.category}</div>
                  </div>
                  <div className="p-5">
                    <div className="text-[14px] font-bold text-white group-hover:text-violet-400 transition-colors leading-snug">{v.title}</div>
                    <div className="flex items-center gap-2 mt-2 text-[12px] text-gray-600">
                      <Clock className="w-3.5 h-3.5" /> {v.duration}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── LIVE CHAT VIEW ── */}
      {view === "chat" && (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0E1217]">
          {/* Chat agent bar */}
          <div className="flex items-center gap-3 md:gap-4 px-4 md:px-6 py-4 bg-[#111518] border-b border-white/5 shrink-0">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold text-[15px]">S</div>
              <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-[#111518]" />
            </div>
            <div>
              <div className="text-[14px] font-bold text-white">Support Agent</div>
              <div className="text-[12px] text-green-400 flex items-center gap-1.5 font-medium">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Online — typically replies in 2 min
              </div>
            </div>
            <div className="ml-auto hidden sm:flex items-center gap-2 text-[12px] text-gray-600 font-bold">
              <Shield className="w-3.5 h-3.5" /> End-to-end encrypted
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex items-end gap-2.5 ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                {msg.from === "bot" && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0 mb-0.5">S</div>
                )}
                <div className={`flex flex-col gap-1 max-w-[85%] sm:max-w-[68%] ${msg.from === "user" ? "items-end" : "items-start"}`}>
                  <div className={`px-4 py-3 rounded-2xl text-[13px] leading-relaxed ${
                    msg.from === "user"
                      ? "bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-br-sm shadow-lg shadow-blue-500/20"
                      : "bg-[#1A1F26] text-gray-200 border border-white/5 rounded-bl-sm"
                  }`}>
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-gray-600 px-1">{msg.time}</span>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex items-end gap-2.5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0">S</div>
                <div className="bg-[#1A1F26] border border-white/5 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1.5 items-center h-4">
                    {[0, 1, 2].map(j => <div key={j} className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: `${j * 0.15}s` }} />)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input bar */}
          <div className="px-4 md:px-6 py-4 border-t border-white/5 bg-[#111518] shrink-0">
            <div className="flex items-center gap-3 bg-[#1A1F26] border border-white/10 focus-within:border-blue-500/50 rounded-2xl px-4 py-2.5 transition-colors">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSend()}
                placeholder="Type a message..."
                className="flex-1 bg-transparent text-[13px] text-white outline-none placeholder-gray-600"
              />
              <button
                onClick={handleSend}
                disabled={!chatInput.trim()}
                className="w-9 h-9 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all hover:scale-105 shrink-0"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
            <p className="text-[11px] text-gray-700 text-center mt-2">This chat is monitored for quality and training purposes.</p>
          </div>
        </div>
      )}
    </div>
  );
};
