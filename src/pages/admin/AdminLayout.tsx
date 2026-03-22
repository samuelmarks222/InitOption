import { useState, useEffect, useMemo } from "react";
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
  LogOut,
  Bitcoin,
  Trophy,
  Menu,
  LifeBuoy,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import { getRoleLabel, roleAllowsAdminPath } from "@/lib/adminRoles";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin", icon: <LayoutDashboard size={18} />, exact: true },
  { label: "Support Inbox", href: "/admin/support", icon: <LifeBuoy size={18} /> },
  { label: "User Management", href: "/admin/users", icon: <Users size={18} /> },
  { label: "Trade Management", href: "/admin/trades", icon: <LineChart size={18} /> },
  { label: "Transactions", href: "/admin/finance", icon: <Wallet size={18} /> },
  { label: "Asset Management", href: "/admin/assets", icon: <CandlestickChart size={18} /> },
  { label: "Tournaments", href: "/admin/tournaments", icon: <Trophy size={18} /> },
  { label: "Platform Settings", href: "/admin/settings", icon: <Settings size={18} /> },
  { label: "Promo Codes", href: "/admin/promos", icon: <Tag size={18} /> },
  { label: "Risk Management", href: "/admin/risk", icon: <AlertTriangle size={18} /> },
  { label: "Reports", href: "/admin/reports", icon: <FileText size={18} /> },
  { label: "Notification", href: "/admin/notifications", icon: <Bell size={18} /> },
  { label: "Audit Logs", href: "/admin/audit", icon: <ScrollText size={18} /> },
  { label: "Admin Users", href: "/admin/admins", icon: <ShieldCheck size={18} /> },
  { label: "Crypto Payments", href: "/admin/crypto-payments", icon: <Bitcoin size={18} /> },
  { label: "Profit Analytics", href: "/admin/analytics", icon: <LineChart size={18} /> },
];

const AdminLayout = () => {
  const { profile, signOut } = useAuth();
  const { isStaff, loading: staffLoading, primaryRole } = useStaffAccess();
  const location = useLocation();
  const { logoUrl, platformName } = useSiteBranding();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const visibleNavItems = useMemo(() => {
    return NAV_ITEMS.filter((item) => roleAllowsAdminPath(primaryRole, item.href));
  }, [primaryRole]);

  if (staffLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0b0e14] text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
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
    <div className="flex h-[100dvh] bg-[#0b0e14] text-gray-200 overflow-hidden font-sans">
      {/* Mobile Overlay Backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — fixed on mobile (overlay), static on desktop */}
      <aside className={`
        fixed md:relative top-0 bottom-0 left-0 z-50 md:z-auto
        w-64 bg-[#11161d] border-r border-white/5 flex flex-col pt-1
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <Link to="/" className="flex items-center gap-3 px-6 h-16 border-b border-white/5 shrink-0 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer" title="Return to Main Site">
          {logoUrl ? (
            <img src={logoUrl} alt={platformName} className="h-8 object-contain" />
          ) : (
            <>
              <ShieldAlert className="text-blue-500 w-6 h-6 shrink-0" />
              <span className="font-bold text-white text-lg tracking-wide truncate">Admin Portal</span>
            </>
          )}
        </Link>
        
        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1 no-scrollbar">
          {visibleNavItems.map((item) => {
            const isActive = item.exact 
              ? location.pathname === item.href 
              : location.pathname.startsWith(item.href);
              
            return (
              <Link 
                key={item.label}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? "bg-blue-500/10 text-blue-400" 
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </div>

        <div className="p-4 border-t border-white/5 shrink-0">
          <div className="flex items-center gap-3 px-3 py-3 bg-white/5 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center font-bold text-white text-xs shrink-0">
              {profile?.display_name?.charAt(0) || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{profile?.display_name || "Admin User"}</p>
              <p className="text-xs text-blue-400 truncate">{getRoleLabel(primaryRole)}</p>
            </div>
            <button onClick={signOut} className="text-gray-400 hover:text-red-400 transition-colors shrink-0">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0b0e14] md:ml-0">
        {/* Top Header */}
        <header className="h-16 px-4 sm:px-8 flex items-center justify-between bg-[#11161d]/50 backdrop-blur border-b border-white/5 shrink-0 z-10">
          {/* Hamburger on mobile */}
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              onClick={() => setSidebarOpen(v => !v)}
            >
              <Menu size={20} />
            </button>
            <h1 className="truncate text-lg sm:text-xl font-bold text-white">
              {visibleNavItems.find(i => i.exact ? location.pathname === i.href : location.pathname.startsWith(i.href))?.label || "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
          </div>
        </header>

        {/* Dynamic Nested Route Content */}
        <div className="relative flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
