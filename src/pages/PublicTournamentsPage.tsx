import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Award, BarChart3, Calendar, ChevronDown, ChevronRight, Clock,
  Crown, DollarSign, Flag, Globe, Medal, Play, Shield, Star, Target, Trophy, TrendingUp, UserPlus, Users, Zap,
} from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import CountryFlag from "@/components/ui/CountryFlag";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import { useDynamicRouteSeo } from "@/hooks/useDynamicRouteSeo";
import { buildTournamentListingSeo } from "@/lib/publicTournaments";
import type { PlatformSettingsRecord } from "@/lib/platformMetadata";
import { cn } from "@/lib/utils";

interface PublicTournamentsPageProps {
  platformSettings?: Partial<PlatformSettingsRecord> | null;
}

// ─── Seeded RNG ──────────────────────────────────────────────────────────────────
function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1103515245, s) + 12345) >>> 0;
    return (s & 0x7fffffff) / 0x7fffffff;
  };
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  return hash >>> 0;
}

// ─── Dummy Data ──────────────────────────────────────────────────────────────────
const FIRST_NAMES = [
  "James","Mary","John","Patricia","Robert","Jennifer","Michael","Linda","David","Elizabeth",
  "William","Barbara","Richard","Susan","Joseph","Jessica","Thomas","Sarah","Christopher","Karen",
  "Charles","Lisa","Daniel","Nancy","Matthew","Betty","Anthony","Margaret","Mark","Sandra",
  "Donald","Ashley","Steven","Dorothy","Paul","Kimberly","Andrew","Emily","Joshua","Donna",
  "Kenneth","Michelle","Kevin","Carol","Brian","Amanda","George","Melissa","Timothy","Deborah",
  "Ronald","Stephanie","Edward","Rebecca","Jason","Sharon","Jeffrey","Laura","Ryan","Cynthia",
  "Jacob","Kathleen","Gary","Amy","Nicholas","Angela","Eric","Shirley","Jonathan","Anna",
  "Stephen","Brenda","Larry","Pamela","Justin","Emma","Scott","Nicole","Brandon","Helen",
  "Benjamin","Samantha","Samuel","Katherine","Raymond","Christine","Gregory","Debra","Frank",
  "Rachel","Alexander","Carolyn","Patrick","Janet","Jack","Catherine","Dennis","Maria",
  "Jeremy","Heather","Ahmed","Fatima","Omar","Aisha","Kwame","Zara","Chen","Maria",
  "Carlos","Priya","Yusuf","Lindiwe","Chloe","David","Sofia","Hassan","Naledi","Rajesh",
];

const LAST_NAMES = [
  "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez",
  "Hernandez","Lopez","Gonzalez","Wilson","Anderson","Thomas","Taylor","Moore","Jackson","Martin",
  "Lee","Perez","Thompson","White","Harris","Sanchez","Clark","Ramirez","Lewis","Robinson",
  "Walker","Young","Allen","King","Wright","Scott","Torres","Nguyen","Hill","Flores",
  "Green","Adams","Nelson","Baker","Hall","Rivera","Campbell","Mitchell","Carter","Roberts",
  "Gomez","Phillips","Evans","Turner","Diaz","Parker","Cruz","Edwards","Collins","Reyes",
];

const COUNTRIES = [
  "US","GB","CA","AU","DE","FR","IT","ES","NL","SE","NO","DK","FI","BR","AR","MX",
  "CO","CL","ZA","NG","KE","GH","EG","MA","TN","AE","SA","IN","PK","BD","JP","KR",
  "CN","TH","VN","MY","SG","RU","TR","PL","CZ","HU","RO","UA","GR","PT","IE","CH",
  "AT","BE","IL","PH","ID","NZ","PE","VE",
];

