"use client";

import { useRouter } from "next/navigation";

type AuditLog = {
  id: number;
  actor_name: string;
  actor_email: string;
  target_name: string;
  target_email: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
};

export default function AuditLogsClient({ logs }: { logs: AuditLog[] }) {
  const router = useRouter();

  function formatDate(value: string) {
    return new Intl.DateTimeFormat("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Africa/Lagos",
    }).format(new Date(value));
  }

  function formatAction(value: string) {
    return value
      .replace(/[._-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function formatDetails(details: Record<string, unknown>) {
    const entries = Object.entries(details ?? {});

    if (!entries.length) return "No additional details";

    return entries
      .map(([key, value]) => {
        const readableKey = key
          .replace(/[._-]+/g, " ")
          .replace(/\b\w/g, (letter) => letter.toUpperCase());

        const readableValue =
          typeof value === "string"
            ? value
            : JSON.stringify(value);

        return `${readableKey}: ${readableValue ?? "—"}`;
      })
      .join(" · ");
  }

  return (
    <section className="audit-management">
      <div className="audit-management-heading">
        <div>
          <p className="audit-eyebrow">PLATFORM SECURITY</p>
          <h1>Audit Logs</h1>
          <p>
            Review administrator activity and changes recorded across TSC.
          </p>
        </div>

        <button
          type="button"
          className="admin-primary-button"
          onClick={() => router.refresh()}
        >
          Refresh logs
        </button>
      </div>

      <section className="audit-panel">
        <div className="audit-panel-heading">
          <div>
            <h2>Recent activity</h2>
            <p>Showing the latest {logs.length} recorded events.</p>
          </div>
          <span className="audit-count">{logs.length} records</span>
        </div>

        <div className="audit-table-wrap">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Date &amp; Time</th>
                <th>Administrator</th>
                <th>Action</th>
                <th>Account Affected</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="audit-date">{formatDate(log.created_at)}</td>
                  <td>
                    <strong>{log.actor_name}</strong>
                    {log.actor_email && (
                      <small>{log.actor_email}</small>
                    )}
                  </td>
                  <td>
                    <span className="audit-action">
                      {formatAction(log.action)}
                    </span>
                  </td>
                  <td>
                    <strong>{log.target_name}</strong>
                    {log.target_email && (
                      <small>{log.target_email}</small>
                    )}
                  </td>
                  <td className="audit-details">
                    {formatDetails(log.details)}
                  </td>
                </tr>
              ))}

              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="audit-empty">
                    No audit activity has been recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
