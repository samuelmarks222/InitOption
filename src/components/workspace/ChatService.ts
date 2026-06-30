import { useState, useEffect, useCallback, useRef } from "react";
import type { TraderData } from "./WorkspaceLeaderboard";
import type { ChatMessage, MessageStatus, TraderPersonality, TraderProfile } from "./ChatMessages";
import {
  getRandomMessage,
  getRandomReaction,
  getRandomInitiation,
  getConversationStarter,
  type TraderPersonality as TraderPersonalityType,
} from "./ChatMessages";
import { generateTraderProfile, seededRandom } from "./ChatTypes";

export type ChatState = "idle" | "typing" | "awaiting_reply";

export interface ChatServiceState {
  messages: ChatMessage[];
  traderProfile: TraderProfile;
  chatState: ChatState;
  typingText: string;
  unreadCount: number;
  isFocused: boolean;
}

type ChatAction =
  | { type: "ADD_MESSAGE"; payload: ChatMessage }
  | { type: "UPDATE_MESSAGE_STATUS"; payload: { id: string; status: MessageStatus } }
  | { type: "SET_TYPING"; payload: { isTyping: boolean; text?: string } }
  | { type: "SET_CHAT_STATE"; payload: ChatState }
  | { type: "MARK_READ"; payload: string[] }
  | { type: "SET_FOCUS"; payload: boolean }
  | { type: "INCREMENT_UNREAD" }
  | { type: "CLEAR_UNREAD" }
  | { type: "SET_TRADER_ONLINE"; payload: boolean }
  | { type: "UPDATE_LAST_SEEN"; payload: number };

function chatReducer(state: ChatServiceState, action: ChatAction): ChatServiceState {
  switch (action.type) {
    case "ADD_MESSAGE":
      return {
        ...state,
        messages: [...state.messages, action.payload],
        chatState: "idle",
        typingText: "",
        unreadCount: action.payload.sender === "them" && !state.isFocused ? state.unreadCount + 1 : state.unreadCount,
      };
    case "UPDATE_MESSAGE_STATUS":
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.payload.id ? { ...m, status: action.payload.status } : m
        ),
      };
    case "SET_TYPING":
      return {
        ...state,
        chatState: action.payload.isTyping ? "typing" : "idle",
        typingText: action.payload.text || "",
      };
    case "SET_CHAT_STATE":
      return { ...state, chatState: action.payload };
    case "MARK_READ":
      return {
        ...state,
        messages: state.messages.map((m) =>
          action.payload.includes(m.id) ? { ...m, status: "read" as MessageStatus } : m
        ),
        unreadCount: 0,
      };
    case "SET_FOCUS":
      return { ...state, isFocused: action.payload, unreadCount: action.payload ? 0 : state.unreadCount };
    case "INCREMENT_UNREAD":
      return { ...state, unreadCount: state.unreadCount + 1 };
    case "CLEAR_UNREAD":
      return { ...state, unreadCount: 0 };
    case "SET_TRADER_ONLINE":
      return { ...state, traderProfile: { ...state.traderProfile, isOnline: action.payload } };
    case "UPDATE_LAST_SEEN":
      return { ...state, traderProfile: { ...state.traderProfile, lastSeen: action.payload } };
    default:
      return state;
  }
}

const MESSAGE_DELAYS = {
  fast: { min: 1500, max: 4000 },
  normal: { min: 3000, max: 10000 },
  slow: { min: 8000, max: 25000 },
};

const TYPING_DURATION = {
  brief: { min: 1000, max: 2500 },
  normal: { min: 2000, max: 5000 },
  verbose: { min: 4000, max: 10000 },
};

const READ_DELAY = { min: 500, max: 2000 };

