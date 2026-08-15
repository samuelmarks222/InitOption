import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { MessageCircle, ThumbsUp, Send, Users, X } from "lucide-react";

const FIRST_NAMES = [
  "Alex","Sarah","Michael","Emma","David","Sophia","James","Olivia","Daniel","Isabella",
  "Chris","Mia","Kevin","Emily","John","Charlotte","Tom","Amelia","Ryan","Harper",
  "Jason","Ella","Lucas","Aria","Ethan","Lily","Noah","Zoe","Mason","Stella",
  "Logan","Nora","Liam","Hannah","Oliver","Avery","Elijah","Scarlett","Aiden","Grace",
  "Caleb","Chloe","Henry","Victoria","Owen","Penelope","Wyatt","Riley","Jack","Audrey",
  "Finn","Layla","Dylan","Ellie","Leo","Natalie","Gabriel","Ruby","Julian","Eva",
  "Mateo","Naomi","Adrian","Alice","Gabby","Aurora","Ian","Hazel","Axel","Samantha",
  "Diego","Bella","Jose","Claire","Taher","Yuki","Wei","Fatima","Omar","Zara",
  "Kwame","Lindiwe","Chen","Priya","Yusuf","Naledi","Rajesh","Hassan","Mei","Ahmed",
];

const LAST_NAMES = [
  "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez",
  "Hernandez","Lopez","Gonzalez","Wilson","Anderson","Thomas","Taylor","Moore","Jackson","Martin",
  "Lee","Perez","Thompson","White","Harris","Sanchez","Clark","Ramirez","Lewis","Robinson",
  "Walker","Young","Allen","King","Wright","Scott","Torres","Nguyen","Hill","Flores",
  "Green","Adams","Nelson","Baker","Hall","Rivera","Campbell","Mitchell","Carter","Roberts",
  "Kim","Chen","Singh","Patel","Cohen","Reyes","Xu","Gupta","Burns","Fox",
];

const COUNTRIES = [
  "US","GB","CA","AU","DE","FR","IT","ES","NL","SE","NO","DK","FI","BR","AR","MX",
  "CO","CL","ZA","NG","KE","GH","EG","MA","TN","AE","SA","IN","PK","BD","JP","KR",
  "CN","TH","VN","MY","SG","RU","TR","PL","CZ","HU","RO","UA","GR","PT","IE","CH",
  "AT","BE","IL","PH","ID","NZ","PE","VE",
];

function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1103515245, s) + 12345) >>> 0;
    return (s & 0x7fffffff) / 0x7fffffff;
  };
}

interface ChatUser {
  id: string;
  name: string;
  country: string;
  flagUrl: string;
  isOnline: boolean;
  joinOrder: number;
  personality: "active" | "shy" | "expert" | "beginner" | "helper";
}

interface ChatMessage {
  id: string;
  userId: string;
  text: string;
  timestamp: number;
  type: "message" | "join" | "leave" | "reaction" | "like" | "reply";
  replyTo?: string;
  replyToName?: string;
  likes: number;
}

interface TypingUser {
  userId: string;
  name: string;
  startedAt: number;
  duration: number;
}

const ONLINE_USERS = 500;
const TOTAL_USERS = 10000;

