import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Search,
  ShieldCheck,
  ShieldPlus,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { AppRole } from "@/lib/adminRoles";
import {
  CO_ADMIN_ROLE_OPTIONS,
  getPrimaryStaffRole,
  getRoleLabel,
} from "@/lib/adminRoles";

type ProfileRow = Pick<Tables<"profiles">, "created_at" | "display_name" | "id" | "username">;
type UserRoleRow = Tables<"user_roles">;

type StaffUser = ProfileRow & {
  role: AppRole;
};

const EmptyState = ({
  description,
  title,
}: {
  description: string;
  title: string;
}) => (
  <div className="rounded-2xl border p-8 text-center shadow-lg" style={{ borderColor: "var(--admin-border)", background: "var(--admin-surface)" }}>
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "var(--admin-surface)" }}>
      <ShieldCheck className="h-5 w-5 text-slate-300" />
    </div>
    <h3 className="mt-4 text-lg font-bold text-white">{title}</h3>
    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-300">{description}</p>
  </div>
);

const formatDate = (value: string | null | undefined) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getUserName = (profile: ProfileRow) => profile.display_name || profile.username || `User ${profile.id.slice(0, 8).toUpperCase()}`;
const getUserHandle = (profile: ProfileRow) => profile.username || profile.id.slice(0, 8).toUpperCase();

