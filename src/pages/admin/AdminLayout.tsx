import { useState, useEffect, useMemo } from "react";
import { Outlet, Link, Navigate, useLocation } from "react-router-dom";
import {
  DollarSign,
  LayoutDashboard,
  CandlestickChart,
  Clock,
  Wallet,
  Users,
  ShieldCheck,
  ArrowDownCircle,
  ArrowUpCircle,
  Receipt,
  Trophy,
  FileText,
  Bell,
  BookOpen,
  Settings,
  CreditCard,
  Search,
  TrendingUp,
  BarChart3,
  Activity,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  UserCheck,
  UserPlus,
  Image,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import { getRoleLabel, roleAllowsAdminPath } from "@/lib/adminRoles";

const ACCENT = "#D5006C";
const BG = "#0D0D0D";
const SURFACE = "#1A1A2A";
const BORDER = "#2A2A3A";
const TEXT_SEC = "#B0B0B0";

interface NavCategory {
  name: string;
  items: { label: string; href: string; icon: React.ReactNode }[];
}

const NAV_CATEGORIES: NavCategory[] = [
  {
    name: "MAIN",
    items: [{ label: "Dashboard", href: "/admin", icon: <LayoutDashboard size={20} /> }],
  },
  {
    name: "TRADING MANAGEMENT",
    items: [
      { label: "Live Trades", href: "/admin/trades", icon: <CandlestickChart size={20} /> },
      { label: "Trade History", href: "/admin/trades?tab=history", icon: <Clock size={20} /> },
      { label: "Assets", href: "/admin/assets", icon: <Wallet size={20} /> },
    ],
  },
  {
    name: "USERS",
    items: [
      { label: "All Users", href: "/admin/users", icon: <Users size={20} /> },
      { label: "KYC Verification", href: "/admin/users?tab=kyc", icon: <ShieldCheck size={20} /> },
      { label: "User Activity", href: "/admin/users?tab=activity", icon: <Activity size={20} /> },
    ],
  },
  {
    name: "FINANCE",
    items: [
      { label: "Deposits", href: "/admin/finance?tab=deposits", icon: <ArrowDownCircle size={20} /> },
      { label: "Withdrawals", href: "/admin/finance?tab=withdrawals", icon: <ArrowUpCircle size={20} /> },
      { label: "Transactions", href: "/admin/finance?tab=transactions", icon: <Receipt size={20} /> },
      { label: "Funds Manager", href: "/admin/funds", icon: <DollarSign size={20} /> },
    ],
  },
  {
    name: "TOURNAMENTS",
    items: [
      { label: "Active Tournaments", href: "/admin/tournaments", icon: <Trophy size={20} /> },
      { label: "Create Tournament", href: "/admin/tournaments?tab=create", icon: <Trophy size={20} /> },
      { label: "Results", href: "/admin/tournaments?tab=results", icon: <BarChart3 size={20} /> },
    ],
  },
  {
    name: "CONTENT",
    items: [
      { label: "Blog", href: "/admin/blog", icon: <FileText size={20} /> },
      { label: "Announcements", href: "/admin/notifications", icon: <Bell size={20} /> },
      { label: "Help Center", href: "/admin/guides", icon: <BookOpen size={20} /> },
      { label: "Guide Media", href: "/admin/guides/media", icon: <Image size={20} /> },
    ],
  },
  {
    name: "SETTINGS",
    items: [
      { label: "General", href: "/admin/settings", icon: <Settings size={20} /> },
      { label: "Payment Gateways", href: "/admin/crypto-payments", icon: <CreditCard size={20} /> },
      { label: "SEO", href: "/admin/settings?tab=seo", icon: <Search size={20} /> },
      { label: "Branding", href: "/admin/settings?tab=branding", icon: <ShieldCheck size={20} /> },
    ],
  },
  {
    name: "ANALYTICS",
    items: [
      { label: "Profit Reports", href: "/admin/reports", icon: <TrendingUp size={20} /> },
      { label: "User Analytics", href: "/admin/analytics", icon: <BarChart3 size={20} /> },
      { label: "Trading Volume", href: "/admin/analytics?tab=volume", icon: <Activity size={20} /> },
    ],
  },
];

const AdminLayout = () => {
  const { profile, signOut } = useAuth();
  const { logoUrl, platformName } = useSiteBranding();
  const { isStaff, loading: staffLoading, primaryRole } = useStaffAccess();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    NAV_CATEGORIES.forEach((c) => { initial[c.name] = true; });
    return initial;
  });

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const toggleCat = (name: string) =>
    setExpandedCats((prev) => ({ ...prev, [name]: !prev[name] }));

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

  const isCategoryActive = (items: NavCategory["items"]) =>
    items.some((item) => isActive(item.href));

  if (staffLoading) {
    return (
      <div className="admin-theme-dark flex h-screen items-center justify-center" style={{ background: BG }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: ACCENT }} />
      </div>
    );
  }

  if (!isStaff) return <Navigate to="/trade" replace />;
  if (!roleAllowsAdminPath(primaryRole, location.pathname)) return <Navigate to="/admin" replace />;

  return (
    <div
      className="admin-theme-dark flex h-[100dvh] overflow-hidden"
      style={{
        background: BG,
        color: "#FFFFFF",
        "--admin-canvas": "#0D0D0D",
        "--admin-surface": "#1A1A2A",
        "--admin-elevated": "#222738",
        "--admin-input": "#13161e",
        "--admin-border": "#2A2A3A",
        "--admin-text": "#FFFFFF",
        "--admin-text-secondary": "#B0B0B0",
        "--admin-text-muted": "#7890ab",
        "--admin-hover": "#2A2A3A",
        "--admin-hover-overlay": "rgba(255,255,255,0.04)",
        "--admin-green": "#00C076",
        "--admin-green-soft": "rgba(0,192,118,0.7)",
        "--admin-orange": "#D5006C",
        "--admin-orange-soft": "#D5006C",
      } as React.CSSProperties}
    >
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:relative top-0 bottom-0 left-0 z-50 md:z-auto flex w-64 flex-col border-r transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        style={{ background: BG, borderColor: BORDER }}
      >
        {/* Brand */}
        <div className="flex h-16 shrink-0 items-center gap-3 border-b px-5" style={{ borderColor: BORDER }}>
          {logoUrl ? (
            <img src={logoUrl} alt={platformName} className="h-8 object-contain" />
          ) : (
            <span className="text-lg font-bold tracking-wide text-white">Init Option</span>
          )}
        </div>

        {/* Nav */}
        <div className="no-scrollbar flex-1 overflow-y-auto px-3 py-4">
          {visibleCategories.map((cat) => {
            const expanded = expandedCats[cat.name] ?? true;
            return (
              <div key={cat.name} className="mb-3">
                <button
                  onClick={() => toggleCat(cat.name)}
                  className="flex w-full items-center justify-between px-2 py-1.5 text-left"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: TEXT_SEC }}>
                    {cat.name}
                  </span>
                  {expanded ? (
                    <ChevronDown size={14} style={{ color: TEXT_SEC }} />
                  ) : (
                    <ChevronRight size={14} style={{ color: TEXT_SEC }} />
                  )}
                </button>
                {expanded && (
                  <div className="mt-0.5 space-y-0.5">
                    {cat.items.map((item) => {
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.label}
                          to={item.href}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                          style={{
                            background: active ? ACCENT : "transparent",
                            color: active ? "#FFFFFF" : TEXT_SEC,
                          }}
                          onMouseEnter={(e) => {
                            if (!active) {
                              e.currentTarget.style.background = "#2A2A3A";
                              e.currentTarget.style.color = "#FFFFFF";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!active) {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.color = TEXT_SEC;
                            }
                          }}
                        >
                          {item.icon}
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Profile footer */}
        <div className="shrink-0 border-t p-4" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: ACCENT }}
            >
              {profile?.display_name?.charAt(0) || "A"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {profile?.display_name || "Admin"}
              </p>
              <p className="truncate text-xs" style={{ color: ACCENT }}>
                {getRoleLabel(primaryRole)}
              </p>
            </div>
            <button
              onClick={signOut}
              className="shrink-0 rounded-lg p-1.5 transition-colors hover:bg-white/10"
              style={{ color: TEXT_SEC }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 sm:px-6" style={{ background: SURFACE, borderColor: BORDER }}>
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-2 transition-colors hover:bg-white/10 md:hidden"
              style={{ color: TEXT_SEC }}
              onClick={() => setSidebarOpen((v) => !v)}
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-semibold text-white">
              {visibleCategories
                .flatMap((c) => c.items)
                .find((item) => isActive(item.href))?.label || "Dashboard"}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative hidden sm:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: TEXT_SEC }} />
              <input
                type="text"
                placeholder="Search users, trades, assets..."
                className="h-9 w-56 rounded-lg border bg-transparent pl-9 pr-3 text-sm text-white outline-none placeholder:text-sm"
                style={{ borderColor: BORDER, color: TEXT_SEC }}
              />
            </div>

            {/* Notifications */}
            <button className="relative rounded-lg p-2 transition-colors hover:bg-white/10" style={{ color: TEXT_SEC }}>
              <Bell size={20} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full" style={{ background: ACCENT }} />
            </button>

            {/* Profile */}
            <div className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ background: ACCENT }}
              >
                {profile?.display_name?.charAt(0) || "A"}
              </div>
              <span className="hidden text-sm font-medium text-white sm:block">
                {profile?.display_name || "Admin"}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="relative flex-1 overflow-auto p-4 sm:p-6 lg:p-8" style={{ background: BG }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
