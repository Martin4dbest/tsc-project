"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type LiveGpsPoint = {
  id?: string;
  latitude: number;
  longitude: number;
  recorded_at?: string;
  accuracy_meters?: number | null;
};

type LiveGpsMapProps = {
  points?: LiveGpsPoint[];
  latitude?: number | null;
  longitude?: number | null;
  className?: string;
};

export default function LiveGpsMap({
  points = [],
  latitude = null,
  longitude = null,
  className = "live-gps-leaflet-map",
}: LiveGpsMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const normalizedPoints: LiveGpsPoint[] =
    points.length > 0
      ? points.filter(
          (p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude)
        )
      : latitude !== null &&
        longitude !== null &&
        Number.isFinite(latitude) &&
        Number.isFinite(longitude)
      ? [{ latitude, longitude }]
      : [];

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof window === "undefined") return;

    // Prevent "Map container is being reused by another instance"
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const containerWithId = el as HTMLDivElement & { _leaflet_id?: number };
    if (containerWithId._leaflet_id) {
      delete containerWithId._leaflet_id;
    }

    const initialCenter: [number, number] =
      normalizedPoints.length > 0
        ? [
            normalizedPoints[normalizedPoints.length - 1].latitude,
            normalizedPoints[normalizedPoints.length - 1].longitude,
          ]
        : [6.5244, 3.3792];

    const map = L.map(el, {
      center: initialCenter,
      zoom: 14,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    const group = L.layerGroup().addTo(map);

    mapRef.current = map;
    layerGroupRef.current = group;

    return () => {
      group.clearLayers();
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
    // Initialize map instance once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    if (normalizedPoints.length === 0) return;

    const latLngs: L.LatLngExpression[] = normalizedPoints.map((pt) => [
      pt.latitude,
      pt.longitude,
    ]);

    if (latLngs.length > 1) {
      L.polyline(latLngs, {
        color: "#F28C28",
        weight: 4,
      }).addTo(group);
    }

    const latest = normalizedPoints[normalizedPoints.length - 1];
    L.circleMarker([latest.latitude, latest.longitude], {
      radius: 8,
      color: "#071D49",
      weight: 3,
      fillColor: "#F28C28",
      fillOpacity: 1,
    })
      .bindPopup(
        latest.recorded_at
          ? `Last update: ${new Date(latest.recorded_at).toLocaleString()}`
          : "Current location"
      )
      .addTo(group);

    if (latLngs.length > 1) {
      map.fitBounds(L.latLngBounds(latLngs), { padding: [24, 24], maxZoom: 16 });
    } else {
      map.setView([latest.latitude, latest.longitude], 15);
    }
  }, [normalizedPoints]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "100%", minHeight: 260 }}
    />
  );
}