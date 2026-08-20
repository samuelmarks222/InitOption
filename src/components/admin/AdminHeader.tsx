"use client";

import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  ChevronDown,
  Menu,
  X,
  LogOut,
  User,
  Settings,
  Shield,
  Activity,
  Circle,
  Plus,
  Eye,
  TrendingUp,
  Users,
  Wallet,
  CreditCard,
  Gift,
  Trophy,
  FileText,
  BarChart3,
  ArrowDownCircle,
  ArrowUpCircle,
  Receipt,
  ShieldCheck,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  UserCheck,
  Loader2,
  LayoutDashboard,
} from "lucide-react";
import { SiteLogo } from "@/components/branding/SiteLogo";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import { useStaffAccess } from "@/hooks/useStaffAccess";

import { getRoleLabel } from "@/lib/adminRoles";

const ACCENT = "#00C076";
const ACCENT_SOFT = "rgba(0,192,118,0.15)";
const BG = "#0A0E17";
const SURFACE = "#111827";
const SURFACE_ELEVATED = "#1A2234";
const BORDER = "#1F2A3E";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SECONDARY = "#94A3B8";
const TEXT_MUTED = "#64748B";

interface Notification {
  id: string;
  type: "deposit" | "withdrawal" | "kyc" | "registration" | "payment_failure" | "system";
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  link?: string;
}

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  href: string;
  variant: "primary" | "secondary" | "alert";
  badge?: string;
}

const MAIN_NAV = [
  { key: "dashboard", label: "Dashboard", icon: <TrendingUp size={18} />, href: "/admin" },
  { key: "users", label: "Users", icon: <Users size={18} />, href: "/admin/users" },
  { key: "trading", label: "Trading", icon: <Wallet size={18} />, href: "/admin/trades" },
  { key: "deposits", label: "Deposits", icon: <ArrowDownCircle size={18} />, href: "/admin/finance?tab=deposits" },
  { key: "withdrawals", label: "Withdrawals", icon: <ArrowUpCircle size={18} />, href: "/admin/finance?tab=withdrawals" },
  { key: "transactions", label: "Transactions", icon: <Receipt size={18} />, href: "/admin/finance?tab=transactions" },
  { key: "payments", label: "Payments", icon: <CreditCard size={18} />, href: "/admin/crypto-payments" },
  { key: "bonuses", label: "Bonuses", icon: <Gift size={18} />, href: "/admin/settings?tab=bonuses" },
  { key: "referrals", label: "Referrals", icon: <UserPlus size={18} />, href: "/admin/users?tab=referrals" },
  { key: "tournaments", label: "Tournaments", icon: <Trophy size={18} />, href: "/admin/tournaments" },
  { key: "reports", label: "Reports", icon: <BarChart3 size={18} />, href: "/admin/reports" },
  { key: "settings", label: "Settings", icon: <Settings size={18} />, href: "/admin/settings" },
];

const NOTIFICATION_ICONS: Record<Notification["type"], React.ReactNode> = {
  deposit: <ArrowDownCircle size={16} className="text-green-400" />,
  withdrawal: <ArrowUpCircle size={16} className="text-red-400" />,
  kyc: <ShieldCheck size={16} className="text-blue-400" />,
  registration: <UserPlus size={16} className="text-purple-400" />,
  payment_failure: <AlertCircle size={16} className="text-amber-400" />,
  system: <CheckCircle2 size={16} className="text-cyan-400" />,
};

const NOTIFICATION_LABELS: Record<Notification["type"], string> = {
  deposit: "New Deposit",
  withdrawal: "Withdrawal Request",
  kyc: "KYC Verification",
  registration: "New User Registration",
  payment_failure: "Payment Failure",
  system: "System Alert",
};