const MESSAGE_TEMPLATES = [
  "Anyone watching EUR/USD right now?",
  "Gold just hit support on the 15min!",
  "Nice call on that breakout 👌",
  "I missed that move, was looking away 😅",
  "What's everyone trading today?",
  "Just had 3 wins in a row on NASDAQ 🔥",
  "Tournament is heating up this week",
  "Anyone else seeing that rejection on Oil?",
  "Risk management first, then profits",
  "New to binary options, any tips?",
  "The 1-min expiry is perfect for scalping",
  "GBP/JPY looking volatile rn",
  "Just hit my daily target, shutting down 🎯",
  "Market's choppy today, staying out",
  "Copy trading is saving my account ngl",
  "What's your win rate this month?",
  "That wick took out my stop 😤",
  "Patience pays off in this game",
  "London session about to open, ready!",
  "Anyone tried the new platform update?",
  "Bitcoin is on fire today 🚀",
  "Consistency > big wins",
  "Lost 2 in a row, taking a break ☕",
  "The Asian session was quiet af",
  "Just joined the tournament, wish me luck!",
  "I use 30-sec expiries for quick scalps",
  "How do you handle drawdown?",
  "Gonna sit this one out, not confident",
  "Price action never lies",
  "Support and resistance is all you need",
  "Took a small loss but I'm fine with it",
  "Anyone else up 20% this week? 📈",
  "New week, fresh mindset 💪",
  "Gold has been my best asset this month",
  "The trend is your friend",
  "Just started journaling my trades, game changer",
  "Who's watching the NFP release?",
  "That fakeout was nasty 😂",
  "Slow and steady wins the race",
  "EUR/USD rejection at resistance was clean",
  "Oil's supply/demand looking interesting",
  "Just hit 1000 total trades 🏆",
  "Anyone using the 5min chart for entries?",
  "Took a big L today but learned a lot",
  "The community here is amazing",
  "Follow the higher timeframe first",
  "Bitcoin correlation with tech stocks is wild",
  "Just copied a top trader, let's see how it goes",
  "Weekend tournament starts in 30 min!",
  "That was a close one 😅",
  "Scalping on NASDAQ 1-min is my favorite",
  "What's your favorite asset to trade?",
  "Stick to your plan, don't revenge trade",
  "The prize pool this week is $50k!",
  "I trade mainly GBP pairs",
  "Afternoon session always better for me",
  "Anyone got a good signal for Gold?",
  "Macro events are driving everything rn",
  "Just withdrew my profits, feels good",
  "Beginner here, what's a good starting amount?",
  "Been trading for 6 months now, finally profitable",
  "The 1-hour chart gives the best context",
  "Anyone tried the copy trading feature?",
  "That spike was unexpected 😳",
  "Welcome to the community! 🙌",
  "Can someone explain straddle strategy?",
  "My win rate improved when I stopped overtrading",
  "Market manipulation is real sometimes",
  "Just seen the most beautiful rejection wick",
  "Tournament deadline approaching!",
  "I focus on 3 assets only, keeps it simple",
  "Discipline > Motivation",
  "What timeframes do you guys use?",
  "Green day today, let's keep it going",
  "Losses are tuition fees",
  "Anyone trading the London open?",
  "That GBP/USD setup was textbook",
  "I use a 70% win rate strategy on 1-min",
  "The key is knowing when NOT to trade",
  "Happy to help any beginners out there",
  "News trading is risky but rewarding",
  "Just got stopped out by 1 pip 🤦",
  "My average win is bigger than my average loss now",
  "Risk per trade should be 1-2% max",
  "Anyone else prefer short expiries?",
  "The charts are looking bullish today",
  "Keep a trading journal, seriously",
  "Been following a few traders here, great results",
  "Volatility is back! Finally some action",
  "Who's in the top 10 this week?",
  "Had a 10-win streak yesterday 🔥",
  "The weekly tournament has 2000+ participants",
  "I wish I started copy trading sooner",
  "Patience is a superpower in trading",
  "That reversal was perfectly at the trendline",
  "Anyone using indicators or pure price action?",
  "Made my first $1000 profit this month! 🎉",
  "Green is green, no matter how small",
  "The Asian session ranges are great for scalping",
  "Just saw a beautiful pin bar on GBP/USD",
  "Better to sit out than force a trade",
  "Who's ready for the NY session?",
  "Trading psychology is 80% of the game",
];

const REPLY_TEMPLATES = [
  "Totally agree!",
  "That's what I've been saying 👏",
  "Good point",
  "Not sure I agree tbh",
  "Interesting take",
  "Exactly what I was thinking",
  "Thanks for sharing!",
  "That makes sense",
  "I've had the opposite experience",
  "Can you explain more?",
  "Hmm, I'll check that out",
  "Facts! 📊",
  "Been saying this for weeks",
  "Respectfully disagree lol",
  "This x1000",
  "Great advice!",
  "Saved me from a bad trade",
  "What makes you say that?",
  "I'm new, this is helpful",
  "True that",
  "Underrated comment",
  "Literally me rn 😂",
  "Couldn't have said it better",
  "I'm convinced",
  "Nah, I'll stick to my strategy",
  "Solid advice, thanks!",
  "This aged well",
  "I was about to say the same thing",
  "Tell me more about your setup",
  "Bookmarking this",
];

