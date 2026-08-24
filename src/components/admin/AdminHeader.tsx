"use client";

import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  ChevronDown,
  LogOut,
  User,
  Settings,
  Shield,
  Activity,
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
  Receipt,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  LayoutDashboard,
} from "lucide-react";
import { SiteLogo } from "@/components/branding/SiteLogo";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import { getRoleLabel } from "@/lib/adminRoles";

const ACCENT = "#00C98D";
const BG_SURFACE = "#0D1420";
const BORDER = "#202B3A";
const TEXT_PRIMARY = "#F1F5F9";
const TEXT_SECONDARY = "#8D9AAF";

interface Notification {
  description: string;
  id: string;
  link?: string;
  read: boolean;
  timestamp: string;
  title: string;
  type: "deposit" | "withdrawal" | "kyc" | "registration" | "payment_failure" | "system";
}

const mockNotifications: Notification[] = [
  { id: "1", type: "withdrawal", title: "Withdrawal Request", description: "User #8923 requested $2,450 withdrawal via M-PESA", timestamp: "2 min ago", read: false, link: "/admin/finance?tab=withdrawals" },
  { id: "2", type: "deposit", title: "New Deposit", description: "User #7156 deposited $500 via Crypto (USDT)", timestamp: "15 min ago", read: false, link: "/admin/finance?tab=deposits" },
  { id: "3", type: "kyc", title: "KYC Verification", description: "User #3421 submitted documents for verification", timestamp: "1 hour ago", read: true, link: "/admin/users?tab=kyc" },
];

function Dropdown({ children, isOpen, onClose }: { children: React.ReactNode; isOpen: boolean; onClose: () => void }) {
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
        className="absolute right-4 top-14 w-80 rounded-xl border bg-[#0D1420] p-3 text-xs shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150"
        style={{ borderColor: BORDER }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function AdminHeader() {
  const { profile, signOut } = useAuth();
  const { logoUrl, platformName } = useSiteBranding();
  const { isAdmin, primaryRole } = useStaffAccess();
  const location = useLocation();
  const navigate = useNavigate();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const getPageTitle = (path: string) => {
    if (path === "/admin") return "Dashboard Overview";
    if (path.startsWith("/admin/trades")) return "Live Trading Console";
    if (path.startsWith("/admin/users")) return "User Management & Directory";
    if (path.startsWith("/admin/finance")) return "Financial Operations Console";
    if (path.startsWith("/admin/crypto-payments")) return "Payment Infrastructure";
    if (path.startsWith("/admin/social")) return "Copy Trading & Social Console";
    if (path.startsWith("/admin/tournaments")) return "Tournaments Management";
    if (path.startsWith("/admin/reports")) return "Analytics & Profit Reports";
    if (path.startsWith("/admin/settings")) return "Platform Configuration";
    if (path.startsWith("/admin/audit")) return "System Audit Ledger";
    return "Operations Console";
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/admin/users?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const unreadCount = mockNotifications.filter((n) => !n.read).length;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-13 border-b px-4 md:px-6 flex items-center justify-between" style={{ background: BG_SURFACE, borderColor: BORDER }}>
      {/* Left: Brand + Page Title */}
      <div className="flex items-center gap-4 min-w-0">
        <Link to="/admin" className="flex items-center gap-2 shrink-0">
          <SiteLogo logoOverride={logoUrl} showText={false} className="h-6 w-auto" />
          <span className="text-xs font-black uppercase tracking-wider text-white hidden sm:inline">{platformName || "InitOption"}</span>
        </Link>
        <span className="h-4 w-px bg-[#202B3A] hidden sm:inline" />
        <h1 className="text-xs font-bold text-[#F1F5F9] truncate">{getPageTitle(location.pathname)}</h1>
      </div>

      {/* Right: Global Search, System Status, Notifications, Profile */}
      <div className="flex items-center gap-3">
        {/* Global Search */}
        <form onSubmit={handleSearch} className="relative hidden md:block w-64">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search users, trades, references..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 rounded-lg border bg-[#080D16] pl-8 pr-3 text-xs text-white outline-none placeholder:text-gray-500 focus:border-[#00C98D]"
            style={{ borderColor: BORDER }}
          />
        </form>

        {/* System Status Pill */}
        <div className="hidden sm:flex items-center gap-2 rounded-lg border border-[#00C98D]/20 bg-[#00C98D]/10 px-2.5 py-1">
          <span className="relative flex h-2 w-2 rounded-full bg-[#00C98D]">
            <span className="absolute inset-0 h-2 w-2 animate-ping rounded-full bg-[#00C98D] opacity-75" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#00C98D]">SYSTEM ONLINE</span>
        </div>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileOpen(false); }}
            className="relative rounded-lg border border-white/5 p-1.5 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#EF4444] text-[9px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          <Dropdown isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)}>
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-bold text-white">System Notifications</span>
              <span className="text-[10px] text-gray-400">{unreadCount} unread</span>
            </div>
            <div className="mt-2 space-y-1.5">
              {mockNotifications.map((n) => (
                <Link
                  key={n.id}
                  to={n.link || "#"}
                  onClick={() => setNotificationsOpen(false)}
                  className="block rounded-lg border border-white/5 bg-black/20 p-2 text-xs transition-colors hover:bg-white/5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{n.title}</span>
                    <span className="text-[10px] text-gray-500">{n.timestamp}</span>
                  </div>
                  <p className="mt-0.5 text-gray-400 leading-tight">{n.description}</p>
                </Link>
              ))}
            </div>
          </Dropdown>
        </div>

        {/* Admin Profile */}
        <div className="relative">
          <button
            onClick={() => { setProfileOpen(!profileOpen); setNotificationsOpen(false); }}
            className="flex items-center gap-2 rounded-lg border border-white/5 p-1.5 transition-colors hover:bg-white/5"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#00C98D] text-xs font-bold text-black">
              {profile?.display_name?.charAt(0) || "A"}
            </div>
            <span className="hidden md:inline text-xs font-semibold text-white max-w-[100px] truncate">
              {profile?.display_name || "Admin"}
            </span>
            <ChevronDown className="h-3 w-3 text-gray-400" />
          </button>

          <Dropdown isOpen={profileOpen} onClose={() => setProfileOpen(false)}>
            <div className="border-b border-white/10 pb-2">
              <p className="font-bold text-white">{profile?.display_name || "Administrator"}</p>
              <p className="text-[10px] text-[#00C98D]">{getRoleLabel(primaryRole)}</p>
            </div>
            <div className="mt-2 space-y-1">
              <Link to="/admin/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-white/5 text-gray-300 hover:text-white">
                <Settings className="h-3.5 w-3.5 text-gray-400" /> Settings
              </Link>
              <Link to="/admin/audit" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-white/5 text-gray-300 hover:text-white">
                <Shield className="h-3.5 w-3.5 text-gray-400" /> Audit Ledger
              </Link>
              <button onClick={() => { void signOut(); setProfileOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[#EF4444] hover:bg-[#EF4444]/10">
                <LogOut className="h-3.5 w-3.5" /> Sign Out
              </button>
            </div>
          </Dropdown>
        </div>
      </div>
    </header>
  );
}

export default AdminHeader;