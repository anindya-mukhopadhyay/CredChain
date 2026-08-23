"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import type { SafeUser, UserRole } from "@/types";
import { apiClient } from "@/lib/api/client";
import { Users, UserPlus, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";

export default function UsersPage() {
  const { user, hasRole } = useAuth();
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteDisplayName, setInviteDisplayName] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("ISSUER");
  const [invitePassword, setInvitePassword] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient<SafeUser[]>("/api/v1/users");
      setUsers(data);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInviteSuccess(null);
    setIsInviting(true);

    try {
      await apiClient("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: inviteEmail,
          displayName: inviteDisplayName,
          role: inviteRole,
          password: invitePassword || "CredChain2026!",
          organizationId: user?.organizationId
        })
      });

      setInviteSuccess(`User ${inviteEmail} provisioned successfully.`);
      setInviteEmail("");
      setInviteDisplayName("");
      setInvitePassword("");
      setIsInviteOpen(false);
      await loadUsers();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleToggleStatus = async (targetUser: SafeUser) => {
    try {
      await apiClient(`/api/v1/users/${targetUser.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !targetUser.isActive })
      });
      await loadUsers();
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  };

  const roleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "danger";
      case "ORGANIZATION_ADMIN":
        return "info";
      case "ISSUER":
        return "success";
      case "VERIFIER":
        return "secondary";
      default:
        return "default";
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-8 h-8 text-indigo-600" />
            User Management & RBAC
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage institutional users, role assignments, and credential issuance permissions
          </p>
        </div>

        {hasRole(["SUPER_ADMIN", "ORGANIZATION_ADMIN"]) && (
          <Button onClick={() => setIsInviteOpen(!isInviteOpen)} variant="primary">
            <UserPlus className="w-4 h-4 mr-2" />
            Provision New User
          </Button>
        )}
      </div>

      {inviteSuccess && (
        <Alert variant="success" title="Success">
          {inviteSuccess}
        </Alert>
      )}

      {error && (
        <Alert variant="danger" title="Error">
          {error}
        </Alert>
      )}

      {/* Provisioning Drawer / Form */}
      {isInviteOpen && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              Provision Institutional User
            </h3>
            <button
              type="button"
              onClick={() => setIsInviteOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-600 font-bold"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name / Title"
                placeholder="e.g. Dr. Priya Patel"
                value={inviteDisplayName}
                onChange={(e) => setInviteDisplayName(e.target.value)}
                required
              />

              <Input
                label="Email Address"
                type="email"
                placeholder="e.g. priya.patel@apex.edu"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />

              <Select
                label="Institutional Role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as UserRole)}
                options={[
                  { value: "ISSUER", label: "ISSUER (Create, Finalize & Issue Degrees)" },
                  { value: "ORGANIZATION_ADMIN", label: "ORGANIZATION_ADMIN (Manage Users & Org Records)" },
                  ...(hasRole(["SUPER_ADMIN"]) ? [{ value: "SUPER_ADMIN", label: "SUPER_ADMIN (Global Administrator)" }] : []),
                  { value: "VERIFIER", label: "VERIFIER (Public Verification Access Only)" }
                ]}
              />

              <Input
                label="Initial Password (Optional)"
                type="password"
                placeholder="Default: CredChain2026!"
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isInviting}>
                Provision User
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Institutional Users ({users.length})
          </span>
          <span className="text-xs text-slate-400 font-mono">Organization-Scoped</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-500 animate-pulse">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No users found for this organization.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{u.displayName}</div>
                      <div className="text-xs text-slate-400 font-mono">{u.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={roleBadgeVariant(u.role)} size="sm">
                        {u.role}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                          <CheckCircle2 className="w-4 h-4" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
                          <XCircle className="w-4 h-4" /> Disabled
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {hasRole(["SUPER_ADMIN", "ORGANIZATION_ADMIN"]) && u.id !== user?.id && (
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(u)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                            u.isActive
                              ? "text-rose-600 hover:bg-rose-50"
                              : "text-emerald-600 hover:bg-emerald-50"
                          }`}
                        >
                          {u.isActive ? "Disable" : "Enable"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
