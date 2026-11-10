"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Props = {
  journey: {
    id: string;
    traveller_id: string;
    status: string;
    location_sharing_enabled: boolean;
  };
  onUpdated: () => void;
};

type Coordinates = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
};

function distanceInMetres(a: Coordinates, b: Coordinates) {
  const radians = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6_371_000;
  const latitudeDifference = radians(b.latitude - a.latitude);
  const longitudeDifference = radians(b.longitude - a.longitude);
  const value =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(radians(a.latitude)) *
      Math.cos(radians(b.latitude)) *
      Math.sin(longitudeDifference / 2) ** 2;

  return earthRadius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export default function JourneyWebGpsControls({
  journey,
  onUpdated,
}: Props) {
  const supabase = createSupabaseBrowserClient();
  const watchId = useRef<number | null>(null);
  const lastUpload = useRef<{ at: number; coordinates: Coordinates } | null>(
    null,
  );
  const mounted = useRef(true);
  const [tracking, setTracking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const stopBrowserWatch = useCallback(() => {
    if (watchId.current !== null && typeof navigator !== "undefined") {
      navigator.geolocation?.clearWatch(watchId.current);
      watchId.current = null;
    }
    lastUpload.current = null;
    if (mounted.current) setTracking(false);
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (watchId.current !== null) {
        navigator.geolocation?.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, []);

  const uploadPosition = useCallback(
    async (coordinates: Coordinates) => {
      const now = Date.now();
      const previous = lastUpload.current;

      if (
        previous &&
        now - previous.at < 15_000 &&
        distanceInMetres(previous.coordinates, coordinates) < 25
      ) {
        return;
      }

      const { error } = await supabase.from("journey_location_updates").insert({
        journey_id: journey.id,
        traveller_id: journey.traveller_id,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        accuracy_meters: coordinates.accuracy,
        speed_meters_per_second: coordinates.speed,
        heading_degrees: coordinates.heading,
        recorded_at: new Date().toISOString(),
      });

      if (error) {
        if (mounted.current) {
          setMessage(
            "GPS is running, but the latest location could not be sent. Check your connection.",
          );
        }
        return;
      }

      lastUpload.current = { at: now, coordinates };
      if (mounted.current) {
        setMessage("Location sharing is active. Your latest position has been sent.");
      }
    },
    [journey.id, journey.traveller_id, supabase],
  );

  const startBrowserWatch = useCallback(
    (initialPosition: GeolocationPosition) => {
      if (!navigator.geolocation) {
        setMessage("Location services are not supported by this browser.");
        return;
      }

      const initial: Coordinates = {
        latitude: initialPosition.coords.latitude,
        longitude: initialPosition.coords.longitude,
        accuracy: initialPosition.coords.accuracy ?? null,
        speed: initialPosition.coords.speed ?? null,
        heading: initialPosition.coords.heading ?? null,
      };

      void uploadPosition(initial);

      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }

      watchId.current = navigator.geolocation.watchPosition(
        (position) => {
          void uploadPosition({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy ?? null,
            speed: position.coords.speed ?? null,
            heading: position.coords.heading ?? null,
          });
        },
        (error) => {
          if (mounted.current) {
            setMessage(
              error.code === error.PERMISSION_DENIED
                ? "Location permission was denied. Allow location access in your browser settings to continue."
                : "Your browser could not obtain a new location. Check device location services.",
            );
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10_000,
          timeout: 20_000,
        },
      );

      setTracking(true);
    },
    [uploadPosition],
  );

  const requestPosition = useCallback(
    (onSuccess: (position: GeolocationPosition) => void) => {
      if (!window.isSecureContext) {
        setMessage("GPS sharing requires HTTPS or localhost.");
        return;
      }

      if (!navigator.geolocation) {
        setMessage("This browser does not support location sharing.");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        onSuccess,
        (error) => {
          setMessage(
            error.code === error.PERMISSION_DENIED
              ? "Location permission was denied. Enable location access for this website in your browser settings."
              : error.code === error.TIMEOUT
                ? "The location request timed out. Check your device location services and try again."
                : "Your current location could not be obtained. Check device location services and try again.",
          );
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 },
      );
    },
    [],
  );

  async function enableSharing() {
    if (!window.confirm(
      "Enable GPS location sharing for this active journey? Your live location will be sent to TSC for journey monitoring. You can turn sharing off at any time.",
    )) return;

    setBusy(true);
    setMessage("");

    requestPosition(async (position) => {
      const { error } = await supabase
        .from("journeys")
        .update({
          location_sharing_enabled: true,
          location_sharing_consent_at: new Date().toISOString(),
        })
        .eq("id", journey.id)
        .eq("traveller_id", journey.traveller_id);

      if (error) {
        setMessage(error.message || "Your location-sharing consent could not be saved.");
        setBusy(false);
        return;
      }

      startBrowserWatch(position);
      setBusy(false);
      onUpdated();
    });

    // The browser location prompt is asynchronous.
    window.setTimeout(() => {
      if (mounted.current) setBusy(false);
    }, 22_000);
  }

  function resumeSharing() {
    setBusy(true);
    setMessage("");
    requestPosition((position) => {
      startBrowserWatch(position);
      setBusy(false);
    });
    window.setTimeout(() => {
      if (mounted.current) setBusy(false);
    }, 22_000);
  }

  async function disableSharing() {
    if (!window.confirm("Turn off GPS location sharing for this journey?")) return;

    setBusy(true);
    setMessage("");

    const { error } = await supabase
      .from("journeys")
      .update({ location_sharing_enabled: false })
      .eq("id", journey.id)
      .eq("traveller_id", journey.traveller_id);

    if (error) {
      setMessage(error.message || "Location sharing could not be turned off.");
      setBusy(false);
      return;
    }

    stopBrowserWatch();
    setBusy(false);
    setMessage("Location sharing has been turned off.");
    onUpdated();
  }

  if (journey.status !== "active") return null;

  return (
    <section
      aria-label="Journey GPS location sharing"
      style={{
        marginTop: 18,
        padding: 16,
        border: "1px solid #dbe3ed",
        borderRadius: 12,
        background: "#f8fafc",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <strong style={{ color: "#102b4e", display: "block" }}>
            GPS location sharing
          </strong>
          <span style={{ color: "#526174", fontSize: 13 }}>
            {journey.location_sharing_enabled
              ? tracking
                ? "Sharing enabled · GPS tracking active"
                : "Sharing enabled · GPS needs to be resumed in this browser"
              : "Off · Your location is not being shared"}
          </span>
        </div>

        {!journey.location_sharing_enabled ? (
          <button
            type="button"
            className="tsc-button tsc-button-primary"
            disabled={busy}
            onClick={() => void enableSharing()}
          >
            {busy ? "Requesting location…" : "Enable GPS sharing"}
          </button>
        ) : tracking ? (
          <button
            type="button"
            className="tsc-button tsc-button-danger"
            disabled={busy}
            onClick={() => void disableSharing()}
          >
            {busy ? "Updating…" : "Turn off sharing"}
          </button>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button
              type="button"
              className="tsc-button tsc-button-primary"
              disabled={busy}
              onClick={resumeSharing}
            >
              {busy ? "Requesting location…" : "Resume GPS sharing"}
            </button>
            <button
              type="button"
              className="tsc-button tsc-button-danger"
              disabled={busy}
              onClick={() => void disableSharing()}
            >
              Turn off sharing
            </button>
          </div>
        )}
      </div>

      {message && (
        <p role="status" style={{ margin: "12px 0 0", color: "#526174", fontSize: 13 }}>
          {message}
        </p>
      )}

      <p style={{ margin: "10px 0 0", color: "#64748b", fontSize: 12 }}>
        GPS updates are sent while this journey page remains open. Keep this page open and your device location enabled during the journey. Sharing can be stopped at any time.
      </p>
    </section>
  );
}
