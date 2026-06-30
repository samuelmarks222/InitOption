export interface MessageContent {
  text: string;
  tags: string[];
  personality: ("casual" | "mixed" | "professional")[];
  verbosity: ("brief" | "normal" | "verbose")[];
  emojiUsage: ("none" | "light" | "heavy")[];
  context: string;
}

export const TRADER_MESSAGE_LIBRARY: MessageContent[] = [
  {
    text: "Nice trade! 👏",
    tags: ["compliment", "reaction"],
    personality: ["casual", "mixed"],
    verbosity: ["brief"],
    emojiUsage: ["light", "heavy"],
    context: "reacting_to_win",
  },
  {
    text: "That EUR/USD move was clean",
    tags: ["market_commentary", "specific_asset"],
    personality: ["casual", "mixed", "professional"],
    verbosity: ["brief", "normal"],
    emojiUsage: ["none", "light"],
    context: "market_discussion",
  },
  {
    text: "I missed that entry 😅",
    tags: ["missed_opportunity", "self_deprecating"],
    personality: ["casual", "mixed"],
    verbosity: ["brief"],
    emojiUsage: ["light"],
    context: "missed_trade",
  },
  {
    text: "Waiting for the next signal on Gold",
    tags: ["waiting", "specific_asset", "strategy"],
    personality: ["casual", "mixed", "professional"],
    verbosity: ["brief", "normal"],
    emojiUsage: ["none"],
    context: "waiting_for_setup",
  },
  {
    text: "Good luck in today's tournament!",
    tags: ["tournament", "encouragement"],
    personality: ["casual", "mixed", "professional"],
    verbosity: ["brief", "normal"],
    emojiUsage: ["light"],
    context: "tournament_encouragement",
  },
  {
    text: "That was a close one 😅",
    tags: ["close_call", "empathy"],
    personality: ["casual", "mixed"],
    verbosity: ["brief"],
    emojiUsage: ["light", "heavy"],
    context: "close_trade",
  },
  {
    text: "Been watching USD/PHP all morning",
    tags: ["watching", "specific_asset", "session"],
    personality: ["casual", "mixed"],
    verbosity: ["normal"],
    emojiUsage: ["none"],
    context: "market_watch",
  },
  {
    text: "The 1-min expiry on NASDAQ is treating me well today",
    tags: ["strategy", "specific_asset", "expiry", "success"],
    personality: ["casual", "mixed", "professional"],
    verbosity: ["normal", "verbose"],
    emojiUsage: ["none", "light"],
    context: "strategy_sharing",
  },
  {
    text: "Oil setup looking promising on the 5min",
    tags: ["analysis", "specific_asset", "timeframe"],
    personality: ["mixed", "professional"],
    verbosity: ["normal"],
    emojiUsage: ["none"],
    context: "technical_analysis",
  },
  {
    text: "Thanks for the follow! 🙏",
    tags: ["gratitude", "social"],
    personality: ["casual", "mixed"],
    verbosity: ["brief"],
    emojiUsage: ["light"],
    context: "follow_thanks",
  },
  {
    text: "How's your win rate this week?",
    tags: ["question", "performance", "conversation"],
    personality: ["casual", "mixed"],
    verbosity: ["brief", "normal"],
    emojiUsage: ["none"],
    context: "performance_check",
  },
  {
    text: "Just hit a 7 trade win streak 🔥",
    tags: ["achievement", "streak", "excitement"],
    personality: ["casual", "mixed"],
    verbosity: ["brief", "normal"],
    emojiUsage: ["heavy"],
    context: "win_streak",
  },
  {
    text: "Market's choppy today, staying out",
    tags: ["market_condition", "risk_management", "decision"],
    personality: ["casual", "mixed", "professional"],
    verbosity: ["brief", "normal"],
    emojiUsage: ["none"],
    context: "avoiding_market",
  },
  {
    text: "Anyone else seeing that rejection on Gold?",
    tags: ["question", "specific_asset", "technical", "community"],
    personality: ["casual", "mixed"],
    verbosity: ["normal"],
    emojiUsage: ["none", "light"],
    context: "technical_question",
  },
  {
    text: "Congrats on the tournament win! 🏆",
    tags: ["congratulations", "tournament", "achievement"],
    personality: ["casual", "mixed", "professional"],
    verbosity: ["brief", "normal"],
    emojiUsage: ["heavy"],
    context: "tournament_congrats",
  },
  {
    text: "I'm using the 30-sec expiry for scalping EUR/USD",
    tags: ["strategy", "specific_asset", "expiry", "sharing"],
    personality: ["mixed", "professional"],
    verbosity: ["normal", "verbose"],
    emojiUsage: ["none"],
    context: "strategy_detail",
  },
  {
    text: "Lost 3 in a row, taking a break ☕",
    tags: ["loss_streak", "risk_management", "break"],
    personality: ["casual", "mixed"],
    verbosity: ["brief", "normal"],
    emojiUsage: ["light"],
    context: "loss_streak_break",
  },
  {
    text: "The London open is usually where I make my best trades",
    tags: ["session", "strategy", "preference"],
    personality: ["mixed", "professional"],
    verbosity: ["normal", "verbose"],
    emojiUsage: ["none"],
    context: "session_preference",
  },
  {
    text: "Risk management saved me today",
    tags: ["risk_management", "reflection", "lesson"],
    personality: ["mixed", "professional"],
    verbosity: ["brief", "normal"],
    emojiUsage: ["none"],
    context: "risk_management_lesson",
  },
  {
    text: "What's your take on Bitcoin right now?",
    tags: ["question", "specific_asset", "opinion", "crypto"],
    personality: ["casual", "mixed"],
    verbosity: ["brief", "normal"],
    emojiUsage: ["none", "light"],
    context: "opinion_request",
  },
  {
    text: "Finally back in profit for the week ✅",
    tags: ["milestone", "profit", "relief"],
    personality: ["casual", "mixed", "professional"],
    verbosity: ["brief", "normal"],
    emojiUsage: ["light", "heavy"],
    context: "weekly_profit",
  },
  {
    text: "That wick took out my stop 😤",
    tags: ["frustration", "stop_loss", "market_mechanics"],
    personality: ["casual", "mixed"],
    verbosity: ["brief"],
    emojiUsage: ["heavy"],
    context: "stop_hunt",
  },
  {
    text: "Patience is key in this game",
    tags: ["wisdom", "mindset", "advice"],
    personality: ["mixed", "professional"],
    verbosity: ["brief", "normal"],
    emojiUsage: ["none"],
    context: "trading_wisdom",
  },
  {
    text: "GBP/JPY looking juicy for a reversal",
    tags: ["analysis", "specific_asset", "setup"],
    personality: ["mixed", "professional"],
    verbosity: ["normal"],
    emojiUsage: ["none", "light"],
    context: "setup_sharing",
  },
  {
    text: "How do you handle the psychological side?",
    tags: ["question", "psychology", "deep", "conversation"],
    personality: ["mixed", "professional"],
    verbosity: ["normal", "verbose"],
    emojiUsage: ["none"],
    context: "psychology_discussion",
  },
  {
    text: "Just closed all positions, calling it a day",
    tags: ["session_end", "discipline", "routine"],
    personality: ["casual", "mixed", "professional"],
    verbosity: ["brief", "normal"],
    emojiUsage: ["none", "light"],
    context: "end_of_day",
  },
  {
    text: "The 5-min chart on EUR/USD is respecting that trendline perfectly",
    tags: ["technical", "specific_asset", "timeframe", "analysis"],
    personality: ["mixed", "professional"],
    verbosity: ["normal", "verbose"],
    emojiUsage: ["none"],
    context: "technical_detail",
  },
  {
    text: "Copy trading saved my account this month ngl 😂",
    tags: ["copy_trading", "honesty", "humor", "results"],
    personality: ["casual", "mixed"],
    verbosity: ["normal"],
    emojiUsage: ["heavy"],
    context: "copy_trading_praise",
  },
  {
    text: "New week, new opportunities 💪",
    tags: ["motivation", "weekly", "mindset"],
    personality: ["casual", "mixed"],
    verbosity: ["brief"],
    emojiUsage: ["heavy"],
    context: "weekly_motivation",
  },
  {
    text: "That news spike on NFP caught me off guard",
    tags: ["news", "event", "surprise", "fundamentals"],
    personality: ["casual", "mixed", "professional"],
    verbosity: ["normal"],
    emojiUsage: ["none", "light"],
    context: "news_event",
  },
  {
    text: "Sticking to my rules today. No revenge trades.",
    tags: ["discipline", "rules", "mindset", "commitment"],
    personality: ["mixed", "professional"],
    verbosity: ["brief", "normal"],
    emojiUsage: ["none"],
    context: "discipline_commitment",
  },
  {
    text: "Anyone trading the Asian session?",
    tags: ["session", "question", "community", "timezone"],
    personality: ["casual", "mixed"],
    verbosity: ["brief"],
    emojiUsage: ["none", "light"],
    context: "session_check",
  },
  {
    text: "My avg win is finally > avg loss 📈",
    tags: ["milestone", "risk_reward", "improvement", "metrics"],
    personality: ["mixed", "professional"],
    verbosity: ["brief", "normal"],
    emojiUsage: ["light", "heavy"],
    context: "risk_reward_milestone",
  },
  {
    text: "The tournament prize pool this week is crazy 💰",
    tags: ["tournament", "prize", "excitement"],
    personality: ["casual", "mixed"],
    verbosity: ["brief", "normal"],
    emojiUsage: ["heavy"],
    context: "tournament_prize",
  },
  {
    text: "Pro tip: don't trade during major news unless you have a plan",
    tags: ["advice", "news", "risk_management", "education"],
    personality: ["mixed", "professional"],
    verbosity: ["normal", "verbose"],
    emojiUsage: ["none", "light"],
    context: "educational_tip",
  },
  {
    text: "Finally figured out my edge on Gold",
    tags: ["breakthrough", "specific_asset", "edge", "confidence"],
    personality: ["casual", "mixed", "professional"],
    verbosity: ["normal", "verbose"],
    emojiUsage: ["light", "heavy"],
    context: "edge_discovery",
  },
  {
    text: "Rough morning, but afternoon session recovered it",
    tags: ["recovery", "session", "resilience", "daily_summary"],
    personality: ["casual", "mixed", "professional"],
    verbosity: ["normal"],
    emojiUsage: ["none", "light"],
    context: "session_recovery",
  },
  {
    text: "What timeframe do you primarily trade?",
    tags: ["question", "timeframe", "preference", "getting_to_know"],
    personality: ["casual", "mixed", "professional"],
    verbosity: ["brief", "normal"],
    emojiUsage: ["none"],
    context: "timeframe_question",
  },
  {
    text: "Just hit my daily target, shutting down the charts 🎯",
    tags: ["target_hit", "discipline", "session_end", "success"],
    personality: ["casual", "mixed", "professional"],
    verbosity: ["brief", "normal"],
    emojiUsage: ["heavy"],
    context: "daily_target_hit",
  },
];

