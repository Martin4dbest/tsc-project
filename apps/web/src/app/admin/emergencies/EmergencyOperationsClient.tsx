"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  assignEmergencyResponder,
  getEmergencyActivity,
  updateEmergencyStatus,
  type EmergencyActivity,
  type EmergencyRecord,
  type EmergencyResponder,
  type EmergencySeverity,
  type EmergencyStatus,
} from "./emergency-actions";

type Props = {
  records: EmergencyRecord[];
  responders: EmergencyResponder[];
  canManage: boolean;
  responderError?: string | null;
};

type StatusFilter = "all" | EmergencyStatus;
type SeverityFilter = "all" | EmergencySeverity;

const STATUS_FILTERS: StatusFilter[] = [
  "all", "reported", "acknowledged", "assigned",
  "responding", "resolved", "cancelled",
];

const SEVERITY_FILTERS: SeverityFilter[] = [
  "all", "low", "moderate", "high", "critical",
];

const NEXT_STATUSES: Record<EmergencyStatus, EmergencyStatus[]> = {
  reported: ["acknowledged", "cancelled"],
  acknowledged: ["assigned", "responding", "resolved"],
  assigned: ["responding", "resolved"],
  responding: ["resolved", "assigned"],
  resolved: [],
  cancelled: [],
};

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) =>
    letter.toUpperCase()
  );
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getStatusClass(status: EmergencyStatus) {
  return `emergency-status emergency-status-${status}`;
}

function getSeverityClass(severity: EmergencySeverity) {
  return `emergency-severity emergency-severity-${severity}`;
}