const ICON_COLORS = [
  "#f44336","#e91e63","#9c27b0","#673ab7","#3f51b5","#2196f3","#03a9f4","#00bcd4",
  "#009688","#4caf50","#8bc34a","#cddc39","#ffc107","#ff9800","#ff5722","#795548",
  "#607d8b","#1abc9c","#3498db","#9b59b6","#e67e22","#2ecc71","#e74c3c","#1b8ffa",
];

const TOTAL_LEADERBOARD = 3482;

function generateLeaderboard() {
  const rng = seededRandom(42);
  const traders: { id: string; name: string; country: string; profit: number; trades: number; wins: number }[] = [];
  for (let i = 0; i < TOTAL_LEADERBOARD; i++) {
    const fn = FIRST_NAMES[i % FIRST_NAMES.length];
    const ln = LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length];
    const profit = Number(((rng() - 0.12) * 35000).toFixed(2));
    const trades = Math.floor(rng() * 500 + 5);
    const wins = Math.floor(trades * (0.38 + rng() * 0.52));
    traders.push({
      id: `ld-${i}`, name: `${fn} ${ln}`,
      country: COUNTRIES[Math.floor(rng() * COUNTRIES.length)],
      profit, trades, wins,
    });
  }
  traders.sort((a, b) => b.profit - a.profit);
  return traders;
}

const LEADERBOARD_TRADERS = generateLeaderboard();

const TOURNAMENTS_SCHEDULE = [
  { day: "Monday", title: "Monday Momentum", entry: "$5", pool: "$50,000", duration: "1 Day", participants: "2,847", icon: Calendar, desc: "Kick off the week with our entry-level tournament. Low stakes, high energy, and a chance to start your week with a win." },
  { day: "Wednesday", title: "Wednesday Warrior", entry: "$10", pool: "$100,000", duration: "1 Day", participants: "3,124", icon: Zap, desc: "Midweek showdown for serious traders. Higher stakes, bigger prize pool, and fierce competition from top traders worldwide." },
  { day: "Friday", title: "Friday Free-for-All", entry: "Free", pool: "$25,000", duration: "1 Day", participants: "5,891", icon: Star, desc: "Free entry tournament open to everyone. Perfect for new traders to experience the thrill of competition risk-free." },
  { day: "Saturday", title: "Weekend Showdown", entry: "$20", pool: "$250,000", duration: "3 Days", participants: "4,562", icon: Trophy, desc: "The flagship weekend event. Massive prize pool, extended trading time, and glory on the line. Only the best survive." },
];

const FEATURES = [
  { icon: BarChart3, title: "Live Rankings", desc: "Real-time leaderboard updates as trades settle" },
  { icon: Users, title: "Thousands of Traders", desc: "Compete against traders from 120+ countries" },
  { icon: Calendar, title: "Weekly Competitions", desc: "New tournaments every Monday, Wednesday, Friday & Saturday" },
  { icon: Shield, title: "Fair Competition", desc: "All traders start with the same balance" },
  { icon: TrendingUp, title: "Instant Leaderboard Updates", desc: "See your rank change instantly after each trade" },
  { icon: Zap, title: "Fast Reward Distribution", desc: "Prizes credited within 24 hours of tournament end" },
  { icon: Globe, title: "Global Participants", desc: "Join a worldwide community of traders" },
  { icon: Target, title: "Secure Trading", desc: "Industry-leading security and fair play guarantees" },
];

const RULES = [
  "Every participant trades under the same starting conditions.",
  "Rankings are based on final tournament performance.",
  "All trades must be placed within the tournament period.",
  "Fraudulent activity leads to immediate disqualification.",
  "Tournament decisions made by the administration are final.",
  "Rewards are distributed after verification within 24 hours.",
  "Participants must be 18 years or older to compete.",
  "The platform reserves the right to modify rules at any time.",
];