export const TRADER_REACTION_MESSAGES: MessageContent[] = [
  { text: "👍", tags: ["reaction", "acknowledgment"], personality: ["casual", "mixed", "professional"], verbosity: ["brief"], emojiUsage: ["heavy"], context: "reaction_acknowledge" },
  { text: "Nice 👌", tags: ["reaction", "approval"], personality: ["casual", "mixed"], verbosity: ["brief"], emojiUsage: ["heavy"], context: "reaction_approval" },
  { text: "Solid 💪", tags: ["reaction", "approval"], personality: ["casual", "mixed"], verbosity: ["brief"], emojiUsage: ["heavy"], context: "reaction_approval" },
  { text: "🔥🔥🔥", tags: ["reaction", "excitement"], personality: ["casual", "mixed"], verbosity: ["brief"], emojiUsage: ["heavy"], context: "reaction_excitement" },
  { text: "Got it", tags: ["reaction", "acknowledgment"], personality: ["professional", "mixed"], verbosity: ["brief"], emojiUsage: ["none"], context: "reaction_acknowledge" },
  { text: "Thanks!", tags: ["reaction", "gratitude"], personality: ["casual", "mixed", "professional"], verbosity: ["brief"], emojiUsage: ["light"], context: "reaction_thanks" },
  { text: "Exactly", tags: ["reaction", "agreement"], personality: ["casual", "mixed", "professional"], verbosity: ["brief"], emojiUsage: ["none"], context: "reaction_agreement" },
  { text: "True that", tags: ["reaction", "agreement"], personality: ["casual", "mixed"], verbosity: ["brief"], emojiUsage: ["none"], context: "reaction_agreement" },
];

