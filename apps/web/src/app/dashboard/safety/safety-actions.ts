"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

type SafetyProfileInput = {
  blood_group?: string;
  medical_conditions?: string;
  allergies?: string;
  medications?: string;
  accessibility_needs?: string;
  additional_information?: string;
  preferred_language?: string;
  preferred_notification_channel?: "in_app" | "email" | "sms" | "push";
  share_safety_information_with_responders?: boolean;
};

type SafetyContactInput = {
  contact_name: string;
  relationship?: string;
  phone_number: string;
  email?: string;
  country_code?: string;
  is_primary?: boolean;
  can_receive_emergency_notifications?: boolean;
};

const SAFETY_PATH = "/dashboard/safety";

async function getAuthenticatedTraveller() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { success: false as const, message: "Please sign in to continue." };
  }

  return { success: true as const, supabase, user };
}

async function writeSafetyAudit(
  travellerId: string,
  entityType: string,
  entityId: string | null,
  eventType: string
) {
  try {
    const admin = createSupabaseAdminClient();

    await admin.from("tsc_safety_audit_logs").insert({
      actor_user_id: travellerId,
      traveller_id: travellerId,
      entity_type: entityType,
      entity_id: entityId,
      event_type: eventType,
      actor_type: "user",
      details: {},
    });
  } catch (error) {
    console.error("Safety audit logging failed:", error);
  }
}

export async function getMySafetyData() {
  const access = await getAuthenticatedTraveller();

  if (!access.success) {
    return { success: false, message: access.message };
  }

  const { supabase, user } = access;

  const [profileResult, contactsResult] = await Promise.all([
    supabase
      .from("tsc_safety_profiles")
      .select(
        "id, blood_group, medical_conditions, allergies, medications, accessibility_needs, additional_information, preferred_language, preferred_notification_channel, share_safety_information_with_responders, profile_completed_at"
      )
      .eq("traveller_id", user.id)
      .maybeSingle(),

    supabase
      .from("tsc_safety_contacts")
      .select(
        "id, contact_name, relationship, phone_number, email, country_code, is_primary, can_receive_emergency_notifications, created_at"
      )
      .eq("traveller_id", user.id)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true }),
  ]);

  if (profileResult.error || contactsResult.error) {
    console.error("Safety data retrieval failed:", {
      profile: profileResult.error,
      contacts: contactsResult.error,
    });

    return {
      success: false,
      message: "Unable to load your safety information. Please try again.",
    };
  }

  return {
    success: true,
    profile: profileResult.data,
    contacts: contactsResult.data ?? [],
  };
}

export async function saveMySafetyProfile(input: SafetyProfileInput) {
  const access = await getAuthenticatedTraveller();

  if (!access.success) {
    return { success: false, message: access.message };
  }

  const { supabase, user } = access;

  const allowedChannels = ["in_app", "email", "sms", "push"];

  const channel = input.preferred_notification_channel ?? "in_app";

  if (!allowedChannels.includes(channel)) {
    return { success: false, message: "Invalid notification preference." };
  }

  const clean = (value: unknown, maxLength: number) => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, maxLength) : null;
  };

  const profile = {
    traveller_id: user.id,
    blood_group: clean(input.blood_group, 30),
    medical_conditions: clean(input.medical_conditions, 5000),
    allergies: clean(input.allergies, 5000),
    medications: clean(input.medications, 5000),
    accessibility_needs: clean(input.accessibility_needs, 3000),
    additional_information: clean(input.additional_information, 5000),
    preferred_language: clean(input.preferred_language, 20) ?? "en",
    preferred_notification_channel: channel,
    share_safety_information_with_responders:
      input.share_safety_information_with_responders !== false,
    profile_completed_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("tsc_safety_profiles")
    .upsert(profile, { onConflict: "traveller_id" })
    .select("id")
    .single();

  if (error) {
    console.error("Safety profile save failed:", error.message);
    return {
      success: false,
      message: "Unable to save your safety profile. Please try again.",
    };
  }

  await writeSafetyAudit(
    user.id,
    "safety_profile",
    data.id,
    "safety_profile_updated"
  );

  revalidatePath(SAFETY_PATH);

  return { success: true, message: "Your safety profile has been saved." };
}