const USER_FIRST_MESSAGES = [
  "Hey everyone! 👋",
  "What's happening in here?",
  "Finally joined the group chat!",
  "Yo! What are we trading today?",
  "Morning team!",
  "Evening all, hope the trading was good",
  "Hello from 🇳🇬!",
  "Hey traders!",
  "Good to be here",
  "Just found this chat, awesome community",
];

function generateUsers(): ChatUser[] {
  const rng = seededRandom(42);
  const users: ChatUser[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < TOTAL_USERS; i++) {
    const fn = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)];
    const ln = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)];
    let name = `${fn}_${ln}`;
    if (usedNames.has(name)) {
      let suffix = 2;
      while (usedNames.has(`${name}${suffix}`)) suffix += 1;
      name = `${name}${suffix}`;
    }
    usedNames.add(name);

    const country = COUNTRIES[Math.floor(rng() * COUNTRIES.length)];
    const personalities: ChatUser["personality"][] = ["active", "shy", "expert", "beginner", "helper"];
    const personality = personalities[Math.floor(rng() * personalities.length)];

    users.push({
      id: `gc-u-${i}`,
      name,
      country,
      flagUrl: `https://flagcdn.com/w160/${country.toLowerCase()}.png`,
      isOnline: i < ONLINE_USERS || rng() < 0.05,
      joinOrder: i,
      personality,
    });
  }

  return users;
}

function getRandomItem<T>(arr: T[], rng?: () => number): T {
  const idx = rng ? Math.floor(rng() * arr.length) : Math.floor(Math.random() * arr.length);
  return arr[idx];
}

function generateReply(targetMsg: string, user: ChatUser): string {
  const rng = seededRandom(Date.now() % 100000 + user.joinOrder);
  if (rng() < 0.2) return getRandomItem(USER_FIRST_MESSAGES, rng);
  if (targetMsg.includes("?")) {
    const answers = [
      "I think it might go higher, watching support levels",
      "Personally I'm staying out until I see confirmation",
      "Been watching it all day, looking like a breakout setup",
      "Not sure yet, waiting for more data",
      "I'd wait for the London session to confirm",
      "Looking bullish on the 1hr chart imo",
    ];
    return getRandomItem(answers, rng);
  }
  return getRandomItem(REPLY_TEMPLATES, rng);
}

