"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import JourneyWebGpsControls from "./JourneyWebGpsControls";

type JourneyStatus = "draft" | "scheduled" | "active" | "completed" | "cancelled";

type Journey = {
  id: string;
  traveller_id: string;
  journey_name: string;
  origin_name: string;
  origin_address: string | null;
  destination_name: string;
  destination_address: string | null;
  departure_at: string;
  departure_timezone: string;
  expected_arrival_at: string | null;
  arrival_timezone: string | null;
  transport_mode: string;
  status: JourneyStatus;
  notes: string | null;
  location_sharing_enabled: boolean;
  location_sharing_consent_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type JourneyForm = {
  journey_name: string;
  origin_name: string;
  origin_address: string;
  destination_name: string;
  destination_address: string;
  departure_at: string;
  expected_arrival_at: string;
  transport_mode: string;
  notes: string;
};

const blankForm: JourneyForm = {
  journey_name: "",
  origin_name: "",
  origin_address: "",
  destination_name: "",
  destination_address: "",
  departure_at: "",
  expected_arrival_at: "",
  transport_mode: "road",
  notes: "",
};

const statusLabels: Record<JourneyStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
};

const transportLabels: Record<string, string> = {
  road: "Road",
  air: "Air",
  rail: "Rail",
  sea: "Sea",
  other: "Other",
};

function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function displayDate(value: string | null, timezone?: string | null) {
  if (!value) return "Not specified";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  try {
    return date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      ...(timezone ? { timeZone: timezone } : {}),
    });
  } catch {
    return date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }
}

function statusClass(status: JourneyStatus) {
  return `tsc-status tsc-status-${status}`;
}

