import { Link } from "react-router-dom";
import { ArrowLeft, CheckCheck } from "lucide-react";
import { SiteLogo } from "@/components/branding/SiteLogo";
import { NotificationTemplateCard } from "@/components/notifications/NotificationTemplateCard";
import { useNotifications } from "@/contexts/NotificationContext";
import { groupNotificationsByDate } from "@/lib/notifications";

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
    <div className="relative min-h-screen overflow-hidden bg-[#0b1017]">
      <div className="relative px-4 py-6 sm:px-6 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SiteLogo to="/" variant="dark" subtitle="Notification center" />
        </div>

        <section className="mt-6 overflow-hidden rounded-[34px] border border-white/8 bg-[#1a2230]/94 backdrop-blur-xl shadow-[0_38px_120px_rgba(0,0,0,0.08)]">
          <div className="border-b border-white/8 bg-[linear-gradient(180deg,#1a2230,#0b1017)] px-5 py-5 sm:px-7 sm:py-6">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="max-w-3xl">
                <Link to="/trade" className="inline-flex items-center gap-2 text-sm text-white/48 transition-colors hover:text-white">
                  <ArrowLeft className="h-4 w-4" />
                  Back to trading
                </Link>
                <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">Notifications</h1>
                <p className="mt-2 text-sm text-white/55 sm:text-[15px]">
                  {unreadCount} unread notifications across admin updates, finance, tournaments, verification, promotions, and social activity.
                </p>
              </div>

              <button
                onClick={() => void markAllNotificationsRead()}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all as read
              </button>
            </div>
          </div>

          <div className="px-4 py-5 sm:px-6 sm:py-6">
            {loading ? (
              <div className="px-3 py-12 text-sm text-white/55">Loading notifications...</div>
            ) : groups.length === 0 ? (
              <div className="px-3 py-12 text-sm text-white/55">You do not have any notifications yet.</div>
            ) : (
              <div className="space-y-8">
                {groups.map((group) => (
                  <section key={group.label} className="space-y-4">
                    <div className="pl-16 text-[11px] font-black uppercase tracking-[0.2em] text-white/48">
                      {group.label}
                    </div>
                    <div className="space-y-4">
                      {group.items.map((notification) => (
                        <NotificationTemplateCard
                          key={notification.id}
                          notification={notification}
                          showTimeline
                          onMarkRead={markNotificationRead}
                        />
                      ))}
                    </div>
                  </section>
                ))}

                <p className="pt-2 text-center text-sm text-white/48">No more notifications</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default NotificationsPage;
