import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  BarChart3,
  User,
  ShieldCheck,
  Wallet,
  Banknote,
  Trophy,
  ChevronDown,
  MessageSquare,
  MessageCircle,
  Plus,
  X,
  Send,
  Paperclip,
  ArrowRight,
  HelpCircle,
  Headphones,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";

interface HelpCenterOverlayProps {
  onClose?: () => void;
}

type HelpTab = "my_requests" | "create_request" | "live_chat" | "faq";
type FaqCategory = "trading" | "account" | "verification" | "payment" | "payouts" | "tournaments";

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

interface ChatMessage {
  id: string;
  sender: "user" | "support";
  text: string;
  timestamp: string;
}

const FAQ_CATEGORIES: Array<{
  id: FaqCategory;
  title: string;
  countLabel: string;
  countNum: number;
  icon: React.ElementType;
}> = [
  { id: "trading", title: "Trading Platform", countLabel: "11 questions", countNum: 11, icon: BarChart3 },
  { id: "account", title: "My account", countLabel: "4 questions", countNum: 4, icon: User },
  { id: "verification", title: "Verification", countLabel: "5 questions", countNum: 5, icon: ShieldCheck },
  { id: "payment", title: "Payment", countLabel: "4 questions", countNum: 4, icon: Wallet },
  { id: "payouts", title: "Payouts", countLabel: "5 questions", countNum: 5, icon: Banknote },
  { id: "tournaments", title: "Tournaments", countLabel: "7 questions", countNum: 7, icon: Trophy },
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
      question: "How to withdraw money from the account?",
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
      answer:
        "The minimum withdrawal amount is $10.00.",
    },
    {
      id: "po4",
      question: "Is there any fee for depositing or withdrawing funds from the account?",
      answer:
        "No. Our platform imposes 0% commission on both deposits and withdrawals.",
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
      question: "What are trading tournaments?",
      answer:
        "Tournaments are competitive trading contests where participants trade on equal virtual tournament balances to achieve the highest balance percentage. Top traders on the leaderboard win real cash prize funds credited directly to their live balance.",
    },
    {
      id: "tr2",
      question: "How do I participate in a tournament?",
      answer:
        "Open the Tournaments section from the left menu bar. Browse active contests, review rules and prize distributions, and click 'Enter Tournament' to join.",
    },
    {
      id: "tr3",
      question: "Can I rebuy if my tournament balance runs out?",
      answer:
        "Yes! Most tournaments feature unlimited rebuys, allowing you to reset your tournament starting balance and continue competing for leaderboard positions.",
    },
    {
      id: "tr4",
      question: "How is the tournament leaderboard calculated?",
      answer:
        "Leaderboard rankings are calculated in real time based on the total net virtual balance accumulated in the tournament workspace.",
    },
    {
      id: "tr5",
      question: "When are tournament prizes distributed?",
      answer:
        "Cash prizes are automatically deposited into winners' live accounts within 1 hour after the tournament countdown timer expires.",
    },
    {
      id: "tr6",
      question: "Are tournament winnings withdrawable?",
      answer:
        "Yes! All cash prizes awarded from tournaments are real funds without turnover restrictions and can be withdrawn or traded immediately.",
    },
    {
      id: "tr7",
      question: "Is there a fee to enter a tournament?",
      answer:
        "We host both Free-Entry Tournaments (Freebies) with guaranteed cash prizes and Premium Tournaments with enlarged prize pools.",
    },
  ],
};

const STORAGE_TICKETS_KEY = "initoption_support_tickets";
const STORAGE_LIVE_CHAT_KEY = "initoption_live_support_chat";

