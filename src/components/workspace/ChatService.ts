import { useState, useEffect, useCallback, useRef } from "react";
import type { TraderData } from "./WorkspaceLeaderboard";
import type { ChatMessage, MessageStatus, TraderPersonality, TraderProfile } from "./ChatTypes";
import {
  getRandomMessage,
  getRandomReaction,
  getRandomInitiation,
  getConversationStarter,
} from "./ChatMessages";
import { generateTraderProfile, seededRandom } from "./ChatTypes";
import { incrementUnread, clearUnread, setUnread } from "./chatUnreadStore";

export type ChatState = "idle" | "typing" | "awaiting_reply";

export interface ChatServiceState {
  messages: ChatMessage[];
  traderProfile: TraderProfile;
  chatState: ChatState;
  typingText: string;
  unreadCount: number;
  isFocused: boolean;
}

const MESSAGE_DELAYS = {
  fast: { min: 1500, max: 4000 },
  normal: { min: 3000, max: 10000 },
  slow: { min: 8000, max: 25000 },
};

const TYPING_DURATION = {
  brief: { charsPerMs: 0.05, min: 800, max: 3000 },
  normal: { charsPerMs: 0.03, min: 1500, max: 5000 },
  verbose: { charsPerMs: 0.02, min: 3000, max: 8000 },
};

const READ_DELAY = { min: 500, max: 2000 };

const SESSION_TOPICS = [
  "EUR/USD",
  "GBP/USD",
  "Gold",
  "Bitcoin",
  "Oil",
  "NASDAQ",
  "Silver",
  "Apple",
  "Tesla",
  "Amazon",
  "GBP/JPY",
  "USD/JPY",
  "S&P 500",
  "Dow Jones",
  "Ethereum",
  "USD/CAD",
  "AUD/USD",
  "NZD/USD",
  "Copper",
  "Natural Gas",
  "USD/CHF",
  "Euro Stoxx 50",
  "Nikkei 225",
  "FTSE 100",
  "DAX",
];

const TOURNAMENT_MENTIONS = [
  "the weekly tournament",
  "today's competition",
  "this month's challenge",
  "the prize pool event",
  "the weekend showdown",
  "the daily leaderboard",
  "the 50k grand tournament",
  "today's speed challenge",
];

function getRandomDelay(range: { min: number; max: number }): number {
  return range.min + Math.random() * (range.max - range.min);
}

function getTypingDuration(message: string, personality: TraderPersonality): number {
  const config = TYPING_DURATION[personality.verbosity];
  const charBased = message.length * config.charsPerMs * 1000;
  const randomFactor = 0.7 + Math.random() * 0.6;
  const duration = Math.max(config.min, Math.min(config.max, charBased * randomFactor));
  return duration;
}

