"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type JourneyStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "completed"
  | "cancelled";

export type JourneyRecord = {
  id: string;
  traveller_id: string;
  journey_name: string;
  origin_name: string;
  origin_address: string | null;
  origin_latitude: number | null;
  origin_longitude: number | null;
  destination_name: string;
  destination_address: string | null;
  destination_latitude: number | null;
  destination_longitude: number | null;
  departure_at: string;
  departure_timezone: string | null;
  expected_arrival_at: string | null;
  arrival_timezone: string | null;
  transport_mode: string;
  status: JourneyStatus;
  notes: string | null;
  location_sharing_enabled: boolean;
  location_sharing_consent_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  traveller_name: string;
  traveller_phone: string | null;
};

export async function getJourneyMonitoringData() {
  const access = await requireAdminPermission("journeys.view");

  if (!access.authorized) {
    return { error: "You do not have permission to view journeys." };
  }

  const admin = createSupabaseAdminClient();

  const { data: journeyRows, error: journeyError } = await admin
    .from("journeys")
    .select("*")
    .order("departure_at", { ascending: false })
    .limit(500);

  if (journeyError) {
    console.error("Journey monitoring load failed:", journeyError);
    return { error: "Unable to load journey records." };
  }

  const journeys = journeyRows ?? [];
  const travellerIds = [
    ...new Set(journeys.map((journey) => journey.traveller_id)),
  ];

  let profiles: {
    user_id: string;
    full_name: string | null;
    phone: string | null;
  }[] = [];

  if (travellerIds.length > 0) {
    const { data: profileRows, error: profileError } = await admin
      .from("profiles")
      .select("user_id, full_name, phone")
      .in("user_id", travellerIds);

    if (profileError) {
      console.error("Journey traveller lookup failed:", profileError);
      return { error: "Unable to load journey traveller details." };
    }

    profiles = profileRows ?? [];
  }

  const profileMap = new Map(
    profiles.map((profile) => [profile.user_id, profile])
  );

  const records: JourneyRecord[] = journeys.map((journey) => {
    const traveller = profileMap.get(journey.traveller_id);

    return {
      ...journey,
      traveller_name: traveller?.full_name || "Unknown traveller",
      traveller_phone: traveller?.phone ?? null,
    } as JourneyRecord;
  });

  return { journeys: records };
}