export const TRADER_INITIATION_MESSAGES: MessageContent[] = [
  { text: "Morning! How's the market treating you?", tags: ["greeting", "question", "market_check"], personality: ["casual", "mixed"], verbosity: ["brief", "normal"], emojiUsage: ["light"], context: "morning_greeting" },
  { text: "Hey, saw your trade on EUR/USD. Nice entry! 👏", tags: ["compliment", "specific_asset", "observation"], personality: ["casual", "mixed"], verbosity: ["brief", "normal"], emojiUsage: ["heavy"], context: "trade_compliment" },
  { text: "You trading the tournament today?", tags: ["question", "tournament", "invitation"], personality: ["casual", "mixed"], verbosity: ["brief"], emojiUsage: ["none", "light"], context: "tournament_invite" },
  { text: "Gold looking interesting on the 15min rn", tags: ["observation", "specific_asset", "timeframe", "sharing"], personality: ["mixed", "professional"], verbosity: ["brief", "normal"], emojiUsage: ["none", "light"], context: "setup_sharing" },
  { text: "What's your take on the USD strength lately?", tags: ["question", "market_analysis", "opinion"], personality: ["mixed", "professional"], verbosity: ["normal"], emojiUsage: ["none"], context: "market_opinion" },
  { text: "Just wanted to say - your win rate is impressive 📊", tags: ["compliment", "stats", "observation"], personality: ["casual", "mixed", "professional"], verbosity: ["brief", "normal"], emojiUsage: ["light"], context: "stats_compliment" },
  { text: "Anyone else seeing that divergence on GBP/USD?", tags: ["question", "technical", "specific_asset", "community"], personality: ["mixed", "professional"], verbosity: ["brief", "normal"], emojiUsage: ["none"], context: "technical_question" },
  { text: "Hope your week's going well! 👋", tags: ["greeting", "well_wishes"], personality: ["casual", "mixed", "professional"], verbosity: ["brief"], emojiUsage: ["light"], context: "casual_greeting" },
];

