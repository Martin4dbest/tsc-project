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
  { value: "road", label: "Road", emoji: "🚘" },
  { value: "air", label: "Air", emoji: "✈️" },
  { value: "rail", label: "Rail", emoji: "🚆" },
  { value: "sea", label: "Sea", emoji: "🚢" },
  { value: "other", label: "Other", emoji: "🧭" },
];

const STATUS_META: Record<
  JourneyStatus,
  { label: string; emoji: string; badgeClass: string }
> = {
  draft: {
    label: "Draft",
    emoji: "📝",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  },
  scheduled: {
    label: "Scheduled",
    emoji: "📅",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  active: {
    label: "Active Now",
    emoji: "🟢",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  completed: {
    label: "Completed",
    emoji: "🏁",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  },
  cancelled: {
    label: "Cancelled",
    emoji: "🚫",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
  },
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

function getModeEmoji(mode: string) {
  return MODES.find((item) => item.value === mode)?.emoji ?? "🚘";
}

function inputClass() {
  return "mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm text-[#172536] outline-none transition focus:border-[#F28C28] focus:bg-white focus:ring-2 focus:ring-orange-100";
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
  const [walletError, setWalletError] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const [modal, setModal] = useState<"form" | "details" | null>(null);
  const [selected, setSelected] = useState<Journey | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<JourneyForm>(EMPTY_FORM);
  const [pendingSchedule, setPendingSchedule] = useState<{
    journey: Journey;
    quoteId: string;
    origin: string;
    destination: string;
    fee: number;
    distance: number;
    interstate: boolean;
    qualifiesForFee: boolean;
  } | null>(null);

  const loadJourneys = useCallback(
    async (quiet = false) => {
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
    },
    [supabase, travellerId]
  );

  useEffect(() => {
    void loadJourneys();
  }, [loadJourneys]);

  const counts = useMemo(
    () => ({
      all: journeys.length,
      upcoming: journeys.filter((j) => j.status === "draft" || j.status === "scheduled").length,
      scheduled: journeys.filter((j) => j.status === "scheduled").length,
      active: journeys.filter((j) => j.status === "active").length,
      completed: journeys.filter((j) => j.status === "completed").length,
    }),
    [journeys]
  );

  const filteredJourneys = useMemo(() => {
    const q = search.trim().toLowerCase();
    return journeys.filter((journey) => {
      const matchesTab =
        filter === "all"
          ? true
          : filter === "upcoming"
          ? journey.status === "draft" || journey.status === "scheduled"
          : journey.status === filter;

      if (!matchesTab) return false;
      if (!q) return true;

      return (
        journey.journey_name.toLowerCase().includes(q) ||
        journey.origin_name.toLowerCase().includes(q) ||
        journey.destination_name.toLowerCase().includes(q)
      );
    });
  }, [journeys, filter, search]);

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
          ? "✅ Your journey details have been updated."
          : "✨ Your journey has been saved as a draft. You can schedule it from its details."
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
      scheduled: "Verify this journey's route and schedule it?",
      active: "🟢 Start this journey now?",
      completed: "🏁 Mark this journey as completed?",
      cancelled: "🚫 Cancel this journey?",
    };

    if (status !== "scheduled" && !window.confirm(messages[status] || "Update this journey?")) {
      return;
    }

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

      if (status === "scheduled") {
        const origin =
          journey.origin_address?.trim() || journey.origin_name.trim();
        const destination =
          journey.destination_address?.trim() ||
          journey.destination_name.trim();

        const quoteResponse = await fetch("/api/journeys/route-quote", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ origin, destination }),
        });

        const quote = await quoteResponse.json();

        if (!quoteResponse.ok || !quote.verified || !quote.quoteId) {
          throw new Error(
            quote.error || "Unable to verify this journey's route."
          );
        }

        setPendingSchedule({
          journey,
          quoteId: quote.quoteId,
          origin: quote.origin?.address || origin,
          destination: quote.destination?.address || destination,
          fee: Number(quote.feeNgn || 0),
          distance: Number(quote.distanceKm || 0),
          interstate: Boolean(quote.interState),
          qualifiesForFee: Boolean(quote.qualifiesForFee),
        });
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
      setNotice(`✅ Journey is now ${STATUS_META[status].label.toLowerCase()}.`);
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

  async function confirmSchedule() {
    if (!pendingSchedule) return;

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

      const scheduleResponse = await fetch("/api/journeys/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          journeyId: pendingSchedule.journey.id,
          quoteId: pendingSchedule.quoteId,
        }),
      });

      const scheduleResult = await scheduleResponse.json();

      if (!scheduleResponse.ok || !scheduleResult.success) {
        throw new Error(
          scheduleResult.error || "Unable to schedule this journey."
        );
      }

      const payment = scheduleResult.data ?? scheduleResult;
      setPendingSchedule(null);
      setModal(null);
      setSelected(null);
      await loadJourneys(true);

      setNotice(
        payment.payment_status === "paid"
          ? `✅ Journey scheduled. Fee charged: ₦${(Number(payment.amount_minor) / 100).toLocaleString("en-NG")}. Reference: ${payment.reference || "Confirmed"}.`
          : "✅ Journey scheduled successfully. No wallet fee was charged."
      );
    } catch (err) {
      console.error("Journey scheduling failed:", err);
      const errorMessage = err instanceof Error
        ? err.message
        : "Unable to schedule this journey. Please try again.";

      if (errorMessage.toLowerCase().includes("insufficient wallet balance")) {
        setWalletError(true);
      } else {
        setNotice(errorMessage);
      }
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
      current.map((journey) => (journey.id === updated.id ? updated : journey))
    );
  }

  function closeModal() {
    if (saving) return;
    setModal(null);
    setSelected(null);
    setNotice("");
  }

  return (
    <section
      aria-label="My journeys"
      data-traveller-id={travellerId}
      className="mx-auto max-w-5xl space-y-6 rounded-3xl bg-[#F4F6F9] p-4 sm:p-7"
    >
      {/* Top Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-extrabold tracking-[0.16em] text-[#F28C28]">
            🧭 TRAVELLER SERVICES {travellerName ? `• ${travellerName.toUpperCase()}` : ""}
          </p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-[#172536] sm:text-3xl">
            My Journeys
          </h2>
        </div>
        <button
          type="button"
          onClick={openCreate}
          aria-label="Plan a journey"
          className="inline-flex items-center gap-2 rounded-2xl bg-[#071D49] px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#102E6B] active:scale-[0.99]"
        >
          <span>➕</span>
          <span>Plan a Journey</span>
        </button>
      </header>

      {/* Hero Banner */}
      <div className="flex items-center gap-4 rounded-2xl bg-[#071D49] p-5 text-white shadow-sm sm:p-6">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-3xl">
          🗺️
        </div>
        <div>
          <h3 className="text-base font-extrabold sm:text-lg">
            Travel with a clear plan ✨
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-300 sm:text-sm">
            Organise routes, track departure schedules, and manage live GPS sharing in one secure hub.
          </p>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: "Scheduled", emoji: "📅", value: counts.scheduled, color: "text-[#071D49]", highlight: false },
          { label: "Active", emoji: "🟢", value: counts.active, color: "text-emerald-600", highlight: true },
          { label: "Completed", emoji: "🏁", value: counts.completed, color: "text-[#071D49]", highlight: false },
        ].map((item) => (
          <div
            key={item.label}
            className={`rounded-2xl border p-4 transition ${
              item.highlight
                ? "border-emerald-200 bg-emerald-50/40"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="text-lg">{item.emoji}</div>
            <p className={`mt-1 text-2xl font-extrabold sm:text-3xl ${item.color}`}>
              {item.value}
            </p>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Activity Controls: Search & Filter Tabs */}
      <div className="space-y-4 pt-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-extrabold text-[#172536] sm:text-lg">
            📋 Your travel activity
          </h3>
          <button
            type="button"
            onClick={() => void loadJourneys(true)}
            disabled={refreshing}
            className="rounded-xl bg-white px-3.5 py-2 text-xs font-extrabold text-[#F28C28] shadow-xs ring-1 ring-slate-200 transition hover:bg-orange-50 disabled:opacity-50"
          >
            {refreshing ? "Syncing…" : "↻ Sync"}
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Filter Chips */}
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", "🌍 All", counts.all],
                ["upcoming", "⏳ Upcoming", counts.upcoming],
                ["active", "🟢 Active", counts.active],
                ["completed", "🏁 Completed", counts.completed],
              ] as [Filter, string, number][]
            ).map(([value, label, count]) => {
              const active = filter === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition ${
                    active
                      ? "border-[#071D49] bg-[#071D49] text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-[#F28C28]"
                  }`}
                >
                  <span>{label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                      active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Search trips or cities..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-[#172536] outline-none transition focus:border-[#F28C28] focus:ring-2 focus:ring-orange-100"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {notice && (
        <div
          role="status"
          className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900"
        >
          {notice}
        </div>
      )}

      {/* Main Content Feed */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-orange-100 border-t-[#F28C28]" />
          <p className="mt-3 text-sm font-medium text-slate-500">Loading your journeys...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <div className="text-3xl">⚠️</div>
          <p className="mt-2 font-extrabold text-[#172536]">Unable to load journeys</p>
          <p className="mt-1 text-sm text-slate-500">{error}</p>
          <button
            type="button"
            onClick={() => void loadJourneys()}
            className="mt-4 rounded-xl bg-[#071D49] px-5 py-2.5 text-sm font-extrabold text-white"
          >
            ↻ Try again
          </button>
        </div>
      ) : filteredJourneys.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFF4E8] text-3xl">
            ✈️
          </div>
          <h3 className="mt-4 text-base font-extrabold text-[#172536]">
            {search ? "No matching trips found" : "No journeys here yet"}
          </h3>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500">
            {search
              ? "Try adjusting your search keywords or clearing your active filter."
              : filter === "all"
              ? "Create your first journey to begin organising your travel."
              : "Journeys matching this category will appear here."}
          </p>
          {filter === "all" && !search && (
            <button
              type="button"
              onClick={openCreate}
              className="mt-5 rounded-xl bg-[#071D49] px-5 py-3 text-sm font-extrabold text-white hover:bg-[#102E6B]"
            >
              ➕ Plan a Journey
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredJourneys.map((journey) => {
            const meta = STATUS_META[journey.status];

            return (
              <button
                key={journey.id}
                type="button"
                onClick={() => {
                  setSelected(journey);
                  setModal("details");
                  setNotice("");
                }}
                className="group flex w-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-[#F28C28] hover:shadow-md"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FFF4E8] text-2xl">
                      {getModeEmoji(journey.transport_mode)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-sm font-extrabold text-[#172536] sm:text-base">
                        {journey.journey_name}
                      </h4>
                      <p className="mt-0.5 text-xs font-medium text-slate-500">
                        🕒 {formatDate(journey.departure_at)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-extrabold ${meta.badgeClass}`}
                    >
                      {meta.emoji} {meta.label}
                    </span>
                  </div>

                  {/* Visual Route Container */}
                  <div className="mt-4 flex gap-3 rounded-xl bg-slate-50 p-3.5">
                    <div className="flex w-3 shrink-0 flex-col items-center py-1.5">
                      <span className="h-2.5 w-2.5 rounded-full border-2 border-emerald-600 bg-white" />
                      <span className="my-1 h-7 w-px bg-slate-300" />
                      <span className="h-2.5 w-2.5 rounded-sm bg-[#F28C28]" />
                    </div>
                    <div className="flex flex-1 flex-col justify-between gap-2.5 overflow-hidden">
                      <div>
                        <p className="text-[9px] font-extrabold tracking-wider text-slate-400">
                          FROM
                        </p>
                        <p className="truncate text-xs font-bold text-slate-800 sm:text-sm">
                          {journey.origin_name}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-extrabold tracking-wider text-slate-400">
                          TO
                        </p>
                        <p className="truncate text-xs font-bold text-slate-800 sm:text-sm">
                          {journey.destination_name}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold tracking-wider text-slate-500">
                      {journey.transport_mode.toUpperCase()} TRIP
                    </span>
                    {journey.location_sharing_enabled && (
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
                        📡 GPS Live
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-extrabold text-[#F28C28] transition group-hover:translate-x-0.5">
                    Manage trip ›
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Verified Route Scheduling Confirmation */}
      {pendingSchedule && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#071D49]/75 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="schedule-confirm-title"
            className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl"
          >
            <div className="bg-[#071D49] px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-2xl">
                  🛣️
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-orange-300">
                    Route verified
                  </p>
                  <h3 id="schedule-confirm-title" className="text-lg font-extrabold">
                    Confirm journey schedule
                  </h3>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-6">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  From
                </div>
                <p className="mt-1 text-sm font-bold text-slate-800">
                  {pendingSchedule.origin}
                </p>
                <div className="my-3 border-t border-dashed border-slate-300" />
                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  To
                </div>
                <p className="mt-1 text-sm font-bold text-slate-800">
                  {pendingSchedule.destination}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-bold text-slate-500">Route distance</p>
                  <p className="mt-1 text-xl font-extrabold text-[#071D49]">
                    {pendingSchedule.distance.toFixed(2)} km
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-bold text-slate-500">Route type</p>
                  <p className="mt-1 text-base font-extrabold text-[#071D49]">
                    {pendingSchedule.interstate ? "Inter-state" : "Intra-state"}
                  </p>
                  <p className="text-xs text-slate-500">Verified route</p>
                </div>
              </div>

              <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                <p className="text-xs font-extrabold uppercase tracking-wider text-orange-800">
                  Journey wallet fee
                </p>
                <p className="mt-1 text-2xl font-extrabold text-[#071D49]">
                  {pendingSchedule.qualifiesForFee
                    ? `₦${pendingSchedule.fee.toLocaleString("en-NG")}`
                    : "₦0"}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  {pendingSchedule.qualifiesForFee
                    ? "This fee will be charged when you confirm scheduling."
                    : "No scheduling fee applies to this verified route."}
                </p>
              </div>

              <p className="text-sm leading-relaxed text-slate-600">
                Confirm below to schedule this journey. Any applicable fee will be
                processed securely.
              </p>

              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setPendingSchedule(null)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void confirmSchedule()}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#071D49] px-4 py-3 text-sm font-extrabold text-white shadow-lg transition hover:bg-[#102E6B] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Scheduling Journey...
                  </>
                ) : (
                  "Confirm & Schedule"
                )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Privacy Banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
        <span className="text-lg">🛡️</span>
        <p className="text-xs leading-relaxed text-emerald-900">
          Your journey data is protected by your account permissions. Live location sharing stays off unless you explicitly enable it inside a journey.
        </p>
      </div>

      {/* Create / Edit Modal */}
      {modal === "form" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#071D49]/65 p-3 backdrop-blur-xs sm:p-5">
          <form
            onSubmit={saveJourney}
            className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-[#F4F6F9] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <h3 className="text-base font-extrabold text-[#172536]">
                {editing ? "✏️ Edit Journey" : "🧭 Plan a Journey"}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close form"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-lg font-bold text-slate-600 hover:bg-slate-200"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto p-5 sm:p-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h4 className="mb-4 text-sm font-extrabold text-[#071D49]">
                  📍 Route & Trip Information
                </h4>

                <div className="space-y-4">
                  <label className="block text-xs font-bold text-slate-700">
                    Journey name *
                    <input
                      required
                      value={form.journey_name}
                      onChange={(e) => updateField("journey_name", e.target.value)}
                      placeholder="e.g. Business trip to Abuja"
                      className={inputClass()}
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-xs font-bold text-slate-700">
                      Departure location *
                      <input
                        required
                        value={form.origin_name}
                        onChange={(e) => updateField("origin_name", e.target.value)}
                        placeholder="City or terminal"
                        className={inputClass()}
                      />
                    </label>

                    <label className="block text-xs font-bold text-slate-700">
                      Departure address
                      <input
                        value={form.origin_address}
                        onChange={(e) => updateField("origin_address", e.target.value)}
                        placeholder="Street address (optional)"
                        className={inputClass()}
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-xs font-bold text-slate-700">
                      Destination *
                      <input
                        required
                        value={form.destination_name}
                        onChange={(e) => updateField("destination_name", e.target.value)}
                        placeholder="City or destination"
                        className={inputClass()}
                      />
                    </label>

                    <label className="block text-xs font-bold text-slate-700">
                      Destination address
                      <input
                        value={form.destination_address}
                        onChange={(e) => updateField("destination_address", e.target.value)}
                        placeholder="Street address (optional)"
                        className={inputClass()}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h4 className="mb-4 text-sm font-extrabold text-[#071D49]">
                  🕒 Schedule & Transport Mode
                </h4>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Departure date and time *
                    <input
                      type="datetime-local"
                      required
                      value={form.departure_at}
                      onChange={(e) => updateField("departure_at", e.target.value)}
                      className={inputClass()}
                    />
                  </label>

                  <label className="block text-xs font-bold text-slate-700">
                    Expected arrival
                    <input
                      type="datetime-local"
                      value={form.expected_arrival_at}
                      onChange={(e) => updateField("expected_arrival_at", e.target.value)}
                      className={inputClass()}
                    />
                  </label>
                </div>

                <div className="mt-5">
                  <span className="block text-xs font-bold text-slate-700">
                    Transport mode
                  </span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {MODES.map((mode) => {
                      const active = form.transport_mode === mode.value;
                      return (
                        <button
                          key={mode.value}
                          type="button"
                          onClick={() => updateField("transport_mode", mode.value)}
                          className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition ${
                            active
                              ? "border-[#F28C28] bg-[#FFF4E8] text-[#9A3412]"
                              : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
                          }`}
                        >
                          <span className="text-base">{mode.emoji}</span>
                          <span>{mode.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="mt-5 block text-xs font-bold text-slate-700">
                  📝 Additional notes
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => updateField("notes", e.target.value)}
                    placeholder="Flight number, hotel check-in, or emergency notes..."
                    className={inputClass()}
                  />
                </label>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-900">
                <span className="text-base">💡</span>
                <p>
                  New journeys are saved as drafts first so you can review everything before scheduling.
                </p>
              </div>

              {notice && (
                <p
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  {notice}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#071D49] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#102E6B] disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editing
                  ? "✅ Save Changes"
                  : "✨ Save Journey"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Details Modal */}
      {modal === "details" && selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#071D49]/65 p-3 backdrop-blur-xs sm:p-5">
          <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-[#F4F6F9] shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <h3 className="text-base font-extrabold text-[#172536]">
                🧭 Journey Details
              </h3>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close details"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-lg font-bold text-slate-600 hover:bg-slate-200"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto p-5 sm:p-6">
              <div className="flex flex-col items-center py-3 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFF4E8] text-3xl">
                  {getModeEmoji(selected.transport_mode)}
                </div>
                <h4 className="mt-3 text-xl font-extrabold text-[#172536]">
                  {selected.journey_name}
                </h4>
                <span
                  className={`mt-2.5 rounded-full border px-3.5 py-1 text-xs font-extrabold ${STATUS_META[selected.status].badgeClass}`}
                >
                  {STATUS_META[selected.status].emoji} {STATUS_META[selected.status].label}
                </span>
              </div>

              <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-5">
                <h4 className="mb-4 text-xs font-extrabold tracking-wide text-[#071D49]">
                  📍 ROUTE OVERVIEW
                </h4>
                <div className="flex gap-3">
                  <span className="mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-emerald-600" />
                  <div>
                    <p className="text-[10px] font-extrabold tracking-wider text-slate-400">
                      FROM
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-[#172536]">
                      {selected.origin_name}
                    </p>
                    {selected.origin_address && (
                      <p className="mt-0.5 text-xs text-slate-500">
                        {selected.origin_address}
                      </p>
                    )}
                  </div>
                </div>
                <div className="my-3.5 ml-1.5 h-5 border-l border-dashed border-slate-300" />
                <div className="flex gap-3">
                  <span className="mt-1 h-3 w-3 shrink-0 rounded-sm bg-[#F28C28]" />
                  <div>
                    <p className="text-[10px] font-extrabold tracking-wider text-slate-400">
                      TO
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-[#172536]">
                      {selected.destination_name}
                    </p>
                    {selected.destination_address && (
                      <p className="mt-0.5 text-xs text-slate-500">
                        {selected.destination_address}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-5">
                <h4 className="mb-3 text-xs font-extrabold tracking-wide text-[#071D49]">
                  🕒 SCHEDULE & LOGISTICS
                </h4>
                {[
                  ["Departure", formatDate(selected.departure_at)],
                  ["Expected arrival", formatDate(selected.expected_arrival_at)],
                  [
                    "Transport",
                    `${getModeEmoji(selected.transport_mode)} ${selected.transport_mode.toUpperCase()}`,
                  ],
                  ["Timezone", selected.departure_timezone],
                  ...(selected.started_at
                    ? [["Started", formatDate(selected.started_at)]]
                    : []),
                  ...(selected.completed_at
                    ? [["Completed", formatDate(selected.completed_at)]]
                    : []),
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0"
                  >
                    <span className="text-xs text-slate-500">{label}</span>
                    <span className="text-right text-xs font-bold text-[#172536]">
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {selected.notes && (
                <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-5">
                  <h4 className="mb-2 text-xs font-extrabold tracking-wide text-[#071D49]">
                    📝 TRAVELLER NOTES
                  </h4>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                    {selected.notes}
                  </p>
                </div>
              )}

              <div className="mt-3">
                <JourneyTravellerGpsPanel
                  journey={selected}
                  onUpdated={updateSelectedGps}
                />
              </div>

              {selected.status === "draft" && (
                <div className="mt-4 space-y-2.5">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void changeStatus(selected, "scheduled")}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#071D49] px-4 py-3 text-sm font-extrabold text-white hover:bg-[#102E6B] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {saving ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Scheduling Journey...
                      </>
                    ) : (
                      "📅 Schedule Journey"
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => openEdit(selected)}
                    className="flex min-h-11 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#071D49] hover:bg-slate-50 disabled:opacity-50"
                  >
                    ✏️ Edit Details
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void changeStatus(selected, "cancelled")}
                    className="w-full p-2.5 text-xs font-bold text-red-600 hover:underline disabled:opacity-50"
                  >
                    🚫 Cancel Journey
                  </button>
                </div>
              )}

              {selected.status === "scheduled" && (
                <div className="mt-4 space-y-2.5">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void changeStatus(selected, "active")}
                    className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    🟢 Start Journey Now
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => openEdit(selected)}
                    className="flex min-h-11 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#071D49] hover:bg-slate-50 disabled:opacity-50"
                  >
                    ✏️ Edit Details
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void changeStatus(selected, "cancelled")}
                    className="w-full p-2.5 text-xs font-bold text-red-600 hover:underline disabled:opacity-50"
                  >
                    🚫 Cancel Journey
                  </button>
                </div>
              )}

              {selected.status === "active" && (
                <div className="mt-4 space-y-2.5">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void changeStatus(selected, "completed")}
                    className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#071D49] px-4 py-3 text-sm font-extrabold text-white hover:bg-[#102E6B] disabled:opacity-50"
                  >
                    🏁 Complete Journey
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void changeStatus(selected, "cancelled")}
                    className="w-full p-2.5 text-xs font-bold text-red-600 hover:underline disabled:opacity-50"
                  >
                    🚫 Cancel Journey
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {walletError && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#061329]/75 p-4 backdrop-blur-md">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="wallet-error-title"
            className="w-full max-w-md overflow-hidden rounded-3xl border border-amber-300/30 bg-white shadow-2xl"
          >
            <div className="bg-gradient-to-br from-[#071D49] via-[#102E6B] to-[#071D49] px-6 py-7 text-center text-white">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-amber-300/30 bg-amber-400/10 text-4xl shadow-lg">
                💳
              </div>
              <h2 id="wallet-error-title" className="mt-4 text-xl font-black tracking-tight">
                Insufficient Wallet Balance
              </h2>
              <p className="mt-2 text-sm font-medium text-slate-200">
                Your wallet needs a little boost
              </p>
            </div>

            <div className="px-6 py-6">
              <p className="text-center text-sm leading-6 text-slate-600">
                Your wallet balance is insufficient to schedule this journey.
                Fund your wallet and try again.
              </p>

              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setWalletError(false);
                    window.location.href = "/dashboard/wallet";
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#071D49] px-5 py-3.5 text-sm font-extrabold text-white shadow-lg transition hover:bg-[#102E6B]"
                >
                  💰 Fund My Wallet
                </button>

                <button
                  type="button"
                  onClick={() => setWalletError(false)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  Close
                </button>
              </div>

              <p className="mt-4 text-center text-xs text-slate-400">
                Your journey details are saved. You can try again after funding.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