const FAQ_ITEMS = [
  { q: "What are trading tournaments?", a: "Trading tournaments are time-limited competitions where traders compete against each other by trading financial instruments. Starting with an equal balance, participants aim to achieve the highest returns within the tournament period to win prizes." },
  { q: "How do I join a tournament?", a: "Simply log into your account, navigate to the Tournaments page, choose an available tournament, review the entry requirements, and click 'Join'. If there's an entry fee, it will be deducted from your main account balance." },
  { q: "Can I join multiple tournaments?", a: "Yes! You can participate in multiple tournaments simultaneously as long as they are running at different times. Each tournament has its own separate balance and leaderboard." },
  { q: "How are winners selected?", a: "Winners are determined by their final tournament balance at the end of the competition. The trader with the highest balance ranks first, followed by the second highest, and so on." },
  { q: "When are rewards paid?", a: "All prize rewards are automatically credited to your live trading account within 24 hours after the tournament ends. Winners are also notified via email and in-app notification." },
  { q: "How is the leaderboard updated?", a: "The leaderboard updates in real-time as trades are settled. You'll see your position change immediately after each winning or losing trade is closed." },
  { q: "Can I participate using a demo account?", a: "Tournaments require a real trading account. Demo accounts cannot participate as tournaments involve real entry fees and prize pools. However, free-entry tournaments are available for new traders." },
  { q: "What happens if two traders tie?", a: "In the event of a tie, the trader who reached the balance first (earliest timestamp) will be ranked higher. This ensures fair and transparent tie-breaking." },
  { q: "Can I join after the tournament starts?", a: "Yes, late registration is available for most tournaments up to 24 hours after the start time. However, you will begin with the same starting balance and can still climb the leaderboard." },
  { q: "Who can I contact for support?", a: "Our support team is available 24/7 via live chat and email. You can reach us directly from your account's support section or by emailing support@tradingplatform.com." },
  { q: "Is there a minimum deposit to join paid tournaments?", a: "You need sufficient funds in your live account to cover the entry fee. There is no separate minimum deposit requirement for tournaments beyond standard account requirements." },
  { q: "How are prize pools funded?", a: "Prize pools are funded by entry fees combined with platform contribution. The platform adds additional funds to ensure competitive and attractive prize pools." },
  { q: "Can I withdraw my tournament balance?", a: "Tournament balances are separate from your main trading account. They cannot be withdrawn directly. Only prizes won through tournament placement are credited to your withdrawable balance." },
  { q: "What instruments can I trade in tournaments?", a: "Tournaments typically offer the same range of instruments as the main platform, including forex, crypto, stocks, and commodities. Some tournaments may have specific instrument restrictions." },
  { q: "Are there any trading restrictions during tournaments?", a: "Standard trading rules apply. Some tournaments may have specific limitations on leverage, trade duration, or instrument selection. These are always clearly communicated in the tournament rules." },
];

// ─── Animation Hooks ────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !startOnView) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true;
          const start = performance.now();
          const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration, startOnView]);

  return { count, ref };
}

function useFadeInUp() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

const FadeInSection = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const { ref, visible } = useFadeInUp();
  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700",
        visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, suffix }: { icon: any; label: string; value: number; suffix?: string }) => {
  const { count, ref } = useCountUp(value);
  return (
    <div className="rounded-2xl border border-[#334050] bg-[#27303d] p-5 transition-all duration-300 hover:border-[#007aff]/40 hover:shadow-lg hover:shadow-[#007aff]/5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#007aff]/12 text-[#007aff]">
        <Icon className="h-5 w-5" />
      </div>
      <span className="text-[28px] font-black text-white tabular-nums" ref={ref}>
        {count.toLocaleString()}
      </span>
      {suffix && <span className="text-[28px] font-black text-[#00b95b]">{suffix}</span>}
      <p className="mt-1 text-[13px] text-[#7a8aa8]">{label}</p>
    </div>
  );
};