export default function JourneyManagementClient({
  travellerId,
  travellerName,
}: {
  travellerId: string;
  travellerName: string;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState<JourneyForm>(blankForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [detailsJourney, setDetailsJourney] = useState<Journey | null>(null);

  const loadJourneys = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data, error: queryError } = await supabase
      .from("journeys")
      .select("*")
      .eq("traveller_id", travellerId)
      .order("departure_at", { ascending: true });

    if (queryError) {
      setError("Your journeys could not be loaded. Please refresh and try again.");
    } else {
      setJourneys((data ?? []) as Journey[]);
    }

    setLoading(false);
  }, [supabase, travellerId]);

  useEffect(() => {
    void loadJourneys();
  }, [loadJourneys]);

  const counts = {
    total: journeys.length,
    upcoming: journeys.filter((j) => j.status === "draft" || j.status === "scheduled").length,
    active: journeys.filter((j) => j.status === "active").length,
    completed: journeys.filter((j) => j.status === "completed").length,
  };

  const visibleJourneys = journeys.filter((journey) => {
    if (filter === "upcoming") return journey.status === "draft" || journey.status === "scheduled";
    if (filter === "active") return journey.status === "active";
    if (filter === "completed") return journey.status === "completed";
    if (filter === "cancelled") return journey.status === "cancelled";
    return true;
  });

  function startNewJourney() {
    setEditingId(null);
    setForm({
      ...blankForm,
      departure_at: localDateTime(new Date(Date.now() + 86_400_000).toISOString()),
    });
    setNotice("");
    setError("");
    setShowForm(true);
  }

  function editJourney(journey: Journey) {
    setEditingId(journey.id);
    setForm({
      journey_name: journey.journey_name,
      origin_name: journey.origin_name,
      origin_address: journey.origin_address ?? "",
      destination_name: journey.destination_name,
      destination_address: journey.destination_address ?? "",
      departure_at: localDateTime(journey.departure_at),
      expected_arrival_at: localDateTime(journey.expected_arrival_at),
      transport_mode: journey.transport_mode,
      notes: journey.notes ?? "",
    });
    setNotice("");
    setError("");
    setShowForm(true);
  }

  function updateField(field: keyof JourneyForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveJourney(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (
      !form.journey_name.trim() ||
      !form.origin_name.trim() ||
      !form.destination_name.trim() ||
      !form.departure_at
    ) {
      setError("Complete the journey name, origin, destination and departure date/time.");
      return;
    }

    const departure = new Date(form.departure_at);
    const arrival = form.expected_arrival_at ? new Date(form.expected_arrival_at) : null;

    if (Number.isNaN(departure.getTime()) || departure <= new Date()) {
      setError("Departure must be a valid date and time in the future.");
      return;
    }

    if (arrival && (Number.isNaN(arrival.getTime()) || arrival <= departure)) {
      setError("Expected arrival must be later than departure.");
      return;
    }

    setSaving(true);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

    const payload = {
      journey_name: form.journey_name.trim(),
      origin_name: form.origin_name.trim(),
      origin_address: form.origin_address.trim() || null,
      destination_name: form.destination_name.trim(),
      destination_address: form.destination_address.trim() || null,
      departure_at: departure.toISOString(),
      departure_timezone: timezone,
      expected_arrival_at: arrival ? arrival.toISOString() : null,
      arrival_timezone: arrival ? timezone : null,
      transport_mode: form.transport_mode,
      notes: form.notes.trim() || null,
    };

    const result = editingId
      ? await supabase
          .from("journeys")
          .update(payload)
          .eq("id", editingId)
          .eq("traveller_id", travellerId)
      : await supabase.from("journeys").insert({
          ...payload,
          traveller_id: travellerId,
          status: "draft",
          location_sharing_enabled: false,
        });

    setSaving(false);

    if (result.error) {
      setError(result.error.message || "The journey could not be saved.");
      return;
    }

    setShowForm(false);
    setEditingId(null);
    setForm(blankForm);
    setNotice(
      editingId
        ? "Journey details updated."
        : "Journey saved as a draft. Schedule it when you are ready."
    );
    await loadJourneys();
  }

  async function changeStatus(journey: Journey, status: JourneyStatus) {
    const confirmation: Record<string, string> = {
      scheduled: "Schedule this journey?",
      active: "Start this journey now?",
      completed: "Mark this journey as completed?",
      cancelled: "Cancel this journey?",
    };

    if (!window.confirm(confirmation[status] || "Update this journey?")) return;

    setSaving(true);
    setError("");

    const { error: updateError } = await supabase
      .from("journeys")
      .update({ status })
      .eq("id", journey.id)
      .eq("traveller_id", travellerId);

    setSaving(false);

    if (updateError) {
      setError(updateError.message || "This journey status could not be updated.");
      return;
    }

    setNotice(`Journey is now ${statusLabels[status].toLowerCase()}.`);
    await loadJourneys();

    if (detailsJourney?.id === journey.id) {
      setDetailsJourney({ ...detailsJourney, status });
    }
  }

  function openJourneyDetails(journey: Journey) {
    setDetailsJourney(journey);
  }

  return (
    <main className="tsc-workspace">
      <header className="tsc-workspace-header">
        <Link href="/dashboard" className="tsc-back-link">← Dashboard</Link>
        <span className="tsc-eyebrow">JOURNEY MANAGEMENT</span>
        <h1>My journeys</h1>
        <p>
          Plan your trips, manage your travel schedule and keep your journey
          information in one place.
        </p>
        <div className="tsc-header-actions">
          <button className="tsc-button tsc-button-primary" onClick={startNewJourney}>
            ＋ Plan a journey
          </button>
          <Link className="tsc-button tsc-button-light" href="/dashboard/emergency">
            Emergency support
          </Link>
        </div>
      </header>

      <section className="tsc-stat-grid" aria-label="Journey summary">
        <div className="tsc-stat-card"><span>Total journeys</span><strong>{counts.total}</strong></div>
        <div className="tsc-stat-card"><span>Upcoming</span><strong>{counts.upcoming}</strong></div>
        <div className="tsc-stat-card"><span>Active now</span><strong>{counts.active}</strong></div>
        <div className="tsc-stat-card"><span>Completed</span><strong>{counts.completed}</strong></div>
      </section>

      {notice && <p className="tsc-message tsc-message-success" role="status">{notice}</p>}
      {error && <p className="tsc-message tsc-message-error" role="alert">{error}</p>}

      {showForm && (
        <section className="tsc-panel tsc-form-panel">
          <div className="tsc-panel-heading">
            <div>
              <span className="tsc-eyebrow">JOURNEY DETAILS</span>
              <h2>{editingId ? "Edit journey" : "Plan a new journey"}</h2>
            </div>
            <button
              className="tsc-icon-button"
              onClick={() => setShowForm(false)}
              aria-label="Close form"
            >
              ×
            </button>
          </div>

          <form onSubmit={saveJourney} className="tsc-form">
            <label>
              Journey name
              <input
                required
                maxLength={160}
                value={form.journey_name}
                onChange={(e) => updateField("journey_name", e.target.value)}
                placeholder="e.g. Business trip to Accra"
              />
            </label>

            <div className="tsc-form-grid">
              <label>
                Origin
                <input
                  required
                  maxLength={200}
                  value={form.origin_name}
                  onChange={(e) => updateField("origin_name", e.target.value)}
                  placeholder="City or departure point"
                />
              </label>
              <label>
                Destination
                <input
                  required
                  maxLength={200}
                  value={form.destination_name}
                  onChange={(e) => updateField("destination_name", e.target.value)}
                  placeholder="City or arrival point"
                />
              </label>
              <label>
                Origin address (optional)
                <input
                  value={form.origin_address}
                  onChange={(e) => updateField("origin_address", e.target.value)}
                  placeholder="Street, terminal or landmark"
                />
              </label>
              <label>
                Destination address (optional)
                <input
                  value={form.destination_address}
                  onChange={(e) => updateField("destination_address", e.target.value)}
                  placeholder="Street, terminal or landmark"
                />
              </label>
              <label>
                Departure date and time
                <input
                  required
                  type="datetime-local"
                  value={form.departure_at}
                  onChange={(e) => updateField("departure_at", e.target.value)}
                />
              </label>
              <label>
                Expected arrival (optional)
                <input
                  type="datetime-local"
                  value={form.expected_arrival_at}
                  onChange={(e) => updateField("expected_arrival_at", e.target.value)}
                />
              </label>
              <label>
                Transport mode
                <select
                  value={form.transport_mode}
                  onChange={(e) => updateField("transport_mode", e.target.value)}
                >
                  <option value="road">Road</option>
                  <option value="air">Air</option>
                  <option value="rail">Rail</option>
                  <option value="sea">Sea</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>

            <label>
              Additional notes (optional)
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Add useful details about this journey"
              />
            </label>

            <p className="tsc-form-hint">
              Your journey is initially saved as a private draft. Location
              sharing is off unless you separately enable it through a
              supported tracking control.
            </p>

            <div className="tsc-form-actions">
              <button
                type="button"
                className="tsc-button tsc-button-light"
                onClick={() => setShowForm(false)}
              >
                Close
              </button>
              <button
                type="submit"
                className="tsc-button tsc-button-primary"
                disabled={saving}
              >
                {saving ? "Saving…" : editingId ? "Save changes" : "Save journey"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="tsc-panel">
        <div className="tsc-panel-heading">
          <div>
            <span className="tsc-eyebrow">YOUR TRAVEL ACTIVITY</span>
            <h2>Journey history</h2>
          </div>
          <button className="tsc-text-button" onClick={() => void loadJourneys()}>
            Refresh ↻
          </button>
        </div>

        <div className="tsc-filter-row">
          {["all", "upcoming", "active", "completed", "cancelled"].map((item) => (
            <button
              key={item}
              className={`tsc-filter ${filter === item ? "is-selected" : ""}`}
              onClick={() => setFilter(item)}
            >
              {item[0].toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="tsc-empty-state">Loading your journeys…</div>
        ) : visibleJourneys.length === 0 ? (
          <div className="tsc-empty-state">
            <span className="tsc-empty-icon">↗</span>
            <h3>No journeys to show</h3>
            <p>
              {filter === "all"
                ? "Plan your first journey to begin managing your travel with TSC."
                : "There are no journeys in this category yet."}
            </p>
            {filter === "all" && (
              <button className="tsc-button tsc-button-primary" onClick={startNewJourney}>
                Plan your first journey
              </button>
            )}
          </div>
        ) : (
          <div className="tsc-journey-list">
            {visibleJourneys.map((journey) => (
              <article className="tsc-journey-card" key={journey.id}>
                <div className="tsc-journey-card-heading">
                  <div>
                    <span className="tsc-eyebrow">
                      {(transportLabels[journey.transport_mode] || journey.transport_mode).toUpperCase()} JOURNEY
                    </span>
                    <h3>{journey.journey_name}</h3>
                  </div>
                  <span className={statusClass(journey.status)}>
                    {statusLabels[journey.status]}
                  </span>
                </div>

                <div className="tsc-route-grid">
                  <div>
                    <span>FROM</span>
                    <strong>{journey.origin_name}</strong>
                    {journey.origin_address && <small>{journey.origin_address}</small>}
                  </div>
                  <div>
                    <span>TO</span>
                    <strong>{journey.destination_name}</strong>
                    {journey.destination_address && <small>{journey.destination_address}</small>}
                  </div>
                </div>

                <div className="tsc-journey-meta">
                  <span>
                    Departure: {displayDate(journey.departure_at, journey.departure_timezone)}
                  </span>
                  <span>
                    Arrival: {displayDate(journey.expected_arrival_at, journey.arrival_timezone)}
                  </span>
                </div>

                {journey.notes && <p className="tsc-journey-notes">{journey.notes}</p>}

                <div className="tsc-card-actions">
                  <button
                    type="button"
                    className="tsc-button tsc-button-light"
                    onClick={() => openJourneyDetails(journey)}
                  >
                    View details
                  </button>

                  {journey.status === "draft" && (
                    <>
                      <button
                        className="tsc-button tsc-button-light"
                        onClick={() => editJourney(journey)}
                      >
                        Edit
                      </button>
                      <button
                        className="tsc-button tsc-button-primary"
                        disabled={saving}
                        onClick={() => void changeStatus(journey, "scheduled")}
                      >
                        Schedule journey
                      </button>
                      <button
                        className="tsc-button tsc-button-danger"
                        disabled={saving}
                        onClick={() => void changeStatus(journey, "cancelled")}
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  {journey.status === "scheduled" && (
                    <>
                      <button
                        className="tsc-button tsc-button-light"
                        onClick={() => editJourney(journey)}
                      >
                        Edit
                      </button>
                      <button
                        className="tsc-button tsc-button-primary"
                        disabled={saving}
                        onClick={() => void changeStatus(journey, "active")}
                      >
                        Start journey
                      </button>
                      <button
                        className="tsc-button tsc-button-danger"
                        disabled={saving}
                        onClick={() => void changeStatus(journey, "cancelled")}
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  {journey.status === "active" && (
                    <>
                      <span className="tsc-live-note">Journey in progress</span>
                      <button
                        className="tsc-button tsc-button-primary"
                        disabled={saving}
                        onClick={() => void changeStatus(journey, "completed")}
                      >
                        Complete journey
                      </button>
                      <button
                        className="tsc-button tsc-button-danger"
                        disabled={saving}
                        onClick={() => void changeStatus(journey, "cancelled")}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>

              </article>
            ))}
          </div>
        )}
      </section>

      {detailsJourney && (
        <div
          className="tsc-journey-details-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDetailsJourney(null);
          }}
        >
          <section
            className="tsc-journey-details-dialog tsc-mobile-match-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tsc-journey-details-title"
          >
            <header className="tsc-mobile-match-header">
              <div>
                <span className="tsc-eyebrow">JOURNEY INFORMATION</span>
                <h2 id="tsc-journey-details-title">{detailsJourney.journey_name}</h2>
                <div className="tsc-mobile-match-badges">
                  <span className={statusClass(detailsJourney.status)}>
                    {statusLabels[detailsJourney.status]}
                  </span>
                  <span>{transportLabels[detailsJourney.transport_mode] || detailsJourney.transport_mode}</span>
                </div>
              </div>
              <button
                type="button"
                className="tsc-icon-button"
                onClick={() => setDetailsJourney(null)}
                aria-label="Close journey details"
              >
                ×
              </button>
            </header>

            <div className="tsc-mobile-match-content">
              <section className="tsc-mobile-match-route">
                <div className="tsc-mobile-match-section-title">
                  <span className="tsc-mobile-match-icon">↗</span>
                  <div>
                    <span>YOUR JOURNEY</span>
                    <h3>Route information</h3>
                  </div>
                </div>

                <div className="tsc-mobile-match-route-point">
                  <span className="tsc-mobile-match-dot origin" />
                  <div>
                    <small>FROM</small>
                    <strong>{detailsJourney.origin_name}</strong>
                    <p>{detailsJourney.origin_address || "No address provided"}</p>
                  </div>
                </div>

                <div className="tsc-mobile-match-route-line" />

                <div className="tsc-mobile-match-route-point">
                  <span className="tsc-mobile-match-dot destination" />
                  <div>
                    <small>TO</small>
                    <strong>{detailsJourney.destination_name}</strong>
                    <p>{detailsJourney.destination_address || "No address provided"}</p>
                  </div>
                </div>
              </section>

              <section className="tsc-mobile-match-card">
                <div className="tsc-mobile-match-section-title">
                  <span className="tsc-mobile-match-icon">◷</span>
                  <div>
                    <span>TRAVEL DETAILS</span>
                    <h3>Schedule and travel</h3>
                  </div>
                </div>

                <div className="tsc-mobile-match-info-grid">
                  <div>
                    <small>Departure</small>
                    <strong>{displayDate(detailsJourney.departure_at, detailsJourney.departure_timezone)}</strong>
                    <p>{detailsJourney.departure_timezone || "Time zone not recorded"}</p>
                  </div>
                  <div>
                    <small>Expected arrival</small>
                    <strong>{displayDate(detailsJourney.expected_arrival_at, detailsJourney.arrival_timezone)}</strong>
                    <p>{detailsJourney.arrival_timezone || "Time zone not recorded"}</p>
                  </div>
                  <div>
                    <small>Transport</small>
                    <strong>{transportLabels[detailsJourney.transport_mode] || detailsJourney.transport_mode}</strong>
                  </div>
                  <div>
                    <small>Journey started</small>
                    <strong>{displayDate(detailsJourney.started_at)}</strong>
                  </div>
                  <div>
                    <small>Journey completed</small>
                    <strong>{displayDate(detailsJourney.completed_at)}</strong>
                  </div>
                </div>
              </section>

              {detailsJourney.notes && (
                <section className="tsc-mobile-match-card">
                  <div className="tsc-mobile-match-section-title">
                    <span className="tsc-mobile-match-icon">✎</span>
                    <div>
                      <span>TRAVELLER INFORMATION</span>
                      <h3>Additional notes</h3>
                    </div>
                  </div>
                  <p className="tsc-mobile-match-notes">{detailsJourney.notes}</p>
                </section>
              )}

              {detailsJourney.status === "active" && (
                <JourneyWebGpsControls
                  journey={detailsJourney}
                  onUpdated={(enabled, consentAt) => {
                    setDetailsJourney((current) =>
                      current
                        ? {
                            ...current,
                            location_sharing_enabled: enabled,
                            ...(consentAt
                              ? { location_sharing_consent_at: consentAt }
                              : {}),
                          }
                        : current
                    );
                    void loadJourneys();
                  }}
                />
              )}
            </div>

            <footer className="tsc-mobile-match-footer">
              <button
                type="button"
                className="tsc-button tsc-button-light"
                onClick={() => setDetailsJourney(null)}
              >
                Close details
              </button>

              {detailsJourney.status === "draft" && (
                <>
                  <button
                    type="button"
                    className="tsc-button tsc-button-light"
                    onClick={() => {
                      const journey = detailsJourney;
                      setDetailsJourney(null);
                      editJourney(journey);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="tsc-button tsc-button-primary"
                    disabled={saving}
                    onClick={() => void changeStatus(detailsJourney, "scheduled")}
                  >
                    Schedule journey
                  </button>
                  <button
                    type="button"
                    className="tsc-button tsc-button-danger"
                    disabled={saving}
                    onClick={() => void changeStatus(detailsJourney, "cancelled")}
                  >
                    Cancel
                  </button>
                </>
              )}

              {detailsJourney.status === "scheduled" && (
                <>
                  <button
                    type="button"
                    className="tsc-button tsc-button-light"
                    onClick={() => {
                      const journey = detailsJourney;
                      setDetailsJourney(null);
                      editJourney(journey);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="tsc-button tsc-button-primary"
                    disabled={saving}
                    onClick={() => void changeStatus(detailsJourney, "active")}
                  >
                    Start journey
                  </button>
                  <button
                    type="button"
                    className="tsc-button tsc-button-danger"
                    disabled={saving}
                    onClick={() => void changeStatus(detailsJourney, "cancelled")}
                  >
                    Cancel
                  </button>
                </>
              )}

              {detailsJourney.status === "active" && (
                <>
                  <button
                    type="button"
                    className="tsc-button tsc-button-primary"
                    disabled={saving}
                    onClick={() => void changeStatus(detailsJourney, "completed")}
                  >
                    Complete journey
                  </button>
                  <button
                    type="button"
                    className="tsc-button tsc-button-danger"
                    disabled={saving}
                    onClick={() => void changeStatus(detailsJourney, "cancelled")}
                  >
                    Cancel
                  </button>
                </>
              )}
            </footer>
          </section>
        </div>
      )}

      <p className="tsc-safety-note">
        TSC journey management supports your travel planning. For immediate
        danger or urgent assistance, contact the appropriate local emergency services.
      </p>

      <footer className="tsc-page-footer">
        <span>TRAVELLERS SAFETY COVERED</span>
        <Link href="/dashboard">Return to dashboard</Link>
      </footer>

      <span className="sr-only" aria-hidden="true">{travellerName}</span>
    </main>
  );
}
