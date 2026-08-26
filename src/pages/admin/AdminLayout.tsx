import { useState, useMemo } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import {
  Activity, ArrowDownCircle, ArrowUpCircle, BarChart3, Bell, BookOpen,
  CandlestickChart, ChevronDown, ChevronRight, Clock, CreditCard, DollarSign,
  FileText, LayoutDashboard, LogOut, Receipt, Settings, ShieldCheck,
  TrendingUp, Trophy, Users, Wallet, Sliders, Shield, Sparkles, MessageSquare,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import { getRoleLabel, roleAllowsAdminPath } from "@/lib/adminRoles";
import { AdminHeader } from "@/components/admin/AdminHeader";

const ACCENT = "#1689e8";
const BG_CANVAS = "#0b1018";
const BG_SIDEBAR = "#0d131f";
const BORDER = "#1b2333";

interface NavCategory {
  items: { href: string; icon: React.ReactNode; label: string; badge?: string }[];
  name: string;
}

const NAV_CATEGORIES: NavCategory[] = [
  {
    name: "OVERVIEW",
    items: [{ label: "Dashboard", href: "/admin", icon: <LayoutDashboard size={16} /> }],
  },
  {
    name: "TRADING & ASSETS",
    items: [
      { label: "Live Trades", href: "/admin/trades", icon: <CandlestickChart size={16} />, badge: "LIVE" },
      { label: "Trade History", href: "/admin/trades?tab=history", icon: <Clock size={16} /> },
      { label: "Assets Config", href: "/admin/assets", icon: <Wallet size={16} /> },
      { label: "Copy Trading", href: "/admin/social", icon: <Sliders size={16} /> },
    ],
  },
  {
    name: "USER & COMPLIANCE",
    items: [
      { label: "All Users", href: "/admin/users", icon: <Users size={16} /> },
      { label: "KYC Verification", href: "/admin/users?tab=kyc", icon: <ShieldCheck size={16} /> },
      { label: "User Activity", href: "/admin/user-activity", icon: <Activity size={16} /> },
      { label: "Risk Management", href: "/admin/risk", icon: <Shield size={16} /> },
    ],
  },
  {
    name: "FINANCE & PAYMENTS",
    items: [
      { label: "Deposits Queue", href: "/admin/finance?tab=deposits", icon: <ArrowDownCircle size={16} /> },
      { label: "Withdrawals Queue", href: "/admin/finance?tab=withdrawals", icon: <ArrowUpCircle size={16} /> },
      { label: "Ledger Transactions", href: "/admin/finance?tab=transactions", icon: <Receipt size={16} /> },
      { label: "Funds Manager", href: "/admin/funds", icon: <DollarSign size={16} /> },
      { label: "Crypto Payments", href: "/admin/crypto-payments", icon: <CreditCard size={16} /> },
    ],
  },
  {
    name: "MARKETING & GROWTH",
    items: [
      { label: "Promo Codes", href: "/admin/promos", icon: <Sparkles size={16} /> },
      { label: "Tournaments", href: "/admin/tournaments", icon: <Trophy size={16} /> },
      { label: "Support Inbox", href: "/admin/support", icon: <MessageSquare size={16} /> },
      { label: "Blog & Content", href: "/admin/blog", icon: <BookOpen size={16} /> },
    ],
  },
  {
    name: "ANALYTICS & SYSTEM",
    items: [
      { label: "Profit Reports", href: "/admin/reports", icon: <TrendingUp size={16} /> },
      { label: "Trading Analytics", href: "/admin/analytics", icon: <BarChart3 size={16} /> },
      { label: "Announcements", href: "/admin/notifications", icon: <Bell size={16} /> },
      { label: "Audit Logs", href: "/admin/audit", icon: <FileText size={16} /> },
      { label: "Platform Settings", href: "/admin/settings", icon: <Settings size={16} /> },
    ],
  },
];

const AdminLayout = () => {
  const { profile, signOut } = useAuth();
  const { isStaff, loading: staffLoading, primaryRole } = useStaffAccess();
  const location = useLocation();

  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    NAV_CATEGORIES.forEach((c) => { initial[c.name] = true; });
    return initial;
  });

  const toggleCat = (name: string) => setExpandedCats((prev) => ({ ...prev, [name]: !prev[name] }));

  const visibleCategories = useMemo(() => {
    return NAV_CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter((item) => roleAllowsAdminPath(primaryRole, item.href)),
    })).filter((cat) => cat.items.length > 0);
  }, [primaryRole]);

  const isActive = (href: string) => {
    const [path, query] = href.split("?");
    if (!query) return location.pathname === path;
    return location.pathname === path && location.search.includes(query);
  };

  if (staffLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0b1018]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#1689e8] border-t-transparent" />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Loading Console...</span>
        </div>
      </div>
    );
  }

  if (!isStaff) return <Navigate to="/trade" replace />;
  if (!roleAllowsAdminPath(primaryRole, location.pathname)) return <Navigate to="/admin" replace />;

  return (
    <div className="flex h-screen overflow-hidden bg-[#0b1018] text-[#f1f5f9] font-sans antialiased">
      {/* Top Header */}
      <AdminHeader />

      <div className="flex flex-1 pt-14 overflow-hidden">
        {/* Sidebar */}
        <aside
          className="w-60 shrink-0 border-r flex flex-col justify-between overflow-y-auto no-scrollbar shadow-2xl z-20"
          style={{ background: BG_SIDEBAR, borderColor: BORDER }}
        >
          <div className="py-4 px-3 space-y-4">
            {visibleCategories.map((cat) => {
              const expanded = expandedCats[cat.name] ?? true;
              return (
                <div key={cat.name} className="space-y-1">
                  <button
                    onClick={() => toggleCat(cat.name)}
                    className="flex w-full items-center justify-between px-2.5 py-1 text-left text-[10px] font-black tracking-widest uppercase text-gray-400 hover:text-white transition-colors"
                  >
                    <span>{cat.name}</span>
                    {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </button>
                  {expanded && (
                    <div className="mt-1 space-y-0.5">
                      {cat.items.map((item) => {
                        const active = isActive(item.href);
                        return (
                          <Link
                            key={item.label}
                            to={item.href}
                            className={`group relative flex items-center justify-between rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                              active
                                ? "bg-[#1689e8]/15 text-[#1689e8] shadow-sm"
                                : "text-gray-400 hover:bg-white/[0.04] hover:text-white"
                            }`}
                          >
                            {active && (
                              <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[#1689e8] shadow-[0_0_8px_#1689e8]" />
                            )}
                            <div className="flex items-center gap-3 truncate">
                              <span className={active ? "text-[#1689e8]" : "text-gray-400 group-hover:text-gray-300"}>
                                {item.icon}
                              </span>
                              <span className="truncate">{item.label}</span>
                            </div>

                            {item.badge && (
                              <span className="rounded bg-[#00c878]/20 px-1.5 py-0.5 text-[9px] font-black text-[#00c878] tracking-wider">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer Admin User Info */}
          <div className="border-t p-3.5 flex items-center justify-between bg-[#080d16]/80 backdrop-blur-md" style={{ borderColor: BORDER }}>
            <div className="min-w-0 flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1689e8] to-indigo-600 text-xs font-black text-white shadow-md">
                {profile?.display_name?.charAt(0).toUpperCase() || "A"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-black text-white">{profile?.display_name || "Super Admin"}</p>
                <p className="truncate text-[10px] font-extrabold uppercase tracking-wider text-[#1689e8]">{getRoleLabel(primaryRole)}</p>
              </div>
            </div>
            <button
              onClick={() => void signOut()}
              className="p-2 text-gray-400 hover:bg-red-500/10 hover:text-[#ff4a5a] rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </aside>

        {/* Main Content Workspace Area */}
        <main className="flex-1 overflow-y-auto bg-[#0b1018] p-4 md:p-6 no-scrollbar">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;