import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { NotificationTemplateCard } from "@/components/notifications/NotificationTemplateCard";
import { useNotifications } from "@/contexts/NotificationContext";
import { groupNotificationsByDate } from "@/lib/notifications";

interface Props {
  mobile?: boolean;
}

export const NotificationBell = ({ mobile = false }: Props) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    notifications,
    unreadCount,
    loading,
    markNotificationRead,
    markAllNotificationsRead,
  } = useNotifications();

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const recentGroups = useMemo(
    () => groupNotificationsByDate(notifications.slice(0, 6)),
    [notifications],
  );

  return (
    <div ref={containerRef} className="relative flex h-[38px] items-center">
      <button
        onClick={() => setOpen((value) => !value)}
        className={`relative flex items-center justify-center rounded transition-colors ${
          mobile ? "p-2 text-gray-300 hover:text-white" : "h-[38px] w-[38px] hover:bg-white/5"
        }`}
      >
        <Bell className={mobile ? "h-5 w-5" : "h-4 w-4 text-gray-300"} />
        {unreadCount > 0 ? (
          <span
            className={`absolute flex items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white ${
              mobile ? "right-1.5 top-1.5 h-4 min-w-[16px]" : "right-1 top-1 h-4 min-w-[16px]"
            }`}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className={`z-[160] overflow-hidden rounded-[30px] border border-white/10 bg-[#1a2230]/95 shadow-[0_40px_110px_rgba(0,0,0,0.48)] backdrop-blur-xl ${
            mobile
              ? "fixed inset-x-2 bottom-[64px] top-[76px] flex flex-col rounded-[24px]"
              : "absolute right-0 top-full mt-3 w-[430px] max-w-[calc(100vw-2rem)]"
          }`}
        >
          <div className="border-b border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))] px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <p className="text-lg font-bold text-white sm:text-xl">Notifications</p>
                <p className="mt-1 text-[12px] text-white/50">Admin updates, finance, tournaments, security updates, bonuses, and platform activity.</p>
              </div>
              <button
                onClick={() => void markAllNotificationsRead()}
                className="self-start text-[10px] font-black uppercase tracking-[0.14em] text-[#1c7dff] transition-colors hover:text-[#59a4ff] sm:shrink-0 sm:text-[11px]"
              >
                Mark all as read
              </button>
            </div>
          </div>

          <div className={`${mobile ? "flex-1" : "max-h-[560px]"} overflow-y-auto px-2.5 py-3 sm:px-3 sm:py-4`}>
            {loading ? (
              <div className="px-3 py-8 text-sm text-white/55">Loading notifications...</div>
            ) : recentGroups.length === 0 ? (
              <div className="px-3 py-10 text-sm text-white/55">No notifications yet.</div>
            ) : (
              <div className="space-y-5">
                {recentGroups.map((group) => (
                  <section key={group.label} className="space-y-3">
                    <div className="px-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                      {group.label}
                    </div>
                    <div className="space-y-3">
                      {group.items.map((notification) => (
                        <NotificationTemplateCard
                          key={notification.id}
                          notification={notification}
                          compact
                          showTimeline={!mobile}
                          onMarkRead={markNotificationRead}
                          onNavigate={() => setOpen(false)}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>

          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between border-t border-white/8 px-4 py-4 text-[11px] font-black uppercase tracking-[0.12em] text-[#1c7dff] transition-colors hover:text-[#59a4ff] sm:px-5 sm:text-[12px]"
          >
            <span>View all notifications</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}
    </div>
  );
};
