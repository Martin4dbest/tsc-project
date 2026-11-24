"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import JourneyTravellerGpsPanel from "../journeys/JourneyTravellerGpsPanel";

type Journey = {
  id: string;
  traveller_id: string;
  journey_name: string;
  origin_name?: string | null;
  destination_name?: string | null;
  status: string;
  location_sharing_enabled: boolean;
  started_at?: string | null;
};

type LocationUpdate = {
  id: string;
  latitude: number;
  longitude: number;
  accuracy_meters: number | null;
  speed_meters_per_second: number | null;
  heading_degrees: number | null;
  recorded_at: string;
};

type Props = {
  travellerId: string;
  travellerName: string;
};

function formatTime(value: string | null | undefined) {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDistance(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "Not available";
  return `${Math.round(value)} m`;
}

export default function GPSTrackingClient({
  travellerId,
  travellerName,
}: Props) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(
    null
  );
  const [updates, setUpdates] = useState<LocationUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [trackingMessage, setTrackingMessage] = useState("");

  const loadTrackingData = useCallback(
    async (quiet = false) => {
      if (quiet) setRefreshing(true);
      else setLoading(true);

      setError("");

      try {
        const { data: journeyData, error: journeyError } = await supabase
          .from("journeys")
          .select(
            "id, traveller_id, journey_name, origin_name, destination_name, status, location_sharing_enabled, started_at"
          )
          .eq("traveller_id", travellerId)
          .order("departure_at", { ascending: false });

        if (journeyError) throw journeyError;

        const availableJourneys = (journeyData ?? []) as Journey[];
        setJourneys(availableJourneys);

        const chosenJourney =
          availableJourneys.find((item) => item.id === selectedJourneyId) ??
          availableJourneys.find(
            (item) => item.status === "active" && item.location_sharing_enabled
          ) ??
          availableJourneys.find((item) => item.status === "active") ??
          availableJourneys.find((item) => item.location_sharing_enabled) ??
          availableJourneys[0] ??
          null;

        setSelectedJourneyId(chosenJourney?.id ?? null);

        if (!chosenJourney) {
          setUpdates([]);
          return;
        }

        const { data: locationData, error: locationError } = await supabase
          .from("journey_location_updates")
          .select(
            "id, latitude, longitude, accuracy_meters, speed_meters_per_second, heading_degrees, recorded_at"
          )
          .eq("journey_id", chosenJourney.id)
          .eq("traveller_id", travellerId)
          .order("recorded_at", { ascending: false })
          .limit(100);

        if (locationError) throw locationError;

        setUpdates(((locationData ?? []) as LocationUpdate[]).reverse());
      } catch {
        setError(
          "We could not load your GPS tracking information. Please try again."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [supabase, travellerId, selectedJourneyId]
  );

  useEffect(() => {
    void loadTrackingData();

    const refreshInterval = setInterval(() => {
      void loadTrackingData(true);
    }, 15000);

    return () => clearInterval(refreshInterval);
  }, [loadTrackingData]);

  const journey =
    journeys.find((item) => item.id === selectedJourneyId) ?? null;

  // Watch foreground GPS while this page is open for an active journey with sharing ON
  useEffect(() => {
    if (
      !journey ||
      journey.status !== "active" ||
      !journey.location_sharing_enabled ||
      typeof navigator === "undefined" ||
      !navigator.geolocation
    ) {
      setTrackingMessage("");
      return;
    }

    let active = true;

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        if (!active) return;

        const { error: insertError } = await supabase
          .from("journey_location_updates")
          .insert({
            journey_id: journey.id,
            traveller_id: travellerId,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy_meters: Number.isFinite(position.coords.accuracy)
              ? position.coords.accuracy
              : null,
            altitude_meters: Number.isFinite(position.coords.altitude)
              ? position.coords.altitude
              : null,
            speed_meters_per_second: Number.isFinite(position.coords.speed)
              ? position.coords.speed
              : null,
            heading_degrees: Number.isFinite(position.coords.heading)
              ? position.coords.heading
              : null,
            recorded_at: new Date(position.timestamp).toISOString(),
          });

        if (!insertError && active) {
          setTrackingMessage(
            "Your consented GPS location is being updated while this screen is open."
          );
          void loadTrackingData(true);
        }
      },
      () => {
        if (active) {
          setTrackingMessage(
            "GPS monitoring is active while TSC remains open on this screen."
          );
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 15000,
      }
    );

    setTrackingMessage(
      "GPS monitoring is active while TSC remains open on this screen."
    );

    return () => {
      active = false;
      navigator.geolocation.clearWatch(watchId);
    };
  }, [
    journey?.id,
    journey?.status,
    journey?.location_sharing_enabled,
    supabase,
    travellerId,
    loadTrackingData,
  ]);

  function handleSharingUpdated(journeyId: string, enabled: boolean) {
    setJourneys((current) =>
      current.map((item) =>
        item.id === journeyId
          ? { ...item, location_sharing_enabled: enabled }
          : item
      )
    );
  }

  const latest = updates.length ? updates[updates.length - 1] : null;
  const isStale = latest
    ? Date.now() - new Date(latest.recorded_at).getTime() > 60000
    : true;

  const mapEmbedUrl = latest
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${(
        latest.longitude - 0.012
      ).toFixed(5)}%2C${(latest.latitude - 0.012).toFixed(5)}%2C${(
        latest.longitude + 0.012
      ).toFixed(5)}%2C${(latest.latitude + 0.012).toFixed(
        5
      )}&layer=mapnik&marker=${latest.latitude.toFixed(
        5
      )}%2C${latest.longitude.toFixed(5)}`
    : null;

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center bg-[#F4F6F9] px-4">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-[#F28C28]" />
        <p className="mt-3 text-xs font-medium text-[#687789]">
          Loading GPS tracking...
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl bg-[#F4F6F9] pb-10 text-[#172536] sm:max-w-4xl">
      {/* Top Bar (matches mobile header) */}
      <header className="sticky top-0 z-20 flex min-h-[70px] items-center justify-between gap-3 border-b border-[#E2E7EE] bg-white px-4 sm:rounded-t-2xl sm:px-6">
        <Link
          href="/dashboard"
          aria-label="Go back"
          className="flex h-[39px] w-[39px] shrink-0 items-center justify-center rounded-xl bg-[#F0F3F7] text-lg font-bold text-[#071D49] transition hover:bg-slate-200"
        >
          ←
        </Link>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-extrabold text-[#071D49]">
            GPS Tracking
          </h1>
          <p className="truncate text-[11px] text-[#687789]">
            Your journey location and movement{travellerName ? ` · ${travellerName}` : ""}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadTrackingData(true)}
          disabled={refreshing}
          aria-label="Refresh GPS tracking"
          className="flex h-[39px] w-[39px] shrink-0 items-center justify-center rounded-xl bg-[#FFF2E5] text-base font-extrabold text-[#071D49] transition hover:bg-orange-100 disabled:opacity-50"
        >
          {refreshing ? "…" : "↻"}
        </button>
      </header>

      <div className="px-4 pt-4 sm:px-6">
        {!!error && (
          <div
            role="alert"
            className="mb-3.5 flex items-center justify-between gap-2 rounded-xl border border-[#F0D5D5] bg-[#FFF3F3] p-3 text-xs text-[#A12B2B]"
          >
            <span>⚠️ {error}</span>
            <button
              type="button"
              onClick={() => void loadTrackingData()}
              className="font-extrabold text-[#A12B2B] hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {!journey ? (
          <section className="mt-4 flex flex-col items-center rounded-2xl border border-[#E2E7EE] bg-white p-6 text-center">
            <div className="mb-4 flex h-[68px] w-[68px] items-center justify-center rounded-[22px] bg-[#FFF2E5] text-3xl text-[#F28C28]">
              🗺️
            </div>
            <h2 className="text-base font-extrabold text-[#071D49]">
              No journey to display
            </h2>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-[#687789]">
              Create a journey in Journey Management, start it, and enable GPS
              sharing to see your location here.
            </p>
            <Link
              href="/dashboard/journeys"
              className="mt-5 inline-flex min-h-[45px] items-center justify-center gap-2 rounded-xl bg-[#071D49] px-5 text-xs font-extrabold text-white transition hover:bg-[#103568]"
            >
              <span>🧭</span>
              <span>Open Journey Management</span>
            </Link>
          </section>
        ) : (
          <div className="space-y-4">
            {/* Journey switcher when multiple journeys exist */}
            {journeys.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {journeys.map((item) => {
                  const isSelected = item.id === journey.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedJourneyId(item.id)}
                      className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold transition ${
                        isSelected
                          ? "border-[#071D49] bg-[#071D49] text-white"
                          : "border-[#E2E7EE] bg-white text-[#172536] hover:border-[#F28C28]"
                      }`}
                    >
                      {item.journey_name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Selected Journey Card */}
            <section className="rounded-2xl border border-[#E2E7EE] bg-white p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF2E5] text-lg text-[#F28C28]">
                  ✈️
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] font-extrabold tracking-wider text-[#687789]">
                    SELECTED JOURNEY
                  </span>
                  <h2 className="truncate text-sm font-extrabold text-[#071D49]">
                    {journey.journey_name}
                  </h2>
                </div>
                <span
                  className={`rounded-md px-2 py-1 text-[9px] font-extrabold ${
                    journey.status === "active"
                      ? "bg-[#E8F5EE] text-[#16845B]"
                      : "bg-[#EDF1F5] text-[#687789]"
                  }`}
                >
                  {journey.status.toUpperCase()}
                </span>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  <span className="text-xs text-[#16845B]">◉</span>
                  <span className="truncate text-xs font-semibold text-[#172536]">
                    {journey.origin_name || "Origin"}
                  </span>
                </div>
                <span className="hidden text-xs text-[#687789] sm:inline">
                  →
                </span>
                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  <span className="text-xs text-[#F28C28]">📍</span>
                  <span className="truncate text-xs font-semibold text-[#172536]">
                    {journey.destination_name || "Destination"}
                  </span>
                </div>
              </div>

              <div className="mt-3.5 flex items-center justify-between border-t border-[#E2E7EE] pt-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      journey.location_sharing_enabled
                        ? "bg-[#16845B]"
                        : "bg-[#9AA5B1]"
                    }`}
                  />
                  <span className="text-xs font-bold text-[#172536]">
                    GPS sharing {journey.location_sharing_enabled ? "ON" : "OFF"}
                  </span>
                </div>

                <Link
                  href="/dashboard/journeys"
                  className="text-xs font-extrabold text-[#F28C28] hover:underline"
                >
                  Manage
                </Link>
              </div>

              <div className="mt-3 border-t border-[#E2E7EE] pt-3">
                <JourneyTravellerGpsPanel
                  journey={journey}
                  onUpdated={(enabled) =>
                    handleSharingUpdated(journey.id, enabled)
                  }
                />
              </div>
            </section>

            {/* Location Map */}
            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-[#071D49]">
                  Location map
                </h2>
                <span className="text-[9px] font-extrabold tracking-wider text-[#687789]">
                  {latest ? "LAST RECORDED POSITION" : "AWAITING LOCATION"}
                </span>
              </div>

              <div className="h-[310px] overflow-hidden rounded-2xl border border-[#E2E7EE] bg-[#E8EDF2] sm:h-[360px]">
                {mapEmbedUrl && latest ? (
                  <iframe
                    title="Last recorded GPS location"
                    src={mapEmbedUrl}
                    className="h-full w-full border-0"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                    <span className="text-3xl text-[#9AA5B1]">🗺️</span>
                    <h3 className="mt-3 text-sm font-extrabold text-[#071D49]">
                      {journey.location_sharing_enabled
                        ? "Waiting for your first GPS position"
                        : "GPS sharing is turned off"}
                    </h3>
                    <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-[#687789]">
                      {journey.location_sharing_enabled
                        ? "Keep TSC open while GPS obtains and records your location."
                        : "Enable GPS sharing from your journey details to begin recording your route."}
                    </p>
                    <Link
                      href="/dashboard/journeys"
                      className="mt-4 inline-flex rounded-xl border border-[#E2E7EE] bg-white px-4 py-2.5 text-xs font-extrabold text-[#071D49] transition hover:border-[#F28C28]"
                    >
                      {journey.location_sharing_enabled
                        ? "Refresh location"
                        : "Open Journey Management"}
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Location Information */}
            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-[#071D49]">
                  Location information
                </h2>
                <span className="text-[9px] font-extrabold tracking-wider text-[#687789]">
                  {updates.length} RECORDED POINT
                  {updates.length === 1 ? "" : "S"}
                </span>
              </div>

              <div className="divide-y divide-[#E2E7EE] rounded-2xl border border-[#E2E7EE] bg-white px-4">
                <div className="flex min-h-[65px] items-center gap-3 py-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF2E5] text-base text-[#F28C28]">
                    🕒
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-[#687789]">
                      Last location update
                    </span>
                    <p className="mt-0.5 text-xs font-bold text-[#071D49]">
                      {latest
                        ? formatTime(latest.recorded_at)
                        : "No location recorded"}
                    </p>
                  </div>
                  {latest && (
                    <span
                      className={`rounded-md px-2 py-1 text-[9px] font-extrabold ${
                        isStale
                          ? "bg-[#FFF2E5] text-[#B56A17]"
                          : "bg-[#E8F5EE] text-[#16845B]"
                      }`}
                    >
                      {isStale ? "STALE" : "RECENT"}
                    </span>
                  )}
                </div>

                <div className="flex min-h-[65px] items-center gap-3 py-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF2E5] text-base text-[#F28C28]">
                    ◎
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-[#687789]">
                      GPS accuracy
                    </span>
                    <p className="mt-0.5 text-xs font-bold text-[#071D49]">
                      {latest
                        ? formatDistance(latest.accuracy_meters)
                        : "Not available"}
                    </p>
                  </div>
                </div>

                <div className="flex min-h-[65px] items-center gap-3 py-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF2E5] text-base text-[#F28C28]">
                    🧭
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-[#687789]">
                      Recorded route points
                    </span>
                    <p className="mt-0.5 text-xs font-bold text-[#071D49]">
                      {updates.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {!!trackingMessage && (
              <div className="flex items-start gap-2.5 rounded-xl bg-[#EAF5EF] p-3 text-xs leading-relaxed text-[#286B4E]">
                <span>ⓘ</span>
                <span>{trackingMessage}</span>
              </div>
            )}

            <Link
              href="/dashboard/journeys"
              className="flex min-h-[45px] w-full items-center justify-center gap-2 rounded-xl border border-[#E2E7EE] bg-white px-4 text-xs font-extrabold text-[#071D49] transition hover:border-[#F28C28]"
            >
              <span>💼</span>
              <span>View journey details and GPS consent</span>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}