const AdminUsers = () => {
  const { primaryRole } = useStaffAccess();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [userRoles, setUserRoles] = useState<UserRoleRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>("support_agent");
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const canManageAdmins = primaryRole === "admin";

  const loadData = async () => {
    setLoading(true);
    const [profilesResult, rolesResult] = await Promise.all([
      supabase.from("profiles").select("id, username, display_name, created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*"),
    ]);

    if (profilesResult.error) {
      toast({
        title: "Profiles unavailable",
        description: profilesResult.error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (rolesResult.error) {
      toast({
        title: "Role directory unavailable",
        description: rolesResult.error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    setProfiles(profilesResult.data ?? []);
    setUserRoles(rolesResult.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const rolesByUserId = useMemo(() => {
    const map = new Map<string, AppRole[]>();

    userRoles.forEach((row) => {
      const current = map.get(row.user_id) ?? [];
      current.push(row.role as AppRole);
      map.set(row.user_id, current);
    });

    return map;
  }, [userRoles]);

  const staffUsers = useMemo<StaffUser[]>(() => {
    return profiles
      .map((profile) => {
        const role = getPrimaryStaffRole(rolesByUserId.get(profile.id) ?? []);
        return role ? { ...profile, role } : null;
      })
      .filter((value): value is StaffUser => Boolean(value))
      .sort((a, b) => getRoleLabel(a.role).localeCompare(getRoleLabel(b.role)) || getUserName(a).localeCompare(getUserName(b)));
  }, [profiles, rolesByUserId]);

  const filteredProfiles = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return profiles;

    return profiles.filter((profile) =>
      [profile.display_name, profile.username, profile.id]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search)),
    );
  }, [profiles, searchTerm]);

  const selectedUser = useMemo(
    () => profiles.find((profile) => profile.id === selectedUserId) ?? null,
    [profiles, selectedUserId],
  );

  const selectedUserCurrentRole = selectedUser ? getPrimaryStaffRole(rolesByUserId.get(selectedUser.id) ?? []) : null;

  const roleCounts = useMemo(() => {
    return CO_ADMIN_ROLE_OPTIONS.reduce<Record<string, number>>((accumulator, option) => {
      accumulator[option.value] = staffUsers.filter((staffUser) => staffUser.role === option.value).length;
      return accumulator;
    }, {});
  }, [staffUsers]);

  const handleAssignRole = async () => {
    if (!selectedUserId) {
      toast({
        title: "Choose a user first",
        description: "Pick a user from the directory before assigning a co-admin role.",
        variant: "destructive",
      });
      return;
    }

    setAssigning(true);
    const { error } = await supabase.rpc("assign_staff_role", {
      p_role: selectedRole,
      p_user_id: selectedUserId,
    });
    setAssigning(false);

    if (error) {
      toast({
        title: "Role assignment failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Co-admin updated",
      description: `${getUserName(selectedUser ?? { id: selectedUserId, display_name: null, username: null, created_at: null })} is now ${getRoleLabel(selectedRole)}.`,
    });
    await loadData();
  };

  const handleRevokeRole = async (userId: string) => {
    setRevokingId(userId);
    const { error } = await supabase.rpc("revoke_staff_role", {
      p_user_id: userId,
    });
    setRevokingId(null);

    if (error) {
      toast({
        title: "Role removal failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Co-admin removed",
      description: "The staff access was revoked successfully.",
    });
    if (selectedUserId === userId) {
      setSelectedUserId(null);
    }
    await loadData();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Co-Admin Management</h2>
          <p className="text-sm text-slate-300 mt-1">
            Create focused admin access for support, finance, risk, content, and audit without giving everyone full control.
          </p>
        </div>
        <div className="rounded-xl border border-[var(--admin-green)]/20 bg-[var(--admin-green)]/10 px-4 py-3 text-sm text-[var(--admin-green-soft)]">
          {staffUsers.length} active staff account{staffUsers.length === 1 ? "" : "s"}
        </div>
      </div>

      {loading ? (
        <EmptyState
          title="Loading staff directory"
          description="Checking platform users and current admin roles..."
        />
      ) : !canManageAdmins ? (
        <EmptyState
          title="Super admin access required"
          description="Only a Super Admin can create or revoke co-admin roles from this page."
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            {CO_ADMIN_ROLE_OPTIONS.map((option) => (
              <div key={option.value} className="rounded-2xl border p-4 shadow-lg" style={{ borderColor: "var(--admin-border)", background: "var(--admin-surface)" }}>
                <div className="text-[11px] uppercase tracking-wider text-slate-400">{option.label}</div>
                <div className="mt-2 text-2xl font-bold text-white">{roleCounts[option.value] ?? 0}</div>
                <p className="mt-2 text-xs leading-5 text-slate-300">{option.description}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="rounded-2xl border shadow-lg" style={{ borderColor: "var(--admin-border)", background: "var(--admin-surface)" }}>
              <div className="border-b p-4" style={{ borderColor: "var(--admin-border)" }}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "var(--admin-green-soft)", color: "var(--admin-green)" }}>
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">User Directory</h3>
                    <p className="text-xs text-slate-300">Pick a platform user to promote into a focused co-admin role.</p>
                  </div>
                </div>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search by name, username, or ID..."
                    className="w-full rounded-xl border bg-[var(--admin-canvas)] py-3 pl-10 pr-4 text-sm text-white outline-none transition-colors placeholder:text-slate-400 focus:border-[var(--admin-green)]"
                    style={{ borderColor: "var(--admin-border)" }}
                  />
                </div>
              </div>

              <div className="max-h-[620px] overflow-y-auto">
                {filteredProfiles.map((profile) => {
                  const currentRole = getPrimaryStaffRole(rolesByUserId.get(profile.id) ?? []);
                  const isActive = selectedUserId === profile.id;

                  return (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => setSelectedUserId(profile.id)}
                      className={`w-full border-b px-4 py-4 text-left transition-colors ${
                        isActive ? "" : "hover:bg-white/[0.03]"
                      }`}
                      style={{ borderColor: "var(--admin-border)", background: isActive ? "var(--admin-green-soft)" : undefined }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-white">{getUserName(profile)}</div>
                          <div className="mt-1 text-xs text-slate-400">@{getUserHandle(profile)}</div>
                        </div>
                        <div className="rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-200" style={{ borderColor: "var(--admin-border)", background: "var(--admin-surface)" }}>
                          {currentRole ? getRoleLabel(currentRole) : "No staff role"}
                        </div>
                      </div>
                      <div className="mt-3 text-[11px] text-slate-400">Joined {formatDate(profile.created_at)}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border p-5 shadow-lg" style={{ borderColor: "var(--admin-border)", background: "var(--admin-surface)" }}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300">
                    <ShieldPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Assign Co-Admin Role</h3>
                    <p className="text-sm text-slate-300">Choose the exact responsibility this account should handle.</p>
                  </div>
                </div>

                {selectedUser ? (
                  <div className="mt-5 space-y-5">
                    <div className="rounded-2xl border p-4" style={{ borderColor: "var(--admin-border)", background: "var(--admin-canvas)" }}>
                      <div className="text-[11px] uppercase tracking-wider text-slate-400">Selected User</div>
                      <div className="mt-2 text-lg font-bold text-white">{getUserName(selectedUser)}</div>
                      <div className="mt-1 text-sm text-slate-300">@{getUserHandle(selectedUser)}</div>
                      <div className="mt-3 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-200" style={{ borderColor: "var(--admin-border)", background: "var(--admin-surface)" }}>
                        Current role: {selectedUserCurrentRole ? getRoleLabel(selectedUserCurrentRole) : "No staff role"}
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      {CO_ADMIN_ROLE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setSelectedRole(option.value)}
                          className={`rounded-2xl border p-4 text-left transition-colors ${
                            selectedRole === option.value ? "" : "hover:bg-white/[0.03]"
                          }`}
                          style={
                            selectedRole === option.value
                              ? { borderColor: "var(--admin-green)", background: "var(--admin-green-soft)" }
                              : { borderColor: "var(--admin-border)", background: "var(--admin-canvas)" }
                          }
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-bold text-white">{option.label}</div>
                          {selectedRole === option.value ? <ShieldCheck className="h-4 w-4 text-[var(--admin-green)]" /> : null}
                          </div>
                          <p className="mt-2 text-xs leading-6 text-slate-300">{option.description}</p>
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleAssignRole()}
                      disabled={assigning}
                      className="inline-flex items-center justify-center rounded-xl bg-[var(--admin-green)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--admin-surface)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {assigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCog className="mr-2 h-4 w-4" />}
                      Save Role
                    </button>
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border-dashed p-8 text-center text-sm text-slate-300" style={{ borderColor: "var(--admin-border)", background: "var(--admin-canvas)" }}>
                    Pick a user from the directory to assign a co-admin role.
                  </div>
                )}
              </div>

              <div className="rounded-2xl border shadow-lg" style={{ borderColor: "var(--admin-border)", background: "var(--admin-surface)" }}>
                <div className="border-b p-4" style={{ borderColor: "var(--admin-border)" }}>
                  <h3 className="text-lg font-bold text-white">Current Staff</h3>
                  <p className="mt-1 text-sm text-slate-300">Review every elevated account and revoke access when it is no longer needed.</p>
                </div>

                {staffUsers.length === 0 ? (
                  <div className="p-8">
                    <EmptyState
                      title="No co-admins yet"
                      description="Assign a role from the panel above and the staff directory will populate here."
                    />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-sm text-slate-200">
                      <thead className="text-xs uppercase text-slate-400" style={{ background: "var(--admin-canvas)" }}>
                        <tr>
                          <th className="px-6 py-4 font-semibold">Staff User</th>
                          <th className="px-6 py-4 font-semibold">Role</th>
                          <th className="px-6 py-4 font-semibold">Joined</th>
                          <th className="px-6 py-4 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {staffUsers.map((staffUser) => (
                          <tr key={staffUser.id} className="hover:bg-white/[0.02]">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "var(--admin-green-soft)", color: "var(--admin-green)" }}>
                                  <ShieldCheck className="h-5 w-5" />
                                </div>
                                <div>
                                  <div className="font-bold text-white">{getUserName(staffUser)}</div>
                                  <div className="text-xs text-slate-400">@{getUserHandle(staffUser)}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gray-200" style={{ borderColor: "var(--admin-border)", background: "var(--admin-surface)" }}>
                                {getRoleLabel(staffUser.role)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-300">{formatDate(staffUser.created_at)}</td>
                            <td className="px-6 py-4 text-right">
                              <button
                                type="button"
                                disabled={revokingId === staffUser.id}
                                onClick={() => void handleRevokeRole(staffUser.id)}
                                className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-red-300 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {revokingId === staffUser.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                                Revoke
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminUsers;

