"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Category =
  | "medical"
  | "accident"
  | "security"
  | "natural_disaster"
  | "transport"
  | "other";
type Severity = "low" | "moderate" | "high" | "critical";
type EmergencyStatus =
  | "reported"
  | "acknowledged"
  | "assigned"
  | "responding"
  | "resolved"
  | "cancelled";

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

type CapturedLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

const categories: { value: Category; label: string; emoji: string }[] = [
  { value: "medical", label: "Medical", emoji: "🩺" },
  { value: "accident", label: "Accident", emoji: "🚗" },
  { value: "security", label: "Security", emoji: "🛡️" },
  { value: "natural_disaster", label: "Natural disaster", emoji: "⚠️" },
  { value: "transport", label: "Transport", emoji: "🚌" },
  { value: "other", label: "Other", emoji: "🧭" },
];

const severities: {
  value: Severity;
  label: string;
  emoji: string;
  selectedClass: string;
}[] = [
  {
    value: "low",
    label: "Low",
    emoji: "🟢",
    selectedClass:
      "border-teal-500 bg-teal-50 text-teal-800 ring-2 ring-teal-100",
  },
  {
    value: "moderate",
    label: "Moderate",
    emoji: "🟡",
    selectedClass:
      "border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-100",
  },
  {
    value: "high",
    label: "High",
    emoji: "🟠",
    selectedClass:
      "border-[#F28C28] bg-[#FFF4E8] text-[#9A3412] ring-2 ring-orange-100",
  },
  {
    value: "critical",
    label: "Critical",
    emoji: "⚡",
    selectedClass:
      "border-[#071D49] bg-[#EFF6FF] text-[#071D49] ring-2 ring-blue-100",
  },
];

const statusMeta: Record<
  EmergencyStatus,
  { label: string; badgeClass: string }
