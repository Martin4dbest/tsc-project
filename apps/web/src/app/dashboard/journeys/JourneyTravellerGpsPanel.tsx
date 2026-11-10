"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { LiveGpsJourneyRecord } from "../../admin/journeys/journey-actions";
import JourneyWebGpsControls from "./JourneyWebGpsControls";

const LiveGpsMap = dynamic(
  () => import("../../admin/journeys/LiveGpsMap"),
  {
    ssr: false,
    loading: () => (
      <div className="live-gps-map-loading">Preparing your GPS map...</div>
    ),
  }
);

type Props = {
  journey: {
    id: string;
    traveller_id: string;
    journey_name: string;
    status: string;
    location_sharing_enabled: boolean;
  };
  onUpdated: (enabled: boolean, consentAt?: string) => void;
};

type LocationPoint = {
  id: string;
  journey_id: string;
  traveller_id: string;
  latitude: number;
  longitude: number;
  accuracy_meters: number | null;
  speed_meters_per_second: number | null;
  heading_degrees: number | null;
  recorded_at: string;
};

export default function JourneyTravellerGpsPanel({
  journey,
  onUpdated,
}: Props) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [locations, setLocations] = useState<LocationPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const loadLocations = useCallback(async () => {
    if (!journey.location_sharing_enabled) {
      setLocations([]);
      return;
    }

    setLoading(true);
    setLoadError("");

    const { data, error } = await supabase
      .from("journey_location_updates")
      .select(
        "id, journey_id, traveller_id, latitude, longitude, accuracy_meters, speed_meters_per_second, heading_degrees, recorded_at"
      )
      .eq("journey_id", journey.id)
      .eq("traveller_id", journey.traveller_id)
      .order("recorded_at", { ascending: false })
      .limit(100);

    if (error) {
      setLoadError("Your journey GPS positions could not be loaded.");
      setLoading(false);
      return;
    }

    const points = (data ?? [])
      .map((point) => ({
        ...point,
        latitude: Number(point.latitude),
        longitude: Number(point.longitude),
        accuracy_meters:
          point.accuracy_meters == null
            ? null
            : Number(point.accuracy_meters),
        speed_meters_per_second:
          point.speed_meters_per_second == null
            ? null
            : Number(point.speed_meters_per_second),
        heading_degrees:
          point.heading_degrees == null
            ? null
            : Number(point.heading_degrees),
      }))
      .reverse() as LocationPoint[];

    setLocations(points);
    setLoading(false);
  }, [
    journey.id,
    journey.traveller_id,
    journey.location_sharing_enabled,
    supabase,
  ]);

  useEffect(() => {
    if (!journey.location_sharing_enabled) {
      setLocations([]);
      return;
    }

    void loadLocations();

    const channel = supabase
      .channel(`traveller-journey-gps-${journey.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "journey_location_updates",
          filter: `journey_id=eq.${journey.id}`,
        },
        () => void loadLocations()
      )
      .subscribe();

    // Fallback refresh in case a realtime event is missed.
    const refresh = window.setInterval(() => {
      void loadLocations();
    }, 15000);

    return () => {
      window.clearInterval(refresh);
      void supabase.removeChannel(channel);
    };
  }, [
    journey.id,
    journey.location_sharing_enabled,
    loadLocations,
    supabase,
  ]);

  const mapJourney = {
    ...journey,
    traveller_name: "You",
    traveller_phone: null,
    locations,
  } as unknown as LiveGpsJourneyRecord;

  const latest = locations[locations.length - 1] ?? null;

  return (
    <>
      <JourneyWebGpsControls journey={journey} onUpdated={onUpdated} />

      {journey.location_sharing_enabled && (
        <section className="live-gps-workspace tsc-traveller-gps-map">
          <div className="live-gps-heading">
            <div>
              <span className="journey-section-kicker">
                YOUR JOURNEY LOCATION
              </span>
              <h2>Live GPS map</h2>
              <p>
                View your latest shared position and the route recorded during
                this active journey.
              </p>
            </div>
            <div className="live-gps-summary">
              <span>
                <strong>{locations.length}</strong>
                Recorded positions
              </span>
            </div>
          </div>

          <div className="live-gps-map-column">
            <div className="live-gps-map-toolbar">
              <div>
                <span className="live-gps-map-dot" />
                <strong>
                  {latest ? "Your recorded GPS positions" : "GPS position pending"}
                </strong>
              </div>
              <span>
                {latest
                  ? `Last update: ${new Date(latest.recorded_at).toLocaleTimeString()}`
                  : "Waiting for location"}
              </span>
            </div>

            {loadError ? (
              <div className="live-gps-message live-gps-error" role="alert">
                {loadError}
              </div>
            ) : loading && !latest ? (
              <div className="live-gps-map-loading">
                Loading your journey GPS positions...
              </div>
            ) : latest ? (
              <LiveGpsMap journey={mapJourney} />
            ) : (
              <div className="live-gps-empty">
                <span className="live-gps-empty-icon">⌖</span>
                <div>
                  <strong>Waiting for your first GPS update</strong>
                  <p>
                    Keep this journey open, allow location access and ensure
                    your device location services are enabled. Your position
                    will appear here when the first update is recorded.
                  </p>
                </div>
              </div>
            )}

            {latest && (
              <div className="live-gps-map-legend">
                <span><i className="gps-legend-current" /> Latest position</span>
                <span><i className="gps-legend-route" /> Recorded route</span>
                <span><i className="gps-legend-old" /> Earlier position</span>
              </div>
            )}
          </div>

          {latest && (
            <div className="live-gps-selected-details">
              <div>
                <span>Last recorded</span>
                <strong>{new Date(latest.recorded_at).toLocaleString()}</strong>
              </div>
              <div>
                <span>GPS accuracy</span>
                <strong>
                  {latest.accuracy_meters == null
                    ? "Not available"
                    : `±${Math.round(latest.accuracy_meters)} m`}
                </strong>
              </div>
              <div>
                <span>Coordinates</span>
                <strong>
                  {latest.latitude.toFixed(5)}, {latest.longitude.toFixed(5)}
                </strong>
              </div>
            </div>
          )}
        </section>
      )}
    </>
  );
}
