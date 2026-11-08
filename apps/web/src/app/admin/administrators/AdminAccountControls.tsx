"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateAdminPermissions,
  setAdminAccountStatus,
} from "../admin-actions";

type CatalogueItem = {
  permission_key: string;
  module_name: string;
  permission_name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
};

type Props = {
  userId: string;
  accountStatus: string;
  assignedPermissions: string[];
  catalogue: CatalogueItem[];
};

export default function AdminAccountControls({
  userId,
  accountStatus,
  assignedPermissions,
  catalogue,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState(assignedPermissions);
  const [saving, setSaving] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function togglePermission(key: string) {
    if (key === "dashboard.view") return;

    setSelected((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    );
  }

  async function savePermissions() {
    setMessage("");
    setError("");
    setSaving(true);

    try {
      const result = await updateAdminPermissions(userId, selected);

      if (!result.success) {
        setError(result.error || "Unable to update permissions.");
        return;
      }

      setMessage(result.message || "Permissions updated.");
      router.refresh();
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus() {
    const nextStatus =
      accountStatus === "active" ? "suspended" : "active";

    setMessage("");
    setError("");
    setChangingStatus(true);

    try {
      const result = await setAdminAccountStatus(userId, nextStatus);

      if (!result.success) {
        setError(result.error || "Unable to update account status.");
        return;
      }

      setMessage(result.message || "Account status updated.");
      router.refresh();
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setChangingStatus(false);
    }
  }

  return (
    <div className="admin-account-controls">
      <details>
        <summary>Edit permissions</summary>

        <div className="admin-account-permission-list">
          {catalogue.map((item) => (
            <label key={item.permission_key}>
              <input
                type="checkbox"
                checked={selected.includes(item.permission_key)}
                disabled={item.permission_key === "dashboard.view"}
                onChange={() => togglePermission(item.permission_key)}
              />
              <span>
                <strong>{item.permission_name}</strong>
                <small>{item.module_name}</small>
              </span>
            </label>
          ))}
        </div>

        <button
          type="button"
          className="admin-primary-button"
          onClick={savePermissions}
          disabled={saving || !selected.includes("dashboard.view")}
        >
          {saving ? "Saving..." : "Save permissions"}
        </button>
      </details>

      <button
        type="button"
        className="admin-secondary-button"
        onClick={changeStatus}
        disabled={changingStatus}
      >
        {changingStatus
          ? "Updating..."
          : accountStatus === "active"
            ? "Suspend account"
            : "Activate account"}
      </button>

      {message && (
        <p className="admin-feedback admin-feedback-success">{message}</p>
      )}
      {error && (
        <p className="admin-feedback admin-feedback-error">{error}</p>
      )}
    </div>
  );
}