function generateConversationMessage(users: ChatUser[], recentUserIds: Set<string>): { msg: ChatMessage; userId: string } | null {
  const rng = seededRandom(Date.now() % 100000 + Math.floor(Math.random() * 99999));
  const onlineUsers = users.filter((u) => u.isOnline);
  if (onlineUsers.length === 0) return null;

  const activePersonalities = onlineUsers.filter((u) => u.personality === "active" || u.personality === "helper" || u.personality === "expert");
  const pool = activePersonalities.length > 0 ? activePersonalities : onlineUsers;
  const user = getRandomItem(pool, rng);

  const text = recentUserIds.size > 0 && rng() < 0.4
    ? generateReply("", user)
    : getRandomItem(MESSAGE_TEMPLATES, rng);

  return {
    msg: {
      id: `gc-msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      userId: user.id,
      text,
      timestamp: Date.now(),
      type: "message",
      likes: Math.floor(rng() * 8),
    },
    userId: user.id,
  };
}

const ALL_USERS = generateUsers();

export const GeneralChat = ({ onClose }: { onClose?: () => void }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineCount, setOnlineCount] = useState(ONLINE_USERS);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [inputText, setInputText] = useState("");
  const [likedMessages, setLikedMessages] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recentUserIdsRef = useRef<Set<string>>(new Set());

  const onlineUsers = useMemo(() => ALL_USERS.filter((u) => u.isOnline), []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  useEffect(() => {
    const joinInterval = setInterval(() => {
      if (Math.random() < 0.3) {
        const offlineUsers = ALL_USERS.filter((u) => !u.isOnline);
        if (offlineUsers.length > 0) {
          const joiner = getRandomItem(offlineUsers);
          joiner.isOnline = true;
          setOnlineCount((c) => c + 1);
          setMessages((prev) => [
            ...prev,
            {
              id: `gc-join-${Date.now()}`,
              userId: joiner.id,
              text: `${joiner.name} joined the chat.`,
              timestamp: Date.now(),
              type: "join",
              likes: 0,
            },
          ]);
        }
      }
      if (Math.random() < 0.2) {
        const onlineNonJoiner = ALL_USERS.filter((u) => u.isOnline && Math.random() < 0.01);
        if (onlineNonJoiner.length > 0) {
          const leaver = getRandomItem(onlineNonJoiner);
          leaver.isOnline = false;
          setOnlineCount((c) => Math.max(0, c - 1));
          setMessages((prev) => [
            ...prev,
            {
              id: `gc-leave-${Date.now()}`,
              userId: leaver.id,
              text: `${leaver.name} left the chat.`,
              timestamp: Date.now(),
              type: "leave",
              likes: 0,
            },
          ]);
        }
      }
    }, 5000 + Math.random() * 10000);
    return () => clearInterval(joinInterval);
  }, []);

  useEffect(() => {
    const typingInterval = setInterval(() => {
      if (Math.random() < 0.5) {
        const availableUsers = ALL_USERS.filter(
          (u) => u.isOnline && !typingUsers.some((t) => t.userId === u.id)
        );
        if (availableUsers.length > 0) {
          const typer = getRandomItem(availableUsers);
          const duration = 2000 + Math.random() * 5000;
          setTypingUsers((prev) => [
            ...prev,
            { userId: typer.id, name: typer.name, startedAt: Date.now(), duration },
          ]);
          setTimeout(() => {
            setTypingUsers((prev) => prev.filter((t) => t.userId !== typer.id));
          }, duration);
        }
      }
    }, 3000 + Math.random() * 4000);
    return () => clearInterval(typingInterval);
  }, [typingUsers]);

  useEffect(() => {
    const messageInterval = setInterval(() => {
      const result = generateConversationMessage(ALL_USERS, recentUserIdsRef.current);
      if (result) {
        const { msg, userId } = result;
        recentUserIdsRef.current.add(userId);
        if (recentUserIdsRef.current.size > 20) {
          recentUserIdsRef.current.clear();
        }
        setMessages((prev) => [...prev, msg]);
      }
    }, 2000 + Math.random() * 5000);
    return () => clearInterval(messageInterval);
  }, []);

  const userMap = useMemo(() => {
    const map = new Map<string, ChatUser>();
    ALL_USERS.forEach((u) => map.set(u.id, u));
    return map;
  }, []);

  const getUser = useCallback((id: string) => userMap.get(id), [userMap]);

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;

    const msg: ChatMessage = {
      id: `gc-user-${Date.now()}`,
      userId: "self",
      text,
      timestamp: Date.now(),
      type: "message",
      likes: 0,
    };
    setMessages((prev) => [...prev, msg]);
    setInputText("");

    setTimeout(() => {
      const replyUsers = ALL_USERS.filter((u) => u.isOnline && u.personality !== "shy");
      if (replyUsers.length > 0) {
        const responder = getRandomItem(replyUsers);
        const replyText = text.includes("?")
          ? getRandomItem([
              `Good question! I think it depends on the timeframe tbh`,
              `Personally I'd wait for confirmation on the 5min`,
              `Not sure but I'm watching it closely`,
            ])
          : getRandomItem([
              `That's a solid point`,
              `I was thinking the same thing 🤔`,
              `Interesting, I'll check that out`,
              `Totally agree with you!`,
              `Hmm, I see it differently but respect your view`,
            ]);
        setMessages((prev) => [
          ...prev,
          {
            id: `gc-reply-${Date.now()}`,
            userId: responder.id,
            text: replyText,
            timestamp: Date.now(),
            type: "message",
            likes: 0,
          },
        ]);
      }
    }, 4000 + Math.random() * 6000);
  }, [inputText]);

  const handleLike = useCallback((msgId: string) => {
    if (likedMessages.has(msgId)) return;
    setLikedMessages((prev) => new Set(prev).add(msgId));
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, likes: m.likes + 1 } : m))
    );
  }, [likedMessages]);

  const displayMessages = messages.slice(-60);

  return (
    <div className="flex h-full flex-col" style={{ background: "var(--trading-workspace-bg)" }}>
      <div
        className="flex items-center justify-between shrink-0 px-4 py-3 border-b"
        style={{ background: "var(--trading-header-bg)", borderBottomColor: "var(--trading-border-color)" }}
      >
        <div className="flex items-center gap-3">
          <MessageCircle className="h-5 w-5 text-[#26a69a]" />
          <span className="text-[14px] font-bold text-white">General Chat</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-[#787b86]">
            <span className="h-2 w-2 rounded-full bg-[#26a69a]" />
            <span className="font-semibold text-[#26a69a]">{onlineCount.toLocaleString()}</span>
            <span>online</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#787b86]">
            <Users className="h-3.5 w-3.5" />
            <span className="font-semibold text-white">{TOTAL_USERS.toLocaleString()}</span>
          </div>
          {onClose && (
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-[#787b86] hover:bg-white/[0.06] hover:text-white">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 no-scrollbar">
        {displayMessages.map((msg) => {
          const user = msg.userId !== "self" ? getUser(msg.userId) : null;

          if (msg.type === "join" || msg.type === "leave") {
            return (
              <div key={msg.id} className="flex justify-center py-1">
                <span className={`text-[10px] font-medium ${msg.type === "join" ? "text-[#26a69a]" : "text-[#787b86]"}`}>
                  {msg.text}
                </span>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2 px-2 py-1.5 rounded-lg transition-colors hover:bg-white/[0.02] ${
                msg.userId === "self" ? "flex-row-reverse" : ""
              }`}
            >
              {user ? (
                <div className="relative shrink-0 mt-0.5">
                  <img
                    src={user.flagUrl}
                    alt=""
                    className="h-6 w-6 rounded-full border border-white/[0.08] object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-[#1c2030] bg-[#26a69a]" />
                </div>
              ) : msg.userId === "self" ? (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#26a69a] text-[10px] font-bold text-white shrink-0 mt-0.5">
                  You
                </div>
              ) : null}

              <div className={`min-w-0 flex-1 ${msg.userId === "self" ? "text-right" : ""}`}>
                {user && (
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[11px] font-semibold text-[#d1d4dc]">{user.name}</span>
                    <span className="text-[9px] text-[#787b86]">{formatTime(msg.timestamp)}</span>
                  </div>
                )}
                {msg.userId === "self" && (
                  <div className="text-[10px] text-[#26a69a] font-medium mb-0.5">{formatTime(msg.timestamp)}</div>
                )}
                <p className="text-[12px] leading-relaxed text-[#e0e3eb] whitespace-pre-wrap break-words">
                  {msg.text}
                </p>
                <div className={`flex items-center gap-2 mt-0.5 ${msg.userId === "self" ? "justify-end" : ""}`}>
                  <button
                    onClick={() => handleLike(msg.id)}
                    className={`flex items-center gap-1 text-[10px] transition-colors ${
                      likedMessages.has(msg.id) ? "text-[#2196f3]" : "text-[#787b86] hover:text-[#d1d4dc]"
                    }`}
                  >
                    <ThumbsUp className="h-3 w-3" />
                    {msg.likes > 0 && <span>{msg.likes}</span>}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.03]">
              <div className="flex gap-0.5">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#787b86]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#787b86]" style={{ animationDelay: "0.15s" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#787b86]" style={{ animationDelay: "0.3s" }} />
              </div>
              <span className="ml-1 text-[10px] text-[#787b86]">
                {typingUsers.length === 1
                  ? `${typingUsers[0].name} is typing...`
                  : typingUsers.length === 2
                  ? `${typingUsers[0].name} and ${typingUsers[1].name} are typing...`
                  : `${typingUsers[0].name} and ${typingUsers.length - 1} others are typing...`}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 border-t px-3 py-3" style={{ borderTopColor: "var(--trading-border-color)" }}>
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Type a message..."
              rows={1}
              className="w-full rounded-2xl border border-[#2a3045] bg-[#24293d] px-4 py-2.5 text-[12px] text-white outline-none placeholder:text-[#787b86] focus:border-[#26a69a]/50 resize-none"
              style={{ minHeight: "38px" }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#26a69a] text-white transition-all hover:bg-[#1f8f84] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
};