const mockNotifications: Notification[] = [
  { id: "1", type: "withdrawal", title: "Withdrawal Request", description: "User #8923 requested $2,450 withdrawal via M-PESA", timestamp: "2 min ago", read: false, link: "/admin/finance?tab=withdrawals" },
  { id: "2", type: "deposit", title: "New Deposit", description: "User #7156 deposited $500 via Crypto (USDT)", timestamp: "15 min ago", read: false, link: "/admin/finance?tab=deposits" },
  { id: "3", type: "kyc", title: "KYC Verification", description: "User #3421 submitted documents for verification", timestamp: "1 hour ago", read: true, link: "/admin/users?tab=kyc" },
  { id: "4", type: "registration", title: "New User Registration", description: "New user registered from Kenya", timestamp: "3 hours ago", read: true, link: "/admin/users" },
  { id: "5", type: "payment_failure", title: "Payment Failure", description: "M-PESA deposit failed for User #9123 - insufficient funds", timestamp: "5 hours ago", read: false, link: "/admin/finance?tab=deposits" },
  { id: "6", type: "system", title: "System Alert", description: "Database backup completed successfully", timestamp: "12 hours ago", read: true },
];

const pendingWithdrawalsCount = 12;

function Dropdown({ isOpen, onClose, children, align = "right" }: { isOpen: boolean; onClose: () => void; children: React.ReactNode; align?: "left" | "right" }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div ref={ref} className="fixed inset-0 z-50" onClick={onClose}>
      <div
        className={`absolute top-full mt-2 w-80 rounded-xl border bg-[#0F172A] shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150`}
        style={{ borderColor: BORDER, right: align === "right" ? 0 : undefined, left: align === "left" ? 0 : undefined }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function NotificationDropdown({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const unreadCount = mockNotifications.filter((n) => !n.read).length;

  return (
    <Dropdown isOpen={isOpen} onClose={onClose} align="right">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={() => {
                // mark all as read
              }}
              className="text-xs text-[var(--admin-green)] hover:underline"
              style={{ color: ACCENT }}
            >
              Mark all as read
            </button>
          )}
        </div>
        <div className="max-h-[360px] overflow-y-auto space-y-2">
          {mockNotifications.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                if (n.link) window.location.href = n.link;
                onClose();
              }}
              className={`w-full p-3 rounded-lg text-left transition-colors ${
                !n.read ? "bg-white/[0.03]" : "hover:bg-white/[0.02]"
              }`}
              style={{ borderColor: !n.read ? ACCENT_SOFT : "transparent", borderWidth: !n.read ? 1 : 0 }}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">{NOTIFICATION_ICONS[n.type]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-white truncate">{NOTIFICATION_LABELS[n.type]}</p>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">{n.timestamp}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400 truncate">{n.description}</p>
                  {!n.read && <div className="mt-2 h-1 w-1 rounded-full" style={{ background: ACCENT }} />}
                </div>
              </div>
            </button>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t">
          <button
            onClick={() => onClose()}
            className="w-full text-center text-sm font-medium text-slate-400 hover:text-white transition-colors"
            style={{ borderColor: BORDER }}
          >
            View all notifications
          </button>
        </div>
      </div>
    </Dropdown>
  );
}