function formatLastSeen(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Active now";
  if (minutes < 60) return `Last seen ${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  if (hours < 24) return `Last seen ${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (days === 1) return "Last seen yesterday";
  if (days < 7) return `Last seen ${days} days ago`;
  return new Date(timestamp).toLocaleDateString();
}

function getTypingIndicatorText(personality: TraderPersonality): string {
  const texts = [
    "Typing...",
    "Writing a reply...",
    "Thinking...",
    "Getting back to you...",
  ];
  if (personality.emojiUsage === "heavy") {
    texts.push("💭", "✍️", "🤔");
  }
  return texts[Math.floor(Math.random() * texts.length)];
}

function generateUniqueHistory(trader: TraderProfile, rng: () => number): ChatMessage[] {
  const { personality } = trader;
  const messages: ChatMessage[] = [];
  const now = Date.now();
  const userName = "You";

  const hoursAgo = (h: number) => now - h * 3600000;
  const minsAgo = (m: number) => now - m * 60000;

  const historyCount = Math.floor(rng() * 4) + 3;
  const startHours = Math.floor(rng() * 72) + 1;

  const topics = SESSION_TOPICS.filter(() => rng() > 0.5);
  const topic = topics.length > 0 ? topics[Math.floor(rng() * topics.length)] : "the markets";
  const tournament = TOURNAMENT_MENTIONS[Math.floor(rng() * TOURNAMENT_MENTIONS.length)];

  const historyTemplates: Array<{ them: string; me: string; delayMins: number }> = [
    {
      them: `Hey! Caught that move on ${topic} earlier?`,
      me: "Yeah saw it, looked clean",
      delayMins: 2 + Math.floor(rng() * 5),
    },
    {
      them: `You in ${tournament}?`,
      me: "Thinking about it, you?",
      delayMins: 1 + Math.floor(rng() * 3),
    },
    {
      them: `Just had a nice win on ${topic} 🎯`,
      me: "Nice! How much?",
      delayMins: 1 + Math.floor(rng() * 4),
    },
    {
      them: "Market's been wild today",
      me: "Yeah not gonna lie, staying cautious",
      delayMins: 2 + Math.floor(rng() * 6),
    },
    {
      them: "Good morning! Ready for today?",
      me: "Let's get it 💪",
      delayMins: 3 + Math.floor(rng() * 5),
    },
    {
      them: `That ${topic} setup was textbook`,
      me: "I know right, perfect conditions",
      delayMins: 1 + Math.floor(rng() * 3),
    },
    {
      them: "Took a small L but it's whatever",
      me: "Happens to all of us",
      delayMins: 2 + Math.floor(rng() * 4),
    },
    {
      them: "Have you tried scalping on 1-min?",
      me: "Not yet, might give it a shot",
      delayMins: 1 + Math.floor(rng() * 3),
    },
    {
      them: `Anyone watching ${topic} right now?`,
      me: "Been keeping an eye on it yeah",
      delayMins: 2 + Math.floor(rng() * 4),
    },
    {
      them: `New week, aiming for consistency on ${topic}`,
      me: "That's the goal. GL!",
      delayMins: 1 + Math.floor(rng() * 3),
    },
    {
      them: "What's your risk per trade usually?",
      me: "Around 1-2%, depends on setup",
      delayMins: 2 + Math.floor(rng() * 5),
    },
    {
      them: "Copied a few of your trades, working well so far",
      me: "Glad to hear it! 🙌",
      delayMins: 1 + Math.floor(rng() * 3),
    },
    {
      them: "That dip was scary but held support",
      me: "Classic shakeout before move",
      delayMins: 2 + Math.floor(rng() * 4),
    },
    {
      them: "Tournament's getting competitive this week",
      me: "Yeah the leaderboard is tight",
      delayMins: 1 + Math.floor(rng() * 3),
    },
    {
      them: "Just hit my 10th win in a row 🔥",
      me: "That's insane! Congrats 👏",
      delayMins: 2 + Math.floor(rng() * 4),
    },
    {
      them: `Think ${topic} will break resistance today?`,
      me: "I'm watching it closely, maybe afternoon",
      delayMins: 3 + Math.floor(rng() * 6),
    },
    {
      them: "I'm testing a new strategy on the 5min chart",
      me: "Interesting, let me know how it goes",
      delayMins: 1 + Math.floor(rng() * 4),
    },
    {
      them: "Just had a great webinar on risk management",
      me: "Nice! Any key takeaways?",
      delayMins: 2 + Math.floor(rng() * 5),
    },
    {
      them: "My copy trading profits are looking good this week",
      me: "That's what I like to hear!",
      delayMins: 1 + Math.floor(rng() * 3),
    },
    {
      them: "What indicators do you rely on most?",
      me: "Mostly price action and EMA, simple setup",
      delayMins: 2 + Math.floor(rng() * 4),
    },
    {
      them: `The spread on ${topic} is really good for scalping today`,
      me: "Yeah I noticed that too, juicy",
      delayMins: 1 + Math.floor(rng() * 3),
    },
    {
      them: "Been using the trading journal feature, game changer",
      me: "Right? It helped me spot my mistakes",
      delayMins: 2 + Math.floor(rng() * 5),
    },
    {
      them: "Took a break over the weekend, feeling refreshed",
      me: "Smart move. Mental health matters",
      delayMins: 1 + Math.floor(rng() * 3),
    },
    {
      them: "Voted for your trade on the platform earlier!",
      me: "Appreciate the support! 🙏",
      delayMins: 1 + Math.floor(rng() * 2),
    },
    {
      them: "The weekend tournament format is actually pretty fun",
      me: "Yeah I like the shorter timeframe",
      delayMins: 2 + Math.floor(rng() * 4),
    },
  ];

  const selected: typeof historyTemplates = [];
  const used = new Set<number>();
  for (let i = 0; i < historyCount; i++) {
    let idx: number;
    do {
      idx = Math.floor(rng() * historyTemplates.length);
    } while (used.has(idx) && used.size < historyTemplates.length);
    used.add(idx);
    selected.push(historyTemplates[idx]);
  }

  let cumulativeTime = startHours * 3600000;
  selected.forEach((entry, i) => {
    const themTimestamp = now - cumulativeTime * 1000;
    const meTimestamp = themTimestamp + entry.delayMins * 60000;

    messages.push({
      id: `hist-them-${trader.id}-${i}`,
      text: entry.them,
      sender: "them",
      timestamp: themTimestamp,
      status: "read",
    });

    messages.push({
      id: `hist-me-${trader.id}-${i}`,
      text: entry.me,
      sender: "me",
      timestamp: meTimestamp,
      status: "read",
    });

    cumulativeTime -= (entry.delayMins * 60 + 120 + Math.floor(rng() * 600));
    if (cumulativeTime < 60) cumulativeTime = 120 + Math.floor(rng() * 600);
  });

  messages.sort((a, b) => a.timestamp - b.timestamp);

  const recentGreeting: ChatMessage = {
    id: `greeting-${trader.id}-${now}`,
    text: personality.emojiUsage === "heavy"
      ? `Hey! Good to see you 👋`
      : personality.formality === "professional"
      ? "Hello, how can I help?"
      : "Hey! What's up?",
    sender: "them",
    timestamp: now - 30000,
    status: "read",
  };

  messages.unshift(recentGreeting);

  return messages;
}

function simulateOnlineStatus(profile: TraderProfile, rng: () => number): { isOnline: boolean; lastSeen: number } {
  const hour = new Date().getHours();
  const dayOfWeek = new Date().getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const activeHours = isWeekend ? (hour >= 10 && hour <= 18) : (hour >= 7 && hour <= 23);
  const baseOnlineChance = activeHours ? 0.7 : 0.1;

  const personalityModifier = profile.personality.responseSpeed === "fast" ? 0.15 :
                              profile.personality.responseSpeed === "slow" ? -0.1 : 0;

  const onlineChance = Math.max(0.05, Math.min(0.95, baseOnlineChance + personalityModifier));
  const isOnline = rng() < onlineChance;

  let lastSeen = profile.lastSeen;
  if (!isOnline) {
    const minutesAgo = isWeekend ? Math.floor(rng() * 300) + 10 : Math.floor(rng() * 120) + 2;
    lastSeen = Date.now() - minutesAgo * 60000;
  }

  return { isOnline, lastSeen };
}

export function useChatService(trader: TraderData, userName: string = "You") {
  const [state, setState] = useState<ChatServiceState>(() => {
    const initialProfile = generateTraderProfile(trader);
    const rng = seededRandom(parseInt(trader.id.replace("tr-", "")) || 999);
    const history = generateUniqueHistory(initialProfile, rng);
    const { isOnline, lastSeen } = simulateOnlineStatus(initialProfile, rng);

    return {
      messages: history,
      traderProfile: { ...initialProfile, isOnline, lastSeen },
      chatState: "idle",
      typingText: "",
      unreadCount: 0,
      isFocused: true,
    };
  });

  const pendingTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const proactiveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const statusTimerRef = useRef<NodeJS.Timeout | null>(null);
  const rngRef = useRef(seededRandom(parseInt(trader.id.replace("tr-", "")) || 999));

  const clearTimer = useCallback((key: string) => {
    const timer = pendingTimersRef.current.get(key);
    if (timer) {
      clearTimeout(timer);
      pendingTimersRef.current.delete(key);
    }
  }, []);

  const clearAllTimers = useCallback(() => {
    pendingTimersRef.current.forEach((timer) => clearTimeout(timer));
    pendingTimersRef.current.clear();
    if (proactiveTimerRef.current) clearTimeout(proactiveTimerRef.current);
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setState((prev) => {
        const { isOnline, lastSeen } = simulateOnlineStatus(prev.traderProfile, rngRef.current);
        return {
          ...prev,
          traderProfile: { ...prev.traderProfile, isOnline, lastSeen },
        };
      });
    }, 25000 + Math.floor(rngRef.current() * 20000));
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (state.traderProfile.isOnline && rngRef.current() < state.traderProfile.personality.initiationChance / 8) {
      const delay = getRandomDelay({ min: 20000, max: 180000 });
      proactiveTimerRef.current = setTimeout(() => {
        setState((prev) => {
          if (prev.chatState === "idle" && prev.isFocused && prev.traderProfile.isOnline) {
            const msg = getConversationStarter(toPersonalityFlags(prev.traderProfile.personality));
            const newMsg: ChatMessage = {
              id: `proactive-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              text: msg,
              sender: "them",
              timestamp: Date.now(),
              status: "delivered",
            };
            incrementUnread(trader.id);
            setTimeout(() => {
              setState((s) => ({
                ...s,
                messages: s.messages.map((m) =>
                  m.id === newMsg.id ? { ...m, status: "read" as MessageStatus } : m
                ),
              }));
            }, getRandomDelay(READ_DELAY));
            return {
              ...prev,
              messages: [...prev.messages, newMsg],
              unreadCount: prev.unreadCount + 1,
              chatState: "idle",
            };
          }
          return prev;
        });
      }, delay);
    }
    return () => {
      if (proactiveTimerRef.current) clearTimeout(proactiveTimerRef.current);
    };
  }, [state.traderProfile.personality.initiationChance, state.chatState, state.isFocused, state.traderProfile.isOnline, trader.id]);

  const triggerTraderReply = useCallback((userMessage: string) => {
    setState((prev) => {
      const { personality } = prev.traderProfile;
      const context = detectContext(userMessage, personality);
      const pf = toPersonalityFlags(personality);
      const replyText = getRandomMessage(context, pf);

      const delayRange = MESSAGE_DELAYS[personality.responseSpeed];
      const baseDelay = getRandomDelay(delayRange);
      const typingDuration = getTypingDuration(replyText, personality);
      const typingText = getTypingIndicatorText(personality);

      const totalDelay = baseDelay * (0.6 + Math.random() * 0.8) + typingDuration;

      setTimeout(() => {
        setState((s) => ({
          ...s,
          chatState: "typing",
          typingText,
        }));

        setTimeout(() => {
          setState((s) => {
            const replyMsg: ChatMessage = {
              id: `reply-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              text: replyText,
              sender: "them",
              timestamp: Date.now(),
              status: "delivered",
            };

            setTimeout(() => {
              setState((st) => ({
                ...st,
                messages: st.messages.map((m) =>
                  m.id === replyMsg.id ? { ...m, status: "read" as MessageStatus } : m
                ),
              }));
            }, getRandomDelay(READ_DELAY));

            const followUpTimer = setTimeout(() => {
              if (personality.initiationChance > 0.1 && rngRef.current() < 0.25) {
                setState((st) => {
                  if (st.chatState === "idle") {
                    const followUp = getRandomReaction(pf);
                    const fMsg: ChatMessage = {
                      id: `followup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                      text: followUp,
                      sender: "them",
                      timestamp: Date.now(),
                      status: "delivered",
                    };
                    setTimeout(() => {
                      setState((s2) => ({
                        ...s2,
                        messages: s2.messages.map((m) =>
                          m.id === fMsg.id ? { ...m, status: "read" as MessageStatus } : m
                        ),
                      }));
                    }, getRandomDelay(READ_DELAY));
                    return {
                      ...st,
                      messages: [...st.messages, fMsg],
                    };
                  }
                  return st;
                });
              }
            }, getRandomDelay({ min: 4000, max: 18000 }));
            pendingTimersRef.current.set(`followup-${replyMsg.id}`, followUpTimer);

            return {
              ...s,
              messages: [...s.messages, replyMsg],
              chatState: "idle",
              typingText: "",
            };
          });
        }, typingDuration);
      }, baseDelay * (0.3 + Math.random() * 0.4));

      return {
        ...prev,
        chatState: "awaiting_reply",
      };
    });
  }, []);

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const optimisticId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const optimisticMsg: ChatMessage = {
      id: optimisticId,
      text: trimmed,
      sender: "me",
      timestamp: Date.now(),
      status: "sent",
      isOptimistic: true,
    };

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, optimisticMsg],
    }));

    // WhatsApp-like: immediately mark as read for instant experience
    setTimeout(() => {
      setState((prev) => ({
        ...prev,
        messages: prev.messages.map((m) =>
          m.id === optimisticId ? { ...m, status: "read" as MessageStatus } : m
        ),
      }));
    }, 200);

    triggerTraderReply(trimmed);
  }, [triggerTraderReply]);

  const markAsRead = useCallback((messageIds: string[]) => {
    setState((prev) => ({
      ...prev,
      messages: prev.messages.map((m) =>
        messageIds.includes(m.id) ? { ...m, status: "read" as MessageStatus } : m
      ),
      unreadCount: 0,
    }));
  }, []);

  const setFocus = useCallback((focused: boolean) => {
    setState((prev) => {
      if (focused) {
        clearUnread(trader.id);
        const unreadIds = prev.messages
          .filter((m) => m.sender === "them" && m.status !== "read")
          .map((m) => m.id);
        return {
          ...prev,
          isFocused: true,
          unreadCount: 0,
          messages: prev.messages.map((m) =>
            unreadIds.includes(m.id) ? { ...m, status: "read" as MessageStatus } : m
          ),
        };
      }
      return { ...prev, isFocused: false };
    });
  }, [trader.id]);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  };

  const getOnlineStatusText = () => {
    const { traderProfile } = state;
    if (traderProfile.isOnline) {
      if (state.chatState === "typing") return "Typing...";
      if (state.chatState === "awaiting_reply") return "Online";
      return "Online";
    }
    return formatLastSeen(traderProfile.lastSeen);
  };

  return {
    messages: state.messages,
    traderProfile: state.traderProfile,
    chatState: state.chatState,
    typingText: state.typingText,
    unreadCount: state.unreadCount,
    isFocused: state.isFocused,
    sendMessage,
    markAsRead,
    setFocus,
    formatTime,
    formatDate,
    getOnlineStatusText,
    clearAllTimers,
  };
}

function toPersonalityFlags(personality: TraderPersonality): {
  casual?: boolean; mixed?: boolean; professional?: boolean;
  verbosity: "brief" | "normal" | "verbose";
  emojiUsage: "none" | "light" | "heavy";
} {
  return {
    [personality.formality]: true,
    verbosity: personality.verbosity,
    emojiUsage: personality.emojiUsage,
  };
}

function detectContext(userMessage: string, personality: TraderPersonality): string {
  const lower = userMessage.toLowerCase();

  if (lower.includes("trade") || lower.includes("position") || lower.includes("entry")) return "trade_discussion";
  if (lower.includes("tournament") || lower.includes("compete")) return "tournament";
  if (lower.includes("signal") || lower.includes("copy")) return "signals";
  if (lower.includes("market") || lower.includes("move") || lower.includes("price")) return "market_analysis";
  if (lower.includes("gold") || lower.includes("eur/usd") || lower.includes("gbp/usd") ||
      lower.includes("bitcoin") || lower.includes("btc") || lower.includes("oil") ||
      lower.includes("nasdaq") || lower.includes("crypto")) return "asset_specific";
  if (lower.includes("win") || lower.includes("profit") || lower.includes("gain")) return "celebration";
  if (lower.includes("loss") || lower.includes("lose") || lower.includes("red") || lower.includes("drawdown")) return "support";
  if (lower.includes("thanks") || lower.includes("thank")) return "gratitude";
  if (lower.includes("hi") || lower.includes("hello") || lower.includes("hey") || lower.includes("morning")) return "greeting";
  if (lower.includes("?") || lower.includes("how") || lower.includes("what") || lower.includes("why")) return "question";
  if (lower.includes("strategy") || lower.includes("setup") || lower.includes("pattern") || lower.includes("indicator")) return "strategy";
  if (lower.includes("risk") || lower.includes("management") || lower.includes("stop loss") || lower.includes("position size")) return "risk_management";
  if (lower.includes("psychology") || lower.includes("discipline") || lower.includes("mindset") || lower.includes("emotion")) return "psychology";

  return "general_chat";
}
