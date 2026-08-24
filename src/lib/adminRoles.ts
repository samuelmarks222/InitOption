import type { Enums } from "@/integrations/supabase/types";

export type AppRole = Enums<"app_role">;

export const STAFF_ROLES: AppRole[] = [
  "admin",
  "support_agent",
  "finance_manager",
  "trade_risk_manager",
  "content_marketing_manager",
  "auditor",
];

export const CO_ADMIN_ROLE_OPTIONS: Array<{
  value: AppRole;
  label: string;
  description: string;
}> = [
  {
    value: "admin",
    label: "Super Admin",
    description: "Full platform access, admin management, and audit visibility.",
  },
  {
    value: "support_agent",
    label: "Support Agent",
    description: "Replies to live chat and tickets and escalates user issues.",
  },
  {
    value: "finance_manager",
    label: "Finance Manager",
    description: "Handles deposits, withdrawals, and balance operations.",
  },
  {
    value: "trade_risk_manager",
    label: "Trade & Risk Manager",
    description: "Monitors trades, platform exposure, and operational risk.",
  },
  {
    value: "content_marketing_manager",
    label: "Content & Marketing Manager",
    description: "Manages promos, announcements, and help content.",
  },
  {
    value: "auditor",
    label: "Auditor",
    description: "Read-only oversight of logs, user history, and transactions.",
  },
];

export const STAFF_ROLE_LABELS: Record<AppRole, string> = {
  admin: "Super Admin",
  auditor: "Auditor",
  content_marketing_manager: "Content & Marketing Manager",
  finance_manager: "Finance Manager",
  moderator: "Moderator",
  support_agent: "Support Agent",
  trade_risk_manager: "Trade & Risk Manager",
  user: "User",
};

export const getRoleLabel = (role: AppRole | null | undefined) => {
  if (!role) return "User";
  return STAFF_ROLE_LABELS[role] ?? role.replace(/_/g, " ");
};

export const isStaffRole = (role: AppRole | null | undefined) => {
  return role ? STAFF_ROLES.includes(role) : false;
};

export const getPrimaryStaffRole = (roles: AppRole[]) => {
  return STAFF_ROLES.find((role) => roles.includes(role)) ?? null;
};

export const roleAllowsAdminPath = (role: AppRole | null, pathname: string) => {
  if (!role) return false;
  if (role === "admin") return true;

  if (pathname === "/admin" || pathname === "/admin/dashboard") return true;

  switch (role) {
    case "support_agent":
      return ["/admin/support", "/admin/users", "/admin/user-activity", "/admin/notifications"].some((path) => pathname.startsWith(path));
    case "finance_manager":
      return ["/admin/finance", "/admin/funds", "/admin/reports", "/admin/analytics", "/admin/users", "/admin/crypto-payments"].some((path) =>
        pathname.startsWith(path),
      );
    case "trade_risk_manager":
      return ["/admin/trades", "/admin/risk", "/admin/analytics", "/admin/assets", "/admin/tournaments", "/admin/social"].some((path) =>
        pathname.startsWith(path),
      );
    case "content_marketing_manager":
      return ["/admin/blog", "/admin/promos", "/admin/notifications", "/admin/settings", "/admin/reports", "/admin/guides"].some(
        (path) => pathname.startsWith(path),
      );
    case "auditor":
      return ["/admin/audit", "/admin/reports", "/admin/finance", "/admin/trades", "/admin/analytics", "/admin/social"].some((path) =>
        pathname.startsWith(path),
      );
    default:
      return false;
  }
};
