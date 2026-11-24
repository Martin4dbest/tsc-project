"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import JourneyTravellerGpsPanel from "./JourneyTravellerGpsPanel";

type JourneyStatus = "draft" | "scheduled" | "active" | "completed" | "cancelled";
type Filter = "all" | "upcoming" | "active" | "completed";

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

type Props = {
  travellerId: string;
  travellerName: string;
};

const EMPTY_FORM: JourneyForm = {
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

const MODES = [
  { value: "road", label: "Road", icon: "🚘" },
  { value: "air", label: "Air", icon: "✈️" },
  { value: "rail", label: "Rail", icon: "🚆" },
  { value: "sea", label: "Sea", icon: "🚢" },
  { value: "other", label: "Other", icon: "➕" },
];

const STATUS_COLORS: Record<JourneyStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  scheduled: "bg-blue-50 text-blue-700",
  active: "bg-emerald-50 text-emerald-700",
  completed: "bg-slate-100 text-slate-700",
  cancelled: "bg-red-50 text-red-700",
};

function localDateTimeValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDate(value: string | null) {
  if (!value) return "Not specified";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusLabel(status: JourneyStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function inputClass() {
  return "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-[#172536] outline-none transition focus:border-[#F28C28] focus:ring-2 focus:ring-orange-100";
}

export default function JourneyManagementClient({
  travellerId,
  travellerName,
}: Props) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const [modal, setModal] = useState<"form" | "details" | null>(null);
  const [selected, setSelected] = useState<Journey | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<JourneyForm>(EMPTY_FORM);

  const loadJourneys = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        window.location.href = "/login";
        return;
      }

      const { data, error: queryError } = await supabase
        .from("journeys")
        .select("*")
        .eq("traveller_id", travellerId)
        .order("departure_at", { ascending: true });

      if (queryError) throw queryError;

      setJourneys((data ?? []) as Journey[]);
    } catch (err) {
      console.error("Journey loading failed:", err);
      setError("We could not load your journeys. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supabase, travellerId]);

  useEffect(() => {
    void loadJourneys();
  }, [loadJourneys]);

  const filteredJourneys = useMemo(() => {
    return journeys.filter((journey) => {
      if (filter === "all") return true;
      if (filter === "upcoming") {
        return journey.status === "draft" || journey.status === "scheduled";
      }
      return journey.status === filter;
    });
  }, [journeys, filter]);

  function openCreate() {
    setSelected(null);
    setEditing(false);
    setNotice("");
    setForm({
      ...EMPTY_FORM,
      departure_at: localDateTimeValue(new Date(Date.now() + 86400000)),
    });
    setModal("form");
  }

  function openEdit(journey: Journey) {
    setSelected(journey);
    setEditing(true);
    setNotice("");

    setForm({
      journey_name: journey.journey_name,
      origin_name: journey.origin_name,
      origin_address: journey.origin_address ?? "",
      destination_name: journey.destination_name,
      destination_address: journey.destination_address ?? "",
      departure_at: localDateTimeValue(new Date(journey.departure_at)),
      expected_arrival_at: journey.expected_arrival_at
        ? localDateTimeValue(new Date(journey.expected_arrival_at))
        : "",
      transport_mode: journey.transport_mode,
      notes: journey.notes ?? "",
    });

    setModal("form");
  }

  function updateField(field: keyof JourneyForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveJourney(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");

    if (
      !form.journey_name.trim() ||
      !form.origin_name.trim() ||
      !form.destination_name.trim() ||
      !form.departure_at.trim()
    ) {
      setNotice("Complete the journey name, origin, destination and departure date/time.");
      return;
    }

    const departure = new Date(form.departure_at);
    const arrival = form.expected_arrival_at.trim()
      ? new Date(form.expected_arrival_at)
      : null;

    if (Number.isNaN(departure.getTime())) {
      setNotice("Enter a valid departure date and time.");
      return;
    }

    if (departure.getTime() <= Date.now()) {
      setNotice("Departure must be in the future.");
      return;
    }

    if (arrival && (Number.isNaN(arrival.getTime()) || arrival <= departure)) {
      setNotice("Expected arrival must be later than departure.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        window.location.href = "/login";
        return;
      }

      const timezone =
        Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

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

      const result =
        editing && selected
          ? await supabase
              .from("journeys")
              .update(payload)
              .eq("id", selected.id)
              .eq("traveller_id", session.user.id)
          : await supabase.from("journeys").insert({
              ...payload,
              traveller_id: session.user.id,
              status: "draft",
              location_sharing_enabled: false,
            });

      if (result.error) throw result.error;

      setModal(null);
      setSelected(null);
      await loadJourneys(true);
      setNotice(
        editing
          ? "Your journey details have been updated."
          : "Your journey has been saved as a draft. You can schedule it from its details."
      );
    } catch (err) {
      console.error("Journey save failed:", err);
      setNotice(
        err instanceof Error
          ? err.message
          : "Unable to save your journey. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(journey: Journey, status: JourneyStatus) {
    const messages: Record<string, string> = {
      scheduled: "Schedule this journey?",
      active: "Start this journey now?",
      completed: "Mark this journey as completed?",
      cancelled: "Cancel this journey?",
    };

    if (!window.confirm(messages[status] || "Update this journey?")) return;

    setSaving(true);
    setNotice("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        window.location.href = "/login";
        return;
      }

      const { error: updateError } = await supabase
        .from("journeys")
        .update({ status })
        .eq("id", journey.id)
        .eq("traveller_id", session.user.id);

      if (updateError) throw updateError;

      setModal(null);
      setSelected(null);
      await loadJourneys(true);
      setNotice(`Journey is now ${statusLabel(status).toLowerCase()}.`);
    } catch (err) {
      console.error("Journey status update failed:", err);
      setNotice(
        err instanceof Error
          ? err.message
          : "This status change could not be completed."
      );
    } finally {
      setSaving(false);
    }
  }

  function updateSelectedGps(enabled: boolean) {
    if (!selected) return;

    const updated = {
      ...selected,
      location_sharing_enabled: enabled,
    };

    setSelected(updated);
    setJourneys((current) =>
      current.map((journey) =>
        journey.id === updated.id ? updated : journey
      )
    );
  }

  function closeModal() {
    if (saving) return;
    setModal(null);
    setSelected(null);
    setNotice("");
  }

  const summary = {
    scheduled: journeys.filter((journey) => journey.status === "scheduled").length,
    active: journeys.filter((journey) => journey.status === "active").length,
    completed: journeys.filter((journey) => journey.status === "completed").length,
  };

  return (
    <section aria-label="My journeys" data-traveller-id={travellerId} className="space-y-5">
      <header className="flex items-center gap-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-extrabold tracking-[0.16em] text-[#F28C28]">
            TRAVELLER SERVICES
          </p>
          <h2 className="mt-1 text-2xl font-extrabold text-[#172536]">
            My journeys
          </h2>
        </div>
        <button
          type="button"
          onClick={openCreate}
          aria-label="Plan a journey"
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#071D49] text-2xl font-medium text-white transition hover:bg-blue-900"
        >
          +
        </button>
      </header>

      <div className="flex items-center gap-4 rounded-2xl bg-[#071D49] p-5 text-white sm:p-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-2xl">
          <span className="text-[#F28C28]">➤</span>
        </div>
        <div>
          <h3 className="text-base font-bold">Travel with a plan</h3>
          <p className="mt-1 text-sm leading-6 text-blue-100">
            Organise your trips and keep your journey information in one place.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Scheduled", value: summary.scheduled, color: "text-[#071D49]" },
          { label: "Active", value: summary.active, color: "text-emerald-600" },
          { label: "Completed", value: summary.completed, color: "text-[#071D49]" },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-[#E2E7EE] bg-white p-3.5 sm:p-4">
            <p className={`text-2xl font-extrabold ${item.color}`}>{item.value}</p>
            <p className="mt-1 text-xs font-semibold text-[#687789]">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        <h3 className="text-base font-extrabold text-[#172536]">Your travel activity</h3>
        <button
          type="button"
          onClick={() => void loadJourneys(true)}
          disabled={refreshing}
          className="rounded-lg px-3 py-2 text-sm font-bold text-[#687789] transition hover:bg-white disabled:opacity-50"
        >
          {refreshing ? "Refreshing…" : "↻ Refresh"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          ["all", "All journeys"],
          ["upcoming", "Upcoming"],
          ["active", "Active"],
          ["completed", "Completed"],
        ] as [Filter, string][]).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
              filter === value
                ? "border-[#071D49] bg-[#071D49] text-white"
                : "border-[#E2E7EE] bg-white text-[#687789] hover:border-[#F28C28]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {notice && (
        <div role="status" className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {notice}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-[#E2E7EE] bg-white py-14 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-orange-100 border-t-[#F28C28]" />
          <p className="mt-3 text-sm text-[#687789]">Loading your journeys...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-[#E2E7EE] bg-white p-7 text-center">
          <p className="font-bold text-[#172536]">Unable to load journeys</p>
          <p className="mt-2 text-sm text-[#687789]">{error}</p>
          <button
            type="button"
            onClick={() => void loadJourneys()}
            className="mt-4 rounded-xl bg-[#071D49] px-5 py-2.5 text-sm font-bold text-white"
          >
            Try again
          </button>
        </div>
      ) : filteredJourneys.length === 0 ? (
        <div className="rounded-2xl border border-[#E2E7EE] bg-white px-6 py-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-2xl">
            ✈️
          </div>
          <h3 className="mt-4 text-base font-extrabold text-[#172536]">
            No journeys here yet
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#687789]">
            {filter === "all"
              ? "Create your first journey to begin organising your travel."
              : "Journeys matching this category will appear here."}
          </p>
          {filter === "all" && (
            <button
              type="button"
              onClick={openCreate}
              className="mt-5 rounded-xl bg-[#071D49] px-5 py-3 text-sm font-bold text-white"
            >
              + Create a journey
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredJourneys.map((journey) => {
            const mode = MODES.find((item) => item.value === journey.transport_mode);

            return (
              <button
                key={journey.id}
                type="button"
                onClick={() => {
                  setSelected(journey);
                  setModal("details");
                  setNotice("");
                }}
                className="w-full rounded-2xl border border-[#E2E7EE] bg-white p-4 text-left transition hover:border-[#F28C28] hover:shadow-sm sm:p-5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-xl">
                    {mode?.icon ?? "🚘"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-sm font-extrabold text-[#172536]">
                      {journey.journey_name}
                    </h4>
                    <p className="mt-1 text-xs text-[#687789]">
                      {formatDate(journey.departure_at)}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-extrabold ${STATUS_COLORS[journey.status]}`}>
                    {statusLabel(journey.status)}
                  </span>
                </div>

                <div className="mt-5 flex gap-3 pl-2">
                  <div className="flex w-3 shrink-0 flex-col items-center py-1">
                    <span className="h-2.5 w-2.5 rounded-full border-2 border-emerald-600 bg-white" />
                    <span className="my-1 h-6 w-px bg-slate-300" />
                    <span className="h-2.5 w-2.5 rounded-sm bg-[#F28C28]" />
                  </div>
                  <div className="flex min-h-12 flex-1 flex-col justify-between gap-3">
                    <p className="truncate text-sm font-semibold text-[#344456]">
                      {journey.origin_name}
                    </p>
                    <p className="truncate text-sm font-semibold text-[#344456]">
                      {journey.destination_name}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-[10px] font-bold tracking-wide text-[#687789]">
                    {journey.transport_mode.toUpperCase()} JOURNEY
                  </span>
                  <span className="text-xs font-extrabold text-[#F28C28]">
                    View details ›
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-start gap-3 rounded-xl bg-[#EAF6F1] p-4">
        <span className="text-lg text-emerald-700">🛡️</span>
        <p className="text-xs leading-5 text-[#41685A]">
          Your journey information is protected by your account permissions.
          Location sharing is off unless you explicitly enable it in a supported feature.
        </p>
      </div>

      {modal === "form" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#071D49]/65 p-3 backdrop-blur-sm sm:p-5">
          <form
            onSubmit={saveJourney}
            className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-[#F4F6F9] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#E2E7EE] bg-white px-5 py-4">
              <h3 className="text-base font-extrabold text-[#172536]">
                {editing ? "Edit journey" : "Plan a journey"}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close form"
                className="rounded-xl bg-[#F4F6F9] px-3 py-2 text-lg text-[#172536]"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto p-5 sm:p-6">
              <h4 className="mb-4 text-sm font-extrabold text-[#071D49]">
                Journey information
              </h4>

              <div className="space-y-4">
                <label className="block text-xs font-bold text-[#344456]">
                  Journey name *
                  <input
                    required
                    value={form.journey_name}
                    onChange={(e) => updateField("journey_name", e.target.value)}
                    placeholder="e.g. Business trip to Abuja"
                    className={inputClass()}
                  />
                </label>

                <label className="block text-xs font-bold text-[#344456]">
                  Departure location *
                  <input
                    required
                    value={form.origin_name}
                    onChange={(e) => updateField("origin_name", e.target.value)}
                    placeholder="City or place of departure"
                    className={inputClass()}
                  />
                </label>

                <label className="block text-xs font-bold text-[#344456]">
                  Departure address
                  <input
                    value={form.origin_address}
                    onChange={(e) => updateField("origin_address", e.target.value)}
                    placeholder="Street address (optional)"
                    className={inputClass()}
                  />
                </label>

                <label className="block text-xs font-bold text-[#344456]">
                  Destination *
                  <input
                    required
                    value={form.destination_name}
                    onChange={(e) => updateField("destination_name", e.target.value)}
                    placeholder="City or destination"
                    className={inputClass()}
                  />
                </label>

                <label className="block text-xs font-bold text-[#344456]">
                  Destination address
                  <input
                    value={form.destination_address}
                    onChange={(e) => updateField("destination_address", e.target.value)}
                    placeholder="Street address (optional)"
                    className={inputClass()}
                  />
                </label>
              </div>

              <h4 className="mb-4 mt-7 text-sm font-extrabold text-[#071D49]">
                Travel schedule
              </h4>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-bold text-[#344456]">
                  Departure date and time *
                  <input
                    type="datetime-local"
                    required
                    value={form.departure_at}
                    onChange={(e) => updateField("departure_at", e.target.value)}
                    className={inputClass()}
                  />
                </label>

                <label className="block text-xs font-bold text-[#344456]">
                  Expected arrival
                  <input
                    type="datetime-local"
                    value={form.expected_arrival_at}
                    onChange={(e) => updateField("expected_arrival_at", e.target.value)}
                    className={inputClass()}
                  />
                </label>
              </div>

              <h4 className="mb-3 mt-7 text-xs font-bold text-[#344456]">
                Transport mode
              </h4>

              <div className="flex flex-wrap gap-2">
                {MODES.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => updateField("transport_mode", mode.value)}
                    className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold transition ${
                      form.transport_mode === mode.value
                        ? "border-[#F28C28] bg-orange-50 text-[#A94E0B]"
                        : "border-[#E2E7EE] bg-white text-[#687789]"
                    }`}
                  >
                    <span>{mode.icon}</span>
                    {mode.label}
                  </button>
                ))}
              </div>

              <label className="mt-6 block text-xs font-bold text-[#344456]">
                Additional notes
                <textarea
                  rows={4}
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  placeholder="Travel details or information for your reference"
                  className={inputClass()}
                />
              </label>

              <div className="mt-5 rounded-xl bg-[#FFF4DF] p-3 text-xs leading-5 text-[#79531C]">
                New journeys are saved as drafts. You can schedule them after reviewing the details.
              </div>

              {notice && (
                <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {notice}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="mt-5 flex min-h-12 w-full items-center justify-center rounded-xl bg-[#071D49] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-blue-900 disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editing
                    ? "✓ Save changes"
                    : "✓ Save journey"}
              </button>
            </div>
          </form>
        </div>
      )}

      {modal === "details" && selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#071D49]/65 p-3 backdrop-blur-sm sm:p-5">
          <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-[#F4F6F9] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E2E7EE] bg-white px-5 py-4">
              <h3 className="text-base font-extrabold text-[#172536]">
                Journey details
              </h3>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close details"
                className="rounded-xl bg-[#F4F6F9] px-3 py-2 text-lg text-[#172536]"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto p-5 sm:p-6">
              <div className="flex flex-col items-center py-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-2xl">
                  ➤
                </div>
                <h4 className="mt-3 text-lg font-extrabold text-[#172536]">
                  {selected.journey_name}
                </h4>
                <span className={`mt-3 rounded-full px-3 py-1.5 text-xs font-extrabold ${STATUS_COLORS[selected.status]}`}>
                  {statusLabel(selected.status)}
                </span>
              </div>

              <div className="mt-3 rounded-xl border border-[#E2E7EE] bg-white p-4">
                <h4 className="mb-4 text-xs font-extrabold text-[#071D49]">Route</h4>
                <div className="flex gap-3">
                  <span className="mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-emerald-600" />
                  <div>
                    <p className="text-[10px] font-extrabold tracking-wider text-[#687789]">FROM</p>
                    <p className="mt-1 text-sm font-bold text-[#172536]">{selected.origin_name}</p>
                    {selected.origin_address && (
                      <p className="mt-1 text-xs text-[#687789]">{selected.origin_address}</p>
                    )}
                  </div>
                </div>
                <div className="my-4 ml-1.5 h-5 border-l border-dashed border-slate-300" />
                <div className="flex gap-3">
                  <span className="mt-1 h-3 w-3 shrink-0 rounded-sm bg-[#F28C28]" />
                  <div>
                    <p className="text-[10px] font-extrabold tracking-wider text-[#687789]">TO</p>
                    <p className="mt-1 text-sm font-bold text-[#172536]">{selected.destination_name}</p>
                    {selected.destination_address && (
                      <p className="mt-1 text-xs text-[#687789]">{selected.destination_address}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-[#E2E7EE] bg-white p-4">
                <h4 className="mb-3 text-xs font-extrabold text-[#071D49]">Schedule and travel</h4>
                {[
                  ["Departure", formatDate(selected.departure_at)],
                  ["Expected arrival", formatDate(selected.expected_arrival_at)],
                  ["Transport", selected.transport_mode.toUpperCase()],
                  ["Timezone", selected.departure_timezone],
                  ...(selected.started_at ? [["Started", formatDate(selected.started_at)]] : []),
                  ...(selected.completed_at ? [["Completed", formatDate(selected.completed_at)]] : []),
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 border-b border-slate-100 py-3 last:border-0">
                    <span className="text-xs text-[#687789]">{label}</span>
                    <span className="text-right text-xs font-bold text-[#172536]">{value}</span>
                  </div>
                ))}
              </div>

              {selected.notes && (
                <div className="mt-3 rounded-xl border border-[#E2E7EE] bg-white p-4">
                  <h4 className="mb-2 text-xs font-extrabold text-[#071D49]">Notes</h4>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-[#445366]">{selected.notes}</p>
                </div>
              )}

              <div className="mt-3">
                <JourneyTravellerGpsPanel
                  journey={selected}
                  onUpdated={updateSelectedGps}
                />
              </div>

              {selected.status === "draft" && (
                <>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void changeStatus(selected, "scheduled")}
                    className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl bg-[#071D49] px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50"
                  >
                    Schedule journey
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => openEdit(selected)}
                    className="mt-2 flex min-h-11 w-full items-center justify-center rounded-xl border border-[#E2E7EE] bg-white px-4 py-3 text-sm font-bold text-[#071D49] disabled:opacity-50"
                  >
                    Edit journey
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void changeStatus(selected, "cancelled")}
                    className="mt-2 w-full p-3 text-xs font-bold text-red-600 disabled:opacity-50"
                  >
                    Cancel journey
                  </button>
                </>
              )}

              {selected.status === "scheduled" && (
                <>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void changeStatus(selected, "active")}
                    className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl bg-[#071D49] px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50"
                  >
                    Start journey
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => openEdit(selected)}
                    className="mt-2 flex min-h-11 w-full items-center justify-center rounded-xl border border-[#E2E7EE] bg-white px-4 py-3 text-sm font-bold text-[#071D49] disabled:opacity-50"
                  >
                    Edit journey
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void changeStatus(selected, "cancelled")}
                    className="mt-2 w-full p-3 text-xs font-bold text-red-600 disabled:opacity-50"
                  >
                    Cancel journey
                  </button>
                </>
              )}

              {selected.status === "active" && (
                <>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void changeStatus(selected, "completed")}
                    className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl bg-[#071D49] px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50"
                  >
                    Complete journey
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void changeStatus(selected, "cancelled")}
                    className="mt-2 w-full p-3 text-xs font-bold text-red-600 disabled:opacity-50"
                  >
                    Cancel journey
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="mt-3 w-full rounded-xl border border-[#E2E7EE] bg-white px-4 py-3 text-sm font-bold text-[#687789]"
              >
                Close details
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
