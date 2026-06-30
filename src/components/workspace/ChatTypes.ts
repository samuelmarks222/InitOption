import { type TraderData } from "./WorkspaceLeaderboard";

export type MessageStatus = "sending" | "sent" | "delivered" | "read";

export interface ChatMessage {
  id: string;
  text: string;
  sender: "me" | "them";
  timestamp: number;
  status?: MessageStatus;
  isOptimistic?: boolean;
}

export interface TraderPersonality {
  responseSpeed: "fast" | "normal" | "slow";
  verbosity: "brief" | "normal" | "verbose";
  formality: "casual" | "mixed" | "professional";
  emojiUsage: "none" | "light" | "heavy";
  topics: string[];
  initiationChance: number;
  expertise: "beginner" | "intermediate" | "expert";
}

export interface TraderProfile {
  id: string;
  name: string;
  flagUrl: string;
  personality: TraderPersonality;
  lastSeen: number;
  isOnline: boolean;
  unreadCount: number;
  messages: ChatMessage[];
  conversationState: "active" | "idle" | "awaiting_reply";
  lastInteraction: number;
}

const FIRST_NAMES = [
  "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
  "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
  "Thomas", "Sarah", "Christopher", "Karen", "Charles", "Nancy", "Daniel", "Lisa",
  "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley",
  "Steven", "Dorothy", "Paul", "Kimberly", "Andrew", "Emily", "Joshua", "Donna",
  "Kenneth", "Michelle", "Kevin", "Carol", "Brian", "Amanda", "George", "Melissa",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
];

const COUNTRIES = [
  "US", "GB", "CA", "AU", "DE", "FR", "IT", "ES", "NL", "SE", "NO", "DK", "FI",
  "BR", "AR", "MX", "CO", "CL", "ZA", "NG", "KE", "GH", "EG", "MA", "TN", "AE",
  "SA", "IN", "PK", "BD", "JP", "KR", "CN", "TH", "VN", "MY", "SG", "RU", "TR",
  "PL", "CZ", "HU", "RO", "UA", "GR", "PT", "IE", "CH", "AT", "BE", "IL", "PH",
  "ID", "NZ", "PE", "VE",
];

const PERSONALITY_ARCHETYPES: TraderPersonality[] = [
  {
    responseSpeed: "fast",
    verbosity: "brief",
    formality: "casual",
    emojiUsage: "heavy",
    topics: ["quick trades", "scalping", "crypto", "30s expirations"],
    initiationChance: 0.15,
    expertise: "expert",
  },
  {
    responseSpeed: "normal",
    verbosity: "normal",
    formality: "mixed",
    emojiUsage: "light",
    topics: ["swing trading", "technical analysis", "risk management", "EUR/USD"],
    initiationChance: 0.08,
    expertise: "intermediate",
  },
  {
    responseSpeed: "slow",
    verbosity: "verbose",
    formality: "professional",
    emojiUsage: "none",
    topics: ["fundamental analysis", "long-term positions", "gold", "news events"],
    initiationChance: 0.05,
    expertise: "expert",
  },
  {
    responseSpeed: "fast",
    verbosity: "normal",
    formality: "casual",
    emojiUsage: "heavy",
    topics: ["tournaments", "copy trading", "signals", "Bitcoin"],
    initiationChance: 0.12,
    expertise: "intermediate",
  },
  {
    responseSpeed: "normal",
    verbosity: "brief",
    formality: "mixed",
    emojiUsage: "light",
    topics: ["GBP/USD", "breakouts", "support resistance", "5min candles"],
    initiationChance: 0.07,
    expertise: "intermediate",
  },
  {
    responseSpeed: "slow",
    verbosity: "normal",
    formality: "casual",
    emojiUsage: "light",
    topics: ["oil", "commodities", "macro", "weekly expirations"],
    initiationChance: 0.04,
    expertise: "beginner",
  },
  {
    responseSpeed: "fast",
    verbosity: "verbose",
    formality: "casual",
    emojiUsage: "heavy",
    topics: ["NASDAQ", "tech stocks", "earnings", "high volatility"],
    initiationChance: 0.1,
    expertise: "expert",
  },
  {
    responseSpeed: "normal",
    verbosity: "normal",
    formality: "mixed",
    emojiUsage: "none",
    topics: ["risk management", "journaling", "psychology", "discipline"],
    initiationChance: 0.06,
    expertise: "expert",
  },
];

export function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1103515245, s) + 12345) >>> 0;
    return (s & 0x7fffffff) / 0x7fffffff;
  };
}

export function generateTraderProfile(trader: TraderData): TraderProfile {
  const rng = seededRandom(parseInt(trader.id.replace("tr-", "")) || 999);
  const archetype = PERSONALITY_ARCHETYPES[Math.floor(rng() * PERSONALITY_ARCHETYPES.length)];
  
  const personality: TraderPersonality = {
    ...archetype,
    responseSpeed: rng() > 0.7 ? "fast" : rng() > 0.3 ? "normal" : "slow",
    verbosity: rng() > 0.7 ? "verbose" : rng() > 0.3 ? "normal" : "brief",
    formality: rng() > 0.6 ? "casual" : rng() > 0.3 ? "mixed" : "professional",
    emojiUsage: rng() > 0.6 ? "heavy" : rng() > 0.2 ? "light" : "none",
    initiationChance: archetype.initiationChance * (0.5 + rng()),
  };

  return {
    id: trader.id,
    name: trader.name,
    flagUrl: trader.flagUrl,
    personality,
    lastSeen: Date.now() - Math.floor(rng() * 3600000),
    isOnline: rng() > 0.3,
    unreadCount: 0,
    messages: [],
    conversationState: "idle",
    lastInteraction: Date.now(),
  };
}

export function getTraderProfile(trader: TraderData): TraderProfile {
  return generateTraderProfile(trader);
}