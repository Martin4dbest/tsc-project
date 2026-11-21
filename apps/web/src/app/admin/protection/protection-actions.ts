"use server";

import { requireAdminPermission } from "@/lib/admin-permissions";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export type ProtectionData = {
  alerts: Record<string, unknown>[];
  checkins: Record<string, unknown>[];
  assessments: Record<string, unknown>[];
  coverage: Record<string, unknown>[];
  riskZones: Record<string, unknown>[];
  travellers: Record<string, unknown>[];
  contacts: Record<string, unknown>[];
  error?: string;
};

export async function getProtectionMonitoringData(): Promise<ProtectionData> {
  const access = await requireAdminPermission("protection.view");

  if (!access.authorized) {
    return {
      alerts: [],
      checkins: [],
      assessments: [],
      coverage: [],
      riskZones: [],
      travellers: [],
      contacts: [],
      error: "You do not have permission to view Protection Management.",
    };
  }

  const admin = createSupabaseAdminClient();

  const [
    alertsResult,
    checkinsResult,
    assessmentsResult,
    coverageResult,
    zonesResult,
    profilesResult,
    contactsResult,
  ] = await Promise.all([
    admin
      .from("tsc_safety_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300),

    admin
      .from("tsc_safety_checkins")
      .select("*")
      .order("scheduled_at", { ascending: false })
      .limit(300),

    admin
      .from("tsc_journey_risk_assessments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300),

    admin
      .from("tsc_journey_protection")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300),

    admin
      .from("tsc_safety_risk_zones")
      .select("id, zone_name, zone_type, severity, country_name, region, city, is_active, starts_at, expires_at, created_at")
      .order("created_at", { ascending: false })
      .limit(300),

    admin
      .from("tsc_safety_profiles")
      .select("id, traveller_id, profile_completed_at, preferred_language, preferred_notification_channel, share_safety_information_with_responders")
      .order("updated_at", { ascending: false })
      .limit(500),

    admin
      .from("tsc_safety_contacts")
      .select("id, traveller_id, contact_name, relationship, phone_number, is_primary, can_receive_emergency_notifications")
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  const errors = [
    alertsResult.error,
    checkinsResult.error,
    assessmentsResult.error,
    coverageResult.error,
    zonesResult.error,
    profilesResult.error,
    contactsResult.error,
  ].filter(Boolean);

  if (errors.length) {
    console.error("Protection monitoring data load failed:", errors);

    return {
      alerts: [],
      checkins: [],
      assessments: [],
      coverage: [],
      riskZones: [],
      travellers: [],
      contacts: [],
      error: "Some Protection Management records could not be loaded. Check the server logs and database permissions.",
    };
  }

  const profiles = profilesResult.data ?? [];
  const contacts = contactsResult.data ?? [];

  const travellerIds = [
    ...new Set([
      ...profiles.map((item) => item.traveller_id),
      ...(alertsResult.data ?? []).map((item) => item.traveller_id),
      ...(checkinsResult.data ?? []).map((item) => item.traveller_id),
      ...(assessmentsResult.data ?? []).map((item) => item.traveller_id),
      ...(coverageResult.data ?? []).map((item) => item.traveller_id),
    ]),
  ];

  const { data: profileDetails, error: profileDetailsError } =
    travellerIds.length
      ? await admin
          .from("profiles")
          .select("user_id, full_name, phone")
          .in("user_id", travellerIds)
      : { data: [], error: null };

  if (profileDetailsError) {
    console.error("Protection traveller lookup failed:", profileDetailsError);

    return {
      alerts: [],
      checkins: [],
      assessments: [],
      coverage: [],
      riskZones: [],
      travellers: [],
      contacts: [],
      error: "Unable to load traveller references for Protection Management.",
    };
  }

  const nameMap = new Map(
    (profileDetails ?? []).map((profile) => [
      profile.user_id,
      {
        full_name: profile.full_name || "Unknown traveller",
        phone: profile.phone ?? null,
      },
    ])
  );

  const attachTraveller = (rows: Record<string, unknown>[]) =>
    rows.map((row) => ({
      ...row,
      traveller_name:
        nameMap.get(String(row.traveller_id))?.full_name ?? "Unknown traveller",
      traveller_phone:
        nameMap.get(String(row.traveller_id))?.phone ?? null,
    }));

  return {
    alerts: attachTraveller(
      (alertsResult.data ?? []) as Record<string, unknown>[]
    ),
    checkins: attachTraveller(
      (checkinsResult.data ?? []) as Record<string, unknown>[]
    ),
    assessments: attachTraveller(
      (assessmentsResult.data ?? []) as Record<string, unknown>[]
    ),
    coverage: attachTraveller(
      (coverageResult.data ?? []) as Record<string, unknown>[]
    ),
    riskZones: (zonesResult.data ?? []) as Record<string, unknown>[],
    travellers: profiles.map((profile) => ({
      ...profile,
      traveller_name:
        nameMap.get(profile.traveller_id)?.full_name ?? "Unknown traveller",
      traveller_phone:
        nameMap.get(profile.traveller_id)?.phone ?? null,
      emergency_contact_count: contacts.filter(
        (contact) => contact.traveller_id === profile.traveller_id
      ).length,
    })),
    contacts: contacts.map((contact) => ({
      ...contact,
      traveller_name:
        nameMap.get(contact.traveller_id)?.full_name ?? "Unknown traveller",
    })),
  };
}
