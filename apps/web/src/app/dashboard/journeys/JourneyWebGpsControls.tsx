"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Props = {
  journey: {
    id: string;
    traveller_id: string;
    status: string;
    location_sharing_enabled: boolean;
  };
  onUpdated: (enabled: boolean, consentAt?: string) => void;
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
  const radius = 6371000;
  const lat = radians(b.latitude - a.latitude);
  const lng = radians(b.longitude - a.longitude);
  const value =
    Math.sin(lat / 2) ** 2 +
    Math.cos(radians(a.latitude)) *
      Math.cos(radians(b.latitude)) *
      Math.sin(lng / 2) ** 2;

  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export default function JourneyWebGpsControls({ journey, onUpdated }: Props) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const watchId = useRef<number | null>(null);
  const lastUpload = useRef<{ at: number; coordinates: Coordinates } | null>(null);
  const mounted = useRef(true);

  const [sharingEnabled, setSharingEnabled] = useState(
    journey.location_sharing_enabled,
  );
  const [tracking, setTracking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setSharingEnabled(journey.location_sharing_enabled);
  }, [journey.location_sharing_enabled]);

  const stopWatch = useCallback(() => {
    if (watchId.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    lastUpload.current = null;
    if (mounted.current) setTracking(false);
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (watchId.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  const uploadPosition = useCallback(
    async (coordinates: Coordinates) => {
      const now = Date.now();
      const previous = lastUpload.current;

      if (
        previous &&
        now - previous.at < 15000 &&
        distanceInMetres(previous.coordinates, coordinates) < 25
      ) {
        return;
      }

      const { error } = await supabase
        .from("journey_location_updates")
        .insert({
          journey_id: journey.id,
          traveller_id: journey.traveller_id,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          accuracy_meters: coordinates.accuracy,
          speed_meters_per_second: coordinates.speed,
          heading_degrees: coordinates.heading,
          recorded_at: new Date().toISOString(),
        });

      if (!mounted.current) return;

      if (error) {
        setMessage("GPS is running, but the latest location could not be sent. Check your connection.");
        return;
      }

      lastUpload.current = { at: now, coordinates };
      setMessage("Your latest location has been shared successfully.");
    },
    [journey.id, journey.traveller_id, supabase],
  );

  const startWatch = useCallback(
    (position: GeolocationPosition) => {
      if (!navigator.geolocation) {
        setMessage("Location services are not supported by this browser.");
        return;
      }

      const convert = (value: GeolocationPosition): Coordinates => ({
        latitude: value.coords.latitude,
        longitude: value.coords.longitude,
        accuracy: value.coords.accuracy ?? null,
        speed: value.coords.speed ?? null,
        heading: value.coords.heading ?? null,
      });

      void uploadPosition(convert(position));

      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }

      watchId.current = navigator.geolocation.watchPosition(
        (next) => void uploadPosition(convert(next)),
        (error) => {
          if (!mounted.current) return;
          setMessage(
            error.code === error.PERMISSION_DENIED
              ? "Location permission was denied. Allow location access in your browser settings."
              : "Unable to obtain your latest location. Check your device location services.",
          );
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 20000,
        },
      );

      setTracking(true);
    },
    [uploadPosition],
  );

  const getPosition = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!window.isSecureContext) {
        reject(new Error("GPS sharing requires HTTPS or localhost."));
        return;
      }

      if (!navigator.geolocation) {
        reject(new Error("This browser does not support location sharing."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        (error) => {
          reject(
            new Error(
              error.code === error.PERMISSION_DENIED
                ? "Location permission was denied. Enable location access for this website."
                : error.code === error.TIMEOUT
                  ? "The location request timed out. Check your device location services."
                  : "Your current location could not be obtained. Check device location services.",
            ),
          );
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
      );
    });
  }, []);

  async function enableSharing() {
    if (
      !window.confirm(
        "Enable GPS location sharing for this active journey? Your live location will be sent to TSC for journey monitoring. You can turn sharing off at any time.",
      )
    ) return;

    setBusy(true);
    setMessage("");

    try {
      const position = await getPosition();
      const consentAt = new Date().toISOString();

      const { error } = await supabase
        .from("journeys")
        .update({
          location_sharing_enabled: true,
          location_sharing_consent_at: consentAt,
        })
        .eq("id", journey.id)
        .eq("traveller_id", journey.traveller_id);

      if (error) throw new Error(error.message);

      setSharingEnabled(true);
      startWatch(position);
      onUpdated(true, consentAt);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "GPS sharing could not be enabled.");
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  async function resumeSharing() {
    setBusy(true);
    setMessage("");

    try {
      const position = await getPosition();
      startWatch(position);
      setMessage("GPS tracking has resumed for this journey.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "GPS tracking could not resume.");
    } finally {
      if (mounted.current) setBusy(false);
    }
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

    stopWatch();
    setSharingEnabled(false);
    setMessage("Location sharing has been turned off.");
    onUpdated(false);
    setBusy(false);
  }

  if (journey.status !== "active") return null;

  return (
    <section className="tsc-web-gps-panel" aria-label="Journey GPS location sharing">
      <div className="tsc-web-gps-heading">
        <div>
          <span className="tsc-web-gps-eyebrow">LIVE JOURNEY SAFETY</span>
          <h3>GPS location sharing</h3>
          <p>
            {sharingEnabled
              ? tracking
                ? "Your location is being shared while this page remains open."
                : "Location sharing is enabled. Resume GPS tracking on this browser."
              : "Share your live location during this active journey."}
          </p>
        </div>
        <span className={`tsc-web-gps-indicator ${tracking ? "is-live" : ""}`}>
          <span />
          {tracking ? "TRACKING" : sharingEnabled ? "ENABLED" : "OFF"}
        </span>
      </div>

      <div className="tsc-web-gps-actions">
        {!sharingEnabled ? (
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
          <>
            <button
              type="button"
              className="tsc-button tsc-button-primary"
              disabled={busy}
              onClick={() => void resumeSharing()}
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
          </>
        )}
      </div>

      {message && <p className="tsc-web-gps-message" role="status">{message}</p>}

      <p className="tsc-web-gps-footnote">
        Keep this journey screen open and your device location enabled during travel.
        You can stop sharing at any time.
      </p>
    </section>
  );
}
