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
  started_at: string | null;
  completed_at: string | null;
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

function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function displayDate(value: string | null) {
  if (!value) return "Not specified";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
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

  const loadJourneys = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: queryError } = await supabase
      .from("journeys")
      .select("*")
      .eq("traveller_id", travellerId)
      .order("departure_at", { ascending: true });

    if (queryError) setError("Your journeys could not be loaded. Please refresh and try again.");
    else setJourneys((data ?? []) as Journey[]);
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

    if (!form.journey_name.trim() || !form.origin_name.trim() ||
        !form.destination_name.trim() || !form.departure_at) {
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
      ? await supabase.from("journeys").update(payload)
          .eq("id", editingId).eq("traveller_id", travellerId)
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
    setNotice(editingId ? "Journey details updated." : "Journey saved as a draft. Schedule it when you are ready.");
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
  }

  return (
    <main className="tsc-workspace">
      <header className="tsc-workspace-header">
        <Link href="/dashboard" className="tsc-back-link">← Dashboard</Link>
        <span className="tsc-eyebrow">JOURNEY MANAGEMENT</span>
        <h1>My journeys</h1>
        <p>Plan your trips, manage your travel schedule and keep your journey information in one place.</p>
        <div className="tsc-header-actions">
          <button className="tsc-button tsc-button-primary" onClick={startNewJourney}>＋ Plan a journey</button>
          <Link className="tsc-button tsc-button-light" href="/dashboard/emergency">Emergency support</Link>
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
            <div><span className="tsc-eyebrow">JOURNEY DETAILS</span><h2>{editingId ? "Edit journey" : "Plan a new journey"}</h2></div>
            <button className="tsc-icon-button" onClick={() => setShowForm(false)} aria-label="Close form">×</button>
          </div>
          <form onSubmit={saveJourney} className="tsc-form">
            <label>Journey name<input required maxLength={160} value={form.journey_name} onChange={(e) => updateField("journey_name", e.target.value)} placeholder="e.g. Business trip to Accra" /></label>
            <div className="tsc-form-grid">
              <label>Origin<input required maxLength={200} value={form.origin_name} onChange={(e) => updateField("origin_name", e.target.value)} placeholder="City or departure point" /></label>
              <label>Destination<input required maxLength={200} value={form.destination_name} onChange={(e) => updateField("destination_name", e.target.value)} placeholder="City or arrival point" /></label>
              <label>Origin address (optional)<input value={form.origin_address} onChange={(e) => updateField("origin_address", e.target.value)} placeholder="Street, terminal or landmark" /></label>
              <label>Destination address (optional)<input value={form.destination_address} onChange={(e) => updateField("destination_address", e.target.value)} placeholder="Street, terminal or landmark" /></label>
              <label>Departure date and time<input required type="datetime-local" value={form.departure_at} onChange={(e) => updateField("departure_at", e.target.value)} /></label>
              <label>Expected arrival (optional)<input type="datetime-local" value={form.expected_arrival_at} onChange={(e) => updateField("expected_arrival_at", e.target.value)} /></label>
              <label>Transport mode<select value={form.transport_mode} onChange={(e) => updateField("transport_mode", e.target.value)}><option value="road">Road</option><option value="air">Air</option><option value="rail">Rail</option><option value="sea">Sea</option><option value="other">Other</option></select></label>
            </div>
            <label>Additional notes (optional)<textarea rows={3} value={form.notes} onChange={(e) => updateField("notes", e.target.value)} placeholder="Add useful details about this journey" /></label>
            <p className="tsc-form-hint">Your journey is initially saved as a private draft. Location sharing is off unless you separately enable it through a supported tracking control.</p>
            <div className="tsc-form-actions">
              <button type="button" className="tsc-button tsc-button-light" onClick={() => setShowForm(false)}>Close</button>
              <button type="submit" className="tsc-button tsc-button-primary" disabled={saving}>{saving ? "Saving…" : editingId ? "Save changes" : "Save journey"}</button>
            </div>
          </form>
        </section>
      )}

      <section className="tsc-panel">
        <div className="tsc-panel-heading">
          <div><span className="tsc-eyebrow">YOUR TRAVEL ACTIVITY</span><h2>Journey history</h2></div>
          <button className="tsc-text-button" onClick={() => void loadJourneys()}>Refresh ↻</button>
        </div>
        <div className="tsc-filter-row">
          {["all", "upcoming", "active", "completed", "cancelled"].map((item) => (
            <button key={item} className={`tsc-filter ${filter === item ? "is-selected" : ""}`} onClick={() => setFilter(item)}>{item[0].toUpperCase() + item.slice(1)}</button>
          ))}
        </div>

        {loading ? <div className="tsc-empty-state">Loading your journeys…</div> :
          visibleJourneys.length === 0 ? (
            <div className="tsc-empty-state"><span className="tsc-empty-icon">↗</span><h3>No journeys to show</h3><p>{filter === "all" ? "Plan your first journey to begin managing your travel with TSC." : "There are no journeys in this category yet."}</p>{filter === "all" && <button className="tsc-button tsc-button-primary" onClick={startNewJourney}>Plan your first journey</button>}</div>
          ) : (
            <div className="tsc-journey-list">
              {visibleJourneys.map((journey) => (
                <article className="tsc-journey-card" key={journey.id}>
                  <div className="tsc-journey-card-heading">
                    <div><span className="tsc-eyebrow">{journey.transport_mode.toUpperCase()} JOURNEY</span><h3>{journey.journey_name}</h3></div>
                    <span className={statusClass(journey.status)}>{statusLabels[journey.status]}</span>
                  </div>
                  <div className="tsc-route-grid">
                    <div><span>FROM</span><strong>{journey.origin_name}</strong>{journey.origin_address && <small>{journey.origin_address}</small>}</div>
                    <div><span>TO</span><strong>{journey.destination_name}</strong>{journey.destination_address && <small>{journey.destination_address}</small>}</div>
                  </div>
                  <div className="tsc-journey-meta"><span>Departure: {displayDate(journey.departure_at)}</span><span>Arrival: {displayDate(journey.expected_arrival_at)}</span></div>
                  {journey.notes && <p className="tsc-journey-notes">{journey.notes}</p>}
                  <div className="tsc-card-actions">
                    {journey.status === "draft" && <>
                      <button className="tsc-button tsc-button-light" onClick={() => editJourney(journey)}>Edit</button>
                      <button className="tsc-button tsc-button-primary" disabled={saving} onClick={() => void changeStatus(journey, "scheduled")}>Schedule journey</button>
                      <button className="tsc-button tsc-button-danger" disabled={saving} onClick={() => void changeStatus(journey, "cancelled")}>Cancel</button>
                    </>}
                    {journey.status === "scheduled" && <>
                      <button className="tsc-button tsc-button-light" onClick={() => editJourney(journey)}>Edit</button>
                      <button className="tsc-button tsc-button-primary" disabled={saving} onClick={() => void changeStatus(journey, "active")}>Start journey</button>
                      <button className="tsc-button tsc-button-danger" disabled={saving} onClick={() => void changeStatus(journey, "cancelled")}>Cancel</button>
                    </>}
                    {journey.status === "active" && <>
                      <span className="tsc-live-note">Journey in progress</span>
                      <button className="tsc-button tsc-button-primary" disabled={saving} onClick={() => void changeStatus(journey, "completed")}>Complete journey</button>
                      <button className="tsc-button tsc-button-danger" disabled={saving} onClick={() => void changeStatus(journey, "cancelled")}>Cancel</button>
                    </>}
                  </div>
                  {journey.status === "active" && (
                    <JourneyWebGpsControls
                      journey={journey}
                      onUpdated={() => void loadJourneys()}
                    />
                  )}
                </article>
              ))}
            </div>
          )
        }
      </section>
      <p className="tsc-safety-note">TSC journey management supports your travel planning. For immediate danger or urgent assistance, contact the appropriate local emergency services.</p>
      <footer className="tsc-page-footer"><span>TRAVELLERS SAFETY COVERED</span><Link href="/dashboard">Return to dashboard</Link></footer>
    </main>
  );
}
