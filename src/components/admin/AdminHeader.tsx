"use client";

import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  ChevronDown,
  LogOut,
  Settings,
  Shield,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";
import { SiteLogo } from "@/components/branding/SiteLogo";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import { getRoleLabel } from "@/lib/adminRoles";

const BG_HEADER = "#202528";
const BORDER = "#30383d";

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
        className="absolute right-4 top-14 w-80 rounded-xl border border-white/10 bg-[#131a27] p-3.5 text-xs text-white shadow-2xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-150"
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
  const { primaryRole } = useStaffAccess();
  const location = useLocation();
  const navigate = useNavigate();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const getPageTitle = (path: string) => {
    if (path === "/admin") return "Executive Dashboard";
    if (path.startsWith("/admin/trades")) return "Live Trading Console";
    if (path.startsWith("/admin/users")) return "User Directory & KYC";
    if (path.startsWith("/admin/finance")) return "Financial Operations";
    if (path.startsWith("/admin/crypto-payments")) return "Crypto Infrastructure";
    if (path.startsWith("/admin/social")) return "Copy Trading Hub";
    if (path.startsWith("/admin/tournaments")) return "Tournaments Hub";
    if (path.startsWith("/admin/reports")) return "Profit & Loss Reports";
    if (path.startsWith("/admin/analytics")) return "Trading Analytics";
    if (path.startsWith("/admin/settings")) return "Platform Settings";
    if (path.startsWith("/admin/audit")) return "System Audit Ledger";
    if (path.startsWith("/admin/support")) return "Customer Support Inbox";
    return "Admin Console";
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/admin/users?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const unreadCount = mockNotifications.filter((n) => !n.read).length;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-16 border-b px-4 md:px-7 flex items-center justify-between shadow-lg backdrop-blur-md"
      style={{ background: BG_HEADER, borderColor: BORDER }}
    >
      {/* Left: Brand + Page Title */}
      <div className="flex items-center gap-4 min-w-0">
        <Link to="/admin" className="flex items-center gap-2.5 shrink-0 hover:opacity-90 transition-opacity">
          <SiteLogo logoOverride={logoUrl} showText={false} className="h-7 w-auto" />
          <span className="text-sm font-black uppercase tracking-wider text-white hidden sm:inline">
            {platformName || "InitOption"}
          </span>
          <span className="rounded-md bg-[#2f9bff]/15 px-2 py-1 text-[9px] font-black text-[#72bdff] tracking-widest uppercase">
            ADMIN
          </span>
        </Link>
        <span className="h-4 w-px bg-white/10 hidden sm:inline" />
        <h1 className="text-xs font-black uppercase tracking-wider text-gray-300 truncate">
          {getPageTitle(location.pathname)}
        </h1>
      </div>

      {/* Right: Global Search, System Status, Notifications, Profile */}
      <div className="flex items-center gap-3">
        {/* Global Search */}
        <form onSubmit={handleSearch} className="relative hidden md:block w-72">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search users, transactions, trades..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 rounded-xl border border-white/10 bg-[#0b1018] pl-9 pr-3 text-xs text-white placeholder-gray-500 outline-none transition focus:border-[#1689e8]"
          />
        </form>

        {/* Live System Indicator */}
        <div className="hidden sm:flex items-center gap-2 rounded-lg border border-[#00c878]/30 bg-[#00c878]/10 px-3 py-1">
          <span className="relative flex h-2 w-2 rounded-full bg-[#00c878]">
            <span className="absolute inset-0 h-2 w-2 animate-ping rounded-full bg-[#00c878] opacity-75" />
          </span>
          <span className="text-[10px] font-black uppercase tracking-wider text-[#00c878]">LIVE ENGINE</span>
        </div>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileOpen(false); }}
            className="relative rounded-xl border border-white/10 bg-[#2a3040] p-2 text-gray-300 transition-colors hover:border-[#72bdff] hover:text-white"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#ff4a5a] text-[9px] font-black text-white ring-2 ring-[#0d131f]">
                {unreadCount}
              </span>
            )}
          </button>

          <Dropdown isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)}>
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-extrabold text-white">System Activity</span>
              <span className="text-[10px] font-bold text-[#1689e8]">{unreadCount} unread</span>
            </div>
            <div className="mt-2 space-y-1.5">
              {mockNotifications.map((n) => (
                <Link
                  key={n.id}
                  to={n.link || "#"}
                  onClick={() => setNotificationsOpen(false)}
                  className="block rounded-lg border border-white/5 bg-[#0b1018]/80 p-2.5 text-xs transition-colors hover:border-[#1689e8]/40"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{n.title}</span>
                    <span className="text-[10px] text-gray-500">{n.timestamp}</span>
                  </div>
                  <p className="mt-1 text-gray-400 leading-tight">{n.description}</p>
                </Link>
              ))}
            </div>
          </Dropdown>
        </div>

        {/* Admin Profile */}
        <div className="relative">
          <button
            onClick={() => { setProfileOpen(!profileOpen); setNotificationsOpen(false); }}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#2a3040] p-1.5 transition-all hover:border-[#72bdff]"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#1689e8] to-indigo-600 text-xs font-black text-white shadow-sm">
              {profile?.display_name?.charAt(0).toUpperCase() || "A"}
            </div>
            <span className="hidden md:inline text-xs font-bold text-white max-w-[110px] truncate">
              {profile?.display_name || "Admin"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          </button>

          <Dropdown isOpen={profileOpen} onClose={() => setProfileOpen(false)}>
            <div className="border-b border-white/10 pb-2.5">
              <p className="font-black text-white text-sm">{profile?.display_name || "Administrator"}</p>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#1689e8]">{getRoleLabel(primaryRole)}</p>
            </div>
            <div className="mt-2.5 space-y-1 font-semibold">
              <Link to="/trade" onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-white/5 text-gray-300 hover:text-white">
                <LayoutDashboard className="h-4 w-4 text-[#1689e8]" /> Trading Terminal
              </Link>
              <Link to="/admin/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-white/5 text-gray-300 hover:text-white">
                <Settings className="h-4 w-4 text-gray-400" /> Platform Settings
              </Link>
              <Link to="/admin/audit" onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-white/5 text-gray-300 hover:text-white">
                <Shield className="h-4 w-4 text-gray-400" /> System Audit
              </Link>
              <div className="border-t border-white/10 pt-1.5 my-1" />
              <button onClick={() => { void signOut(); setProfileOpen(false); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[#ff4a5a] hover:bg-[#ff4a5a]/10">
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>
          </Dropdown>
        </div>
      </div>
    </header>
  );
}

export default AdminHeader;