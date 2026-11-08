"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type EmergencyStatus =
  | "reported"
  | "acknowledged"
  | "assigned"
  | "responding"
  | "resolved"
  | "cancelled";

export type EmergencySeverity = "low" | "moderate" | "high" | "critical";

export type EmergencyCategory =
  | "medical"
  | "accident"
  | "security"
  | "natural_disaster"
  | "transport"
  | "other";

export type EmergencyRecord = {
  id: string;
  traveller_id: string;
  journey_id: string | null;
  category: EmergencyCategory;
  severity: EmergencySeverity;
  status: EmergencyStatus;
  title: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  location_accuracy_meters: number | null;
  location_address: string | null;
  assigned_responder_id: string | null;
  reported_at: string;
  acknowledged_at: string | null;
  assigned_at: string | null;
  responding_at: string | null;
  resolved_at: string | null;
  cancelled_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  traveller_name: string;
  traveller_phone: string | null;
  responder_name: string | null;
  responder_phone: string | null;
  journey_name: string | null;
};

export type EmergencyResponder = {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  role: "admin" | "super_admin";
};

export type EmergencyActivity = {
  id: string;
  emergency_id: string;
  actor_user_id: string | null;
  event_type: string;
  details: Record<string, unknown>;
  created_at: string;
  actor_name: string;
};