export default function EmergencyOperationsClient({
  records,
  responders,
  canManage,
  responderError,
}: Props) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [severityFilter, setSeverityFilter] =
    useState<SeverityFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(
    records[0]?.id ?? null
  );
  const [activities, setActivities] = useState<EmergencyActivity[]>([]);
  const [activityError, setActivityError] = useState("");
  const [selectedResponder, setSelectedResponder] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();
  const [realtimeStatus, setRealtimeStatus] = useState<
    "connecting" | "connected" | "reconnecting"
  >("connecting");

  const selectedRecord = records.find((record) => record.id === selectedId) ?? null;

  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase();

    return records.filter((record) => {
      const matchesStatus =
        statusFilter === "all" || record.status === statusFilter;
      const matchesSeverity =
        severityFilter === "all" || record.severity === severityFilter;
      const searchable = [
        record.title,
        record.description,
        record.traveller_name,
        record.traveller_phone,
        record.journey_name,
        record.location_address,
        record.id,
      ].filter(Boolean).join(" ").toLowerCase();

      return matchesStatus && matchesSeverity &&
        (!term || searchable.includes(term));
    });
  }, [records, search, statusFilter, severityFilter]);

  useEffect(() => {
    let disposed = false;
    let refreshTimer: ReturnType<typeof setInterval> | undefined;

    const channel = supabase
      .channel("admin-emergency-operations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "emergency_alerts" },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "emergency_activity_logs" },
        () => {
          if (selectedId) void loadActivity(selectedId);
          router.refresh();
        }
      )
      .subscribe((status) => {
        if (disposed) return;

        if (status === "SUBSCRIBED") {
          setRealtimeStatus("connected");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeStatus("reconnecting");
        } else {
          setRealtimeStatus("connecting");
        }
      });

    refreshTimer = setInterval(() => {
      if (!disposed) router.refresh();
    }, 30000);

    return () => {
      disposed = true;
      if (refreshTimer) clearInterval(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [router, selectedId]);

  async function loadActivity(emergencyId: string) {
    setActivityError("");

    const result = await getEmergencyActivity(emergencyId);

    if (result.error) {
      setActivityError(result.error);
      setActivities([]);
      return;
    }

    setActivities(result.activities);
  }

  useEffect(() => {
    if (!selectedRecord) {
      setActivities([]);
      setSelectedResponder("");
      setResolutionNotes("");
      return;
    }

    setSelectedResponder(selectedRecord.assigned_responder_id ?? "");
    setResolutionNotes(selectedRecord.resolution_notes ?? "");
    void loadActivity(selectedRecord.id);
  }, [selectedId, selectedRecord?.id]);

  function runAction(action: () => Promise<{ success?: boolean; error?: string }>) {
    setFeedback("");

    startTransition(async () => {
      const result = await action();

      if (result.error) {
        setFeedback(result.error);
        return;
      }

      setFeedback("Emergency record updated successfully.");
      router.refresh();

      if (selectedId) {
        await loadActivity(selectedId);
      }
    });
  }

  function handleStatusChange(status: EmergencyStatus) {
    if (!selectedRecord) return;

    runAction(() =>
      updateEmergencyStatus(
        selectedRecord.id,
        status,
        status === "resolved" ? resolutionNotes : undefined
      )
    );
  }

  function handleResponderAssignment() {
    if (!selectedRecord || !selectedResponder) {
      setFeedback("Select a responder first.");
      return;
    }

    runAction(() =>
      assignEmergencyResponder(selectedRecord.id, selectedResponder)
    );
  }

  const counts = useMemo(() => ({
    total: records.length,
    open: records.filter((item) =>
      ["reported", "acknowledged", "assigned", "responding"].includes(item.status)
    ).length,
    critical: records.filter((item) =>
      item.severity === "critical" &&
      !["resolved", "cancelled"].includes(item.status)
    ).length,
    responding: records.filter((item) => item.status === "responding").length,
    resolved: records.filter((item) => item.status === "resolved").length,
  }), [records]);


  return (
    <div className="emergency-operations">
      <section className="emergency-page-heading">
        <div>
          <span className="emergency-eyebrow">SAFETY & RESPONSE CENTRE</span>
          <h1>Emergency Operations</h1>
          <p>
            Monitor traveller incidents, coordinate responders and track
            emergency resolution.
          </p>
        </div>

        <div className={`emergency-live-indicator ${realtimeStatus}`}>
          <span />
          {realtimeStatus === "connected"
            ? "Live monitoring"
            : realtimeStatus === "reconnecting"
              ? "Reconnecting"
              : "Connecting"}
        </div>
      </section>

      <section className="emergency-kpi-grid">
        <article className="emergency-kpi">
          <span>Total reports</span>
          <strong>{counts.total}</strong>
          <small>All recorded incidents</small>
        </article>
        <article className="emergency-kpi">
          <span>Open incidents</span>
          <strong>{counts.open}</strong>
          <small>Awaiting closure</small>
        </article>
        <article className="emergency-kpi emergency-kpi-critical">
          <span>Critical incidents</span>
          <strong>{counts.critical}</strong>
          <small>Require urgent attention</small>
        </article>
        <article className="emergency-kpi">
          <span>Responding</span>
          <strong>{counts.responding}</strong>
          <small>Active response operations</small>
        </article>
        <article className="emergency-kpi">
          <span>Resolved</span>
          <strong>{counts.resolved}</strong>
          <small>Closed incidents</small>
        </article>
      </section>

      {feedback && (
        <div className="emergency-feedback" role="status">
          {feedback}
          <button type="button" onClick={() => setFeedback("")}>
            Dismiss
          </button>
        </div>
      )}

      {responderError && canManage && (
        <div className="emergency-feedback emergency-feedback-warning" role="alert">
          {responderError}
        </div>
      )}

      <section className="emergency-workspace">
        <div className="emergency-list-panel">
          <div className="emergency-panel-heading">
            <div>
              <h2>Incident register</h2>
              <p>{filteredRecords.length} reports displayed</p>
            </div>
            <span className="emergency-register-count">{records.length}</span>
          </div>

          <div className="emergency-filters">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search reports, travellers or references..."
              aria-label="Search emergency reports"
            />

            <div className="emergency-filter-row">
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as StatusFilter)
                }
                aria-label="Filter by status"
              >
                {STATUS_FILTERS.map((status) => (
                  <option key={status} value={status}>
                    {status === "all" ? "All statuses" : formatLabel(status)}
                  </option>
                ))}
              </select>

              <select
                value={severityFilter}
                onChange={(event) =>
                  setSeverityFilter(event.target.value as SeverityFilter)
                }
                aria-label="Filter by severity"
              >
                {SEVERITY_FILTERS.map((severity) => (
                  <option key={severity} value={severity}>
                    {severity === "all"
                      ? "All severities"
                      : formatLabel(severity)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="emergency-record-list">
            {filteredRecords.length === 0 ? (
              <div className="emergency-empty">
                <span>✓</span>
                <strong>No matching reports</strong>
                <p>Try changing your search or filters.</p>
              </div>
            ) : (
              filteredRecords.map((record) => (
                <button
                  type="button"
                  key={record.id}
                  className={`emergency-record-item ${
                    selectedId === record.id ? "selected" : ""
                  }`}
                  onClick={() => setSelectedId(record.id)}
                >
                  <span className="emergency-record-topline">
                    <span className={getSeverityClass(record.severity)}>
                      {formatLabel(record.severity)}
                    </span>
                    <span className={getStatusClass(record.status)}>
                      {formatLabel(record.status)}
                    </span>
                  </span>
                  <strong>{record.title}</strong>
                  <span className="emergency-record-traveller">
                    {record.traveller_name}
                  </span>
                  <span className="emergency-record-date">
                    {formatDate(record.reported_at)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="emergency-detail-panel">
          {!selectedRecord ? (
            <div className="emergency-empty emergency-detail-empty">
              <span>!</span>
              <strong>Select an incident</strong>
              <p>Choose a report from the incident register to view its details and response history.</p>
            </div>
          ) : (
            <>
              <div className="emergency-detail-heading">
                <div>
                  <span className="emergency-eyebrow">INCIDENT DETAILS</span>
                  <h2>{selectedRecord.title}</h2>
                  <p>Reference: {selectedRecord.id}</p>
                </div>
                <div className="emergency-detail-badges">
                  <span className={getSeverityClass(selectedRecord.severity)}>
                    {formatLabel(selectedRecord.severity)}
                  </span>
                  <span className={getStatusClass(selectedRecord.status)}>
                    {formatLabel(selectedRecord.status)}
                  </span>
                </div>
              </div>

              <div className="emergency-detail-grid">
                <div>
                  <span>Traveller</span>
                  <strong>{selectedRecord.traveller_name}</strong>
                  <small>{selectedRecord.traveller_phone || "No phone provided"}</small>
                </div>
                <div>
                  <span>Incident category</span>
                  <strong>{formatLabel(selectedRecord.category)}</strong>
                </div>
                <div>
                  <span>Reported</span>
                  <strong>{formatDate(selectedRecord.reported_at)}</strong>
                </div>
                <div>
                  <span>Assigned responder</span>
                  <strong>{selectedRecord.responder_name || "Not assigned"}</strong>
                  <small>{selectedRecord.responder_phone || ""}</small>
                </div>
                <div>
                  <span>Related journey</span>
                  <strong>{selectedRecord.journey_name || "No journey linked"}</strong>
                </div>
                <div>
                  <span>Location accuracy</span>
                  <strong>
                    {selectedRecord.location_accuracy_meters != null
                      ? `${Math.round(selectedRecord.location_accuracy_meters)} metres`
                      : "Not available"}
                  </strong>
                </div>
              </div>

              <section className="emergency-description">
                <h3>Traveller's report</h3>
                <p>{selectedRecord.description || "No additional description supplied."}</p>
              </section>

              <section className="emergency-location">
                <div>
                  <h3>Reported location</h3>
                  <p>{selectedRecord.location_address || "Address not available"}</p>
                  {selectedRecord.latitude != null &&
                    selectedRecord.longitude != null && (
                      <small>
                        {selectedRecord.latitude.toFixed(6)},{" "}
                        {selectedRecord.longitude.toFixed(6)}
                      </small>
                    )}
                </div>
                {selectedRecord.latitude != null &&
                  selectedRecord.longitude != null && (
                    <a
                      href={`https://www.google.com/maps?q=${selectedRecord.latitude},${selectedRecord.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open map
                    </a>
                  )}
              </section>

              {canManage && !["resolved", "cancelled"].includes(selectedRecord.status) && (
                <section className="emergency-response-controls">
                  <h3>Response coordination</h3>

                  <label htmlFor="emergency-responder">
                    Assign or change responder
                  </label>
                  <div className="emergency-assignment-row">
                    <select
                      id="emergency-responder"
                      value={selectedResponder}
                      onChange={(event) => setSelectedResponder(event.target.value)}
                    >
                      <option value="">Select a responder</option>
                      {responders.map((responder) => (
                        <option key={responder.user_id} value={responder.user_id}>
                          {responder.full_name} ({formatLabel(responder.role)})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleResponderAssignment}
                      disabled={isPending || !selectedResponder}
                    >
                      Assign responder
                    </button>
                  </div>

                  {selectedRecord.status === "responding" && (
                    <label htmlFor="emergency-resolution-notes">
                      Resolution notes
                      <textarea
                        id="emergency-resolution-notes"
                        value={resolutionNotes}
                        onChange={(event) => setResolutionNotes(event.target.value)}
                        placeholder="Record the response outcome and assistance provided..."
                        rows={3}
                      />
                    </label>
                  )}

                  <div className="emergency-action-buttons">
                    {selectedRecord.status === "reported" && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleStatusChange("acknowledged")}
                          disabled={isPending}
                        >
                          Acknowledge report
                        </button>
                        <button
                          type="button"
                          className="emergency-button-danger"
                          onClick={() => handleStatusChange("cancelled")}
                          disabled={isPending}
                        >
                          Cancel report
                        </button>
                      </>
                    )}

                    {["acknowledged", "assigned"].includes(selectedRecord.status) && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange("responding")}
                        disabled={isPending || !selectedRecord.assigned_responder_id}
                      >
                        Start response
                      </button>
                    )}

                    {["acknowledged", "assigned", "responding"].includes(selectedRecord.status) && (
                      <button
                        type="button"
                        className="emergency-button-success"
                        onClick={() => handleStatusChange("resolved")}
                        disabled={isPending}
                      >
                        Mark as resolved
                      </button>
                    )}
                  </div>
                </section>
              )}

              {selectedRecord.resolution_notes && (
                <section className="emergency-description">
                  <h3>Resolution notes</h3>
                  <p>{selectedRecord.resolution_notes}</p>
                </section>
              )}

              <section className="emergency-activity-section">
                <div className="emergency-panel-heading">
                  <div>
                    <h3>Activity history</h3>
                    <p>Recorded actions and response updates</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadActivity(selectedRecord.id)}
                  >
                    Refresh
                  </button>
                </div>

                {activityError && (
                  <p className="emergency-inline-error">{activityError}</p>
                )}

                {activities.length === 0 ? (
                  <p className="emergency-activity-empty">
                    No activity entries are available.
                  </p>
                ) : (
                  <ol className="emergency-activity-list">
                    {activities.map((activity) => (
                      <li key={activity.id}>
                        <span className="emergency-activity-dot" />
                        <div>
                          <strong>{formatLabel(activity.event_type)}</strong>
                          <p>{activity.actor_name || "System"}</p>
                          <time dateTime={activity.created_at}>
                            {formatDate(activity.created_at)}
                          </time>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