function ProfileDropdown({ isOpen, onClose, profile, primaryRole, signOut, isStaff }: {
  isOpen: boolean;
  onClose: () => void;
  profile: { display_name?: string; username?: string } | null;
  primaryRole: string | null;
  signOut: () => void;
  isStaff: boolean;
}) {
  return (
    <Dropdown isOpen={isOpen} onClose={onClose} align="right">
      <div className="p-2">
        <div className="px-3 py-3 border-b" style={{ borderColor: BORDER }}>
          <p className="text-sm font-semibold text-white truncate">
            {profile?.display_name || profile?.username || "Administrator"}
          </p>
          <p className="text-xs text-slate-400 truncate mt-0.5">{getRoleLabel(primaryRole) || "Administrator"}</p>
        </div>
        <div className="py-1 space-y-1">
          <Link
            to="/admin/settings?tab=profile"
            onClick={onClose}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-white/[0.05] hover:text-white transition-colors"
          >
            <User size={18} />
            My Profile
          </Link>
          <Link
            to="/admin/settings"
            onClick={onClose}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-white/[0.05] hover:text-white transition-colors"
          >
            <Settings size={18} />
            Account Settings
          </Link>
          <Link
            to="/admin/settings?tab=security"
            onClick={onClose}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-white/[0.05] hover:text-white transition-colors"
          >
            <Shield size={18} />
            Security / 2FA
          </Link>
          <Link
            to="/admin/user-activity"
            onClick={onClose}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-white/[0.05] hover:text-white transition-colors"
          >
            <Activity size={18} />
            Activity Logs
          </Link>
          {isStaff && (
            <Link
              to="/admin"
              onClick={onClose}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-white/[0.05] hover:text-white transition-colors"
            >
              <LayoutDashboard size={18} />
              Admin Panel
            </Link>
          )}
          <div className="border-t my-1" style={{ borderColor: BORDER }} />
          <button
            onClick={() => { signOut(); onClose(); }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>
    </Dropdown>
  );
}

function QuickActionsDropdown({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const actions: QuickAction[] = [
    { label: "Add Funds", icon: <Plus size={18} />, href: "/admin/funds", variant: "primary" },
    { label: "Review Withdrawals", icon: <Eye size={18} />, href: "/admin/finance?tab=withdrawals", variant: "alert", badge: `${pendingWithdrawalsCount} Pending` },
    { label: "View Transactions", icon: <Receipt size={18} />, href: "/admin/finance?tab=transactions", variant: "secondary" },
  ];

  return (
    <Dropdown isOpen={isOpen} onClose={onClose} align="right">
      <div className="p-2 space-y-1">
        {actions.map((action) => (
          <Link
            key={action.label}
            to={action.href}
            onClick={onClose}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              action.variant === "primary"
                ? "bg-[var(--admin-green)] text-white hover:bg-green-600"
                : action.variant === "alert"
                ? "bg-[#D5006C]/10 text-[#D5006C] hover:bg-[#D5006C]/20 border border-[#D5006C]/30"
                : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
            }`}
            style={{ backgroundColor: action.variant === "secondary" ? undefined : undefined }}
          >
            {action.icon}
            <span className="flex-1">{action.label}</span>
            {action.badge && (
              <span className="px-2 py-0.5 text-[10px] font-medium rounded-full" style={{
                backgroundColor: action.variant === "alert" ? "#D5006C" : "rgba(0,192,118,0.2)",
                color: action.variant === "alert" ? "#FFFFFF" : ACCENT,
              }}>
                {action.badge}
              </span>
            )}
          </Link>
        ))}
      </div>
    </Dropdown>
  );
}

export function AdminHeader() {
  const { profile, signOut } = useAuth();
  const { logoUrl, platformName } = useSiteBranding();
  const { isStaff, primaryRole, loading: staffLoading } = useStaffAccess();
  const location = useLocation();
  const navigate = useNavigate();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const activeNavKey = MAIN_NAV.find((n) => {
    const [path] = n.href.split("?");
    if (!n.href.includes("?")) return location.pathname === path;
    return location.pathname === path && location.search.includes(n.href.split("?")[1]);
  })?.key || "dashboard";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/admin/users?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50" style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}` }}>
      {/* Top Header Bar */}
      <div className="h-14 flex items-center justify-between px-4 sm:px-6 border-b" style={{ borderColor: BORDER }}>
        <div className="flex items-center gap-4 min-w-0">
          {/* Hamburger (mobile) */}
          <button
            className="md:hidden rounded-lg p-2 transition-colors hover:bg-white/[0.05]"
            style={{ color: TEXT_SECONDARY }}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Logo + Admin Panel label */}
          <div className="flex items-center gap-2 min-w-0">
            <SiteLogo logoOverride={logoUrl} showText={false} className="flex-shrink-0" />
            <div className="hidden sm:block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: ACCENT }}>
                Admin Panel
              </span>
            </div>
          </div>

          {/* Main Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1 ml-4" style={{ borderLeft: `1px solid ${BORDER}`, paddingLeft: 16 }}>
            {MAIN_NAV.map((nav) => {
              const isActive = activeNavKey === nav.key;
              return (
                <Link
                  key={nav.key}
                  to={nav.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-[var(--admin-green)]/10 text-white"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.03]"
                  }`}
                  style={{
                    color: isActive ? ACCENT : TEXT_SECONDARY,
                    backgroundColor: isActive ? ACCENT_SOFT : undefined,
                  }}
                >
                  {nav.icon}
                  <span className="hidden sm:inline">{nav.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3 min-w-0">
          {/* Global Search */}
          <form onSubmit={handleSearch} className="relative hidden md:block w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none" style={{ color: TEXT_MUTED }} />
            <input
              type="text"
              placeholder="Search users, trades, assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 rounded-lg border bg-[#0A0E17]/80 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-500 transition-all"
              style={{ borderColor: BORDER }}
              autoComplete="off"
            />
          </form>

          {/* System Status */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "rgba(0,192,118,0.08)", border: `1px solid ${ACCENT_SOFT}` }}>
            <span className="relative flex h-2 w-2 rounded-full" style={{ background: ACCENT }}>
              <span className="absolute inset-0 h-2 w-2 rounded-full animate-ping" style={{ background: ACCENT, opacity: 0.6 }} />
            </span>
            <span className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: ACCENT }}>System Online</span>
          </div>

          {/* Quick Actions */}
          <div className="relative">
            <button
              onClick={() => { setQuickActionsOpen(!quickActionsOpen); setNotificationsOpen(false); setProfileOpen(false); }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-sm transition-colors hover:bg-white/[0.05]"
              style={{ color: TEXT_SECONDARY }}
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Quick Actions</span>
              <ChevronDown size={14} />
            </button>
            <QuickActionsDropdown isOpen={quickActionsOpen} onClose={() => setQuickActionsOpen(false)} />
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => { setNotificationsOpen(!notificationsOpen); setQuickActionsOpen(false); setProfileOpen(false); }}
              className="relative rounded-lg p-2 transition-colors hover:bg-white/[0.05]"
              style={{ color: TEXT_SECONDARY }}
              aria-label="Notifications"
            >
              <Bell size={20} />
              <span className="absolute -right-1 -top-1 h-5 w-5 flex items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: "#D5006C" }}>
                {mockNotifications.filter((n) => !n.read).length || ""}
              </span>
            </button>
            <NotificationDropdown isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
          </div>

          {/* Profile */}
          <div className="relative ml-2">
            <button
              onClick={() => { setProfileOpen(!profileOpen); setNotificationsOpen(false); setQuickActionsOpen(false); }}
              className="flex items-center gap-2 pr-2 rounded-lg transition-colors hover:bg-white/[0.03]"
              style={{ color: TEXT_PRIMARY }}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: ACCENT }}>
                {profile?.display_name?.charAt(0) || profile?.username?.charAt(0) || "A"}
              </div>
              <div className="hidden sm:block text-left min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {profile?.display_name || profile?.username || "Administrator"}
                </p>
                <p className="text-[10px] font-medium truncate" style={{ color: ACCENT }}>
                  {getRoleLabel(primaryRole) || "Administrator"}
                </p>
              </div>
              <ChevronDown size={14} className="ml-1 shrink-0" style={{ color: TEXT_MUTED }} />
            </button>
            <ProfileDropdown
              isOpen={profileOpen}
              onClose={() => setProfileOpen(false)}
              profile={profile}
              primaryRole={primaryRole}
              signOut={signOut}
              isStaff={isStaff}
            />
          </div>
        </div>
      </div>

      {/* Mobile Navigation Tabs (scrollable) */}
      <div className="lg:hidden overflow-x-auto pb-2 px-4" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        <nav className="flex items-center gap-2 min-w-max" style={{ paddingBottom: 4 }}>
          {MAIN_NAV.map((nav) => {
            const isActive = activeNavKey === nav.key;
            return (
              <Link
                key={nav.key}
                to={nav.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap shrink-0 ${
                  isActive
                    ? "bg-[var(--admin-green)]/10 text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.03]"
                }`}
                style={{
                  color: isActive ? ACCENT : TEXT_SECONDARY,
                  backgroundColor: isActive ? ACCENT_SOFT : undefined,
                }}
              >
                {nav.icon}
                <span>{nav.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

export default AdminHeader;