const formatProfit = (value: number) => {
  const sign = value >= 0 ? "+" : "";
  return `${sign}$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatPct = (profit: number, trades: number) => {
  const pct = trades > 0 ? (profit / trades) * 0.5 : 0;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
};

// ─── Components ─────────────────────────────────────────────────────────────────
const CountdownTimer = ({ targetDate }: { targetDate: string }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(new Date(targetDate).getTime() - now, 0);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return (
    <span className="font-mono text-[13px] font-bold tabular-nums text-[#00b95b]">
      {d > 0 ? `${d}d ` : ""}{h}h {m}m {s}s
    </span>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────────────
const PublicTournamentsPage = ({ platformSettings }: PublicTournamentsPageProps) => {
  const { platformName } = useSiteBranding();
  const { data: websiteContent } = useWebsiteContent();
  const seoOverride = buildTournamentListingSeo(platformName);
  useDynamicRouteSeo({ platformSettings, routeOverride: seoOverride });

  const [lbPage, setLbPage] = useState(1);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const lbPageSize = 25;
  const lbTotalPages = Math.ceil(LEADERBOARD_TRADERS.length / lbPageSize);
  const paginatedLB = useMemo(
    () => LEADERBOARD_TRADERS.slice((lbPage - 1) * lbPageSize, lbPage * lbPageSize),
    [lbPage],
  );

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: "#1b202a" }}>
      <Navbar />

      <main>
        {/* ─── Hero Section ─────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden px-4 pb-16 pt-20 sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,122,255,0.08)_0%,transparent_60%)]" />
          <div className="relative mx-auto max-w-[1200px]">
            <FadeInSection>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#00b95b]/30 bg-[#00b95b]/8 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#00b95b]">
                <Trophy className="h-3.5 w-3.5" />
                Weekly Trading Tournaments
              </div>
              <h1 className="text-[40px] font-black leading-tight text-white sm:text-[56px]">
                Weekly Trading <span className="text-[#00b95b]">Tournaments</span>
              </h1>
              <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-[#9aafcf]">
                Join thousands of traders in weekly competitions. Prove your skills, climb the leaderboard,
                and earn real rewards. New tournaments every Monday, Wednesday, Friday, and Saturday.
              </p>
            </FadeInSection>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {TOURNAMENTS_SCHEDULE.map((t, i) => (
                <FadeInSection key={t.day}>
                  <div className="group relative overflow-hidden rounded-2xl border border-[#334050] bg-[#27303d] p-5 transition-all duration-300 hover:border-[#00b95b]/40 hover:shadow-lg hover:shadow-[#00b95b]/5">
                    <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#00b95b]/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#00b95b]/12 text-[#00b95b]">
                      <t.icon className="h-5 w-5" />
                    </div>
                    <div className="mb-2 inline-flex items-center rounded-full border border-[#334050] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#7a8aa8]">
                      {t.day}
                    </div>
                    <h3 className="text-[17px] font-bold text-white">{t.title}</h3>
                    <div className="mt-3 space-y-1.5 text-[13px] text-[#7a8aa8]">
                      <p>Prize: <span className="font-bold text-[#00b95b]">{t.pool}</span></p>
                      <p>Entry: <span className="font-semibold text-white">{t.entry}</span></p>
                      <p>Participants: <span className="font-semibold text-white">{t.participants}</span></p>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5 text-[12px] text-[#7a8aa8]">
                      <Clock className="h-3.5 w-3.5" />
                      <CountdownTimer targetDate={i === 0 ? "2026-07-07T00:00:00Z" : i === 1 ? "2026-07-09T00:00:00Z" : i === 2 ? "2026-07-11T00:00:00Z" : "2026-07-12T00:00:00Z"} />
                    </div>
                    <button
                      type="button"
                      className="mt-4 w-full rounded-xl bg-[#00b95b] py-2.5 text-[13px] font-bold text-white transition-all hover:bg-[#00a34f] hover:shadow-lg hover:shadow-[#00b95b]/20"
                    >
                      Join Tournament
                    </button>
                  </div>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Statistics Section ────────────────────────────────────────────── */}
        <section className="border-t border-[#2a3340] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1200px]">
            <FadeInSection>
              <div className="mb-10 text-center">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#007aff]/30 bg-[#007aff]/8 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#007aff]">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Tournament Statistics
                </div>
                <h2 className="text-[32px] font-black text-white sm:text-[40px]">By the Numbers</h2>
              </div>
            </FadeInSection>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={Calendar} label="Weekly Tournaments" value={4} />
              <StatCard icon={Users} label="Active Traders" value={15000} suffix="+" />
              <StatCard icon={UserPlus} label="Registered Participants" value={13284} />
              <StatCard icon={Globe} label="Countries Participating" value={120} suffix="+" />
              <StatCard icon={DollarSign} label="Total Prize Pool" value={250000} />
              <StatCard icon={Trophy} label="Weekly Prize Winners" value={400} />
              <StatCard icon={Flag} label="Completed Tournaments" value={2300} suffix="+" />
            </div>
          </div>
        </section>

        {/* ─── Live Leaderboard Section ──────────────────────────────────────── */}
        <section className="border-t border-[#2a3340] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1200px]">
            <FadeInSection>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#00b95b]/30 bg-[#00b95b]/8 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#00b95b]">
                <BarChart3 className="h-3.5 w-3.5" />
                Live Leaderboard
              </div>
              <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-[32px] font-black text-white sm:text-[40px]">Top Traders</h2>
                  <p className="mt-2 text-[15px] text-[#9aafcf]">
                    {LEADERBOARD_TRADERS.length.toLocaleString()} Participants · Page {lbPage} of {lbTotalPages.toLocaleString()}
                  </p>
                </div>
              </div>
            </FadeInSection>

            <FadeInSection>
              {/* Column headers */}
              <div className="mb-2 flex items-center gap-3 rounded-xl bg-[#232b3a] px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#7a8aa8]">
                <span className="w-10 text-center">#</span>
                <span className="w-8" />
                <span className="w-7" />
                <span className="flex-1">Trader</span>
                <span className="w-[100px] text-right">Profit / Loss</span>
                <span className="w-[80px] text-right">Return</span>
              </div>

              <div className="divide-y divide-[#2a3340] rounded-xl border border-[#334050] bg-[#27303d]">
                {paginatedLB.map((trader, idx) => {
                  const rank = (lbPage - 1) * lbPageSize + idx + 1;
                  const isPositive = trader.profit >= 0;
                  const initial = trader.name.charAt(0).toUpperCase();
                  const iconColor = ICON_COLORS[hashCode(trader.id) % ICON_COLORS.length];

                  return (
                    <div
                      key={trader.id}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#1e2530]"
                    >
                      <span className={cn("w-10 text-center text-[13px] font-black", rank <= 3 ? "text-[#00b95b]" : "text-[#7a8aa8]")}>
                        {rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : rank}
                      </span>
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white ring-1 ring-white/10"
                        style={{ background: iconColor }}
                      >
                        {initial}
                      </div>
                      <CountryFlag code={trader.country} size={22} className="shrink-0 rounded-full ring-1 ring-black/20" />
                      <div className="min-w-0 flex-1">
                        <span className="truncate text-[13px] font-bold text-white">{trader.name}</span>
                      </div>
                      <span className={cn("w-[100px] shrink-0 text-right text-[13px] font-black tabular-nums", isPositive ? "text-[#00b95b]" : "text-[#ff6f6f]")}>
                        {formatProfit(trader.profit)}
                      </span>
                      <span className={cn("w-[80px] shrink-0 text-right text-[12px] font-bold tabular-nums", isPositive ? "text-[#00b95b]" : "text-[#ff6f6f]")}>
                        {formatPct(trader.profit, trader.trades)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setLbPage((p) => Math.max(1, p - 1))}
                  disabled={lbPage === 1}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#2a3340] px-4 py-2.5 text-[13px] font-bold text-white transition-all hover:bg-[#354151] disabled:opacity-40"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, lbTotalPages) }, (_, i) => {
                    let pageNum: number;
                    if (lbTotalPages <= 5) {
                      pageNum = i + 1;
                    } else if (lbPage <= 3) {
                      pageNum = i + 1;
                    } else if (lbPage >= lbTotalPages - 2) {
                      pageNum = lbTotalPages - 4 + i;
                    } else {
                      pageNum = lbPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setLbPage(pageNum)}
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg text-[13px] font-bold transition-all",
                          lbPage === pageNum ? "bg-[#00b95b] text-white" : "bg-[#2a3340] text-[#7a8aa8] hover:bg-[#354151] hover:text-white",
                        )}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {lbTotalPages > 5 && (
                    <span className="text-[13px] text-[#7a8aa8]">...</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setLbPage((p) => Math.min(lbTotalPages, p + 1))}
                  disabled={lbPage === lbTotalPages}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#2a3340] px-4 py-2.5 text-[13px] font-bold text-white transition-all hover:bg-[#354151] disabled:opacity-40"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </FadeInSection>
          </div>
        </section>

        {/* ─── Weekly Schedule Section ───────────────────────────────────────── */}
        <section className="border-t border-[#2a3340] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1200px]">
            <FadeInSection>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#007aff]/30 bg-[#007aff]/8 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#007aff]">
                <Calendar className="h-3.5 w-3.5" />
                Weekly Schedule
              </div>
              <h2 className="mb-10 text-[32px] font-black text-white sm:text-[40px]">Tournament Schedule</h2>
            </FadeInSection>

            <div className="grid gap-6 lg:grid-cols-2">
              {TOURNAMENTS_SCHEDULE.map((t, i) => (
                <FadeInSection key={t.day}>
                  <div className="group rounded-2xl border border-[#334050] bg-[#27303d] p-6 transition-all duration-300 hover:border-[#007aff]/40 hover:shadow-lg hover:shadow-[#007aff]/5">
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#007aff]/12 text-[#007aff]">
                          <t.icon className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="inline-flex items-center rounded-full border border-[#334050] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#7a8aa8]">
                            {t.day}
                          </div>
                          <h3 className="mt-1 text-[20px] font-bold text-white">{t.title}</h3>
                        </div>
                      </div>
                    </div>
                    <p className="mb-4 text-[14px] leading-relaxed text-[#9aafcf]">{t.desc}</p>
                    <div className="grid grid-cols-2 gap-3 rounded-xl border border-[#334050] bg-[#1e2530] p-4 sm:grid-cols-5">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a8aa8]">Start</p>
                        <p className="mt-1 text-[13px] font-bold text-white">Every {t.day}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a8aa8]">Duration</p>
                        <p className="mt-1 text-[13px] font-bold text-white">{t.duration}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a8aa8]">Entry</p>
                        <p className="mt-1 text-[13px] font-bold text-white">{t.entry}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a8aa8]">Prize</p>
                        <p className="mt-1 text-[13px] font-bold text-[#00b95b]">{t.pool}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a8aa8]">Participants</p>
                        <p className="mt-1 text-[13px] font-bold text-white">{t.participants}</p>
                      </div>
                    </div>
                  </div>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>

        {/* ─── How It Works Section ──────────────────────────────────────────── */}
        <section className="border-t border-[#2a3340] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1200px]">
            <FadeInSection>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#00b95b]/30 bg-[#00b95b]/8 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#00b95b]">
                <Play className="h-3.5 w-3.5" />
                How It Works
              </div>
              <h2 className="mb-10 text-[32px] font-black text-white sm:text-[40px]">Four Steps to Victory</h2>
            </FadeInSection>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: UserPlus, step: "Step 1", title: "Join Tournament", desc: "Choose a tournament from the schedule and confirm your participation. Pay the entry fee or join free tournaments." },
                { icon: TrendingUp, step: "Step 2", title: "Start Trading", desc: "Use your tournament balance to trade across available instruments. Every trade affects your leaderboard position." },
                { icon: Trophy, step: "Step 3", title: "Climb the Leaderboard", desc: "Watch your rank change in real-time as you compete against thousands of traders worldwide." },
                { icon: Award, step: "Step 4", title: "Win Rewards", desc: "Top-ranked traders at tournament end receive prizes credited directly to their trading accounts." },
              ].map((s, i) => (
                <FadeInSection key={s.step}>
                  <div className="group relative rounded-2xl border border-[#334050] bg-[#27303d] p-6 text-center transition-all duration-300 hover:border-[#00b95b]/40">
                    {i < 3 && (
                      <div className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-[#334050] lg:block">
                        <ChevronRight className="h-6 w-6" />
                      </div>
                    )}
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#00b95b]/12 text-[#00b95b] transition-all duration-300 group-hover:scale-110 group-hover:bg-[#00b95b]/20">
                      <s.icon className="h-6 w-6" />
                    </div>
                    <div className="mb-2 inline-flex items-center rounded-full border border-[#00b95b]/20 bg-[#00b95b]/8 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#00b95b]">
                      {s.step}
                    </div>
                    <h3 className="text-[17px] font-bold text-white">{s.title}</h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-[#9aafcf]">{s.desc}</p>
                  </div>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Features Section ──────────────────────────────────────────────── */}
        <section className="border-t border-[#2a3340] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1200px]">
            <FadeInSection>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#007aff]/30 bg-[#007aff]/8 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#007aff]">
                <Star className="h-3.5 w-3.5" />
                Tournament Features
              </div>
              <h2 className="mb-10 text-[32px] font-black text-white sm:text-[40px]">Why Trade Tournaments?</h2>
            </FadeInSection>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <FadeInSection key={f.title}>
                  <div className="group rounded-2xl border border-[#334050] bg-[#27303d] p-5 transition-all duration-300 hover:border-[#007aff]/40 hover:shadow-lg hover:shadow-[#007aff]/5">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#007aff]/12 text-[#007aff] transition-transform duration-300 group-hover:scale-110">
                      <f.icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-[15px] font-bold text-white">{f.title}</h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-[#9aafcf]">{f.desc}</p>
                  </div>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Prize Distribution ────────────────────────────────────────────── */}
        <section className="border-t border-[#2a3340] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1200px]">
            <FadeInSection>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#f4b742]/30 bg-[#f4b742]/8 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#f4b742]">
                <Award className="h-3.5 w-3.5" />
                Prize Distribution
              </div>
              <h2 className="mb-10 text-[32px] font-black text-white sm:text-[40px]">What You Can Win</h2>
            </FadeInSection>

            <FadeInSection>
              <div className="overflow-hidden rounded-2xl border border-[#334050]">
                <div className="grid grid-cols-3 gap-px bg-[#334050]">
                  {[
                    { rank: "1st Place", icon: Crown, prize: "50% of pool", color: "text-yellow-400", bg: "bg-yellow-400/8" },
                    { rank: "2nd Place", icon: Medal, prize: "25% of pool", color: "text-slate-300", bg: "bg-slate-300/8" },
                    { rank: "3rd Place", icon: Medal, prize: "15% of pool", color: "text-amber-600", bg: "bg-amber-600/8" },
                    { rank: "Top 10", icon: Trophy, prize: "Share 8%", color: "text-[#007aff]", bg: "bg-[#007aff]/8" },
                    { rank: "Top 100", icon: Award, prize: "Share 2%", color: "text-[#f4b742]", bg: "bg-[#f4b742]/8" },
                  ].map((item) => (
                    <div key={item.rank} className={cn("flex flex-col items-center justify-center p-6 text-center transition-colors hover:brightness-110", item.bg)}>
                      <item.icon className={cn("h-8 w-8", item.color)} />
                      <span className={cn("mt-2 text-[18px] font-black", item.color)}>{item.rank}</span>
                      <span className="mt-1 text-[13px] font-bold text-white">{item.prize}</span>
                    </div>
                  ))}
                </div>
              </div>
            </FadeInSection>
          </div>
        </section>

        {/* ─── Rules Section ─────────────────────────────────────────────────── */}
        <section className="border-t border-[#2a3340] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1200px]">
            <FadeInSection>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#007aff]/30 bg-[#007aff]/8 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#007aff]">
                <Shield className="h-3.5 w-3.5" />
                Tournament Rules
              </div>
              <h2 className="mb-10 text-[32px] font-black text-white sm:text-[40px]">Fair Play Guaranteed</h2>
            </FadeInSection>

            <div className="grid gap-4 sm:grid-cols-2">
              {RULES.map((rule, i) => (
                <FadeInSection key={i}>
                  <div className="flex items-start gap-3 rounded-2xl border border-[#334050] bg-[#27303d] p-4 transition-all duration-300 hover:border-[#007aff]/30">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#00b95b]/12 text-[#00b95b]">
                      <Shield className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-[14px] leading-relaxed text-[#c3d2ea]">{rule}</p>
                  </div>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>

        {/* ─── FAQ Section ───────────────────────────────────────────────────── */}
        <section className="border-t border-[#2a3340] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[900px]">
            <FadeInSection>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#00b95b]/30 bg-[#00b95b]/8 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#00b95b]">
                <HelpCircleIcon className="h-3.5 w-3.5" />
                Frequently Asked Questions
              </div>
              <h2 className="mb-10 text-[32px] font-black text-white sm:text-[40px]">Got Questions?</h2>
            </FadeInSection>

            <div className="space-y-3">
              {FAQ_ITEMS.map((item, i) => (
                <FadeInSection key={i}>
                  <div className="overflow-hidden rounded-2xl border border-[#334050] transition-all duration-300 hover:border-[#00b95b]/30">
                    <button
                      type="button"
                      onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                      className="flex w-full items-center justify-between bg-[#27303d] px-5 py-4 text-left transition-colors hover:bg-[#2a3545]"
                    >
                      <span className="text-[14px] font-bold text-white pr-4">{item.q}</span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 text-[#7a8aa8] transition-transform duration-300",
                          faqOpen === i && "rotate-180",
                        )}
                      />
                    </button>
                    <div
                      className={cn(
                        "grid transition-all duration-300",
                        faqOpen === i ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                      )}
                    >
                      <div className="overflow-hidden">
                        <div className="border-t border-[#334050] bg-[#1e2530] px-5 py-4 text-[14px] leading-relaxed text-[#b0bedd]">
                          {item.a}
                        </div>
                      </div>
                    </div>
                  </div>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA Section ───────────────────────────────────────────────────── */}
        <section className="border-t border-[#2a3340] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[900px] text-center">
            <FadeInSection>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#00b95b]/30 bg-[#00b95b]/8 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#00b95b]">
                <Trophy className="h-3.5 w-3.5" />
                Ready to Compete?
              </div>
              <h2 className="text-[36px] font-black text-white sm:text-[48px]">
                Ready to <span className="text-[#00b95b]">Compete?</span>
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-[16px] leading-relaxed text-[#9aafcf]">
                Join thousands of traders every Monday, Wednesday, Friday, and Saturday. Improve your trading skills,
                compete on the live leaderboard, and earn exciting rewards.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#00b95b] px-8 py-4 text-[16px] font-bold text-white transition-all hover:bg-[#00a34f] hover:shadow-lg hover:shadow-[#00b95b]/20"
                >
                  <Trophy className="h-5 w-5" />
                  Join Tournament
                </Link>
                <Link
                  to="/how-it-works"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#334050] bg-[#27303d] px-8 py-4 text-[16px] font-bold text-white transition-all hover:border-[#007aff]/40 hover:bg-[#2a3545]"
                >
                  Learn More
                </Link>
              </div>
            </FadeInSection>
          </div>
        </section>
      </main>

      <Footer content={websiteContent} />
    </div>
  );
};

const HelpCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export default PublicTournamentsPage;
