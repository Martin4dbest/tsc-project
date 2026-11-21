"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProtectionData } from "./protection-actions";

type Tab =
  | "alerts"
  | "checkins"
  | "assessments"
  | "coverage"
  | "zones"
  | "travellers";

type RecordRow = Record<string, unknown>;

function value(row: RecordRow, key: string) {
  const item = row[key];
  return item == null || item === "" ? "—" : String(item);
}

function label(input: string) {
  return input.replace(/_/g, " ").replace(/\b\w/g, (letter) =>
    letter.toUpperCase()
  );
}

function date(input: unknown) {
  if (!input) return "Not recorded";
  const parsed = new Date(String(input));
  if (Number.isNaN(parsed.getTime())) return "Invalid date";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function Status({ value: status }: { value: string }) {
  const normalized = status.toLowerCase();

  const color =
    ["critical", "high", "escalated", "overdue", "missed", "emergency", "unresolved"].includes(normalized)
      ? "#b42318"
      : ["medium", "pending", "due", "review", "in_progress"].includes(normalized)
        ? "#a15c00"
        : ["cancelled", "expired", "declined", "not_enrolled", "inactive"].includes(normalized)
          ? "#64748b"
          : "#187443";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "5px 10px",
        borderRadius: 5,
        background: `${color}12`,
        color,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: color,
        }}
      />
      {label(status)}
    </span>
  );
}

const cardStyle = {
  background: "#fff",
  border: "1px solid #e7edf5",
  borderRadius: 10,
  padding: 18,
  minWidth: 0,
} as const;

const mutedStyle = {
  color: "#718096",
  fontSize: 13,
} as const;

const buttonStyle = {
  border: "1px solid #dce4ef",
  borderRadius: 7,
  background: "#fff",
  color: "#071d49",
  padding: "9px 14px",
  fontWeight: 650,
  cursor: "pointer",
} as const;

