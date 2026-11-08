"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAdminAccount } from "../admin-actions";
import AdminAccountControls from "./AdminAccountControls";

type Administrator = {
  user_id: string;
  full_name: string | null;
  role: string;
  account_status: string;
  created_at: string;
  email: string;
};

type Permission = {
  user_id: string;
  permission_key: string;
  assigned_by: string;
  assigned_at: string;
};

type CatalogueItem = {
  permission_key: string;
  module_name: string;
  permission_name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
};

type Props = {
  administrators: Administrator[];
  permissions: Permission[];
  catalogue: CatalogueItem[];
};

export default function AdminManagementClient({
  administrators,
  permissions,
  catalogue,
}: Props) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([
    "dashboard.view",
  ]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const groupedPermissions = catalogue.reduce<
    Record<string, CatalogueItem[]>
  >((groups, item) => {
    const moduleName = item.module_name || "Other";
    if (!groups[moduleName]) groups[moduleName] = [];
    groups[moduleName].push(item);
    return groups;
  }, {});

  function togglePermission(permissionKey: string) {
    if (permissionKey === "dashboard.view") return;

    setSelectedPermissions((current) =>
      current.includes(permissionKey)
        ? current.filter((key) => key !== permissionKey)
        : [...current, permissionKey]
    );
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setSubmitting(true);

    try {
      const result = await createAdminAccount({
        fullName,
        email,
        phone,
        temporaryPassword,
        permissionKeys: selectedPermissions,
      });

      if (!result.success) {
        setError(result.error || "Unable to create administrator.");
        return;
      }

      setMessage(result.message || "Administrator created successfully.");
      setFullName("");
      setEmail("");
      setPhone("");
      setTemporaryPassword("");
      setSelectedPermissions(["dashboard.view"]);
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="admin-management">
      <div className="admin-management-heading">
        <div>
          <span className="dashboard-eyebrow">SUPER ADMIN CONTROL</span>
          <h1>Administrator Management</h1>
          <p>
            Create administrator accounts and control which areas of the TSC
            platform each administrator can access.
          </p>
        </div>

        <a href="/admin" className="admin-back-link">
          Back to dashboard
        </a>
      </div>

      <section className="admin-management-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>Create administrator</h2>
            <p>
              Assign only the permissions required for the administrator&apos;s
              responsibilities.
            </p>
          </div>
        </div>

        {message && <div className="admin-feedback admin-feedback-success">{message}</div>}
        {error && <div className="admin-feedback admin-feedback-error">{error}</div>}

        <form onSubmit={handleCreate} className="admin-create-form">
          <div className="admin-form-grid">
            <label>
              Full name
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Administrator's full name"
                required
                minLength={2}
                autoComplete="name"
              />
            </label>

            <label>
              Email address
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@example.com"
                required
                autoComplete="email"
              />
            </label>

            <label>
              Phone number
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Phone number"
                autoComplete="tel"
              />
            </label>

            <label>
              Temporary password
              <input
                type="password"
                value={temporaryPassword}
                onChange={(event) => setTemporaryPassword(event.target.value)}
                placeholder="At least 12 characters"
                required
                minLength={12}
                autoComplete="new-password"
              />
            </label>
          </div>

          <div className="admin-permission-heading">
            <h3>Assign permissions</h3>
            <p>
              Dashboard View is required. Select the other permissions this
              administrator needs.
            </p>
          </div>

          <div className="admin-permission-groups">
            {Object.entries(groupedPermissions).map(([moduleName, items]) => (
              <section className="admin-permission-group" key={moduleName}>
                <h4>{moduleName}</h4>

                <div className="admin-permission-list">
                  {items.map((item) => (
                    <label
                      className="admin-permission-option"
                      key={item.permission_key}
                    >
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(
                          item.permission_key
                        )}
                        disabled={item.permission_key === "dashboard.view"}
                        onChange={() => togglePermission(item.permission_key)}
                      />
                      <span>
                        <strong>{item.permission_name}</strong>
                        {item.description && <small>{item.description}</small>}
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <button
            type="submit"
            className="admin-primary-button"
            disabled={submitting}
          >
            {submitting ? "Creating account..." : "Create administrator"}
          </button>
        </form>
      </section>

      <section className="admin-management-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>Administrators</h2>
            <p>Administrator accounts currently registered on TSC.</p>
          </div>
          <span className="admin-count">{administrators.length} accounts</span>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Permissions</th>
              </tr>
            </thead>
            <tbody>
              {administrators.map((administrator) => {
                const assignedCount = permissions.filter(
                  (permission) => permission.user_id === administrator.user_id
                ).length;

                return (
                  <tr key={administrator.user_id}>
                    <td>{administrator.full_name || "Not provided"}</td>
                    <td>{administrator.email || "Unavailable"}</td>
                    <td>
                      <span className="admin-role-label">
                        {administrator.role === "super_admin"
                          ? "Super Admin"
                          : "Admin"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={
                          administrator.account_status === "active"
                            ? "admin-status-active"
                            : "admin-status-inactive"
                        }
                      >
                        {administrator.account_status}
                      </span>
                    </td>
                    <td>
                      {administrator.role === "super_admin"
                        ? "All permissions"
                        : `${assignedCount} assigned`}
                      {administrator.role === "admin" && (
                        <AdminAccountControls
                          userId={administrator.user_id}
                          accountStatus={administrator.account_status}
                          assignedPermissions={permissions
                            .filter((item) => item.user_id === administrator.user_id)
                            .map((item) => item.permission_key)}
                          catalogue={catalogue}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}

              {administrators.length === 0 && (
                <tr>
                  <td colSpan={5}>No administrator accounts found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