export const HelpCenterOverlay = ({ onClose }: HelpCenterOverlayProps) => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<HelpTab>("faq");
  const [selectedCategory, setSelectedCategory] = useState<FaqCategory>("trading");
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>("t1");

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
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [
      {
        id: "TK-928104",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        category: "Deposits & Payments",
        subject: "Deposit confirmation status",
        message: "I completed an M-Pesa deposit of 100 USD. Requesting status update.",
        status: "Answered",
        replies: [
          {
            id: "r1",
            sender: "user",
            text: "I completed an M-Pesa deposit of 100 USD. Requesting status update.",
            timestamp: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: "r2",
            sender: "support",
            text: "Hello! Your M-Pesa deposit of $100.00 has been verified and credited to your live balance.",
            timestamp: new Date(Date.now() - 43200000).toISOString(),
          },
        ],
      },
    ];
  });

  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState("");

  // Live Support Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LIVE_CHAT_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // silent catch
    }
    return [
      {
        id: "c1",
        sender: "support",
        text: "👋 Hello! Welcome to InitOption 24/7 Live Support. How can our support team assist your trading today?",
        timestamp: new Date().toISOString(),
      },
    ];
  });
  const [chatInput, setChatInput] = useState("");
  const [isBotTyping, setIsBotTyping] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TICKETS_KEY, JSON.stringify(tickets));
    } catch {
      // silent
    }
  }, [tickets]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_LIVE_CHAT_KEY, JSON.stringify(chatMessages));
    } catch {
      // silent
    }
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, activeTab]);

  const handleCreateTicket = (e: React.FormEvent) => {
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
    setTimeout(() => {
      const newTicket: SupportTicket = {
        id: `TK-${Math.floor(100000 + Math.random() * 900000)}`,
        createdAt: new Date().toISOString(),
        category: ticketCategory,
        subject: ticketSubject.trim(),
        message: ticketMessage.trim(),
        status: "Open",
        replies: [
          {
            id: `r-${Date.now()}`,
            sender: "user",
            text: ticketMessage.trim(),
            timestamp: new Date().toISOString(),
          },
        ],
      };

      setTickets((prev) => [newTicket, ...prev]);
      setIsSubmitting(false);
      setTicketSubject("");
      setTicketMessage("");
      setTicketAttachment(null);

      toast({
        title: "Support ticket submitted!",
        description: `Ticket ${newTicket.id} created. Our support team will respond shortly.`,
      });

      setActiveTab("my_requests");
    }, 600);
  };

  const handleSendReply = () => {
    if (!activeTicket || !replyText.trim()) return;

    const newReply = {
      id: `r-${Date.now()}`,
      sender: "user" as const,
      text: replyText.trim(),
      timestamp: new Date().toISOString(),
    };

    const updatedTickets = tickets.map((t) => {
      if (t.id === activeTicket.id) {
        return {
          ...t,
          status: "Open" as const,
          replies: [...t.replies, newReply],
        };
      }
      return t;
    });

    setTickets(updatedTickets);
    setActiveTicket((prev) => (prev ? { ...prev, status: "Open", replies: [...prev.replies, newReply] } : null));
    setReplyText("");
    toast({ title: "Reply sent to support staff." });
  };

  // Handle sending a live chat message
  const handleSendChatMessage = (customText?: string) => {
    const textToSend = customText || chatInput.trim();
    if (!textToSend) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toISOString(),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!customText) setChatInput("");
    setIsBotTyping(true);

    // Simulate intelligent support response
    setTimeout(() => {
      let botReply = "Thank you for reaching out to InitOption Live Support. An agent has been assigned to your ticket. How else can we assist you?";
      const lower = textToSend.toLowerCase();

      if (lower.includes("mpesa") || lower.includes("m-pesa") || lower.includes("deposit")) {
        botReply = "💳 To deposit via M-Pesa: Click the green '+ Deposit' button at the top right, select M-Pesa, enter your deposit amount ($10 minimum), and enter your phone number. You will receive an instant STK push prompt on your mobile phone to complete payment.";
      } else if (lower.includes("withdraw") || lower.includes("payout")) {
        botReply = "💸 Withdrawals are processed instantly to your verified M-Pesa or Crypto wallet (15-60 minutes average processing time). Navigate to Account -> Withdrawal to place a request.";
      } else if (lower.includes("verif") || lower.includes("kyc")) {
        botReply = "🔐 Verification requires submitting a valid government-issued ID (Passport, National ID, or Driver's License) in your Settings tab. Processing takes 15 to 60 minutes.";
      } else if (lower.includes("digital option") || lower.includes("trade") || lower.includes("how to")) {
        botReply = "📈 Digital options allow you to forecast asset price direction (UP or DOWN) within a fixed timeframe (5s to 4h). If correct, you earn up to 98% profit payout!";
      }

      const botMsg: ChatMessage = {
        id: `msg-bot-${Date.now()}`,
        sender: "support",
        text: botReply,
        timestamp: new Date().toISOString(),
      };

      setChatMessages((prev) => [...prev, botMsg]);
      setIsBotTyping(false);
    }, 1000);
  };

  const currentFaqs = useMemo(() => FAQ_DATA[selectedCategory] || [], [selectedCategory]);

  return (
    <div className="flex flex-col h-full w-full bg-[#161b26] text-white overflow-hidden select-none">
      {/* ── TOP SUB-NAVIGATION BAR (Quotex Style + Live Support Chat) ── */}
      <div className="flex items-center justify-between px-6 py-4 bg-[#1b2232] border-b border-[#252e42] shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab("my_requests")}
            className={`px-5 py-2.5 rounded-[4px] text-[14px] font-bold transition-all ${
              activeTab === "my_requests"
                ? "bg-[#273248] text-white shadow-sm border border-white/10"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            My requests
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("create_request")}
            className={`px-5 py-2.5 rounded-[4px] text-[14px] font-bold transition-all ${
              activeTab === "create_request"
                ? "bg-[#273248] text-white shadow-sm border border-white/10"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            Create request
          </button>

          {/* 💬 LIVE SUPPORT CHAT TAB */}
          <button
            type="button"
            onClick={() => setActiveTab("live_chat")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-[4px] text-[14px] font-extrabold transition-all ${
              activeTab === "live_chat"
                ? "bg-[#0084FF] text-white shadow-md"
                : "bg-white/5 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10"
            }`}
          >
            <MessageCircle className="h-4 w-4" />
            <span>Live Support Chat</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("faq")}
            className={`px-5 py-2.5 rounded-[4px] text-[14px] font-bold transition-all ${
              activeTab === "faq"
                ? "bg-[#273248] text-white shadow-sm border border-white/10"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            FAQ
          </button>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* ── MAIN WORKSPACE CONTENT AREA ── */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-10 lg:px-16 deposit-scrollbar">
        {/* ── TAB 1: FAQ (Frequently Asked Questions) ── */}
        {activeTab === "faq" && (
          <div className="max-w-[1100px] mx-auto space-y-10">
            {/* Header Title */}
            <div className="text-center space-y-2">
              <h1 className="text-[26px] sm:text-[30px] font-black text-white tracking-wide">
                Frequently Asked Questions
              </h1>
            </div>

            {/* 6 Category Interactive Cards Grid (Quotex Reference Image) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
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
                    className={`flex flex-col items-center justify-center p-5 rounded-[12px] transition-all text-center ${
                      isSelected
                        ? "bg-white text-[#161b26] shadow-[0_12px_30px_rgba(0,0,0,0.35)] scale-[1.03]"
                        : "bg-[#1f2738] text-white/70 hover:bg-[#273248] hover:text-white border border-white/5"
                    }`}
                  >
                    <div className={`p-2.5 rounded-full mb-3 ${isSelected ? "bg-[#161b26]/10 text-[#161b26]" : "bg-white/5 text-white"}`}>
                      <Icon className="h-6 w-6" strokeWidth={2.2} />
                    </div>
                    <span className="text-[14px] font-extrabold leading-snug">{cat.title}</span>
                    <span className={`text-[11.5px] font-bold mt-1 ${isSelected ? "text-[#161b26]/60" : "text-white/40"}`}>
                      {cat.countLabel}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Horizontal Line Divider */}
            <div className="border-t border-white/10 my-6" />

            {/* 2-Column Accordion FAQ Questions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4 text-left">
              {currentFaqs.map((item) => {
                const isExpanded = expandedFaqId === item.id;

                return (
                  <div key={item.id} className="border-b border-white/10 pb-4">
                    <button
                      type="button"
                      onClick={() => setExpandedFaqId(isExpanded ? null : item.id)}
                      className="flex w-full items-start gap-3 text-left font-extrabold text-[14.5px] text-white/90 hover:text-white transition-colors"
                    >
                      <ChevronDown
                        className={`mt-1 h-4 w-4 shrink-0 text-white/50 transition-transform duration-200 ${
                          isExpanded ? "rotate-180 text-[#0084FF]" : ""
                        }`}
                      />
                      <span>{item.question}</span>
                    </button>

                    {isExpanded && (
                      <div className="mt-3 pl-7 pr-2 text-[13px] font-normal leading-relaxed text-white/70 whitespace-pre-line animate-fadeIn">
                        {item.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Contact Customer Support Floating Box (Quotex Style + Live Chat Button) */}
            <div className="pt-8 pb-4 flex justify-center gap-4 flex-wrap">
              <div className="bg-[#1f293d] border border-white/10 rounded-[12px] p-4 sm:px-8 flex items-center gap-4 max-w-md w-full shadow-lg">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0084FF] text-white">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div className="text-left text-[13px] flex-1">
                  <p className="font-bold text-white/80">Didn't find an answer to your question?</p>
                  <div className="mt-1 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab("live_chat")}
                      className="font-black text-[#0084FF] hover:underline flex items-center gap-1"
                    >
                      Start Live Chat
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-white/30">|</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab("create_request")}
                      className="font-bold text-white/60 hover:text-white hover:underline"
                    >
                      Submit Ticket
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: LIVE SUPPORT CHAT 💬 ── */}
        {activeTab === "live_chat" && (
          <div className="max-w-[850px] mx-auto flex flex-col h-[calc(100vh-170px)] min-h-[520px] bg-[#1f2738] border border-white/10 rounded-[16px] shadow-2xl overflow-hidden text-left">
            {/* Live Chat Agent Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-[#181e2b] border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-[#0084FF] text-white shadow-md">
                  <Headphones className="h-5 w-5" />
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#181e2b] bg-emerald-500" />
                </div>
                <div>
                  <h3 className="text-[15px] font-extrabold text-white flex items-center gap-2">
                    InitOption 24/7 Live Support
                    <span className="rounded-[4px] bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-400">
                      LIVE
                    </span>
                  </h3>
                  <p className="text-[11.5px] font-bold text-white/50">
                    Average response time: <strong className="text-emerald-400">&lt; 1 min</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setChatMessages([
                    {
                      id: "c1",
                      sender: "support",
                      text: "👋 Hello! Welcome to InitOption 24/7 Live Support. How can our support team assist your trading today?",
                      timestamp: new Date().toISOString(),
                    },
                  ]);
                  toast({ title: "Chat session refreshed." });
                }}
                className="flex items-center gap-1.5 rounded-[6px] bg-white/5 px-3 py-1.5 text-xs font-bold text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                title="Restart chat session"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reset Chat</span>
              </button>
            </div>

            {/* Quick Prompt Recommendation Pills */}
            <div className="px-6 py-2.5 bg-[#161b26] border-b border-white/5 flex items-center gap-2 overflow-x-auto shrink-0 deposit-scrollbar">
              <span className="text-[11px] font-extrabold uppercase text-white/40 shrink-0 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-yellow-400" /> Quick Topics:
              </span>
              {[
                "💳 M-Pesa Deposit Guide",
                "💸 Withdrawal Processing Time",
                "🔐 Verification Help",
                "📈 How Digital Options Work",
              ].map((topic, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSendChatMessage(topic)}
                  className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11.5px] font-bold text-white/80 transition-colors hover:border-[#0084FF] hover:bg-[#0084FF]/20 hover:text-white"
                >
                  {topic}
                </button>
              ))}
            </div>

            {/* Chat Messages Log */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 deposit-scrollbar bg-[#161b26]/50">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[80%] sm:max-w-[70%] rounded-[14px] p-4 text-[13.5px] leading-relaxed shadow-sm ${
                      msg.sender === "user"
                        ? "bg-[#0084FF] text-white rounded-br-none"
                        : "bg-[#273248] text-white/95 border border-white/10 rounded-bl-none"
                    }`}
                  >
                    {msg.sender === "support" && (
                      <p className="font-extrabold text-[11px] text-[#0084FF] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Headphones className="h-3 w-3" /> Support Agent
                      </p>
                    )}
                    <p className="whitespace-pre-line">{msg.text}</p>
                  </div>
                  <span className="text-[10px] font-bold text-white/40 mt-1 px-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}

              {isBotTyping && (
                <div className="flex items-center gap-2 text-xs font-bold text-white/50 italic bg-[#273248]/50 w-fit px-4 py-2 rounded-full border border-white/5">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce delay-150" />
                    <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce delay-300" />
                  </div>
                  <span>Support Agent is typing...</span>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input Bar */}
            <div className="p-4 bg-[#181e2b] border-t border-white/10 flex items-center gap-3 shrink-0">
              <label className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] bg-white/5 text-white/50 hover:bg-white/10 hover:text-white cursor-pointer transition-colors">
                <Paperclip className="h-5 w-5" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleSendChatMessage(`[Attached image: ${e.target.files[0].name}]`);
                    }
                  }}
                  className="hidden"
                />
              </label>

              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendChatMessage()}
                placeholder="Type your message to support..."
                className="h-11 flex-1 rounded-[8px] border border-white/15 bg-[#161b26] px-4 text-sm font-bold text-white outline-none focus:border-[#0084FF] transition-colors"
              />

              <button
                type="button"
                onClick={() => handleSendChatMessage()}
                className="flex h-11 px-5 items-center justify-center gap-2 rounded-[8px] bg-[#0084FF] text-sm font-black text-white hover:bg-[#0070df] transition-all active:scale-[0.98]"
              >
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
          </div>
        )}

        {/* ── TAB 3: Create Request (Support Ticket Submission) ── */}
        {activeTab === "create_request" && (
          <div className="max-w-[700px] mx-auto space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-[24px] font-black text-white">Create a Support Request</h2>
              <p className="text-[13px] font-bold text-white/50">
                Our support team is available 24/7. Submit your query and we will respond promptly.
              </p>
            </div>

            <form onSubmit={handleCreateTicket} className="bg-[#1f2738] p-6 sm:p-8 rounded-[12px] border border-white/10 space-y-5 shadow-xl text-left">
              <div>
                <label className="block text-[12px] font-extrabold text-white/70 uppercase tracking-wider mb-2">
                  Category
                </label>
                <select
                  value={ticketCategory}
                  onChange={(e) => setTicketCategory(e.target.value)}
                  className="h-11 w-full rounded-[6px] border border-white/15 bg-[#161b26] px-4 text-sm font-bold text-white outline-none focus:border-[#0084FF] transition-colors"
                >
                  <option value="Trading Platform">Trading Platform & Execution</option>
                  <option value="Account & Verification">Account & KYC Verification</option>
                  <option value="Deposits & Payments">Deposits & Payments</option>
                  <option value="Payouts & Withdrawals">Payouts & Withdrawals</option>
                  <option value="Tournaments">Tournaments & Promotions</option>
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
                  className="h-11 w-full rounded-[6px] border border-white/15 bg-[#161b26] px-4 text-sm font-bold text-white outline-none focus:border-[#0084FF] transition-colors"
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
                  className="w-full rounded-[6px] border border-white/15 bg-[#161b26] p-4 text-sm font-bold text-white outline-none focus:border-[#0084FF] transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-[12px] font-extrabold text-white/70 uppercase tracking-wider mb-2">
                  Attachment (Optional Screenshot)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex h-11 items-center gap-2 rounded-[6px] border border-dashed border-white/20 bg-[#161b26] px-4 text-xs font-bold text-white/70 hover:text-white cursor-pointer transition-colors">
                    <Paperclip className="h-4 w-4 text-[#0084FF]" />
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
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-[6px] bg-[#0084FF] text-[15px] font-black text-white shadow-md transition-all hover:bg-[#0070df] active:scale-[0.99] disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  <span>{isSubmitting ? "Submitting..." : "Submit Support Request"}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── TAB 4: My Requests (Submitted Support Tickets) ── */}
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
                className="flex items-center gap-2 rounded-[6px] bg-[#0084FF] px-4 py-2 text-xs font-bold text-white hover:bg-[#0070df]"
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
                  className="inline-flex items-center gap-2 rounded-[6px] bg-[#0084FF] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0070df]"
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
                    className="bg-[#1f2738] p-5 rounded-[10px] border border-white/10 hover:border-[#0084FF]/50 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[13px] font-bold text-[#0084FF]">{t.id}</span>
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

      {/* ── TICKET DETAIL DISCUSSION THREAD MODAL ── */}
      {activeTicket && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85dvh] w-full max-w-[650px] flex-col overflow-hidden rounded-[12px] bg-[#1a2130] border border-white/15 text-white shadow-2xl text-left">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-[#20293c]">
              <div>
                <span className="font-mono text-xs font-bold text-[#0084FF]">{activeTicket.id}</span>
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
                        ? "bg-[#0084FF] text-white rounded-br-none"
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
                className="h-11 flex-1 rounded-[6px] border border-white/15 bg-[#20293c] px-4 text-sm font-bold text-white outline-none focus:border-[#0084FF]"
              />
              <button
                type="button"
                onClick={handleSendReply}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] bg-[#0084FF] text-white hover:bg-[#0070df]"
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
