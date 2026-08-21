import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/integrations/api/client";
import type { AppRole } from "@/lib/adminRoles";
import { getPrimaryStaffRole, isStaffRole } from "@/lib/adminRoles";

export const useStaffAccess = () => {
  const { user, profile } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadRoles = async () => {
      // Use profile.id (canonical UUID) instead of user.id (Appwrite UID)
      const canonicalUserId = profile?.id ?? user?.id;
      if (!canonicalUserId) {
        if (mounted) {
          setRoles([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      const { data, error } = await api.from("user_roles").select("role").eq("user_id", canonicalUserId);

      if (!mounted) return;

      if (error) {
        setRoles([]);
        setLoading(false);
        return;
      }

      setRoles((data ?? []).map((row) => row.role as AppRole));
      setLoading(false);
    };

    void loadRoles();

    return () => {
      mounted = false;
    };
  }, [profile?.id, user?.id]);

  return useMemo(() => {
    const primaryRole = getPrimaryStaffRole(roles);

    return {
      isStaff: roles.some((role) => isStaffRole(role)),
      isAdmin: roles.includes("admin"),
      loading,
      primaryRole,
      roles,
    };
  }, [loading, roles]);
};
