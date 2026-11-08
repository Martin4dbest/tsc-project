"use client";

import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { LiveGpsJourneyRecord } from "./journey-actions";

type Props = {
  journey: LiveGpsJourneyRecord;
};

function MapFocus({ latitude, longitude }: {
  latitude: number;
  longitude: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.flyTo([latitude, longitude], Math.max(map.getZoom(), 13), {
      duration: 0.8,
    });
  }, [map, latitude, longitude]);

  return null;
}

function formatRecordedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function LiveGpsMap({ journey }: Props) {
  const locations = journey.locations.filter(
    (point) =>
      Number.isFinite(point.latitude) &&
      Number.isFinite(point.longitude) &&
      point.latitude >= -90 &&
      point.latitude <= 90 &&
      point.longitude >= -180 &&
      point.longitude <= 180
  );

  if (locations.length === 0) {
    return (
      <div className="live-gps-map-loading">
        No valid GPS coordinates are available for this journey.
      </div>
    );
  }

  const latest = locations[locations.length - 1];
  const route: [number, number][] = locations.map((point) => [
    point.latitude,
    point.longitude,
  ]);

  const currentIcon = L.divIcon({
    className: "tsc-gps-marker-shell",
    html: '<span class="tsc-gps-marker"><i></i></span>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

  return (
    <div className="live-gps-map-canvas">
      <MapContainer
        key={journey.id}
        center={[latest.latitude, latest.longitude]}
        zoom={13}
        scrollWheelZoom
        className="live-gps-leaflet-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapFocus
          latitude={latest.latitude}
          longitude={latest.longitude}
        />

        {route.length > 1 && (
          <Polyline
            positions={route}
            pathOptions={{
              color: "#e87924",
              weight: 5,
              opacity: 0.82,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        )}

        {locations.slice(0, -1).map((point, index) => (
          <CircleMarker
            key={point.id}
            center={[point.latitude, point.longitude]}
            radius={5}
            pathOptions={{
              color: "#ffffff",
              weight: 2,
              fillColor: "#173b67",
              fillOpacity: 0.9,
            }}
          >
            <Popup>
              <strong>Recorded position</strong>
              <br />
              {formatRecordedAt(point.recorded_at)}
              <br />
              Point {index + 1} of {locations.length}
            </Popup>
          </CircleMarker>
        ))}

        <Marker
          position={[latest.latitude, latest.longitude]}
          icon={currentIcon}
        >
          <Popup>
            <strong>{journey.traveller_name}</strong>
            <br />
            {journey.journey_name || "Active journey"}
            <br />
            Latest recorded position
            <br />
            {formatRecordedAt(latest.recorded_at)}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
