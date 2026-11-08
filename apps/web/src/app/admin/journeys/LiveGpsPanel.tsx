"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { LiveGpsJourneyRecord } from "./journey-actions";

const LiveGpsMap = dynamic(() => import("./LiveGpsMap"), {
  ssr: false,
  loading: () => (
    <div className="live-gps-map-loading">
      Preparing secure GPS map...
    </div>
  ),
});

type Props = {
  records: LiveGpsJourneyRecord[];
  error?: string | null;
};

function getLatestLocation(journey: LiveGpsJourneyRecord) {
  return journey.locations[journey.locations.length - 1] ?? null;
}

function timeAgo(value: string) {
  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) return "Unknown time";

  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;

  return `${Math.floor(seconds / 86400)} days ago`;
}

function isStale(value: string) {
  return Date.now() - new Date(value).getTime() > 60_000;
}

export default function LiveGpsPanel({ records, error }: Props) {
  const journeysWithLocations = useMemo(
    () => records.filter((journey) => journey.locations.length > 0),
    [records]
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedJourney =
    journeysWithLocations.find((journey) => journey.id === selectedId) ??
    journeysWithLocations[0] ??
    null;

  const latest = selectedJourney
    ? getLatestLocation(selectedJourney)
    : null;

  const recentCount = journeysWithLocations.filter((journey) => {
    const point = getLatestLocation(journey);
    return point ? !isStale(point.recorded_at) : false;
  }).length;

  return (
    <section className="live-gps-workspace">
      <div className="live-gps-heading">
        <div>
          <span className="journey-section-kicker">
            GPS TRACKING &amp; LOCATION INTELLIGENCE
          </span>
          <h2>Live traveller map</h2>
          <p>
            View recorded traveller positions and movement history for active
            journeys with location-sharing consent.
          </p>
        </div>

        <div className="live-gps-summary">
          <span>
            <strong>{journeysWithLocations.length}</strong>
            Journeys with GPS records
          </span>
          <span>
            <strong>{recentCount}</strong>
            Updated within 60 seconds
          </span>
        </div>
      </div>

      {error ? (
        <div className="live-gps-message live-gps-error" role="alert">
          <strong>GPS monitoring unavailable</strong>
          <p>{error}</p>
        </div>
      ) : journeysWithLocations.length === 0 ? (
        <div className="live-gps-empty">
          <span className="live-gps-empty-icon">⌖</span>
          <div>
            <strong>No recorded GPS positions available</strong>
            <p>
              The map will display a traveller after an active journey has
              location-sharing consent and at least one GPS position has been
              recorded.
            </p>
          </div>
        </div>
      ) : (
        <div className="live-gps-layout">
          <div className="live-gps-map-column">
            <div className="live-gps-map-toolbar">
              <div>
                <span className="live-gps-map-dot" />
                <strong>Recorded GPS positions</strong>
              </div>
              <span>
                {selectedJourney?.locations.length ?? 0} route points
              </span>
            </div>

            {selectedJourney && (
              <LiveGpsMap journey={selectedJourney} />
            )}

            <div className="live-gps-map-legend">
              <span><i className="gps-legend-current" /> Latest position</span>
              <span><i className="gps-legend-route" /> Recorded route</span>
              <span><i className="gps-legend-old" /> Earlier position</span>
            </div>
          </div>

          <aside className="live-gps-traveller-panel">
            <div className="live-gps-traveller-heading">
              <strong>Tracking list</strong>
              <span>{journeysWithLocations.length} travellers</span>
            </div>

            <div className="live-gps-traveller-list">
              {journeysWithLocations.map((journey) => {
                const point = getLatestLocation(journey);
                if (!point) return null;

                const stale = isStale(point.recorded_at);
                const selected = selectedJourney?.id === journey.id;

                return (
                  <button
                    type="button"
                    key={journey.id}
                    className={
                      selected
                        ? "live-gps-traveller active"
                        : "live-gps-traveller"
                    }
                    onClick={() => setSelectedId(journey.id)}
                  >
                    <span className="live-gps-traveller-avatar">
                      {(journey.traveller_name || "T")
                        .charAt(0)
                        .toUpperCase()}
                    </span>

                    <span className="live-gps-traveller-info">
                      <strong>{journey.traveller_name}</strong>
                      <small>{journey.journey_name || "Active journey"}</small>
                      <small>
                        {journey.origin_name} → {journey.destination_name}
                      </small>
                      <span
                        className={
                          stale
                            ? "live-gps-freshness stale"
                            : "live-gps-freshness"
                        }
                      >
                        <i />
                        {stale ? "Stale position" : "Recently updated"} ·{" "}
                        {timeAgo(point.recorded_at)}
                      </span>
                    </span>
                    <span className="live-gps-select-arrow">›</span>
                  </button>
                );
              })}
            </div>

            {selectedJourney && latest && (
              <div className="live-gps-selected-details">
                <span className="journey-section-kicker">
                  SELECTED TRAVELLER
                </span>
                <strong>{selectedJourney.traveller_name}</strong>
                <p>
                  {selectedJourney.traveller_phone || "No contact number"}
                </p>
                <div>
                  <span>Last recorded</span>
                  <strong>{timeAgo(latest.recorded_at)}</strong>
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
                  <span>Speed</span>
                  <strong>
                    {latest.speed_meters_per_second == null
                      ? "Not available"
                      : `${(
                          latest.speed_meters_per_second * 3.6
                        ).toFixed(1)} km/h`}
                  </strong>
                </div>
                <div>
                  <span>Coordinates</span>
                  <strong>
                    {latest.latitude.toFixed(5)},{" "}
                    {latest.longitude.toFixed(5)}
                  </strong>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}

      <p className="live-gps-disclaimer">
        Location information is displayed only for active journeys with
        recorded traveller consent. A recent position is not a guarantee of
        continuous or uninterrupted GPS connectivity.
      </p>
    </section>
  );
}
