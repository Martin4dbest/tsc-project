"use client";

import { useState, useMemo } from "react";

type JourneyStatus = "Upcoming" | "Active" | "Completed" | "Cancelled";

interface JourneyRecord {
  id: string;
  mode: string;
  title: string;
  status: JourneyStatus;
  fromCity: string;
  fromAddress?: string;
  toCity: string;
  toAddress?: string;
  departure: string;
  arrival: string;
  note: string;
}

interface JourneyManagementClientProps {
  travellerId: string;
  travellerName: string;
  initialJourneys?: JourneyRecord[];
}

const DEFAULT_JOURNEYS: JourneyRecord[] = [
  {
    id: "jrn-001",
    mode: "ROAD JOURNEY",
    title: "Business trip Abuja",
    status: "Completed",
    fromCity: "Lagos",
    fromAddress: "12 Ajah",
    toCity: "Abuja",
    toAddress: "Wuse Zone 5",
    departure: "Nov 7, 2026, 10:23 AM",
    arrival: "Not specified",
    note: "I am going for a business trip",
  },
  {
    id: "jrn-002",
    mode: "ROAD JOURNEY",
    title: "Short Trip to Lekki",
    status: "Completed",
    fromCity: "Ajah",
    toCity: "Lekki",
    departure: "Nov 7, 2026, 12:36 PM",
    arrival: "Not specified",
    note: "I am going for a meeting",
  },
];

const FILTER_TABS: Array<"All" | JourneyStatus> = [
  "All",
  "Upcoming",
  "Active",
  "Completed",
  "Cancelled",
];

