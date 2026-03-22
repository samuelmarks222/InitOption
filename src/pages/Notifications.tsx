import { Link } from "react-router-dom";
import { ArrowLeft, CheckCheck } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";
import { SiteLogo } from "@/components/branding/SiteLogo";
import {
  formatNotificationRelativeTime,
  getNotificationVisual,
  groupNotificationsByDate,
} from "@/lib/notifications";

const NotificationsPage = () => {
  const {
    notifications,
    loading,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
  } = useNotifications();

  const groups = groupNotificationsByDate(notifications);

  return (
    <div className="min-h-screen bg-[#0b1016] px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SiteLogo to="/" subtitle="Notification center" />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <Link to="/trade" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to trading
            </Link>
            <h1 className="mt-3 text-2xl font-bold text-white">Notifications</h1>
            <p className="mt-1 text-sm text-gray-400">
              {unreadCount} unread notifications across announcements, bonuses, and referral earnings.
            </p>
          </div>
          <button
            onClick={() => void markAllNotificationsRead()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </button>
        </div>

        <div className="rounded-3xl border border-white/8 bg-[#111923] p-3 shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:p-5">
          {loading ? (
            <div className="px-4 py-10 text-sm text-gray-400">Loading notifications...</div>
          ) : groups.length === 0 ? (
            <div className="px-4 py-10 text-sm text-gray-400">You do not have any notifications yet.</div>
          ) : (
            <div className="space-y-6">
              {groups.map((group) => (
                <section key={group.label}>
                  <div className="px-2 pb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
                    {group.label}
                  </div>
                  <div className="space-y-3">
                    {group.items.map((notification) => {
                      const visual = getNotificationVisual(notification.type);
                      const Icon = visual.icon;

                      return (
                        <article
                          key={notification.id}
                          className={`rounded-3xl border p-4 transition-colors sm:p-5 ${
                            notification.is_read
                              ? "border-white/5 bg-[#0d141d]"
                              : `${visual.accentClass} ring-1 ring-white/5`
                          }`}
                        >
                          <div className="flex gap-4">
                            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${visual.accentClass}`}>
                              <Icon className={`h-5 w-5 ${visual.iconClass}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-sm font-semibold text-white sm:text-base">{notification.title}</h2>
                                <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                                  {visual.chipLabel}
                                </span>
                                {!notification.is_read && (
                                  <span className="rounded-full bg-red-500/15 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-red-300">
                                    Unread
                                  </span>
                                )}
                              </div>
                              <p className="mt-2 text-sm leading-relaxed text-gray-300">{notification.message}</p>
                              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                                <span className="text-xs font-medium text-gray-500">
                                  {formatNotificationRelativeTime(notification.created_at)}
                                </span>
                                {!notification.is_read && (
                                  <button
                                    onClick={() => void markNotificationRead(notification.id)}
                                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                                  >
                                    Mark as read
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
