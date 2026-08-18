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
import { AdminHeader } from "@/components/admin/AdminHeader";

const ACCENT = "#D5006C";
const BG = "#0A0E17";
const SURFACE = "#111827";
const BORDER = "#1F2A3E";
const TEXT_SEC = "#94A3B8";

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
      { label: "User Activity", href: "/admin/user-activity", icon: <Activity size={20} /> },
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
        "--admin-canvas": "#0A0E17",
        "--admin-surface": "#111827",
        "--admin-elevated": "#1A2234",
        "--admin-input": "#0F172A",
        "--admin-border": "#1F2A3E",
        "--admin-text": "#FFFFFF",
        "--admin-text-secondary": "#94A3B8",
        "--admin-text-muted": "#64748B",
        "--admin-hover": "#1F2A3E",
        "--admin-hover-overlay": "rgba(255,255,255,0.03)",
        "--admin-green": "#00C076",
        "--admin-green-soft": "rgba(0,192,118,0.15)",
        "--admin-orange": "#D5006C",
        "--admin-orange-soft": "rgba(213,0,108,0.15)",
      } as React.CSSProperties}
    >
      {/* Fixed Header */}
      <AdminHeader />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:relative top-14 bottom-0 left-0 z-50 md:z-auto flex w-64 flex-col border-r transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        style={{ background: BG, borderColor: BORDER }}
      >
        {/* Brand - minimal on desktop, hidden on mobile since header has logo */}
        <div className="md:flex h-12 shrink-0 items-center gap-3 border-b px-5 hidden" style={{ borderColor: BORDER }}>
          {logoUrl ? (
            <img src={logoUrl} alt={platformName} className="h-7 object-contain" />
          ) : (
            <span className="text-sm font-bold tracking-wide text-white">Init Option</span>
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
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: TEXT_SEC }}>
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
                            background: active ? "rgba(0,192,118,0.15)" : "transparent",
                            color: active ? "#00C076" : TEXT_SEC,
                          }}
                          onMouseEnter={(e) => {
                            if (!active) {
                              e.currentTarget.style.background = "rgba(255,255,255,0.03)";
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
              style={{ background: "#00C076" }}
            >
              {profile?.display_name?.charAt(0) || "A"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {profile?.display_name || "Admin"}
              </p>
              <p className="truncate text-xs" style={{ color: "#00C076" }}>
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
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        {/* Page content - account for fixed header (h-14 = 56px) + mobile nav bar (~44px on mobile) */}
        <main className="relative flex-1 overflow-auto pt-14 lg:pt-0 pb-4 px-4 sm:px-6 lg:px-8" style={{ background: BG }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;