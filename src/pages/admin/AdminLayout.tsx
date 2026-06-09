import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, Link, Navigate, useLocation } from "react-router-dom";
import {
  ShieldAlert,
  LayoutDashboard,
  Users,
  LineChart,
  Wallet,
  CandlestickChart,
  Settings,
  Tag,
  AlertTriangle,
  FileText,
  Bell,
  ScrollText,
  ShieldCheck,
  NotebookPen,
  LogOut,
  Bitcoin,
  Trophy,
  Menu,
  LifeBuoy,
  TrendingUp,
  Sun,
  Moon,
  BookOpen,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import { getRoleLabel, roleAllowsAdminPath } from "@/lib/adminRoles";

const AdminLayout = () => {
  const { t } = useTranslation();
  const { profile, signOut } = useAuth();
  const { isStaff, loading: staffLoading, primaryRole } = useStaffAccess();
  const location = useLocation();
  const { logoUrl, platformName } = useSiteBranding();

  const NAV_ITEMS = [
    { label: t("admin.nav.dashboard"), href: "/admin", icon: <LayoutDashboard size={18} />, exact: true },
    { label: t("admin.nav.supportInbox"), href: "/admin/support", icon: <LifeBuoy size={18} /> },
    { label: t("admin.nav.userManagement"), href: "/admin/users", icon: <Users size={18} /> },
    { label: t("admin.nav.tradeManagement"), href: "/admin/trades", icon: <LineChart size={18} /> },
    { label: t("admin.nav.transactions"), href: "/admin/finance", icon: <Wallet size={18} /> },
    { label: t("admin.nav.assetManagement"), href: "/admin/assets", icon: <CandlestickChart size={18} /> },
    { label: t("admin.nav.tournaments"), href: "/admin/tournaments", icon: <Trophy size={18} /> },
    { label: t("admin.nav.blog"), href: "/admin/blog", icon: <NotebookPen size={18} /> },
    { label: t("admin.nav.guides"), href: "/admin/guides", icon: <BookOpen size={18} /> },
    { label: "Guide Media", href: "/admin/guide-media", icon: <BookOpen size={18} /> },
    { label: t("admin.nav.platformSettings"), href: "/admin/settings", icon: <Settings size={18} /> },
    { label: "Promo Materials", href: "/admin/promo-materials", icon: <TrendingUp size={18} /> },
    { label: t("admin.nav.promoCodes"), href: "/admin/promos", icon: <Tag size={18} /> },
    { label: t("admin.nav.riskManagement"), href: "/admin/risk", icon: <AlertTriangle size={18} /> },
    { label: t("admin.nav.reports"), href: "/admin/reports", icon: <FileText size={18} /> },
    { label: t("admin.nav.notification"), href: "/admin/notifications", icon: <Bell size={18} /> },
    { label: t("admin.nav.auditLogs"), href: "/admin/audit", icon: <ScrollText size={18} /> },
    { label: t("admin.nav.adminUsers"), href: "/admin/admins", icon: <ShieldCheck size={18} /> },
    { label: t("admin.nav.cryptoPayments"), href: "/admin/crypto-payments", icon: <Bitcoin size={18} /> },
    { label: t("admin.nav.profitAnalytics"), href: "/admin/analytics", icon: <LineChart size={18} /> },
  ];

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminTheme, setAdminTheme] = useState(() => localStorage.getItem("adminTheme") || "dark");

  const toggleAdminTheme = () => {
    const next = adminTheme === "dark" ? "light" : "dark";
    setAdminTheme(next);
    localStorage.setItem("adminTheme", next);
  };

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const visibleNavItems = useMemo(() => {
    return NAV_ITEMS.filter((item) => roleAllowsAdminPath(primaryRole, item.href));
  }, [primaryRole]);

  if (staffLoading) {
    return (
      <div className="admin-theme flex h-screen items-center justify-center bg-[#0e1017] text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0fa053] border-t-transparent" />
      </div>
    );
  }

  if (!isStaff) {
    return <Navigate to="/trade" replace />;
  }

  if (!roleAllowsAdminPath(primaryRole, location.pathname)) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className={`admin-theme-${adminTheme} flex h-[100dvh] overflow-hidden bg-[var(--admin-canvas)] font-sans text-gray-200`}>
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed md:relative top-0 bottom-0 left-0 z-50 md:z-auto w-64 bg-[#1a1e2b] border-r border-[#2a2f42] flex flex-col pt-1 transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <Link
          to="/"
          className="flex h-16 shrink-0 cursor-pointer items-center gap-3 border-b border-[#2a2f42] bg-[#1a1e2b] px-6 transition-colors hover:bg-[#1a1e2b]"
          title={t("admin.returnToSite")}
        >
          {logoUrl ? (
            <img src={logoUrl} alt={platformName} className="h-8 object-contain" />
          ) : (
            <>
              <ShieldAlert className="h-6 w-6 shrink-0 text-[#ffc27a]" />
              <span className="truncate text-lg font-bold tracking-wide text-white">{t("admin.portal")}</span>
            </>
          )}
        </Link>

        <div className="no-scrollbar flex-1 space-y-1 overflow-y-auto px-3 py-6">
          {visibleNavItems.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.href
              : location.pathname.startsWith(item.href);

            return (
              <Link
                key={item.label}
                to={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "border border-[#ff9a3d]/20 bg-[linear-gradient(90deg,rgba(255,154,61,0.16),rgba(55,163,114,0.14))] text-white shadow-[0_18px_40px_rgba(255,154,61,0.08)]"
                    : "text-[#a7bfd8] hover:bg-[#1a1e2b] hover:text-white"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="shrink-0 border-t border-[#2a2f42] p-4">
          <div className="flex items-center gap-3 rounded-xl bg-[#1a1e2b] px-3 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#0fa053] to-[#1a1e2b] text-xs font-bold text-white">
              {profile?.display_name?.charAt(0) || "A"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{profile?.display_name || t("admin.adminUser")}</p>
              <p className="truncate text-xs text-[#ffc27a]">{getRoleLabel(primaryRole)}</p>
            </div>
            <button onClick={signOut} className="shrink-0 text-[#a7bfd8] transition-colors hover:text-[#ffc27a]">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="md:ml-0 flex min-w-0 flex-1 flex-col bg-[#0e1017]">
        <header className="z-10 flex h-16 shrink-0 items-center justify-between border-b border-[#2a2f42] bg-[#1a1e2b]/50 px-4 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-2 text-[#a7bfd8] transition-colors hover:bg-[#1a1e2b] hover:text-white md:hidden"
              onClick={() => setSidebarOpen((value) => !value)}
            >
              <Menu size={20} />
            </button>
            <div>
              <div className="hidden text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ffc27a] sm:block">
                {t("admin.desk")}
              </div>
              <h1 className="truncate text-lg font-bold text-white sm:text-xl">
                {visibleNavItems.find((item) => (item.exact ? location.pathname === item.href : location.pathname.startsWith(item.href)))?.label ||
                  t("admin.nav.dashboard")}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/trade"
              className="flex items-center gap-2 rounded-lg border border-[#0fa053]/30 bg-[#0fa053]/10 px-3 py-1.5 text-sm font-semibold text-[#0fa053] transition-colors hover:bg-[#0fa053]/20"
              title={t("admin.returnToSite")}
            >
              <TrendingUp size={16} />
              <span className="hidden sm:inline">{t("admin.goToTrade")}</span>
            </Link>
            <button
              onClick={toggleAdminTheme}
              className="rounded-full p-2 text-[var(--admin-text-secondary)] transition-colors hover:bg-[var(--admin-hover)] hover:text-[var(--admin-orange-soft)]"
              title={adminTheme === "dark" ? t("admin.switchLight") : t("admin.switchDark")}
            >
              {adminTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="relative rounded-full p-2 text-[var(--admin-text-secondary)] transition-colors hover:bg-[var(--admin-hover)] hover:text-[var(--admin-orange-soft)]">
              <Bell size={20} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500"></span>
            </button>
          </div>
        </header>

        <div className="relative flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
