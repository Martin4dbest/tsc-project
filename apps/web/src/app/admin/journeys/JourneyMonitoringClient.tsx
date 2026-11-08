"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  updateJourneyStatus,
  type JourneyRecord,
  type JourneyStatus,
  type LiveGpsJourneyRecord,
} from "./journey-actions";
import LiveGpsPanel from "./LiveGpsPanel";

type Props = {
  journeys: JourneyRecord[];
  canManage: boolean;
  liveGpsRecords: LiveGpsJourneyRecord[];
  liveGpsError?: string | null;
};

const FILTERS: { label: string; value: "all" | JourneyStatus }[] = [
  { label: "All journeys", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const NEXT_STATUSES: Record<JourneyStatus, JourneyStatus[]> = {
  draft: ["scheduled", "cancelled"],
  scheduled: ["active", "cancelled"],
  active: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

function formatDateTime(value: string | null, timezone: string | null) {
  if (!value) return "Not recorded";

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Invalid date";

    const safeTimezone = timezone || "UTC";

    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: safeTimezone,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(new Date(value));
  }
}

function statusLabel(status: JourneyStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function transportLabel(mode: string) {
  const labels: Record<string, string> = {
    air: "Air travel",
    road: "Road travel",
    rail: "Rail travel",
    sea: "Sea travel",
    other: "Other transport",
  };

  return labels[mode] || mode;
}

export default function JourneyMonitoringClient({
  journeys,
  canManage,
  liveGpsRecords,
  liveGpsError,
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | JourneyStatus>(
    "all"
  );
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(
    null
  );
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting" | "connected" | "reconnecting">("connecting");

  useEffect(() => {
    let disposed = false;

    const channel = supabase
      .channel("admin-journey-monitoring")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "journeys" },
        () => {
          if (!disposed) router.refresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "journey_location_updates",
        },
        () => {
          if (!disposed) router.refresh();
        }
      )
      .subscribe((status) => {
        if (disposed) return;

        if (status === "SUBSCRIBED") {
          setRealtimeStatus("connected");
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setRealtimeStatus("reconnecting");
        } else {
          setRealtimeStatus("connecting");
        }
      });

    return () => {
      disposed = true;
      void supabase.removeChannel(channel);
    };
  }, [router]);

  useEffect(() => {
    if (realtimeStatus === "connected") return;

    const fallback = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 30000);

    return () => window.clearInterval(fallback);
  }, [realtimeStatus, router]);

  const counts = useMemo(() => {
    return {
      all: journeys.length,
      draft: journeys.filter((item) => item.status === "draft").length,
      scheduled: journeys.filter((item) => item.status === "scheduled").length,
      active: journeys.filter((item) => item.status === "active").length,
      completed: journeys.filter((item) => item.status === "completed").length,
      cancelled: journeys.filter((item) => item.status === "cancelled").length,
    };
  }, [journeys]);

  const filteredJourneys = useMemo(() => {
    const query = search.trim().toLowerCase();

    return journeys.filter((journey) => {
      const matchesStatus =
        activeFilter === "all" || journey.status === activeFilter;

      const searchable = [
        journey.journey_name,
        journey.traveller_name,
        journey.traveller_phone,
        journey.origin_name,
        journey.origin_address,
        journey.destination_name,
        journey.destination_address,
        journey.transport_mode,
        journey.id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesStatus && (!query || searchable.includes(query));
    });
  }, [journeys, activeFilter, search]);

  const selectedJourney =
    journeys.find((item) => item.id === selectedJourneyId) ?? null;

  function changeStatus(journey: JourneyRecord, status: JourneyStatus) {
    setFeedback("");

    startTransition(async () => {
      const result = await updateJourneyStatus(journey.id, status);

      if (result.error) {
        setFeedback(result.error);
        return;
      }

      setFeedback(
        `Journey status updated to ${statusLabel(status).toLowerCase()}.`
      );
      router.refresh();
    });
  }

  return (
    <div className="journey-workspace">
      <section className="journey-page-heading">
        <div>
          <span className="journey-eyebrow">
            <span /> OPERATIONS &amp; TRIP OVERSIGHT
          </span>
          <h1>Journey Monitoring</h1>
          <p>
            Review traveller journeys, scheduled movements and recorded trip
            progress across the platform.
          </p>
        </div>

        <div className="journey-heading-meta">
          <span className="journey-live-mark" />
          <span>Journey register</span>
          <small>{realtimeStatus === "connected" ? "Live updates connected" : realtimeStatus === "reconnecting" ? "Reconnecting · automatic refresh enabled" : "Connecting to live updates..."}</small>
        </div>
      </section>

      <section className="journey-stat-grid" aria-label="Journey summary">
        <article className="journey-stat-card journey-stat-total">
          <span className="journey-stat-icon">⌖</span>
          <span className="journey-stat-label">Total journeys</span>
          <strong>{counts.all.toLocaleString()}</strong>
          <small>Records available to this account</small>
        </article>

        <article className="journey-stat-card journey-stat-active">
          <span className="journey-stat-icon">↗</span>
          <span className="journey-stat-label">Active journeys</span>
          <strong>{counts.active.toLocaleString()}</strong>
          <small>Marked as currently in progress</small>
        </article>

        <article className="journey-stat-card journey-stat-scheduled">
          <span className="journey-stat-icon">◷</span>
          <span className="journey-stat-label">Scheduled</span>
          <strong>{counts.scheduled.toLocaleString()}</strong>
          <small>Awaiting journey start</small>
        </article>

        <article className="journey-stat-card journey-stat-completed">
          <span className="journey-stat-icon">✓</span>
          <span className="journey-stat-label">Completed</span>
          <strong>{counts.completed.toLocaleString()}</strong>
          <small>Marked as completed</small>
        </article>

        <article className="journey-stat-card journey-stat-cancelled">
          <span className="journey-stat-icon">—</span>
          <span className="journey-stat-label">Cancelled</span>
          <strong>{counts.cancelled.toLocaleString()}</strong>
          <small>Cancelled journey records</small>
        </article>
      </section>

      <LiveGpsPanel
        records={liveGpsRecords}
        error={liveGpsError}
      />

      <section className="journey-register">
        <div className="journey-register-heading">
          <div>
            <span className="journey-section-kicker">JOURNEY OPERATIONS</span>
            <h2>Journey register</h2>
            <p>
              Search and review journey schedules, destinations and traveller
              information.
            </p>
          </div>
          <span className="journey-record-count">
            {filteredJourneys.length} of {journeys.length} records
          </span>
        </div>

        <div className="journey-toolbar">
          <label className="journey-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search traveller, journey or destination..."
              aria-label="Search journeys"
            />
          </label>

          <button
            type="button"
            className="journey-refresh-button"
            onClick={() => router.refresh()}
            disabled={isPending}
          >
            <span>↻</span> Refresh records
          </button>
        </div>

        <div className="journey-filter-row" aria-label="Filter by status">
          {FILTERS.map((filter) => (
            <button
              type="button"
              key={filter.value}
              className={
                activeFilter === filter.value
                  ? "journey-filter active"
                  : "journey-filter"
              }
              onClick={() => setActiveFilter(filter.value)}
            >
              {filter.label}
              <span>
                {filter.value === "all"
                  ? counts.all
                  : counts[filter.value]}
              </span>
            </button>
          ))}
        </div>

        {feedback && (
          <div className="journey-feedback" role="status">
            {feedback}
            <button
              type="button"
              onClick={() => setFeedback("")}
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}

        {filteredJourneys.length === 0 ? (
          <div className="journey-empty-state">
            <span className="journey-empty-icon">⌖</span>
            <h3>
              {journeys.length === 0
                ? "No journey records yet"
                : "No matching journeys"}
            </h3>
            <p>
              {journeys.length === 0
                ? "Journey records will appear here when travellers create and schedule journeys."
                : "Try another search term or select a different status filter."}
            </p>
            {(search || activeFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setActiveFilter("all");
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="journey-table-wrap">
            <table className="journey-table">
              <thead>
                <tr>
                  <th>Journey / Traveller</th>
                  <th>Route</th>
                  <th>Departure</th>
                  <th>Transport</th>
                  <th>Status</th>
                  <th className="journey-action-heading">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredJourneys.map((journey) => (
                  <tr key={journey.id}>
                    <td>
                      <div className="journey-primary-cell">
                        <strong>{journey.journey_name || "Unnamed journey"}</strong>
                        <span>{journey.traveller_name}</span>
                        {journey.traveller_phone && (
                          <small>{journey.traveller_phone}</small>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="journey-route-cell">
                        <span>{journey.origin_name}</span>
                        <span className="journey-route-arrow">→</span>
                        <strong>{journey.destination_name}</strong>
                      </div>
                    </td>
                    <td>
                      <div className="journey-date-cell">
                        <strong>
                          {formatDateTime(
                            journey.departure_at,
                            journey.departure_timezone
                          )}
                        </strong>
                        <small>
                          {journey.departure_timezone || "UTC"}
                        </small>
                      </div>
                    </td>
                    <td>
                      <span className="journey-transport">
                        {transportLabel(journey.transport_mode)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`journey-status journey-status-${journey.status}`}
                      >
                        <span />
                        {statusLabel(journey.status)}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="journey-details-button"
                        onClick={() => setSelectedJourneyId(journey.id)}
                      >
                        View details <span>→</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="journey-register-footer">
          <span>
            Showing up to 500 most recently scheduled journey records.
          </span>
          <span>Access controlled by your administrator permissions</span>
        </div>
      </section>

      {selectedJourney && (
        <div
          className="journey-detail-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedJourneyId(null);
            }
          }}
        >
          <section
            className="journey-detail-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="journey-detail-title"
          >
            <div className="journey-detail-header">
              <div>
                <span className="journey-section-kicker">JOURNEY RECORD</span>
                <h2 id="journey-detail-title">
                  {selectedJourney.journey_name || "Unnamed journey"}
                </h2>
                <span
                  className={`journey-status journey-status-${selectedJourney.status}`}
                >
                  <span />
                  {statusLabel(selectedJourney.status)}
                </span>
              </div>
              <button
                type="button"
                className="journey-detail-close"
                onClick={() => setSelectedJourneyId(null)}
                aria-label="Close journey details"
              >
                ×
              </button>
            </div>

            <div className="journey-detail-body">
              <section className="journey-detail-section">
                <h3>Traveller information</h3>
                <div className="journey-detail-grid">
                  <div>
                    <small>Traveller</small>
                    <strong>{selectedJourney.traveller_name}</strong>
                  </div>
                  <div>
                    <small>Contact number</small>
                    <strong>{selectedJourney.traveller_phone || "Not provided"}</strong>
                  </div>
                  <div>
                    <small>Traveller account ID</small>
                    <strong className="journey-id-value">
                      {selectedJourney.traveller_id}
                    </strong>
                  </div>
                  <div>
                    <small>Journey reference</small>
                    <strong className="journey-id-value">
                      {selectedJourney.id}
                    </strong>
                  </div>
                </div>
              </section>

              <section className="journey-detail-section">
                <h3>Route information</h3>
                <div className="journey-route-detail">
                  <div>
                    <span className="journey-route-point origin" />
                    <div>
                      <small>ORIGIN</small>
                      <strong>{selectedJourney.origin_name}</strong>
                      <p>{selectedJourney.origin_address || "Address not provided"}</p>
                    </div>
                  </div>
                  <div className="journey-route-connector" />
                  <div>
                    <span className="journey-route-point destination" />
                    <div>
                      <small>DESTINATION</small>
                      <strong>{selectedJourney.destination_name}</strong>
                      <p>
                        {selectedJourney.destination_address ||
                          "Address not provided"}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="journey-detail-section">
                <h3>Schedule &amp; transport</h3>
                <div className="journey-detail-grid">
                  <div>
                    <small>Departure</small>
                    <strong>
                      {formatDateTime(
                        selectedJourney.departure_at,
                        selectedJourney.departure_timezone
                      )}
                    </strong>
                    <small>
                      {selectedJourney.departure_timezone || "UTC"}
                    </small>
                  </div>
                  <div>
                    <small>Expected arrival</small>
                    <strong>
                      {formatDateTime(
                        selectedJourney.expected_arrival_at,
                        selectedJourney.arrival_timezone
                      )}
                    </strong>
                    <small>
                      {selectedJourney.arrival_timezone || "UTC"}
                    </small>
                  </div>
                  <div>
                    <small>Transport mode</small>
                    <strong>
                      {transportLabel(selectedJourney.transport_mode)}
                    </strong>
                  </div>
                  <div>
                    <small>Journey started</small>
                    <strong>
                      {formatDateTime(selectedJourney.started_at, null)}
                    </strong>
                  </div>
                  <div>
                    <small>Journey completed</small>
                    <strong>
                      {formatDateTime(selectedJourney.completed_at, null)}
                    </strong>
                  </div>
                </div>
              </section>

              <section className="journey-detail-section">
                <h3>Location sharing &amp; notes</h3>
                <div className="journey-sharing-status">
                  <span
                    className={
                      selectedJourney.location_sharing_enabled
                        ? "journey-sharing-indicator enabled"
                        : "journey-sharing-indicator"
                    }
                  />
                  <div>
                    <strong>
                      {selectedJourney.location_sharing_enabled
                        ? "Location sharing consent recorded"
                        : "Location sharing not enabled"}
                    </strong>
                    <small>
                      {selectedJourney.location_sharing_consent_at
                        ? `Consent recorded ${formatDateTime(
                            selectedJourney.location_sharing_consent_at,
                            null
                          )}`
                        : "No location-sharing consent timestamp recorded"}
                    </small>
                  </div>
                </div>
                <p className="journey-note-text">
                  {selectedJourney.notes || "No additional journey notes."}
                </p>
                <p className="journey-disclaimer">
                  This record displays journey details and consent information.
                  It does not confirm that live GPS tracking is currently
                  available.
                </p>
              </section>

              {canManage &&
                NEXT_STATUSES[selectedJourney.status].length > 0 && (
                  <section className="journey-detail-section journey-management-section">
                    <h3>Journey status management</h3>
                    <p>
                      Choose an allowed next status. The platform validates
                      each transition before saving.
                    </p>
                    <div className="journey-management-actions">
                      {NEXT_STATUSES[selectedJourney.status].map((status) => (
                        <button
                          type="button"
                          key={status}
                          className={
                            status === "cancelled"
                              ? "journey-status-action danger"
                              : "journey-status-action"
                          }
                          disabled={isPending}
                          onClick={() => changeStatus(selectedJourney, status)}
                        >
                          {isPending
                            ? "Saving..."
                            : `Mark as ${statusLabel(status)}`}
                        </button>
                      ))}
                    </div>
                  </section>
                )}
            </div>

            <div className="journey-detail-footer">
              <span>
                Last updated{" "}
                {formatDateTime(selectedJourney.updated_at, null)}
              </span>
              <button
                type="button"
                onClick={() => setSelectedJourneyId(null)}
              >
                Close details
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
