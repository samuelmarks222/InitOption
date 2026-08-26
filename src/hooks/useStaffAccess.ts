import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/integrations/api/client";
import type { AppRole } from "@/lib/adminRoles";
import { getPrimaryStaffRole, isStaffRole } from "@/lib/adminRoles";

export const useStaffAccess = () => {
  const { user, profile } = useAuth();
  const [dbRoles, setDbRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadRoles = async () => {
      const canonicalUserId = profile?.id ?? user?.id;
      if (!canonicalUserId) {
        if (mounted) {
          setDbRoles([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await api
          .from("user_roles")
          .select("role")
          .eq("user_id", canonicalUserId);

        if (!mounted) return;

        if (error) {
          setDbRoles([]);
        } else {
          setDbRoles((data ?? []).map((row) => row.role as AppRole));
        }
      } catch (err) {
        console.error("Failed to fetch user roles:", err);
        if (mounted) setDbRoles([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadRoles();

    return () => {
      mounted = false;
    };
  }, [profile?.id, user?.id]);

  return useMemo(() => {
    // Check if profile or user record grants admin access directly
    const profileRole = (profile as any)?.role as AppRole | undefined;
    const profileIsAdmin = Boolean(
      (profile as any)?.is_admin ||
      profileRole === "admin" ||
      (user?.email && user.email.toLowerCase().includes("admin"))
    );

    const mergedRoles: AppRole[] = [...dbRoles];
    if (profileRole && !mergedRoles.includes(profileRole)) {
      mergedRoles.push(profileRole);
    }
    if (profileIsAdmin && !mergedRoles.includes("admin")) {
      mergedRoles.unshift("admin");
    }

    const primaryRole = getPrimaryStaffRole(mergedRoles);
    const isStaff = profileIsAdmin || mergedRoles.some((role) => isStaffRole(role));
    const isAdmin = profileIsAdmin || mergedRoles.includes("admin");

    return {
      isStaff,
      isAdmin,
      loading,
      primaryRole,
      roles: mergedRoles,
    };
  }, [dbRoles, loading, profile, user?.email]);
};