function getRandomDelay(range: { min: number; max: number }): number {
  return range.min + Math.random() * (range.max - range.min);
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

function getTypingIndicatorText(personality: TraderPersonalityType): string {
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

function generateInitialMessages(trader: TraderProfile, userName: string = "You"): ChatMessage[] {
  const { personality } = trader;
  const messages: ChatMessage[] = [];
  const now = Date.now();
  
  const greeting = personality.emojiUsage === "heavy" 
    ? `Hey! Thanks for reaching out 👋`
    : "Hey! Thanks for reaching out";
  
  messages.push({
    id: `init-${now}-1`,
    text: greeting,
    sender: "them",
    timestamp: now - 120000,
    status: "read",
  });

  const followUp = personality.formality === "casual" 
    ? "What's up?"
    : personality.formality === "professional"
    ? "How can I help you today?"
    : "How are you?";
  
  messages.push({
    id: `init-${now}-2`,
    text: followUp,
    sender: "them",
    timestamp: now - 60000,
    status: "read",
  });

  return messages;
}

function simulateOnlineStatus(profile: TraderProfile): { isOnline: boolean; lastSeen: number } {
  const rng = seededRandom(parseInt(profile.id.replace("tr-", "")) || 999);
  const hour = new Date().getHours();
  
  const isActiveHours = hour >= 8 && hour <= 23;
  const baseOnlineChance = isActiveHours ? 0.75 : 0.15;
  const personalityModifier = profile.personality.responseSpeed === "fast" ? 0.1 : 
                              profile.personality.responseSpeed === "slow" ? -0.1 : 0;
  
  const onlineChance = Math.max(0.05, Math.min(0.95, baseOnlineChance + personalityModifier));
  const isOnline = rng() < onlineChance;
  
  let lastSeen = profile.lastSeen;
  if (!isOnline) {
    const minutesAgo = Math.floor(rng() * 120) + 5;
    lastSeen = Date.now() - minutesAgo * 60000;
  }
  
  return { isOnline, lastSeen };
}

export function useChatService(trader: TraderData, userName: string = "You") {
  const [state, dispatch] = useState<ChatServiceState>(() => {
    const initialProfile = generateTraderProfile(trader);
    const initialMessages = generateInitialMessages(initialProfile, userName);
    const { isOnline, lastSeen } = simulateOnlineStatus(initialProfile);
    
    return {
      messages: initialMessages,
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
      const { isOnline, lastSeen } = simulateOnlineStatus(state.traderProfile);
      dispatch({ type: "SET_TRADER_ONLINE", payload: isOnline });
      dispatch({ type: "UPDATE_LAST_SEEN", payload: lastSeen });
    }, 30000);
    return () => clearInterval(timer);
  }, [state.traderProfile]);

  useEffect(() => {
    if (state.traderProfile.isOnline && rngRef.current() < state.traderProfile.personality.initiationChance / 10) {
      const delay = getRandomDelay({ min: 30000, max: 180000 });
      proactiveTimerRef.current = setTimeout(() => {
        if (state.chatState === "idle" && state.isFocused) {
          const msg = getConversationStarter(state.traderProfile.personality);
          sendTraderMessage(msg);
        }
      }, delay);
    }
    return () => {
      if (proactiveTimerRef.current) clearTimeout(proactiveTimerRef.current);
    };
  }, [state.traderProfile.personality.initiationChance, state.chatState, state.isFocused]);

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const optimisticId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const optimisticMsg: ChatMessage = {
      id: optimisticId,
      text: trimmed,
      sender: "me",
      timestamp: Date.now(),
      status: "sending",
      isOptimistic: true,
    };

    dispatch({ type: "ADD_MESSAGE", payload: optimisticMsg });

    const sentTimer = setTimeout(() => {
      dispatch({ type: "UPDATE_MESSAGE_STATUS", payload: { id: optimisticId, status: "sent" } });
      
      const deliveredTimer = setTimeout(() => {
        dispatch({ type: "UPDATE_MESSAGE_STATUS", payload: { id: optimisticId, status: "delivered" } });
      }, getRandomDelay({ min: 200, max: 800 }));
      pendingTimersRef.current.set(`delivered-${optimisticId}`, deliveredTimer);
    }, getRandomDelay({ min: 100, max: 500 }));
    pendingTimersRef.current.set(`sent-${optimisticId}`, sentTimer);

    const readTimer = setTimeout(() => {
      dispatch({ type: "UPDATE_MESSAGE_STATUS", payload: { id: optimisticId, status: "read" } });
    }, getRandomDelay(READ_DELAY));
    pendingTimersRef.current.set(`read-${optimisticId}`, readTimer);

    triggerTraderReply(trimmed);
  }, []);

  const triggerTraderReply = useCallback((userMessage: string) => {
    const { personality } = state.traderProfile;
    const delayRange = MESSAGE_DELAYS[personality.responseSpeed];
    const replyDelay = getRandomDelay(delayRange);
    
    const typingDurationRange = TYPING_DURATION[personality.verbosity];
    const typingDuration = getRandomDelay(typingDurationRange);
    const typingText = getTypingIndicatorText(personality);

    dispatch({ type: "SET_TYPING", payload: { isTyping: true, text: typingText } });
    dispatch({ type: "SET_CHAT_STATE", payload: "typing" });

    const typingTimer = setTimeout(() => {
      dispatch({ type: "SET_TYPING", payload: { isTyping: false } });
      
      const context = detectContext(userMessage, personality);
      const replyText = getRandomMessage(context, personality);
      
      const replyMsg: ChatMessage = {
        id: `reply-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: replyText,
        sender: "them",
        timestamp: Date.now(),
        status: "delivered",
      };
      
      dispatch({ type: "ADD_MESSAGE", payload: replyMsg });
      
      setTimeout(() => {
        dispatch({ type: "UPDATE_MESSAGE_STATUS", payload: { id: replyMsg.id, status: "read" } });
      }, getRandomDelay(READ_DELAY));
      
      if (personality.initiationChance > 0.1 && rngRef.current() < 0.3) {
        const followUpDelay = getRandomDelay({ min: 5000, max: 15000 });
        setTimeout(() => {
          if (state.chatState === "idle") {
            const followUp = getRandomReaction(personality);
            const followUpMsg: ChatMessage = {
              id: `followup-${Date.now()}`,
              text: followUp,
              sender: "them",
              timestamp: Date.now(),
              status: "delivered",
            };
            dispatch({ type: "ADD_MESSAGE", payload: followUpMsg });
          }
        }, followUpDelay);
      }
    }, replyDelay + typingDuration);

    pendingTimersRef.current.set(`reply-${Date.now()}`, typingTimer);
  }, [state.traderProfile, state.chatState]);

  const sendTraderMessage = useCallback((text: string) => {
    const msg: ChatMessage = {
      id: `proactive-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text,
      sender: "them",
      timestamp: Date.now(),
      status: "delivered",
    };
    dispatch({ type: "ADD_MESSAGE", payload: msg });
    
    setTimeout(() => {
      dispatch({ type: "UPDATE_MESSAGE_STATUS", payload: { id: msg.id, status: "read" } });
    }, getRandomDelay(READ_DELAY));
  }, []);

  const markAsRead = useCallback((messageIds: string[]) => {
    dispatch({ type: "MARK_READ", payload: messageIds });
  }, []);

  const setFocus = useCallback((focused: boolean) => {
    dispatch({ type: "SET_FOCUS", payload: focused });
    if (focused) {
      const unreadIds = state.messages
        .filter((m) => m.sender === "them" && m.status !== "read")
        .map((m) => m.id);
      if (unreadIds.length > 0) {
        markAsRead(unreadIds);
      }
    }
  }, [state.messages, markAsRead]);

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

function detectContext(userMessage: string, personality: TraderPersonalityType): string {
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

const TRADER_MESSAGE_LIBRARY = {
  greeting: [
    { text: "Hey there! 👋", context: "greeting", personality: ["casual", "mixed"], verbosity: ["brief"], emojiUsage: ["light", "heavy"] },
    { text: "Hi! How's it going?", context: "greeting", personality: ["casual", "mixed"], verbosity: ["brief", "normal"], emojiUsage: ["none", "light"] },
    { text: "Hello! Nice to hear from you.", context: "greeting", personality: ["professional", "mixed"], verbosity: ["normal"], emojiUsage: ["none"] },
    { text: "Hey! What's up?", context: "greeting", personality: ["casual"], verbosity: ["brief"], emojiUsage: ["light"] },
  ],
  trade_discussion: [
    { text: "Nice entry on that one! What was your reasoning?", context: "trade_discussion", personality: ["casual", "mixed"], verbosity: ["normal"], emojiUsage: ["light"] },
    { text: "I saw that setup too. Clean breakout 👌", context: "trade_discussion", personality: ["casual", "mixed"], verbosity: ["brief", "normal"], emojiUsage: ["heavy"] },
    { text: "Good catch. Risk/reward looked solid.", context: "trade_discussion", personality: ["professional", "mixed"], verbosity: ["brief", "normal"], emojiUsage: ["none"] },
    { text: "That's a textbook pattern right there", context: "trade_discussion", personality: ["mixed", "professional"], verbosity: ["brief"], emojiUsage: ["none"] },
  ],
  tournament: [
    { text: "You in the tournament today? 🏆", context: "tournament", personality: ["casual", "mixed"], verbosity: ["brief"], emojiUsage: ["light", "heavy"] },
    { text: "Tournament's looking competitive this week", context: "tournament", personality: ["mixed", "professional"], verbosity: ["normal"], emojiUsage: ["none"] },
    { text: "I'm sitting out this one, focusing on my regular trades", context: "tournament", personality: ["mixed", "professional"], verbosity: ["normal", "verbose"], emojiUsage: ["none", "light"] },
    { text: "Good luck if you're playing! 🍀", context: "tournament", personality: ["casual", "mixed"], verbosity: ["brief"], emojiUsage: ["heavy"] },
  ],
  signals: [
    { text: "Been following the signals channel? Some good ones lately", context: "signals", personality: ["casual", "mixed"], verbosity: ["normal"], emojiUsage: ["light"] },
    { text: "I copy a few traders, helps diversify", context: "signals", personality: ["mixed", "professional"], verbosity: ["brief", "normal"], emojiUsage: ["none"] },
    { text: "Signals are hit or miss, I prefer my own analysis", context: "signals", personality: ["professional", "mixed"], verbosity: ["normal", "verbose"], emojiUsage: ["none"] },
  ],
  market_analysis: [
    { text: "Market's been choppy lately, hard to catch a trend", context: "market_analysis", personality: ["casual", "mixed"], verbosity: ["normal"], emojiUsage: ["light"] },
    { text: "Waiting for a clear direction before committing", context: "market_analysis", personality: ["mixed", "professional"], verbosity: ["brief", "normal"], emojiUsage: ["none"] },
    { text: "Volatility's picked up, finally some movement", context: "market_analysis", personality: ["casual", "mixed"], verbosity: ["brief"], emojiUsage: ["light"] },
    { text: "Range-bound for days now. Breakout soon? 🤔", context: "market_analysis", personality: ["casual", "mixed"], verbosity: ["brief"], emojiUsage: ["heavy"] },
  ],
  asset_specific: [
    { text: "Gold's been respecting that support level nicely", context: "asset_specific", personality: ["mixed", "professional"], verbosity: ["normal"], emojiUsage: ["none"] },
    { text: "EUR/USD looking bullish on the daily", context: "asset_specific", personality: ["mixed", "professional"], verbosity: ["brief"], emojiUsage: ["none"] },
    { text: "Bitcoin's correlation with tech stocks is interesting rn", context: "asset_specific", personality: ["professional", "mixed"], verbosity: ["normal", "verbose"], emojiUsage: ["none", "light"] },
    { text: "Oil's supply/demand dynamics shifting", context: "asset_specific", personality: ["professional"], verbosity: ["verbose"], emojiUsage: ["none"] },
  ],
  celebration: [
    { text: "Great trade! 🎉", context: "celebration", personality: ["casual", "mixed"], verbosity: ["brief"], emojiUsage: ["heavy"] },
    { text: "Nice profit! Keep it up 💪", context: "celebration", personality: ["casual", "mixed"], verbosity: ["brief"], emojiUsage: ["heavy"] },
    { text: "That's what I like to see. Consistent execution.", context: "celebration", personality: ["professional", "mixed"], verbosity: ["brief", "normal"], emojiUsage: ["none"] },
    { text: "Winning streak! 🔥", context: "celebration", personality: ["casual"], verbosity: ["brief"], emojiUsage: ["heavy"] },
  ],
  support: [
    { text: "Don't worry about it, happens to everyone 😅", context: "support", personality: ["casual", "mixed"], verbosity: ["brief", "normal"], emojiUsage: ["light", "heavy"] },
    { text: "Losses are part of the game. How's your risk management?", context: "support", personality: ["professional", "mixed"], verbosity: ["normal"], emojiUsage: ["none"] },
    { text: "Shake it off. Next trade's a fresh start.", context: "support", personality: ["casual", "mixed"], verbosity: ["brief"], emojiUsage: ["light"] },
    { text: "Review the setup, learn from it, move on", context: "support", personality: ["professional"], verbosity: ["brief", "normal"], emojiUsage: ["none"] },
  ],
  gratitude: [
    { text: "Anytime! 😊", context: "gratitude", personality: ["casual", "mixed"], verbosity: ["brief"], emojiUsage: ["light", "heavy"] },
    { text: "Happy to help", context: "gratitude", personality: ["mixed", "professional"], verbosity: ["brief"], emojiUsage: ["none"] },
    { text: "No problem at all!", context: "gratitude", personality: ["casual", "mixed"], verbosity: ["brief"], emojiUsage: ["light"] },
  ],
  question: [
    { text: "Good question. Let me think...", context: "question", personality: ["mixed", "professional"], verbosity: ["brief"], emojiUsage: ["light"] },
    { text: "That depends on your timeframe and risk tolerance", context: "question", personality: ["professional", "mixed"], verbosity: ["normal", "verbose"], emojiUsage: ["none"] },
    { text: "I'd look at the higher timeframe first for context", context: "question", personality: ["professional", "mixed"], verbosity: ["normal"], emojiUsage: ["none"] },
  ],
  strategy: [
    { text: "I keep it simple: trend + pullback + trigger", context: "strategy", personality: ["mixed", "professional"], verbosity: ["normal"], emojiUsage: ["none"] },
    { text: "Price action mostly. Clean charts, clear levels", context: "strategy", personality: ["professional", "mixed"], verbosity: ["brief", "normal"], emojiUsage: ["none"] },
    { text: "Been testing a mean reversion strategy on 5m lately", context: "strategy", personality: ["casual", "mixed"], verbosity: ["normal", "verbose"], emojiUsage: ["light"] },
  ],
  risk_management: [
    { text: "Never risk more than 1-2% per trade. Non-negotiable.", context: "risk_management", personality: ["professional", "mixed"], verbosity: ["normal"], emojiUsage: ["none"] },
    { text: "Position sizing is everything. Get that right and the rest follows", context: "risk_management", personality: ["professional", "mixed"], verbosity: ["normal", "verbose"], emojiUsage: ["none"] },
    { text: "I use a fixed fractional approach. Works for me", context: "risk_management", personality: ["mixed", "professional"], verbosity: ["brief", "normal"], emojiUsage: ["none"] },
  ],
  psychology: [
    { text: "Discipline > strategy. Can't trade what you don't follow", context: "psychology", personality: ["professional", "mixed"], verbosity: ["normal"], emojiUsage: ["none"] },
    { text: "The mental game is 80% of it 🧠", context: "psychology", personality: ["casual", "mixed"], verbosity: ["brief"], emojiUsage: ["heavy"] },
    { text: "Journaling changed everything for me. Highly recommend", context: "psychology", personality: ["mixed", "professional"], verbosity: ["normal", "verbose"], emojiUsage: ["light"] },
  ],
  general_chat: [
    { text: "Yeah, makes sense", context: "general_chat", personality: ["casual", "mixed"], verbosity: ["brief"], emojiUsage: ["none", "light"] },
    { text: "True that", context: "general_chat", personality: ["casual"], verbosity: ["brief"], emojiUsage: ["none"] },
    { text: "Interesting perspective", context: "general_chat", personality: ["professional", "mixed"], verbosity: ["brief"], emojiUsage: ["none"] },
    { text: "I see what you mean", context: "general_chat", personality: ["mixed"], verbosity: ["brief"], emojiUsage: ["none"] },
    { text: "Hmm, hadn't thought of that", context: "general_chat", personality: ["mixed", "casual"], verbosity: ["brief"], emojiUsage: ["light"] },
  ],
};

const TRADER_REACTION_MESSAGES = [
  { text: "Exactly 👍", context: "reaction_agreement", personality: ["casual", "mixed"], verbosity: ["brief"], emojiUsage: ["light", "heavy"] },
  { text: "Couldn't agree more", context: "reaction_agreement", personality: ["mixed", "professional"], verbosity: ["brief"], emojiUsage: ["none"] },
  { text: "That's the way", context: "reaction_agreement", personality: ["casual", "mixed"], verbosity: ["brief"], emojiUsage: ["light"] },
  { text: "💯", context: "reaction_agreement", personality: ["casual"], verbosity: ["brief"], emojiUsage: ["heavy"] },
  { text: "Solid point", context: "reaction_agreement", personality: ["mixed", "professional"], verbosity: ["brief"], emojiUsage: ["none"] },
  { text: "Learned something new today", context: "reaction_learning", personality: ["casual", "mixed"], verbosity: ["brief"], emojiUsage: ["light"] },
  { text: "Good to know, thanks", context: "reaction_learning", personality: ["mixed", "professional"], verbosity: ["brief"], emojiUsage: ["none"] },
  { text: "Makes sense when you put it like that", context: "reaction_understanding", personality: ["casual", "mixed"], verbosity: ["brief", "normal"], emojiUsage: ["light"] },
  { text: "🤔", context: "reaction_thinking", personality: ["casual"], verbosity: ["brief"], emojiUsage: ["heavy"] },
  { text: "Hmm, interesting", context: "reaction_interesting", personality: ["mixed", "professional"], verbosity: ["brief"], emojiUsage: ["none", "light"] },
];

const TRADER_INITIATION_MESSAGES = [
  { text: "Morning! How's the market treating you?", context: "morning_greeting", personality: ["casual", "mixed"], verbosity: ["brief", "normal"], emojiUsage: ["light"] },
  { text: "Hey, saw your trade on EUR/USD. Nice entry! 👏", context: "trade_compliment", personality: ["casual", "mixed"], verbosity: ["brief", "normal"], emojiUsage: ["heavy"] },
  { text: "You trading the tournament today?", context: "tournament_invite", personality: ["casual", "mixed"], verbosity: ["brief"], emojiUsage: ["none", "light"] },
  { text: "Gold looking interesting on the 15min rn", context: "setup_sharing", personality: ["mixed", "professional"], verbosity: ["brief", "normal"], emojiUsage: ["none", "light"] },
  { text: "What's your take on the USD strength lately?", context: "market_opinion", personality: ["mixed", "professional"], verbosity: ["normal"], emojiUsage: ["none"] },
  { text: "Just wanted to say - your win rate is impressive 📊", context: "stats_compliment", personality: ["casual", "mixed", "professional"], verbosity: ["brief", "normal"], emojiUsage: ["light"] },
  { text: "Anyone else seeing that divergence on GBP/USD?", context: "technical_question", personality: ["mixed", "professional"], verbosity: ["brief", "normal"], emojiUsage: ["none"] },
  { text: "Hope your week's going well! 👋", context: "casual_greeting", personality: ["casual", "mixed", "professional"], verbosity: ["brief"], emojiUsage: ["light"] },
];

const CONVERSATION_STARTERS = [
  { context: "market_open", weight: 0.3, messages: ["Market just opened, what are we watching?", "London open in 10, ready?", "Asian session was quiet, hoping for volatility"] },
  { context: "tournament_reminder", weight: 0.2, messages: ["Tournament starts in 30 min!", "Don't forget the weekly tournament today", "Prize pool is $50k this week 💰"] },
  { context: "major_news", weight: 0.15, messages: ["NFP in 15 min, staying out", "CPI data just dropped, watching reaction", "Fed speakers later, expect choppiness"] },
  { context: "check_in", weight: 0.25, messages: ["How's the week going?", "Still copying my trades? 😄", "Seen any good setups today?"] },
  { context: "milestone_share", weight: 0.1, messages: ["Hit 100 followers today! 🎉", "First profitable month in a while", "Finally positive expectancy on my journal"] },
];