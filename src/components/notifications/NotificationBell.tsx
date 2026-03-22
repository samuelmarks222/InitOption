import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Check, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useNotifications } from "@/contexts/NotificationContext";
import {
  formatNotificationRelativeTime,
  getNotificationVisual,
  groupNotificationsByDate,
} from "@/lib/notifications";

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
    () => groupNotificationsByDate(notifications.slice(0, 10)),
    [notifications],
  );

  return (
    <div ref={containerRef} className="relative h-[38px] flex items-center">
      <button
        onClick={() => setOpen((value) => !value)}
        className={`relative flex items-center justify-center rounded transition-colors ${
          mobile ? "p-2 text-gray-300 hover:text-white" : "w-[38px] h-[38px] hover:bg-white/5"
        }`}
      >
        <Bell className={mobile ? "w-5 h-5" : "w-4 h-4 text-gray-300"} />
        {unreadCount > 0 && (
          <span className={`absolute bg-red-500 rounded-full text-[9px] font-black text-white flex items-center justify-center ${
            mobile
              ? "top-1.5 right-1.5 min-w-[16px] h-4 px-1"
              : "top-1 right-1 min-w-[16px] h-4 px-1"
          }`}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className={`absolute right-0 top-full mt-2 rounded-2xl border border-white/10 bg-[#11161d] shadow-2xl overflow-hidden z-[160] ${
          mobile ? "w-[320px] max-w-[calc(100vw-24px)]" : "w-[360px]"
        }`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
            <div>
              <p className="text-[13px] font-bold text-white">Notifications</p>
              <p className="text-[11px] text-gray-500">Announcements, bonuses, and referral earnings</p>
            </div>
            <button
              onClick={() => void markAllNotificationsRead()}
              className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="px-4 py-6 text-[12px] text-gray-400">Loading notifications...</div>
            ) : recentGroups.length === 0 ? (
              <div className="px-4 py-8 text-[12px] text-gray-400">No notifications yet.</div>
            ) : (
              recentGroups.map((group) => (
                <div key={group.label} className="border-b border-white/5 last:border-b-0">
                  <div className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">
                    {group.label}
                  </div>
                  <div className="pb-2">
                    {group.items.map((notification) => {
                      const visual = getNotificationVisual(notification.type);
                      const Icon = visual.icon;

                      return (
                        <div
                          key={notification.id}
                          className={`group mx-2 mb-2 rounded-2xl border px-3 py-3 transition-colors ${
                            notification.is_read
                              ? "border-white/5 bg-transparent"
                              : `${visual.accentClass} shadow-[0_12px_30px_rgba(0,0,0,0.18)]`
                          }`}
                        >
                          <div className="flex gap-3">
                            <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border ${visual.accentClass}`}>
                              <Icon className={`h-4 w-4 ${visual.iconClass}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="truncate text-[12px] font-semibold text-white">{notification.title}</p>
                                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-gray-400">
                                      {visual.chipLabel}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-[11px] leading-relaxed text-gray-400">{notification.message}</p>
                                  <p className="mt-2 text-[10px] font-medium text-gray-500">
                                    {formatNotificationRelativeTime(notification.created_at)}
                                  </p>
                                </div>
                                {!notification.is_read && (
                                  <button
                                    onClick={() => void markNotificationRead(notification.id)}
                                    className="mt-0.5 opacity-0 transition-opacity group-hover:opacity-100 text-gray-400 hover:text-white"
                                    title="Mark as read"
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between px-4 py-3 border-t border-white/8 text-[12px] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
          >
            <span>View all notifications</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
};