export default function ProtectionManagementClient({
  data,
}: {
  data: ProtectionData;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("alerts");
  const [search, setSearch] = useState("");

  const tabs: { id: Tab; name: string; count: number }[] = [
    { id: "alerts", name: "Safety alerts", count: data.alerts.length },
    { id: "checkins", name: "Safety check-ins", count: data.checkins.length },
    { id: "assessments", name: "Journey risk", count: data.assessments.length },
    { id: "coverage", name: "Protection coverage", count: data.coverage.length },
    { id: "zones", name: "Risk zones", count: data.riskZones.length },
    { id: "travellers", name: "Safety profiles", count: data.travellers.length },
  ];

  const source: Record<Tab, RecordRow[]> = {
    alerts: data.alerts,
    checkins: data.checkins,
    assessments: data.assessments,
    coverage: data.coverage,
    zones: data.riskZones,
    travellers: data.travellers,
  };

  const activeRecords = useMemo(() => {
    const term = search.trim().toLowerCase();
    return source[tab].filter(
      (record) =>
        !term ||
        Object.values(record).some((item) =>
          String(item ?? "").toLowerCase().includes(term)
        )
    );
  }, [source, tab, search]);

  const openAlerts = data.alerts.filter((item) =>
    ["unread", "read", "acknowledged"].includes(String(item.status))
  ).length;

  const criticalAlerts = data.alerts.filter(
    (item) =>
      ["critical", "high"].includes(String(item.severity)) &&
      item.status !== "resolved"
  ).length;

  const missedCheckins = data.checkins.filter((item) =>
    ["missed", "escalated"].includes(String(item.status))
  ).length;

  const activeCoverage = data.coverage.filter(
    (item) => item.coverage_status === "active"
  ).length;

  const totalRecords = Object.values(source).reduce(
    (total, records) => total + records.length,
    0
  );

  const summaries = [
    { title: "Safety alerts", count: data.alerts.length, detail: `${openAlerts} unresolved` },
    { title: "High priority", count: criticalAlerts, detail: "High and critical alerts" },
    { title: "Missed check-ins", count: missedCheckins, detail: "Missed or escalated" },
    { title: "Active coverage", count: activeCoverage, detail: "Active coverage records" },
    { title: "Safety profiles", count: data.travellers.length, detail: "Traveller profiles" },
  ];

  const columns: Record<Tab, { key: string; title: string }[]> = {
    alerts: [
      { key: "title", title: "Alert details" },
      { key: "traveller_name", title: "Traveller" },
      { key: "alert_type", title: "Category" },
      { key: "severity", title: "Severity" },
      { key: "status", title: "Status" },
      { key: "created_at", title: "Reported" },
    ],
    checkins: [
      { key: "traveller_name", title: "Traveller" },
      { key: "status", title: "Check-in status" },
      { key: "scheduled_at", title: "Scheduled" },
      { key: "confirmed_at", title: "Confirmed" },
      { key: "timezone", title: "Time zone" },
    ],
    assessments: [
      { key: "traveller_name", title: "Traveller" },
      { key: "risk_level", title: "Risk level" },
      { key: "risk_score", title: "Risk score" },
      { key: "assessment_status", title: "Assessment" },
      { key: "assessed_at", title: "Assessed" },
    ],
    coverage: [
      { key: "traveller_name", title: "Traveller" },
      { key: "eligibility_status", title: "Eligibility" },
      { key: "coverage_status", title: "Coverage" },
      { key: "calculated_amount", title: "Calculated amount" },
      { key: "currency_code", title: "Currency" },
      { key: "coverage_limit", title: "Coverage limit" },
    ],
    zones: [
      { key: "zone_name", title: "Risk zone" },
      { key: "zone_type", title: "Zone type" },
      { key: "severity", title: "Severity" },
      { key: "country_name", title: "Country" },
      { key: "region", title: "Region" },
      { key: "is_active", title: "Availability" },
    ],
    travellers: [
      { key: "traveller_name", title: "Traveller" },
      { key: "traveller_phone", title: "Phone" },
      { key: "preferred_language", title: "Language" },
      { key: "preferred_notification_channel", title: "Notifications" },
      { key: "emergency_contact_count", title: "Emergency contacts" },
      { key: "profile_completed_at", title: "Profile completed" },
    ],
  };

  function renderCell(record: RecordRow, key: string) {
    const raw = record[key];

    if (
      ["created_at", "scheduled_at", "confirmed_at", "assessed_at", "profile_completed_at"].includes(key)
    ) {
      return date(raw);
    }

    if (key === "calculated_amount" || key === "coverage_limit") {
      return raw == null ? "—" : Number(raw).toLocaleString(undefined, { maximumFractionDigits: 2 });
    }

    if (key === "risk_score") {
      return raw == null ? "—" : `${value(record, key)} / 100`;
    }

    if (
      ["status", "coverage_status", "eligibility_status", "severity", "risk_level", "assessment_status"].includes(key)
    ) {
      return <Status value={value(record, key)} />;
    }

    if (key === "traveller_name") {
      return <strong style={{ color: "#071d49" }}>{value(record, key)}</strong>;
    }

    if (key === "title") {
      return (
        <div>
          <strong style={{ color: "#071d49" }}>{value(record, key)}</strong>
          {record.message ? (
            <div style={mutedStyle}>{String(record.message)}</div>
          ) : null}
        </div>
      );
    }

    if (key === "is_active") {
      const active = raw === true || raw === "true" || raw === 1;
      return <Status value={active ? "active" : "inactive"} />;
    }

    return value(record, key);
  }

  const selectedTab = tabs.find((item) => item.id === tab);

  return (
    <div style={{ display: "grid", gap: 24, minWidth: 0 }}>
      <header className="dashboard-header" style={{ marginBottom: 0 }}>
        <div>
          <span className="dashboard-eyebrow">TSC ADMINISTRATION</span>
          <h1 style={{ color: "#071d49", margin: "6px 0", fontSize: 28 }}>
            Protection Management
          </h1>
          <p style={mutedStyle}>
            Monitor traveller safety activity, review reported incidents and oversee protection records.
          </p>
        </div>
        <button type="button" style={buttonStyle} onClick={() => router.refresh()}>
          ↻ Refresh records
        </button>
      </header>

      {data.error ? (
        <div role="alert" style={{ ...cardStyle, borderLeft: "4px solid #b42318", color: "#b42318" }}>
          <strong>Some records could not be loaded</strong>
          <p>{data.error}</p>
        </div>
      ) : null}

      <section>
        <div style={{ marginBottom: 14 }}>
          <span className="dashboard-eyebrow">OPERATIONS OVERVIEW</span>
          <h2 style={{ color: "#071d49", fontSize: 20, margin: "5px 0" }}>
            Safety activity
          </h2>
        </div>

        <div className="dashboard-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: 14 }}>
          {summaries.map((item) => (
            <article className="dashboard-card" key={item.title}>
              <span style={mutedStyle}>{item.title}</span>
              <strong style={{ display: "block", color: "#071d49", fontSize: 28, margin: "10px 0 5px" }}>
                {item.count.toLocaleString()}
              </strong>
              <span style={{ ...mutedStyle, fontSize: 12 }}>{item.detail}</span>
            </article>
          ))}
        </div>
      </section>

      <div className="dashboard-card" style={{ borderLeft: "4px solid #FF8A00" }}>
        <strong style={{ color: "#071d49" }}>Monitoring workspace</strong>
        <p style={{ ...mutedStyle, marginBottom: 0 }}>
          These records do not represent live emergency dispatch, confirmed insurance coverage or resolved incidents.
        </p>
      </div>

      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <div>
            <span className="dashboard-eyebrow">PROTECTION DATA</span>
            <h2 style={{ color: "#071d49", fontSize: 20, margin: "5px 0" }}>Records centre</h2>
            <p style={mutedStyle}>Review and search safety information recorded across the platform.</p>
          </div>
          <div className="dashboard-card" style={{ minWidth: 130 }}>
            <strong style={{ display: "block", color: "#071d49", fontSize: 24 }}>{totalRecords.toLocaleString()}</strong>
            <span style={mutedStyle}>Total records</span>
          </div>
        </div>

        <div className="dashboard-card" style={{ padding: 0, overflow: "hidden" }}>
          <div role="tablist" aria-label="Protection record categories" style={{ display: "flex", flexWrap: "wrap", gap: 5, padding: 12, borderBottom: "1px solid #e7edf5" }}>
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                aria-controls="protection-record-panel"
                onClick={() => {
                  setTab(item.id);
                  setSearch("");
                }}
                style={{
                  ...buttonStyle,
                  borderColor: tab === item.id ? "#FF8A00" : "#dce4ef",
                  background: tab === item.id ? "#fff5e9" : "#fff",
                  color: tab === item.id ? "#071d49" : "#718096",
                }}
              >
                {item.name} ({item.count.toLocaleString()})
              </button>
            ))}
          </div>

          <div id="protection-record-panel" role="tabpanel" style={{ minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, padding: 18, borderBottom: "1px solid #e7edf5" }}>
              <div>
                <h3 style={{ color: "#071d49", margin: 0 }}>{selectedTab?.name}</h3>
                <p style={{ ...mutedStyle, margin: "4px 0 0" }}>
                  {activeRecords.length.toLocaleString()} of {source[tab].length.toLocaleString()} records
                </p>
              </div>
              <input
                type="search"
                placeholder={`Search ${selectedTab?.name.toLowerCase()}...`}
                aria-label={`Search ${selectedTab?.name.toLowerCase()}`}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                style={{ width: "min(100%, 320px)", minHeight: 40, padding: "8px 12px", border: "1px solid #dce4ef", borderRadius: 7, font: "inherit" }}
              />
            </div>

            <div style={{ width: "100%", overflowX: "auto" }}>
              {activeRecords.length > 0 ? (
                <table style={{ width: "100%", minWidth: 680, borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "#f4f7fc" }}>
                      {columns[tab].map((column) => (
                        <th key={column.key} style={{ padding: "13px 15px", color: "#52657c", fontSize: 12, whiteSpace: "nowrap", borderBottom: "1px solid #e7edf5" }}>
                          {column.title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeRecords.map((record, index) => (
                      <tr key={String(record.id ?? `${tab}-${index}`)}>
                        {columns[tab].map((column) => (
                          <td key={column.key} style={{ padding: "13px 15px", color: "#40566d", fontSize: 13, borderBottom: "1px solid #edf1f5", verticalAlign: "middle" }}>
                            {renderCell(record, column.key)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: 42, textAlign: "center" }}>
                  <h3 style={{ color: "#071d49" }}>
                    {search ? "No matching records" : `No ${selectedTab?.name.toLowerCase()} yet`}
                  </h3>
                  <p style={mutedStyle}>
                    {search
                      ? "Try a different search term."
                      : "Records in this category will appear here for authorised administrators."}
                  </p>
                  {search ? (
                    <button type="button" style={buttonStyle} onClick={() => setSearch("")}>
                      Clear search
                    </button>
                  ) : null}
                </div>
              )}
            </div>

            <div style={{ padding: "12px 16px", borderTop: "1px solid #e7edf5", color: "#718096", fontSize: 12 }}>
              Showing {activeRecords.length.toLocaleString()} {activeRecords.length === 1 ? "record" : "records"} · Administrator access controls apply
            </div>
          </div>
        </div>
      </section>

      <footer className="dashboard-card">
        <strong style={{ color: "#071d49" }}>Privacy and data protection</strong>
        <p style={{ ...mutedStyle, marginBottom: 0 }}>
          Sensitive medical information is not displayed in this monitoring workspace. Access to personal safety records remains subject to administrator permissions and applicable privacy requirements.
        </p>
      </footer>
    </div>
  );
}