> = {
  reported: {
    label: "Reported",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
  },
  acknowledged: {
    label: "Acknowledged",
    badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
  },
  assigned: {
    label: "Responder assigned",
    badgeClass: "bg-indigo-50 text-indigo-800 border-indigo-200",
  },
  responding: {
    label: "Response in progress",
    badgeClass: "bg-[#FFF4E8] text-[#9A3412] border-orange-200",
  },
  resolved: {
    label: "Resolved",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  cancelled: {
    label: "Cancelled",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  },
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

  const loadData = useCallback(
    async (quiet = false) => {
      if (!quiet) {
        setLoading(true);
      }
      setError("");

      const [journeyResult, alertResult] = await Promise.all([
        supabase
          .from("journeys")
          .select("id, journey_name, status")
          .eq("traveller_id", travellerId)
          .eq("status", "active")
          .order("departure_at", { ascending: true }),
        supabase
          .from("emergency_alerts")
          .select("*")
          .eq("traveller_id", travellerId)
          .order("reported_at", { ascending: false })
          .limit(30),
      ]);

      if (journeyResult.error || alertResult.error) {
        setError(
          "We could not load all your emergency information. Please refresh and try again."
        );
      } else {
        setJourneys((journeyResult.data ?? []) as Journey[]);
        setAlerts((alertResult.data ?? []) as EmergencyAlert[]);
      }
      setLoading(false);
    },
    [supabase, travellerId]
  );

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
          accuracy: Number.isFinite(position.coords.accuracy)
            ? position.coords.accuracy
            : null,
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

    if (
      !window.confirm(
        "Submit this emergency report to TSC? If you are in immediate danger, contact local emergency services now as well."
      )
    ) {
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
      setError(
        insertError.message ||
          "Your emergency report could not be submitted. Please try again."
      );
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
    await loadData(true);
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 rounded-3xl bg-[#F4F6F9] p-4 sm:p-7">
      <nav className="flex items-center justify-between text-sm">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 font-bold text-[#071D49] hover:text-[#F28C28]"
        >
          ← Dashboard
        </Link>
        <span className="rounded-lg bg-[#F28C28] px-2.5 py-1 text-[11px] font-black tracking-wider text-white">
          SOS OPERATIONS
        </span>
      </nav>

      <header className="rounded-3xl bg-gradient-to-br from-[#071D49] via-[#103568] to-[#164a83] p-6 text-white shadow-lg sm:p-8">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/10 text-2xl">
            🚨
          </div>
          <div>
            <span className="text-[10px] font-extrabold tracking-[2px] text-orange-300">
              EMERGENCY OPERATIONS{" "}
              {travellerName ? `• ${travellerName.toUpperCase()}` : ""}
            </span>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Emergency support 🆘
            </h1>
          </div>
        </div>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
          Report a travel-related emergency and keep track of live updates to your
          report.
        </p>

        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-orange-300/30 bg-white/10 p-4">
          <span className="text-xl">⚠️</span>
          <div className="text-xs leading-relaxed text-blue-50 sm:text-sm">
            <strong className="block font-extrabold text-orange-200">
              Need immediate help?
            </strong>
            <span>
              TSC is not a replacement for police, ambulance, fire or other local
              emergency services. Contact the appropriate local emergency service
              immediately if anyone is in danger.
            </span>
          </div>
        </div>
      </header>

      {submitted && (
        <section
          role="status"
          className="flex items-start justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-xs"
        >
          <div className="flex items-start gap-3.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-600 text-lg font-black text-white">
              ✓
            </span>
            <div>
              <span className="text-[10px] font-extrabold tracking-widest text-emerald-700">
                REPORT SUBMITTED
              </span>
              <h2 className="mt-0.5 text-lg font-extrabold text-emerald-950">
                Your report has been received
              </h2>
              <p className="mt-1 text-sm text-emerald-900">
                Reference: <strong>{reference(submitted.id)}</strong>
              </p>
              <p className="text-sm text-emerald-900">
                Status: <strong>Reported</strong>. Keep this reference for your
                records.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSubmitted(null)}
            aria-label="Dismiss confirmation"
            className="rounded-lg p-1.5 text-lg font-bold text-emerald-800 hover:bg-emerald-100"
          >
            ×
          </button>
        </section>
      )}

      {notice && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
        >
          <span>✅ {notice}</span>
          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Dismiss notice"
            className="font-bold text-emerald-800"
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950"
        >
          <span>⚠️ {error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss alert"
            className="font-bold text-amber-900"
          >
            ×
          </button>
        </div>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-7">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-extrabold tracking-[1.5px] text-[#F28C28]">
              NEW EMERGENCY REPORT · 01
            </span>
            <h2 className="mt-1 text-lg font-extrabold text-[#071D49] sm:text-xl">
              📝 Tell us what happened
            </h2>
          </div>
          <span className="grid h-9 w-9 place-items-center rounded-full border border-orange-200 bg-[#FFF4E8] text-base font-black text-[#F28C28]">
            !
          </span>
        </div>

        <form className="space-y-5" onSubmit={submitEmergency}>
          <div>
            <span className="block text-xs font-extrabold text-[#172536] sm:text-sm">
              Emergency category *
            </span>
            <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {categories.map((item) => {
                const selected = category === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setCategory(item.value)}
                    className={`flex flex-col items-center justify-center rounded-2xl border p-3.5 text-center transition ${
                      selected
                        ? "border-[#F28C28] bg-[#FFF4E8] text-[#9A3412] ring-2 ring-orange-100"
                        : "border-slate-200 bg-slate-50/70 text-slate-600 hover:border-slate-300 hover:bg-white"
                    }`}
                  >
                    <span className="text-2xl">{item.emoji}</span>
                    <span className="mt-1.5 text-xs font-extrabold">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <fieldset>
            <legend className="text-xs font-extrabold text-[#172536] sm:text-sm">
              Severity level *
            </legend>
            <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {severities.map((item) => {
                const selected = severity === item.value;
                return (
                  <label
                    key={item.value}
                    className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-extrabold transition ${
                      selected
                        ? item.selectedClass
                        : "border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="severity"
                      value={item.value}
                      checked={selected}
                      onChange={() => setSeverity(item.value)}
                      className="sr-only"
                    />
                    <span>{item.emoji}</span>
                    <span>{item.label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <label className="block text-xs font-extrabold text-[#172536] sm:text-sm">
            Emergency title *
            <input
              required
              maxLength={160}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Briefly describe the emergency"
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm font-normal text-[#172536] outline-none transition focus:border-[#F28C28] focus:bg-white focus:ring-4 focus:ring-orange-100"
            />
            <span className="mt-1 block text-right text-[11px] font-normal text-slate-400">
              {title.length}/160
            </span>
          </label>

          <label className="block text-xs font-extrabold text-[#172536] sm:text-sm">
            Additional details (optional)
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened and any assistance required"
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm font-normal text-[#172536] outline-none transition focus:border-[#F28C28] focus:bg-white focus:ring-4 focus:ring-orange-100"
            />
          </label>

          <label className="block text-xs font-extrabold text-[#172536] sm:text-sm">
            🧭 Link to an active journey (optional)
            <select
              value={journeyId}
              onChange={(e) => setJourneyId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm font-normal text-[#172536] outline-none transition focus:border-[#F28C28] focus:bg-white focus:ring-4 focus:ring-orange-100"
            >
              <option value="">No journey selected</option>
              {journeys.map((journey) => (
                <option key={journey.id} value={journey.id}>
                  {journey.journey_name}
                </option>
              ))}
            </select>
            {journeys.length === 0 && (
              <small className="mt-1.5 block text-xs font-normal text-slate-500">
                No active journeys found. You can still submit an emergency report.
              </small>
            )}
          </label>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <strong className="block text-sm font-extrabold text-[#172536]">
                📍 Attach your current location
              </strong>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                {location
                  ? `Coordinates captured (accuracy approx. ${Math.round(location.accuracy ?? 0)} m).`
                  : "Optional. Your browser will ask permission before sharing your location."}
              </p>
              {location && (
                <p className="mt-1 text-xs font-bold text-emerald-700">
                  {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                </p>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={captureLocation}
                disabled={locating}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-extrabold text-[#071D49] shadow-2xs transition hover:border-orange-300 hover:bg-orange-50 disabled:opacity-50"
              >
                {locating
                  ? "Getting location…"
                  : location
                  ? "↻ Refresh location"
                  : "📡 Use my location"}
              </button>
              {location && (
                <button
                  type="button"
                  onClick={() => setLocation(null)}
                  className="px-2 py-2 text-xs font-bold text-[#071D49] hover:underline"
                >
                  Remove location
                </button>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#F28C28] px-6 py-3.5 text-sm font-extrabold text-white shadow-md transition hover:bg-orange-600 disabled:opacity-60"
          >
            {saving ? "Submitting report…" : "🚨 Submit emergency report"}
          </button>

          <p className="text-center text-xs leading-relaxed text-slate-500">
            Submitting this form creates an emergency record for TSC response
            monitoring. Do not delay contacting local emergency services.
          </p>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-7">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-extrabold tracking-[1.5px] text-[#F28C28]">
              YOUR RECORDS · 02
            </span>
            <h2 className="mt-1 text-lg font-extrabold text-[#071D49] sm:text-xl">
              📋 Emergency report history
            </h2>
          </div>
          <button
            type="button"
            onClick={() => void loadData(true)}
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-extrabold text-[#071D49] transition hover:bg-slate-50"
          >
            Refresh ↻
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Loading your reports…
          </div>
        ) : alerts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-xl font-black text-emerald-600">
              ✓
            </span>
            <h3 className="mt-3 text-base font-extrabold text-[#172536]">
              No emergency reports
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
              Your submitted emergency reports and their response status will appear
              here.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {alerts.map((alert) => {
              const st = statusMeta[alert.status];
              const cat = categories.find((c) => c.value === alert.category);

              return (
                <article
                  key={alert.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition hover:border-slate-300 hover:bg-white"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-extrabold tracking-wider text-[#F28C28]">
                      {cat?.emoji ?? "🚨"}{" "}
                      {alert.category.replace("_", " ").toUpperCase()} ·{" "}
                      {alert.severity.toUpperCase()}
                    </span>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${st.badgeClass}`}
                    >
                      {st.label}
                    </span>
                  </div>

                  <h3 className="mt-2 text-sm font-extrabold text-[#172536] sm:text-base">
                    {alert.title}
                  </h3>

                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {reference(alert.id)} · {formatDate(alert.reported_at)}
                  </p>

                  {alert.description && (
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">
                      {alert.description}
                    </p>
                  )}

                  {alert.location_address && (
                    <p className="mt-2 text-xs text-slate-500">
                      📍 Location: {alert.location_address}
                    </p>
                  )}

                  {alert.latitude !== null && alert.longitude !== null && (
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      🛰️ GPS: {alert.latitude.toFixed(5)},{" "}
                      {alert.longitude.toFixed(5)}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <p className="px-2 text-center text-xs leading-relaxed text-slate-500">
        TSC helps record and coordinate reported incidents. Response availability
        and timing may vary. Always use local emergency channels for urgent
        assistance.
      </p>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 text-xs">
        <span className="font-extrabold tracking-wider text-[#071D49]">
          🛡️ TRAVELLERS SAFETY COVERED
        </span>
        <Link
          href="/dashboard"
          className="font-extrabold text-[#F28C28] hover:underline"
        >
          Return to dashboard →
        </Link>
      </footer>
    </main>
  );
}