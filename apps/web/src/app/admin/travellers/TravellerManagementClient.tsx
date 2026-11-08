"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setTravellerAccountStatus } from "./traveller-actions";

type Traveller = {
  user_id: string;
  full_name: string;
  phone: string | null;
  account_status: "active" | "suspended";
  created_at: string;
};

export default function TravellerManagementClient({
  travellers,
  canManage,
}: {
  travellers: Traveller[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const filteredTravellers = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return travellers;

    return travellers.filter((traveller) =>
      [
        traveller.full_name,
        traveller.phone ?? "",
        traveller.user_id,
        traveller.account_status,
      ].some((value) => value.toLowerCase().includes(term))
    );
  }, [travellers, search]);

  function changeStatus(traveller: Traveller) {
    const nextStatus =
      traveller.account_status === "active" ? "suspended" : "active";

    const confirmed = window.confirm(
      `Are you sure you want to ${nextStatus} ${traveller.full_name || "this traveller"}?`
    );

    if (!confirmed) return;

    setMessage("");

    startTransition(async () => {
      const result = await setTravellerAccountStatus(
        traveller.user_id,
        nextStatus
      );

      if (result.error) {
        setMessage(result.error);
        return;
      }

      setMessage("Traveller account status updated successfully.");
      router.refresh();
    });
  }

  return (
    <section className="traveller-management">
      <div className="traveller-management-summary">
        <div className="dashboard-card">
          <span>Total travellers</span>
          <strong>{travellers.length}</strong>
        </div>
        <div className="dashboard-card">
          <span>Active accounts</span>
          <strong>
            {travellers.filter((item) => item.account_status === "active").length}
          </strong>
        </div>
        <div className="dashboard-card">
          <span>Suspended accounts</span>
          <strong>
            {travellers.filter((item) => item.account_status === "suspended").length}
          </strong>
        </div>
      </div>

      <div className="traveller-management-toolbar">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, phone, ID or status..."
          aria-label="Search travellers"
        />
        <span>{filteredTravellers.length} records</span>
      </div>

      {message && <p role="status">{message}</p>}

      <div className="traveller-management-table-wrap">
        <table className="traveller-management-table">
          <thead>
            <tr>
              <th>Traveller</th>
              <th>Phone</th>
              <th>Registration date</th>
              <th>Status</th>
              {canManage && <th>Account action</th>}
            </tr>
          </thead>
          <tbody>
            {filteredTravellers.map((traveller) => (
              <tr key={traveller.user_id}>
                <td>
                  <strong>{traveller.full_name || "Unnamed traveller"}</strong>
                  <small>{traveller.user_id}</small>
                </td>
                <td>{traveller.phone || "Not provided"}</td>
                <td>
                  {new Date(traveller.created_at).toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td>
                  <span className={`traveller-status ${traveller.account_status}`}>
                    {traveller.account_status}
                  </span>
                </td>
                {canManage && (
                  <td>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => changeStatus(traveller)}
                    >
                      {traveller.account_status === "active"
                        ? "Suspend"
                        : "Activate"}
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {filteredTravellers.length === 0 && (
              <tr>
                <td colSpan={canManage ? 5 : 4}>
                  No matching traveller records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!canManage && (
        <p>You have read-only access to traveller records.</p>
      )}
    </section>
  );
}