export default function JourneyManagementClient({
  travellerId,
  travellerName,
  initialJourneys = DEFAULT_JOURNEYS,
}: JourneyManagementClientProps) {
  const [journeys, setJourneys] = useState<JourneyRecord[]>(initialJourneys);
  const [activeFilter, setActiveFilter] = useState<"All" | JourneyStatus>("All");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedJourney, setSelectedJourney] = useState<JourneyRecord | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Journey Form State
  const [title, setTitle] = useState("");
  const [fromCity, setFromCity] = useState("");
  const [fromAddress, setFromAddress] = useState("");
  const [toCity, setToCity] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [departure, setDeparture] = useState("");
  const [arrival, setArrival] = useState("");
  const [note, setNote] = useState("");

  const filteredJourneys = useMemo(() => {
    if (activeFilter === "All") return journeys;
    return journeys.filter((item) => item.status === activeFilter);
  }, [journeys, activeFilter]);

  function handleRefresh() {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 450);
  }

  function handleCreateJourney(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !fromCity.trim() || !toCity.trim()) return;

    const newRecord: JourneyRecord = {
      id: `jrn-${Date.now()}`,
      mode: "ROAD JOURNEY",
      title: title.trim(),
      status: "Upcoming",
      fromCity: fromCity.trim(),
      fromAddress: fromAddress.trim() || undefined,
      toCity: toCity.trim(),
      toAddress: toAddress.trim() || undefined,
      departure: departure.trim() || "Scheduled",
      arrival: arrival.trim() || "Not specified",
      note: note.trim() || "Standard protected journey",
    };

    setJourneys((prev) => [newRecord, ...prev]);
    setTitle("");
    setFromCity("");
    setFromAddress("");
    setToCity("");
    setToAddress("");
    setDeparture("");
    setArrival("");
    setNote("");
    setIsModalOpen(false);
    setActiveFilter("All");
  }

  function statusBadgeStyle(status: JourneyStatus) {
    switch (status) {
      case "Completed":
        return "border-emerald-200 bg-emerald-50 text-emerald-700";
      case "Active":
        return "border-blue-200 bg-blue-50 text-[#1D4ED8]";
      case "Upcoming":
        return "border-amber-200 bg-amber-50 text-[#B45309]";
      case "Cancelled":
        return "border-slate-200 bg-slate-100 text-slate-600";
    }
  }

  return (
    <section
      aria-label="Your travel activity"
      data-traveller-id={travellerId}
      className="space-y-6"
    >
      {/* Top Activity Header Bar */}
      <div className="overflow-hidden rounded-2xl border border-[#1D4ED8]/15 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 bg-gradient-to-r from-[#0F2952] to-[#1E3A8A] px-5 py-4 text-white sm:px-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="text-sm">
                📊
              </span>
              <span className="text-xs font-extrabold tracking-[0.16em] text-[#FCD34D] uppercase">
                YOUR TRAVEL ACTIVITY
              </span>
            </div>
            <h2 className="text-lg font-extrabold tracking-tight text-white sm:text-xl">
              Journey history
            </h2>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-sm font-bold text-white backdrop-blur-xs transition-all hover:border-[#F5A623] hover:bg-white/20"
            >
              <span>Refresh</span>
              <span
                aria-hidden="true"
                className={`inline-block transition-transform duration-500 ${
                  isRefreshing ? "rotate-360" : ""
                }`}
              >
                ↻
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#F5A623] px-4 py-2 text-sm font-extrabold text-[#0F2952] shadow-xs transition-colors hover:bg-[#FBBF24]"
            >
              <span>+ Plan Journey</span>
            </button>
          </div>
        </div>

        {/* Filter Pills Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-[#F8FAFD] px-5 py-3.5 sm:px-6">
          <div
            role="tablist"
            aria-label="Filter journeys by status"
            className="flex flex-wrap items-center gap-2"
          >
            {FILTER_TABS.map((tab) => {
              const isSelected = activeFilter === tab;
              const count =
                tab === "All"
                  ? journeys.length
                  : journeys.filter((j) => j.status === tab).length;

              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setActiveFilter(tab)}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-bold transition-all ${
                    isSelected
                      ? "bg-[#0F2952] text-[#F5A623] shadow-2xs"
                      : "border border-slate-200 bg-white text-[#1E3A8A] hover:border-[#1D4ED8]/40 hover:bg-blue-50/50"
                  }`}
                >
                  <span>{tab}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${
                      isSelected
                        ? "bg-[#F5A623]/20 text-[#FCD34D]"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <span className="text-xs font-semibold text-slate-500 sm:text-sm">
            Showing {filteredJourneys.length} of {journeys.length} trips
          </span>
        </div>

        {/* Journey Cards List */}
        <div className="p-5 sm:p-6">
          {filteredJourneys.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/40 p-8 text-center">
              <p className="text-base font-bold text-[#0F2952]">
                No {activeFilter.toLowerCase()} journeys found
              </p>
              <p className="mt-1.5 text-sm text-slate-600">
                Switch filter tabs or plan a new protected journey for{" "}
                {travellerName}.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {filteredJourneys.map((journey) => (
                <article
                  key={journey.id}
                  className="group flex flex-col justify-between rounded-2xl border border-[#1D4ED8]/15 bg-white p-5 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-[#F5A623] hover:shadow-md sm:p-6"
                >
                  <div>
                    {/* Top Row: Mode Tag & Status Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-[#0F2952] px-3 py-1 text-xs font-extrabold tracking-wider text-[#F5A623] uppercase">
                        <span aria-hidden="true">🚘</span>
                        <span>{journey.mode}</span>
                      </span>

                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${statusBadgeStyle(
                          journey.status
                        )}`}
                      >
                        <span aria-hidden="true">
                          {journey.status === "Completed"
                            ? "✅"
                            : journey.status === "Active"
                              ? "🟢"
                              : journey.status === "Upcoming"
                                ? "⏳"
                                : "⚪"}
                        </span>
                        <span>{journey.status}</span>
                      </span>
                    </div>

                    {/* Journey Title */}
                    <h3 className="mt-3.5 text-lg font-extrabold tracking-tight text-[#0F2952] group-hover:text-[#1D4ED8]">
                      {journey.title}
                    </h3>

                    {/* FROM -> TO Visual Route Box */}
                    <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-blue-100 bg-gradient-to-r from-[#F4F8FF] via-white to-[#FFFBEB] p-3.5 sm:grid-cols-2">
                      {/* FROM */}
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold tracking-wider text-[#1D4ED8] uppercase">
                          <span aria-hidden="true">📍</span>
                          <span>FROM</span>
                        </span>
                        <p className="text-sm font-extrabold text-[#0F2952] sm:text-base">
                          {journey.fromCity}
                        </p>
                        {journey.fromAddress && (
                          <p className="text-xs font-medium text-slate-600 sm:text-sm">
                            {journey.fromAddress}
                          </p>
                        )}
                      </div>

                      {/* TO */}
                      <div className="space-y-1 border-t border-blue-100 pt-2.5 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-3.5">
                        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold tracking-wider text-[#B45309] uppercase">
                          <span aria-hidden="true">🏁</span>
                          <span>TO</span>
                        </span>
                        <p className="text-sm font-extrabold text-[#0F2952] sm:text-base">
                          {journey.toCity}
                        </p>
                        {journey.toAddress && (
                          <p className="text-xs font-medium text-slate-600 sm:text-sm">
                            {journey.toAddress}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Departure (GREEN) & Arrival Timestamps */}
                    <div className="mt-4 flex flex-col gap-2.5 text-sm">
                      {/* Green Departure Pill */}
                      <div className="inline-flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/90 px-3.5 py-2 font-bold text-emerald-700">
                        <span aria-hidden="true">🛫</span>
                        <span>Departure:</span>
                        <span className="text-emerald-800">
                          {journey.departure}
                        </span>
                      </div>

                      {/* Arrival Pill */}
                      <div className="inline-flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 px-3.5 py-2 font-semibold text-[#1E3A8A]">
                        <span aria-hidden="true">🛬</span>
                        <span>Arrival:</span>
                        <span className="text-slate-600">
                          {journey.arrival}
                        </span>
                      </div>
                    </div>

                    {/* Trip Purpose / Note */}
                    <div className="mt-3.5 flex items-start gap-2 rounded-xl border border-amber-200/60 bg-amber-50/50 px-3.5 py-2.5 text-sm font-medium text-[#0F2952]">
                      <span aria-hidden="true">📝</span>
                      <span>{journey.note}</span>
                    </div>
                  </div>

                  {/* Card Footer Action */}
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3.5">
                    <span className="text-xs font-semibold text-emerald-700 sm:text-sm">
                      🛡️ TSC Covered
                    </span>

                    <button
                      type="button"
                      onClick={() => setSelectedJourney(journey)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#0F2952] px-4 py-2 text-sm font-extrabold text-[#F5A623] transition-all hover:bg-[#1D4ED8] hover:text-white"
                    >
                      <span>View details</span>
                      <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Safety Advisory Banner */}
          <div
            role="note"
            className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-300/70 bg-gradient-to-r from-amber-50 via-[#FFFBEB] to-blue-50/50 p-4 text-sm text-[#0F2952]"
          >
            <span aria-hidden="true" className="text-lg">
              🚨
            </span>
            <p className="leading-relaxed font-medium text-[#0F2952]">
              <strong className="font-extrabold text-[#B45309]">
                Safety Advisory:
              </strong>{" "}
              TSC journey management supports your travel planning. For
              immediate danger or urgent assistance, contact the appropriate
              local emergency services.
            </p>
          </div>
        </div>
      </div>

      {/* VIEW DETAILS MODAL */}
      {selectedJourney && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={selectedJourney.title}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#06132A]/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#F5A623]/40 bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-[#0F2952] px-5 py-4 text-white">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="text-base">
                  🧭
                </span>
                <h3 className="text-base font-extrabold text-[#F5A623]">
                  {selectedJourney.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJourney(null)}
                className="cursor-pointer rounded-lg bg-white/10 px-2.5 py-1 text-sm font-bold text-white hover:bg-[#F5A623] hover:text-[#0F2952]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 p-5 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-500">Mode</span>
                <span className="font-extrabold text-[#0F2952]">
                  {selectedJourney.mode}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-500">Status</span>
                <span
                  className={`rounded-full border px-3 py-0.5 text-xs font-bold ${statusBadgeStyle(
                    selectedJourney.status
                  )}`}
                >
                  {selectedJourney.status}
                </span>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5">
                <p className="font-bold text-[#1D4ED8]">
                  📍 From: {selectedJourney.fromCity}
                  {selectedJourney.fromAddress
                    ? ` (${selectedJourney.fromAddress})`
                    : ""}
                </p>
                <p className="mt-1.5 font-bold text-[#B45309]">
                  🏁 To: {selectedJourney.toCity}
                  {selectedJourney.toAddress
                    ? ` (${selectedJourney.toAddress})`
                    : ""}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 font-bold text-emerald-700">
                🛫 Departure: {selectedJourney.departure}
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 font-semibold text-[#1E3A8A]">
                🛬 Arrival: {selectedJourney.arrival}
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 text-[#0F2952]">
                <strong className="block text-xs tracking-wider text-[#B45309] uppercase">
                  Trip Purpose
                </strong>
                <p className="mt-1 font-medium">{selectedJourney.note}</p>
              </div>

              <div className="pt-2 text-right">
                <button
                  type="button"
                  onClick={() => setSelectedJourney(null)}
                  className="cursor-pointer rounded-xl bg-[#0F2952] px-4 py-2 text-sm font-extrabold text-[#F5A623] hover:bg-[#1D4ED8] hover:text-white"
                >
                  Close details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PLAN NEW JOURNEY MODAL */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Plan a new journey"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#06132A]/60 p-4 backdrop-blur-xs"
        >
          <form
            onSubmit={handleCreateJourney}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-[#F5A623]/40 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between bg-[#0F2952] px-5 py-4 text-white">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="text-base">
                  ✈️
                </span>
                <h3 className="text-base font-extrabold text-[#F5A623]">
                  Plan New Protected Journey
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="cursor-pointer rounded-lg bg-white/10 px-2.5 py-1 text-sm font-bold text-white hover:bg-[#F5A623] hover:text-[#0F2952]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 p-5 text-sm">
              <div>
                <label className="mb-1 block font-bold text-[#0F2952]">
                  Journey Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Business trip Abuja"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-[#0F2952] focus:border-[#1D4ED8] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-bold text-[#1D4ED8]">
                    From City *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lagos"
                    value={fromCity}
                    onChange={(e) => setFromCity(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-[#0F2952] focus:border-[#1D4ED8] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-bold text-[#1D4ED8]">
                    From Address
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 12 Ajah"
                    value={fromAddress}
                    onChange={(e) => setFromAddress(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-[#0F2952] focus:border-[#1D4ED8] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-bold text-[#B45309]">
                    To City *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Abuja"
                    value={toCity}
                    onChange={(e) => setToCity(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-[#0F2952] focus:border-[#1D4ED8] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-bold text-[#B45309]">
                    To Address
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Wuse Zone 5"
                    value={toAddress}
                    onChange={(e) => setToAddress(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-[#0F2952] focus:border-[#1D4ED8] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-bold text-emerald-700">
                    🛫 Departure
                  </label>
                  <input
                    type="text"
                    placeholder="Nov 7, 2026, 10:23 AM"
                    value={departure}
                    onChange={(e) => setDeparture(e.target.value)}
                    className="w-full rounded-xl border border-emerald-200 bg-emerald-50/40 px-3.5 py-2 text-sm font-semibold text-emerald-800 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-bold text-[#1E3A8A]">
                    🛬 Arrival
                  </label>
                  <input
                    type="text"
                    placeholder="Not specified"
                    value={arrival}
                    onChange={(e) => setArrival(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-[#0F2952] focus:border-[#1D4ED8] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-bold text-[#0F2952]">
                  Purpose / Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. I am going for a business trip"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-[#0F2952] focus:border-[#1D4ED8] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cursor-pointer rounded-xl bg-[#F5A623] px-4 py-2 text-sm font-extrabold text-[#0F2952] shadow-xs hover:bg-[#FBBF24]"
                >
                  Save Journey
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}