import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import {
  Activity, ArrowDownCircle, ArrowUpCircle, BarChart3, Bell, BookOpen,
  CandlestickChart, ChevronDown, ChevronRight, Clock, CreditCard, DollarSign,
  FileText, LayoutDashboard, LogOut, Receipt, Search, Settings, ShieldCheck,
  TrendingUp, Trophy, Users, Wallet, Image, Sliders, Shield, RefreshCw,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import { getRoleLabel, roleAllowsAdminPath } from "@/lib/adminRoles";
import { AdminHeader } from "@/components/admin/AdminHeader";

const ACCENT = "#00C98D";
const BG_CANVAS = "#080D16";
const BG_SIDEBAR = "#0D1420";
const BORDER = "#202B3A";
const TEXT_MUTED = "#5E6B7D";
const TEXT_SECONDARY = "#8D9AAF";

interface NavCategory {
  items: { href: string; icon: React.ReactNode; label: string }[];
  name: string;
}

const NAV_CATEGORIES: NavCategory[] = [
  {
    name: "MAIN",
    items: [{ label: "Dashboard", href: "/admin", icon: <LayoutDashboard size={15} /> }],
  },
  {
    name: "TRADING",
    items: [
      { label: "Live Trades", href: "/admin/trades", icon: <CandlestickChart size={15} /> },
      { label: "Trade History", href: "/admin/trades?tab=history", icon: <Clock size={15} /> },
      { label: "Assets Config", href: "/admin/assets", icon: <Wallet size={15} /> },
    ],
  },
  {
    name: "USERS",
    items: [
      { label: "All Users", href: "/admin/users", icon: <Users size={15} /> },
      { label: "KYC Verification", href: "/admin/users?tab=kyc", icon: <ShieldCheck size={15} /> },
      { label: "User Activity", href: "/admin/user-activity", icon: <Activity size={15} /> },
      { label: "Risk Management", href: "/admin/risk", icon: <Shield size={15} /> },
    ],
  },
  {
    name: "FINANCE",
    items: [
      { label: "Deposits Queue", href: "/admin/finance?tab=deposits", icon: <ArrowDownCircle size={15} /> },
      { label: "Withdrawals Queue", href: "/admin/finance?tab=withdrawals", icon: <ArrowUpCircle size={15} /> },
      { label: "Ledger Transactions", href: "/admin/finance?tab=transactions", icon: <Receipt size={15} /> },
      { label: "Funds Manager", href: "/admin/funds", icon: <DollarSign size={15} /> },
    ],
  },
  {
    name: "PAYMENTS",
    items: [
      { label: "Crypto Payments", href: "/admin/crypto-payments", icon: <CreditCard size={15} /> },
    ],
  },
  {
    name: "GROWTH",
    items: [
      { label: "Promo Codes", href: "/admin/promos", icon: <DollarSign size={15} /> },
      { label: "Tournaments", href: "/admin/tournaments", icon: <Trophy size={15} /> },
    ],
  },
  {
    name: "SOCIAL",
    items: [
      { label: "Copy Trading", href: "/admin/social", icon: <Sliders size={15} /> },
    ],
  },
  {
    name: "ANALYTICS",
    items: [
      { label: "Profit Reports", href: "/admin/reports", icon: <TrendingUp size={15} /> },
      { label: "Trading Analytics", href: "/admin/analytics", icon: <BarChart3 size={15} /> },
    ],
  },
  {
    name: "SYSTEM",
    items: [
      { label: "Announcements", href: "/admin/notifications", icon: <Bell size={15} /> },
      { label: "Audit Logs", href: "/admin/audit", icon: <FileText size={15} /> },
      { label: "Platform Settings", href: "/admin/settings", icon: <Settings size={15} /> },
    ],
  },
];

const AdminLayout = () => {
  const { profile, signOut } = useAuth();
  const { logoUrl, platformName } = useSiteBranding();
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
      <div className="flex h-screen items-center justify-center bg-[#080D16]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#00C98D] border-t-transparent" />
      </div>
    );
  }

  if (!isStaff) return <Navigate to="/trade" replace />;
  if (!roleAllowsAdminPath(primaryRole, location.pathname)) return <Navigate to="/admin" replace />;

  return (
    <div className="flex h-screen overflow-hidden bg-[#080D16] text-[#F1F5F9]">
      {/* Top Header */}
      <AdminHeader />

      <div className="flex flex-1 pt-13">
        {/* Sidebar */}
        <aside
          className="w-56 shrink-0 border-r flex flex-col justify-between overflow-y-auto no-scrollbar"
          style={{ background: BG_SIDEBAR, borderColor: BORDER }}
        >
          <div className="py-3 px-2">
            {visibleCategories.map((cat) => {
              const expanded = expandedCats[cat.name] ?? true;
              return (
                <div key={cat.name} className="mb-2">
                  <button
                    onClick={() => toggleCat(cat.name)}
                    className="flex w-full items-center justify-between px-2 py-1 text-left text-[10px] font-bold tracking-wider uppercase text-[#5E6B7D]"
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
                            className={`relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                              active
                                ? "bg-[#00C98D]/10 text-[#00C98D]"
                                : "text-[#8D9AAF] hover:bg-white/[0.03] hover:text-white"
                            }`}
                          >
                            {/* Thin vertical green indicator for active item */}
                            {active && (
                              <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r bg-[#00C98D]" />
                            )}
                            <span className={active ? "text-[#00C98D]" : "text-gray-400"}>{item.icon}</span>
                            <span className="truncate">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer User Info */}
          <div className="border-t p-3 flex items-center justify-between" style={{ borderColor: BORDER }}>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-white">{profile?.display_name || "Admin User"}</p>
              <p className="truncate text-[10px] font-semibold text-[#00C98D]">{getRoleLabel(primaryRole)}</p>
            </div>
            <button onClick={signOut} className="p-1 text-gray-400 hover:text-[#EF4444] transition-colors" title="Sign Out">
              <LogOut size={14} />
            </button>
          </div>
        </aside>

        {/* Main Content Workspace Area */}
        <main className="flex-1 overflow-y-auto bg-[#080D16] p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;