export async function addSafetyContact(input: SafetyContactInput) {
  const access = await getAuthenticatedTraveller();

  if (!access.success) {
    return { success: false, message: access.message };
  }

  const { supabase, user } = access;

  const contactName = input.contact_name?.trim();
  const phoneNumber = input.phone_number?.trim();
  const email = input.email?.trim() || null;

  if (!contactName || contactName.length < 2 || contactName.length > 150) {
    return { success: false, message: "Enter a valid contact name." };
  }

  if (!phoneNumber || phoneNumber.length < 3 || phoneNumber.length > 30) {
    return { success: false, message: "Enter a valid phone number." };
  }

  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return { success: false, message: "Enter a valid email address." };
  }

  if (input.is_primary) {
    const { error: clearError } = await supabase
      .from("tsc_safety_contacts")
      .update({ is_primary: false })
      .eq("traveller_id", user.id)
      .eq("is_primary", true);

    if (clearError) {
      return {
        success: false,
        message: "Unable to update your primary contact. Please try again.",
      };
    }
  }

  const { data, error } = await supabase
    .from("tsc_safety_contacts")
    .insert({
      traveller_id: user.id,
      contact_name: contactName,
      relationship: input.relationship?.trim().slice(0, 100) || null,
      phone_number: phoneNumber,
      email,
      country_code: input.country_code?.trim().slice(0, 8) || null,
      is_primary: input.is_primary === true,
      can_receive_emergency_notifications:
        input.can_receive_emergency_notifications !== false,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Safety contact creation failed:", error.message);
    return {
      success: false,
      message: "Unable to add this emergency contact. Please try again.",
    };
  }

  await writeSafetyAudit(
    user.id,
    "safety_contact",
    data.id,
    "emergency_contact_added"
  );

  revalidatePath(SAFETY_PATH);

  return { success: true, message: "Emergency contact added." };
}

export async function updateSafetyContact(
  contactId: string,
  input: SafetyContactInput
) {
  const access = await getAuthenticatedTraveller();

  if (!access.success) {
    return { success: false, message: access.message };
  }

  const { supabase, user } = access;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(contactId)) {
    return { success: false, message: "Invalid contact reference." };
  }

  const contactName = input.contact_name?.trim();
  const phoneNumber = input.phone_number?.trim();
  const email = input.email?.trim() || null;

  if (!contactName || contactName.length < 2 || contactName.length > 150) {
    return { success: false, message: "Enter a valid contact name." };
  }

  if (!phoneNumber || phoneNumber.length < 3 || phoneNumber.length > 30) {
    return { success: false, message: "Enter a valid phone number." };
  }

  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return { success: false, message: "Enter a valid email address." };
  }

  const { data: existing, error: lookupError } = await supabase
    .from("tsc_safety_contacts")
    .select("id")
    .eq("id", contactId)
    .eq("traveller_id", user.id)
    .maybeSingle();

  if (lookupError || !existing) {
    return { success: false, message: "Emergency contact not found." };
  }

  if (input.is_primary) {
    const { error: clearError } = await supabase
      .from("tsc_safety_contacts")
      .update({ is_primary: false })
      .eq("traveller_id", user.id)
      .eq("is_primary", true);

    if (clearError) {
      return {
        success: false,
        message: "Unable to update your primary contact. Please try again.",
      };
    }
  }

  const { error } = await supabase
    .from("tsc_safety_contacts")
    .update({
      contact_name: contactName,
      relationship: input.relationship?.trim().slice(0, 100) || null,
      phone_number: phoneNumber,
      email,
      country_code: input.country_code?.trim().slice(0, 8) || null,
      is_primary: input.is_primary === true,
      can_receive_emergency_notifications:
        input.can_receive_emergency_notifications !== false,
    })
    .eq("id", contactId)
    .eq("traveller_id", user.id);

  if (error) {
    console.error("Safety contact update failed:", error.message);
    return {
      success: false,
      message: "Unable to update this emergency contact. Please try again.",
    };
  }

  await writeSafetyAudit(
    user.id,
    "safety_contact",
    contactId,
    "emergency_contact_updated"
  );

  revalidatePath(SAFETY_PATH);

  return { success: true, message: "Emergency contact updated." };
}

export async function deleteSafetyContact(contactId: string) {
  const access = await getAuthenticatedTraveller();

  if (!access.success) {
    return { success: false, message: access.message };
  }

  const { supabase, user } = access;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(contactId)) {
    return { success: false, message: "Invalid contact reference." };
  }

  const { data: existing, error: lookupError } = await supabase
    .from("tsc_safety_contacts")
    .select("id")
    .eq("id", contactId)
    .eq("traveller_id", user.id)
    .maybeSingle();

  if (lookupError || !existing) {
    return { success: false, message: "Emergency contact not found." };
  }

  const { error } = await supabase
    .from("tsc_safety_contacts")
    .delete()
    .eq("id", contactId)
    .eq("traveller_id", user.id);

  if (error) {
    console.error("Safety contact deletion failed:", error.message);
    return {
      success: false,
      message: "Unable to remove this emergency contact. Please try again.",
    };
  }

  await writeSafetyAudit(
    user.id,
    "safety_contact",
    contactId,
    "emergency_contact_deleted"
  );

  revalidatePath(SAFETY_PATH);

  return { success: true, message: "Emergency contact removed." };
}