const ALLOWED_TRANSITIONS: Record<JourneyStatus, JourneyStatus[]> = {
  draft: ["scheduled", "cancelled"],
  scheduled: ["active", "cancelled"],
  active: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export async function updateJourneyStatus(
  journeyId: string,
  newStatus: unknown
) {
  const access = await requireAdminPermission("journeys.manage");

  if (!access.authorized) {
    return { error: "You do not have permission to manage journeys." };
  }

  if (!UUID_PATTERN.test(journeyId)) {
    return { error: "Invalid journey record." };
  }

  const validStatuses: JourneyStatus[] = [
    "draft",
    "scheduled",
    "active",
    "completed",
    "cancelled",
  ];

  if (
    typeof newStatus !== "string" ||
    !validStatuses.includes(newStatus as JourneyStatus)
  ) {
    return { error: "Invalid journey status." };
  }

  const supabase = await createSupabaseServerClient();

  const { data: currentJourney, error: lookupError } = await supabase
    .from("journeys")
    .select("id, status")
    .eq("id", journeyId)
    .single();

  if (lookupError || !currentJourney) {
    return { error: "Journey record could not be found." };
  }

  const currentStatus = currentJourney.status as JourneyStatus;
  const targetStatus = newStatus as JourneyStatus;

  if (!ALLOWED_TRANSITIONS[currentStatus]?.includes(targetStatus)) {
    return {
      error: `A journey cannot be changed from ${currentStatus} to ${targetStatus}.`,
    };
  }

  const { error: updateError } = await supabase
    .from("journeys")
    .update({ status: targetStatus })
    .eq("id", journeyId);

  if (updateError) {
    console.error("Journey status update failed:", updateError);
    return {
      error:
        "Unable to update journey status. Please verify the permitted transition and try again.",
    };
  }

  revalidatePath("/admin/journeys");
  revalidatePath("/admin");

  return { success: true };
}

export type LiveGpsLocation = {
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

export type LiveGpsJourneyRecord = {
  id: string;
  traveller_id: string;
  journey_name: string;
  origin_name: string;
  destination_name: string;
  traveller_name: string;
  traveller_phone: string | null;
  locations: LiveGpsLocation[];
};

export async function getLiveGpsMonitoringData(): Promise<{
  records: LiveGpsJourneyRecord[];
  error?: string;
}> {
  const access = await requireAdminPermission("journeys.view");

  if (!access.authorized) {
    return {
      records: [],
      error: "You do not have permission to view GPS tracking.",
    };
  }

  const admin = createSupabaseAdminClient();

  const { data: journeyRows, error: journeyError } = await admin
    .from("journeys")
    .select(
      "id, traveller_id, journey_name, origin_name, destination_name"
    )
    .eq("status", "active")
    .eq("location_sharing_enabled", true)
    .not("location_sharing_consent_at", "is", null);

  if (journeyError) {
    console.error("Live GPS journey lookup failed:", journeyError);
    return {
      records: [],
      error: "Unable to load consented active GPS journeys.",
    };
  }

  const activeJourneys = journeyRows ?? [];

  if (activeJourneys.length === 0) {
    return { records: [] };
  }

  const journeyIds = activeJourneys.map((journey) => journey.id);
  const travellerIds = [
    ...new Set(activeJourneys.map((journey) => journey.traveller_id)),
  ];

  const [{ data: locationRows, error: locationError }, { data: profileRows, error: profileError }] =
    await Promise.all([
      admin
        .from("journey_location_updates")
        .select(
          "id, journey_id, traveller_id, latitude, longitude, accuracy_meters, speed_meters_per_second, heading_degrees, recorded_at"
        )
        .in("journey_id", journeyIds)
        .order("recorded_at", { ascending: false })
        .limit(2000),
      admin
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", travellerIds),
    ]);

  if (locationError) {
    console.error("Live GPS location lookup failed:", locationError);
    return {
      records: [],
      error: "Unable to load recorded GPS locations.",
    };
  }

  if (profileError) {
    console.error("Live GPS traveller lookup failed:", profileError);
    return {
      records: [],
      error: "Unable to load GPS traveller details.",
    };
  }

  const profileMap = new Map(
    (profileRows ?? []).map((profile) => [profile.user_id, profile])
  );

  const locationMap = new Map<string, LiveGpsLocation[]>();

  for (const location of locationRows ?? []) {
    const points = locationMap.get(location.journey_id) ?? [];

    points.push({
      ...location,
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
      accuracy_meters:
        location.accuracy_meters == null
          ? null
          : Number(location.accuracy_meters),
      speed_meters_per_second:
        location.speed_meters_per_second == null
          ? null
          : Number(location.speed_meters_per_second),
      heading_degrees:
        location.heading_degrees == null
          ? null
          : Number(location.heading_degrees),
    } as LiveGpsLocation);

    locationMap.set(location.journey_id, points);
  }

  const records: LiveGpsJourneyRecord[] = activeJourneys.map((journey) => {
    const traveller = profileMap.get(journey.traveller_id);

    const locations = (locationMap.get(journey.id) ?? [])
      .sort(
        (a, b) =>
          new Date(a.recorded_at).getTime() -
          new Date(b.recorded_at).getTime()
      )
      .slice(-100);

    return {
      ...journey,
      traveller_name: traveller?.full_name || "Unknown traveller",
      traveller_phone: traveller?.phone ?? null,
      locations,
    };
  });

  return { records };
}