export async function getEmergencyMonitoringData(): Promise<{
  records: EmergencyRecord[];
  error?: string;
}> {
  const access = await requireAdminPermission("emergencies.view");

  if (!access.authorized) {
    return {
      records: [],
      error: "You do not have permission to view emergency reports.",
    };
  }

  const admin = createSupabaseAdminClient();

  const { data: emergencyRows, error } = await admin
    .from("emergency_alerts")
    .select("*")
    .order("reported_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("Emergency monitoring load failed:", error);
    return {
      records: [],
      error: "Unable to load emergency reports.",
    };
  }

  const emergencies = emergencyRows ?? [];

  if (emergencies.length === 0) {
    return { records: [] };
  }

  const profileIds = [
    ...new Set(
      emergencies.flatMap((item) =>
        [item.traveller_id, item.assigned_responder_id].filter(
          (id): id is string => Boolean(id)
        )
      )
    ),
  ];

  const journeyIds = [
    ...new Set(
      emergencies
        .map((item) => item.journey_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const [{ data: profiles, error: profileError }, { data: journeys, error: journeyError }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", profileIds),
      journeyIds.length > 0
        ? admin
            .from("journeys")
            .select("id, journey_name")
            .in("id", journeyIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (profileError || journeyError) {
    console.error("Emergency related records lookup failed:", {
      profileError,
      journeyError,
    });

    return {
      records: [],
      error: "Unable to load emergency traveller or journey details.",
    };
  }

  const profileMap = new Map(
    (profiles ?? []).map((profile) => [profile.user_id, profile])
  );

  const journeyMap = new Map(
    (journeys ?? []).map((journey) => [journey.id, journey.journey_name])
  );

  const records: EmergencyRecord[] = emergencies.map((item) => {
    const traveller = profileMap.get(item.traveller_id);
    const responder = item.assigned_responder_id
      ? profileMap.get(item.assigned_responder_id)
      : null;

    return {
      ...item,
      latitude: item.latitude == null ? null : Number(item.latitude),
      longitude: item.longitude == null ? null : Number(item.longitude),
      location_accuracy_meters:
        item.location_accuracy_meters == null
          ? null
          : Number(item.location_accuracy_meters),
      traveller_name: traveller?.full_name || "Unknown traveller",
      traveller_phone: traveller?.phone ?? null,
      responder_name: responder?.full_name ?? null,
      responder_phone: responder?.phone ?? null,
      journey_name: item.journey_id
        ? journeyMap.get(item.journey_id) ?? null
        : null,
    } as EmergencyRecord;
  });

  return { records };
}

export async function getEmergencyResponders(): Promise<{
  responders: EmergencyResponder[];
  error?: string;
}> {
  const access = await requireAdminPermission("emergencies.manage");

  if (!access.authorized) {
    return {
      responders: [],
      error: "You do not have permission to assign responders.",
    };
  }

  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("profiles")
    .select("user_id, full_name, phone, role")
    .eq("account_status", "active")
    .in("role", ["admin", "super_admin"])
    .order("full_name", { ascending: true });

  if (error) {
    console.error("Emergency responder lookup failed:", error);
    return {
      responders: [],
      error: "Unable to load active responders.",
    };
  }

  return {
    responders: (data ?? []) as EmergencyResponder[],
  };
}

export async function getEmergencyActivity(
  emergencyId: string
): Promise<{
  activities: EmergencyActivity[];
  error?: string;
}> {
  const access = await requireAdminPermission("emergencies.view");

  if (!access.authorized) {
    return {
      activities: [],
      error: "You do not have permission to view emergency activity.",
    };
  }

  if (!UUID_PATTERN.test(emergencyId)) {
    return { activities: [], error: "Invalid emergency report." };
  }

  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("emergency_activity_logs")
    .select("*")
    .eq("emergency_id", emergencyId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Emergency activity lookup failed:", error);
    return {
      activities: [],
      error: "Unable to load emergency activity history.",
    };
  }

  const activities = data ?? [];
  const actorIds = [
    ...new Set(
      activities
        .map((item) => item.actor_user_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  let actorMap = new Map<string, string>();

  if (actorIds.length > 0) {
    const { data: actors, error: actorError } = await admin
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", actorIds);

    if (actorError) {
      console.error("Emergency activity actor lookup failed:", actorError);
      return {
        activities: [],
        error: "Unable to load activity user details.",
      };
    }

    actorMap = new Map(
      (actors ?? []).map((actor) => [
        actor.user_id,
        actor.full_name || "Administrator",
      ])
    );
  }

  return {
    activities: activities.map((item) => ({
      ...item,
      details: (item.details ?? {}) as Record<string, unknown>,
      actor_name: item.actor_user_id
        ? actorMap.get(item.actor_user_id) ?? "Administrator"
        : "System",
    })) as EmergencyActivity[],
  };
}

const ALLOWED_TRANSITIONS: Record<EmergencyStatus, EmergencyStatus[]> = {
  reported: ["acknowledged", "cancelled"],
  acknowledged: ["assigned", "responding", "resolved"],
  assigned: ["responding", "resolved"],
  responding: ["resolved", "assigned"],
  resolved: [],
  cancelled: [],
};

export async function updateEmergencyStatus(
  emergencyId: string,
  newStatus: unknown,
  resolutionNotes?: unknown
) {
  const access = await requireAdminPermission("emergencies.manage");

  if (!access.authorized) {
    return {
      error: "You do not have permission to manage emergency reports.",
    };
  }

  if (!UUID_PATTERN.test(emergencyId)) {
    return { error: "Invalid emergency report." };
  }

  const validStatuses: EmergencyStatus[] = [
    "reported",
    "acknowledged",
    "assigned",
    "responding",
    "resolved",
    "cancelled",
  ];

  if (
    typeof newStatus !== "string" ||
    !validStatuses.includes(newStatus as EmergencyStatus)
  ) {
    return { error: "Invalid emergency status." };
  }

  if (
    resolutionNotes !== undefined &&
    (typeof resolutionNotes !== "string" || resolutionNotes.length > 5000)
  ) {
    return { error: "Resolution notes must be 5,000 characters or fewer." };
  }

  const targetStatus = newStatus as EmergencyStatus;

  const { data: current, error: lookupError } = await access.supabase
    .from("emergency_alerts")
    .select("id, status, assigned_responder_id")
    .eq("id", emergencyId)
    .single();

  if (lookupError || !current) {
    return { error: "Emergency report could not be found." };
  }

  const currentStatus = current.status as EmergencyStatus;

  if (!ALLOWED_TRANSITIONS[currentStatus]?.includes(targetStatus)) {
    return {
      error: `An emergency cannot be changed from ${currentStatus} to ${targetStatus}.`,
    };
  }

  if (
    (targetStatus === "assigned" || targetStatus === "responding") &&
    !current.assigned_responder_id
  ) {
    return {
      error: "Assign an active responder before starting this stage.",
    };
  }

  const update: {
    status: EmergencyStatus;
    resolution_notes?: string | null;
  } = {
    status: targetStatus,
  };

  if (resolutionNotes !== undefined) {
    update.resolution_notes = resolutionNotes.trim() || null;
  }

  const { error: updateError } = await access.supabase
    .from("emergency_alerts")
    .update(update)
    .eq("id", emergencyId);

  if (updateError) {
    console.error("Emergency status update failed:", updateError);
    return {
      error:
        "Unable to update the emergency. Verify its current status and responder assignment.",
    };
  }

  revalidatePath("/admin/emergencies");
  revalidatePath("/admin");

  return { success: true };
}

export async function assignEmergencyResponder(
  emergencyId: string,
  responderId: unknown
) {
  const access = await requireAdminPermission("emergencies.manage");

  if (!access.authorized) {
    return {
      error: "You do not have permission to assign emergency responders.",
    };
  }

  if (!UUID_PATTERN.test(emergencyId) || typeof responderId !== "string") {
    return { error: "Invalid emergency or responder." };
  }

  if (!UUID_PATTERN.test(responderId)) {
    return { error: "Select a valid responder." };
  }

  const { data: current, error: lookupError } = await access.supabase
    .from("emergency_alerts")
    .select("id, status, assigned_responder_id")
    .eq("id", emergencyId)
    .single();

  if (lookupError || !current) {
    return { error: "Emergency report could not be found." };
  }

  const currentStatus = current.status as EmergencyStatus;

  if (
    !["acknowledged", "assigned", "responding"].includes(currentStatus)
  ) {
    return {
      error: "Acknowledge the emergency before assigning a responder.",
    };
  }

  const admin = createSupabaseAdminClient();

  const { data: responder, error: responderError } = await admin
    .from("profiles")
    .select("user_id")
    .eq("user_id", responderId)
    .eq("account_status", "active")
    .in("role", ["admin", "super_admin"])
    .maybeSingle();

  if (responderError || !responder) {
    return {
      error: "The selected responder is not an active administrator.",
    };
  }

  const { error: updateError } = await access.supabase
    .from("emergency_alerts")
    .update({
      assigned_responder_id: responderId,
      status: currentStatus === "acknowledged" ? "assigned" : currentStatus,
    })
    .eq("id", emergencyId);

  if (updateError) {
    console.error("Emergency responder assignment failed:", updateError);
    return {
      error: "Unable to assign the responder. Please try again.",
    };
  }

  revalidatePath("/admin/emergencies");
  revalidatePath("/admin");

  return { success: true };
}
