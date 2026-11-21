"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProtectionData } from "./protection-actions";
import styles from "./ProtectionManagement.module.css";

type Tab =
  | "alerts"
  | "checkins"
  | "assessments"
  | "coverage"
  | "zones"
  | "travellers";

function value(row: Record<string, unknown>, key: string) {
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
  return (
    <span className={`${styles.status} ${styles[`status_${status}`] ?? ""}`}>
      {label(status)}
    </span>
  );
}

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

  const activeRecords = useMemo(() => {
    const source: Record<Tab, Record<string, unknown>[]> = {
      alerts: data.alerts,
      checkins: data.checkins,
      assessments: data.assessments,
      coverage: data.coverage,
      zones: data.riskZones,
      travellers: data.travellers,
    };

    const term = search.trim().toLowerCase();

    return source[tab].filter((record) =>
      !term ||
      Object.values(record).some((item) =>
        String(item ?? "").toLowerCase().includes(term)
      )
    );
  }, [data, tab, search]);

  const openAlerts = data.alerts.filter((item) =>
    ["unread", "read", "acknowledged"].includes(String(item.status))
  ).length;

  const criticalAlerts = data.alerts.filter((item) =>
    ["critical", "high"].includes(String(item.severity)) &&
    !["resolved"].includes(String(item.status))
  ).length;

  const missedCheckins = data.checkins.filter((item) =>
    ["missed", "escalated"].includes(String(item.status))
  ).length;

  const activeCoverage = data.coverage.filter(
    (item) => item.coverage_status === "active"
  ).length;

  const columns: Record<Tab, { key: string; title: string }[]> = {
    alerts: [
      { key: "title", title: "Alert" },
      { key: "traveller_name", title: "Traveller" },
      { key: "alert_type", title: "Type" },
      { key: "severity", title: "Severity" },
      { key: "status", title: "Status" },
      { key: "created_at", title: "Reported" },
    ],
    checkins: [
      { key: "traveller_name", title: "Traveller" },
      { key: "status", title: "Status" },
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
      { key: "zone_type", title: "Type" },
      { key: "severity", title: "Severity" },
      { key: "country_name", title: "Country" },
      { key: "region", title: "Region" },
      { key: "is_active", title: "Active" },
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

  function displayCell(record: Record<string, unknown>, key: string) {
    const raw = record[key];

    if (key === "created_at" || key === "scheduled_at" ||
        key === "confirmed_at" || key === "assessed_at" ||
        key === "profile_completed_at") {
      return date(raw);
    }

    if (key === "is_active") return raw ? "Active" : "Inactive";

    if (key === "calculated_amount" || key === "coverage_limit") {
      if (raw == null) return "—";
      return Number(raw).toLocaleString(undefined, {
        maximumFractionDigits: 2,
      });
    }

    if (key === "risk_score") {
      return raw == null ? "—" : `${value(record, key)} / 100`;
    }

    return key.endsWith("_status") || key === "status" ||
      key === "severity" || key === "risk_level" || key === "alert_type"
      ? label(value(record, key))
      : value(record, key);
  }

  return (
    <div className={styles.workspace}>
      <section className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>TRAVELLER SAFETY & PROTECTION</span>
          <h1>Protection Management</h1>
          <p>
            Monitor safety alerts, check-ins, journey risks and protection
            coverage across the TSC platform.
          </p>
        </div>
        <button type="button" onClick={() => router.refresh()}>
          ↻ Refresh records
        </button>
      </section>

      <section className={styles.metrics}>
        <article>
          <span>Safety alerts</span>
          <strong>{data.alerts.length}</strong>
          <small>{openAlerts} unresolved</small>
        </article>
        <article>
          <span>High-priority alerts</span>
          <strong>{criticalAlerts}</strong>
          <small>High and critical severity</small>
        </article>
        <article>
          <span>Missed check-ins</span>
          <strong>{missedCheckins}</strong>
          <small>Missed or escalated</small>
        </article>
        <article>
          <span>Active coverage</span>
          <strong>{activeCoverage}</strong>
          <small>Active journey protection records</small>
        </article>
        <article>
          <span>Safety profiles</span>
          <strong>{data.travellers.length}</strong>
          <small>Traveller profiles recorded</small>
        </article>
      </section>

      <div className={styles.notice}>
        <strong>Operational monitoring</strong>
        <span>
          This workspace displays recorded information. It does not itself
          dispatch emergency responders, confirm insurance coverage or resolve
          safety alerts.
        </span>
      </div>

      <section className={styles.panel}>
        <div className={styles.tabs} role="tablist" aria-label="Protection records">
          {tabs.map((item) => (
            <button
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={tab === item.id ? styles.activeTab : ""}
              key={item.id}
              onClick={() => setTab(item.id)}
            >
              {item.name}
              <span>{item.count}</span>
            </button>
          ))}
        </div>

        <div className={styles.toolbar}>
          <div>
            <h2>{tabs.find((item) => item.id === tab)?.name}</h2>
            <p>{activeRecords.length} records displayed</p>
          </div>
          <input
            type="search"
            placeholder="Search records..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search protection records"
          />
        </div>

        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                {columns[tab].map((column) => (
                  <th key={column.key}>{column.title}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeRecords.map((record, index) => (
                <tr key={String(record.id ?? `${tab}-${index}`)}>
                  {columns[tab].map((column) => (
                    <td key={column.key}>
                      {column.key === "status" ||
                       column.key === "coverage_status" ||
                       column.key === "eligibility_status" ||
                       column.key === "severity" ||
                       column.key === "risk_level" ||
                       column.key === "assessment_status" ? (
                        <Status value={value(record, column.key)} />
                      ) : (
                        displayCell(record, column.key)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              {activeRecords.length === 0 && (
                <tr>
                  <td colSpan={columns[tab].length}>
                    <div className={styles.empty}>
                      <strong>No records found</strong>
                      <span>There are no matching records in this section.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className={styles.privacy}>
        Sensitive medical information is not displayed in this monitoring
        workspace. Access to personal safety records remains subject to
        administrator permissions and applicable privacy requirements.
      </p>
    </div>
  );
}
