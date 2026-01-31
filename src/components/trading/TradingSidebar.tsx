import { Link, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  PieChart,
  Gauge,
  History,
  MessageSquare,
  Trophy,
  Gift,
  Users,
  BarChart3,
  MoreHorizontal,
  Flame,
} from "lucide-react";

const sidebarItems = [
  { icon: PieChart, label: "Total Portfolio", path: "/trade" },
  { icon: Gauge, label: "Performance Dashboard", path: "/trade/performance", isNew: true },
  { icon: History, label: "Trading History", path: "/trade/history" },
  { icon: MessageSquare, label: "Chats & Support", path: "/trade/support" },
  { icon: Trophy, label: "Leader Board", path: "/trade/leaderboard" },
  { icon: Gift, label: "Promo", path: "/trade/promo" },
  { icon: Users, label: "Partnership", path: "/trade/partnership" },
  { icon: BarChart3, label: "Market Analysis", path: "/trade/analysis" },
  { icon: MoreHorizontal, label: "More", path: "/trade/more" },
];

const TradingSidebar = () => {
  const location = useLocation();

  return (
    <aside className="w-20 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="h-14 flex items-center justify-center border-b border-sidebar-border">
        <Link to="/" className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
          <Flame className="w-5 h-5 text-primary-foreground" />
        </Link>
      </div>

      {/* Grid icon */}
      <div className="h-14 flex items-center justify-center border-b border-sidebar-border">
        <button className="w-9 h-9 rounded-lg bg-sidebar-accent flex items-center justify-center text-sidebar-foreground hover:text-foreground transition-colors">
          <LayoutGrid className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto scrollbar-hide">
        <ul className="space-y-1">
          {sidebarItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={index}>
                <Link
                  to={item.path}
                  className={`flex flex-col items-center justify-center py-3 px-2 text-[10px] transition-colors relative ${
                    isActive
                      ? "text-foreground"
                      : "text-sidebar-foreground hover:text-foreground"
                  }`}
                >
                  {item.isNew && (
                    <span className="absolute top-1 right-2 px-1 py-0.5 text-[8px] font-bold bg-trading-green text-success-foreground rounded">
                      NEW
                    </span>
                  )}
                  <item.icon className="w-5 h-5 mb-1" />
                  <span className="text-center leading-tight">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Support */}
      <div className="p-2 border-t border-sidebar-border">
        <button className="w-full py-2 px-1 rounded-lg bg-trading-green text-success-foreground text-[10px] font-medium flex flex-col items-center gap-1">
          <MessageSquare className="w-4 h-4" />
          SUPPORT
        </button>
      </div>
    </aside>
  );
};

export default TradingSidebar;