export function getMessagesForContext(
  context: string,
  personality: { casual?: boolean; mixed?: boolean; professional?: boolean; verbosity: "brief" | "normal" | "verbose"; emojiUsage: "none" | "light" | "heavy" }
): MessageContent[] {
  return TRADER_MESSAGE_LIBRARY.filter((msg) => 
    msg.context === context &&
    msg.personality.some((p) => personality[p as keyof typeof personality]) &&
    msg.verbosity.includes(personality.verbosity) &&
    msg.emojiUsage.includes(personality.emojiUsage)
  );
}

export function getRandomMessage(
  context: string,
  personality: { casual?: boolean; mixed?: boolean; professional?: boolean; verbosity: "brief" | "normal" | "verbose"; emojiUsage: "none" | "light" | "heavy" }
): string {
  const candidates = getMessagesForContext(context, personality);
  if (candidates.length === 0) {
    const fallbacks = TRADER_MESSAGE_LIBRARY.filter((m) => 
      m.personality.some((p) => personality[p as keyof typeof personality])
    );
    return fallbacks[Math.floor(Math.random() * fallbacks.length)].text;
  }
  return candidates[Math.floor(Math.random() * candidates.length)].text;
}

export function getRandomReaction(personality: { casual?: boolean; mixed?: boolean; professional?: boolean; emojiUsage: "none" | "light" | "heavy" }): string {
  const candidates = TRADER_REACTION_MESSAGES.filter((m) =>
    m.personality.some((p) => personality[p as keyof typeof personality]) &&
    m.emojiUsage.includes(personality.emojiUsage)
  );
  return candidates[Math.floor(Math.random() * candidates.length)].text;
}

export function getRandomInitiation(personality: { casual?: boolean; mixed?: boolean; professional?: boolean; emojiUsage: "none" | "light" | "heavy" }): string {
  const candidates = TRADER_INITIATION_MESSAGES.filter((m) =>
    m.personality.some((p) => personality[p as keyof typeof personality]) &&
    m.emojiUsage.includes(personality.emojiUsage)
  );
  return candidates[Math.floor(Math.random() * candidates.length)].text;
}

export const CONVERSATION_STARTERS = [
  { context: "market_open", weight: 0.3, messages: ["Market just opened, what are we watching?", "London open in 10, ready?", "Asian session was quiet, hoping for volatility"] },
  { context: "tournament_reminder", weight: 0.2, messages: ["Tournament starts in 30 min!", "Don't forget the weekly tournament today", "Prize pool is $50k this week 💰"] },
  { context: "major_news", weight: 0.15, messages: ["NFP in 15 min, staying out", "CPI data just dropped, watching reaction", "Fed speakers later, expect choppiness"] },
  { context: "check_in", weight: 0.25, messages: ["How's the week going?", "Still copying my trades? 😄", "Seen any good setups today?"] },
  { context: "milestone_share", weight: 0.1, messages: ["Hit 100 followers today! 🎉", "First profitable month in a while", "Finally positive expectancy on my journal"] },
];

export function getConversationStarter(personality: { casual?: boolean; mixed?: boolean; professional?: boolean; emojiUsage: "none" | "light" | "heavy" }): string {
  const starter = CONVERSATION_STARTERS[Math.floor(Math.random() * CONVERSATION_STARTERS.length)];
  const msg = starter.messages[Math.floor(Math.random() * starter.messages.length)];
  return msg;
}