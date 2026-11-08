"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Category = "medical" | "accident" | "security" | "natural_disaster" | "transport" | "other";
type Severity = "low" | "moderate" | "high" | "critical";
type EmergencyStatus = "reported" | "acknowledged" | "assigned" | "responding" | "resolved" | "cancelled";

type Journey = { id: string; journey_name: string; status: string };
type EmergencyAlert = {
  id: string;
  category: Category;
  severity: Severity;
  status: EmergencyStatus;
  title: string;
  description: string | null;
  reported_at: string;
  location_address: string | null;
  latitude: number | null;
  longitude: number | null;
  journey_id: string | null;
};

type CapturedLocation = { latitude: number; longitude: number; accuracy: number | null };

const categories: { value: Category; label: string }[] = [
  { value: "medical", label: "Medical" },
  { value: "accident", label: "Accident" },
  { value: "security", label: "Security" },
  { value: "natural_disaster", label: "Natural disaster" },
  { value: "transport", label: "Transport" },
  { value: "other", label: "Other" },
];

const severities: { value: Severity; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const statusLabels: Record<EmergencyStatus, string> = {
  reported: "Reported",
  acknowledged: "Acknowledged",
  assigned: "Responder assigned",
  responding: "Response in progress",
  resolved: "Resolved",
  cancelled: "Cancelled",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function reference(id: string) {
  return `TSC-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export default function EmergencySupportClient({
  travellerId,
  travellerName,
}: {
  travellerId: string;
  travellerName: string;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [category, setCategory] = useState<Category>("other");
  const [severity, setSeverity] = useState<Severity>("high");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [journeyId, setJourneyId] = useState("");
  const [location, setLocation] = useState<CapturedLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitted, setSubmitted] = useState<EmergencyAlert | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const [journeyResult, alertResult] = await Promise.all([
      supabase.from("journeys").select("id, journey_name, status")
        .eq("traveller_id", travellerId).eq("status", "active")
        .order("departure_at", { ascending: true }),
      supabase.from("emergency_alerts").select("*")
        .eq("traveller_id", travellerId)
        .order("reported_at", { ascending: false }).limit(30),
    ]);

    if (journeyResult.error || alertResult.error) {
      setError("We could not load all your emergency information. Please refresh and try again.");
    } else {
      setJourneys((journeyResult.data ?? []) as Journey[]);
      setAlerts((alertResult.data ?? []) as EmergencyAlert[]);
    }
    setLoading(false);
  }, [supabase, travellerId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function captureLocation() {
    setError("");
    setNotice("");

    if (!navigator.geolocation) {
      setError("Location services are not supported by this browser.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
        });
        setLocating(false);
        setNotice("Your current location has been captured for this report.");
      },
      (geoError) => {
        setLocating(false);
        setError(
          geoError.code === geoError.PERMISSION_DENIED
            ? "Location permission was denied. You can still submit an emergency without GPS coordinates."
            : "Your location could not be obtained. You can still submit without GPS coordinates."
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }

  async function submitEmergency(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const cleanTitle = title.trim();
    if (!cleanTitle || cleanTitle.length > 160) {
      setError("Enter an emergency title between 1 and 160 characters.");
      return;
    }

    if (journeyId && !journeys.some((journey) => journey.id === journeyId)) {
      setError("Please select one of your currently active journeys.");
      return;
    }

    if (!window.confirm("Submit this emergency report to TSC? If you are in immediate danger, contact local emergency services now as well.")) {
      return;
    }

    setSaving(true);
    const { data, error: insertError } = await supabase
      .from("emergency_alerts")
      .insert({
        traveller_id: travellerId,
        journey_id: journeyId || null,
        category,
        severity,
        title: cleanTitle,
        description: description.trim() || null,
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        location_accuracy_meters: location?.accuracy ?? null,
        status: "reported",
      })
      .select("*")
      .single();

    setSaving(false);

    if (insertError) {
      setError(insertError.message || "Your emergency report could not be submitted. Please try again.");
      return;
    }

    const alert = data as EmergencyAlert;
    setSubmitted(alert);
    setTitle("");
    setDescription("");
    setCategory("other");
    setSeverity("high");
    setJourneyId("");
    setLocation(null);
    await loadData();
  }

  return (
    <main className="tsc-workspace">
      <header className="tsc-workspace-header tsc-emergency-header">
        <Link href="/dashboard" className="tsc-back-link">← Dashboard</Link>
        <span className="tsc-eyebrow">EMERGENCY OPERATIONS</span>
        <h1>Emergency support</h1>
        <p>Report a travel-related emergency and keep track of updates to your report.</p>
        <div className="tsc-emergency-warning">
          <strong>Need immediate help?</strong>
          <span>TSC is not a replacement for police, ambulance, fire or other local emergency services. Contact the appropriate local emergency service immediately if anyone is in danger.</span>
        </div>
      </header>

      {submitted && (
        <section className="tsc-panel tsc-submission-success" role="status">
          <span className="tsc-success-mark">✓</span>
          <div>
            <span className="tsc-eyebrow">REPORT SUBMITTED</span>
            <h2>Your report has been received</h2>
            <p>Reference: <strong>{reference(submitted.id)}</strong></p>
            <p>Status: <strong>Reported</strong>. Keep this reference for your records.</p>
          </div>
          <button className="tsc-icon-button" onClick={() => setSubmitted(null)} aria-label="Dismiss confirmation">×</button>
        </section>
      )}

      {notice && <p className="tsc-message tsc-message-success" role="status">{notice}</p>}
      {error && <p className="tsc-message tsc-message-error" role="alert">{error}</p>}

      <section className="tsc-panel tsc-emergency-form-panel">
        <div className="tsc-panel-heading">
          <div><span className="tsc-eyebrow">NEW EMERGENCY REPORT</span><h2>Tell us what happened</h2></div>
          <span className="tsc-emergency-symbol">!</span>
        </div>

        <form className="tsc-form" onSubmit={submitEmergency}>
          <label>Emergency category
            <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
              {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>

          <fieldset className="tsc-severity-field">
            <legend>Severity level</legend>
            <div className="tsc-severity-options">
              {severities.map((item) => (
                <label key={item.value} className={`tsc-severity-option tsc-severity-${item.value} ${severity === item.value ? "is-selected" : ""}`}>
                  <input type="radio" name="severity" value={item.value} checked={severity === item.value} onChange={() => setSeverity(item.value)} />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label>Emergency title
            <input required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Briefly describe the emergency" />
          </label>

          <label>Additional details (optional)
            <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what happened and any assistance required" />
          </label>

          <label>Link to an active journey (optional)
            <select value={journeyId} onChange={(e) => setJourneyId(e.target.value)}>
              <option value="">No journey selected</option>
              {journeys.map((journey) => <option key={journey.id} value={journey.id}>{journey.journey_name}</option>)}
            </select>
            {journeys.length === 0 && <small className="tsc-field-hint">No active journeys found. You can still submit an emergency report.</small>}
          </label>

          <div className="tsc-location-box">
            <div>
              <strong>Attach your current location</strong>
              <p>{location ? `Coordinates captured (accuracy approx. ${Math.round(location.accuracy ?? 0)} m).` : "Optional. Your browser will ask permission before sharing your location."}</p>
            </div>
            <button type="button" className="tsc-button tsc-button-light" onClick={captureLocation} disabled={locating}>
              {locating ? "Getting location…" : location ? "Refresh location" : "Use my location"}
            </button>
            {location && <button type="button" className="tsc-clear-location" onClick={() => setLocation(null)}>Remove location</button>}
          </div>

          <button type="submit" className="tsc-button tsc-button-emergency" disabled={saving}>
            {saving ? "Submitting report…" : "Submit emergency report"}
          </button>
          <p className="tsc-form-hint">Submitting this form creates an emergency record for TSC response monitoring. Do not delay contacting local emergency services.</p>
        </form>
      </section>

      <section className="tsc-panel">
        <div className="tsc-panel-heading">
          <div><span className="tsc-eyebrow">YOUR RECORDS</span><h2>Emergency report history</h2></div>
          <button className="tsc-text-button" onClick={() => void loadData()}>Refresh ↻</button>
        </div>

        {loading ? <div className="tsc-empty-state">Loading your reports…</div> :
          alerts.length === 0 ? (
            <div className="tsc-empty-state"><span className="tsc-empty-icon">✓</span><h3>No emergency reports</h3><p>Your submitted emergency reports and their response status will appear here.</p></div>
          ) : (
            <div className="tsc-emergency-list">
              {alerts.map((alert) => (
                <article className="tsc-emergency-card" key={alert.id}>
                  <div className="tsc-journey-card-heading">
                    <div><span className="tsc-eyebrow">{alert.category.replace("_", " ").toUpperCase()} · {alert.severity.toUpperCase()}</span><h3>{alert.title}</h3></div>
                    <span className={`tsc-status tsc-status-${alert.status}`}>{statusLabels[alert.status]}</span>
                  </div>
                  <p className="tsc-emergency-reference">{reference(alert.id)} · {formatDate(alert.reported_at)}</p>
                  {alert.description && <p className="tsc-journey-notes">{alert.description}</p>}
                  {alert.location_address && <p className="tsc-emergency-reference">Location: {alert.location_address}</p>}
                  {alert.latitude !== null && alert.longitude !== null && (
                    <p className="tsc-emergency-reference">GPS: {alert.latitude.toFixed(5)}, {alert.longitude.toFixed(5)}</p>
                  )}
                </article>
              ))}
            </div>
          )
        }
      </section>

      <p className="tsc-safety-note">TSC helps record and coordinate reported incidents. Response availability and timing may vary. Always use local emergency channels for urgent assistance.</p>
      <footer className="tsc-page-footer"><span>TRAVELLERS SAFETY COVERED</span><Link href="/dashboard">Return to dashboard</Link></footer>
    </main>
  );
}
