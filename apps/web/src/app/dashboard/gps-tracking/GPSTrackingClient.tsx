"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import JourneyTravellerGpsPanel from "../journeys/JourneyTravellerGpsPanel";

type Journey = {
  id: string;
  traveller_id: string;
  journey_name: string;
  status: string;
  location_sharing_enabled: boolean;
};

type Props = {
  travellerId: string;
  travellerName: string;
};

export default function GPSTrackingClient({
  travellerId,
  travellerName,
}: Props) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadJourneys = useCallback(async () => {
    setError("");

    const { data, error: queryError } = await supabase
      .from("journeys")
      .select(
        "id, traveller_id, journey_name, status, location_sharing_enabled"
      )
      .eq("traveller_id", travellerId)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (queryError) {
      setError("Your active journeys could not be loaded. Please try again.");
      setLoading(false);
      return;
    }

    setJourneys((data ?? []) as Journey[]);
    setLoading(false);
  }, [supabase, travellerId]);

  useEffect(() => {
    void loadJourneys();
  }, [loadJourneys]);

  const sharingCount = journeys.filter(
    (journey) => journey.location_sharing_enabled
  ).length;

  function updateJourney(
    journeyId: string,
    enabled: boolean
  ) {
    setJourneys((current) =>
      current.map((journey) =>
        journey.id === journeyId
          ? { ...journey, location_sharing_enabled: enabled }
          : journey
      )
    );
  }

  return (
    <main className="tsc-workspace">
      <header className="tsc-workspace-header">
        <Link href="/dashboard" className="tsc-back-link">
          ← Dashboard
        </Link>
        <span className="tsc-eyebrow">TRAVELLER SAFETY MONITORING</span>
        <h1>GPS tracking</h1>
        <p>
          Welcome, {travellerName}. Manage location sharing and view the
          recorded GPS positions for your active journeys.
        </p>
        <div className="tsc-header-actions">
          <Link
            className="tsc-button tsc-button-light"
            href="/dashboard/journeys"
          >
            Manage journeys
          </Link>
          <button
            className="tsc-button tsc-button-primary"
            type="button"
            onClick={() => {
              setLoading(true);
              void loadJourneys();
            }}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </header>

      <section className="tsc-stat-grid" aria-label="GPS tracking summary">
        <div className="tsc-stat-card">
          <span>Active journeys</span>
          <strong>{journeys.length}</strong>
        </div>
        <div className="tsc-stat-card">
          <span>Sharing location</span>
          <strong>{sharingCount}</strong>
        </div>
        <div className="tsc-stat-card">
          <span>Sharing disabled</span>
          <strong>{journeys.length - sharingCount}</strong>
        </div>
      </section>

      {error && (
        <p className="tsc-message tsc-message-error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <section className="tsc-panel">
          <p>Loading your active journeys...</p>
        </section>
      ) : journeys.length === 0 ? (
        <section className="tsc-panel">
          <span className="tsc-eyebrow">NO ACTIVE JOURNEYS</span>
          <h2>GPS tracking is available during an active journey</h2>
          <p>
            Plan a journey and start it before enabling GPS location sharing.
            You can then return here to manage sharing and view recorded
            positions.
          </p>
          <Link
            className="tsc-button tsc-button-primary"
            href="/dashboard/journeys"
          >
            Open journey management
          </Link>
        </section>
      ) : (
        <div className="tsc-panel-stack">
          {journeys.map((journey) => (
            <section className="tsc-panel" key={journey.id}>
              <div className="tsc-panel-heading">
                <div>
                  <span className="tsc-eyebrow">ACTIVE JOURNEY</span>
                  <h2>{journey.journey_name || "Untitled journey"}</h2>
                  <p>
                    {journey.location_sharing_enabled
                      ? "Location sharing is enabled for this journey."
                      : "Location sharing is currently turned off."}
                  </p>
                </div>
              </div>

              <JourneyTravellerGpsPanel
                journey={journey}
                onUpdated={(enabled) => updateJourney(journey.id, enabled)}
              />
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
