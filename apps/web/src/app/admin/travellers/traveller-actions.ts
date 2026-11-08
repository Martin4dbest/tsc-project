"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireAdminPermission } from "@/lib/admin-permissions";

export async function getTravellerManagementData() {
  const access = await requireAdminPermission("travellers.view");

  if (!access.authorized) {
    return { error: "You do not have permission to view travellers." };
  }

  const adminClient = createSupabaseAdminClient();

  const { data, error } = await adminClient
    .from("profiles")
    .select("user_id, full_name, phone, account_status, created_at")
    .eq("role", "traveller")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return { error: "Unable to load traveller records." };
  }

  return { travellers: data ?? [] };
}

export async function setTravellerAccountStatus(
  targetUserId: string,
  newStatus: unknown
) {
  const access = await requireAdminPermission("travellers.manage");

  if (!access.authorized) {
    return { error: "You do not have permission to manage travellers." };
  }

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetUserId)
  ) {
    return { error: "Invalid traveller account." };
  }

  if (newStatus !== "active" && newStatus !== "suspended") {
    return { error: "Invalid account status." };
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.rpc(
    "tsc_set_traveller_account_status",
    {
      p_target_user_id: targetUserId,
      p_new_status: newStatus,
    }
  );

  if (error) {
    console.error("Traveller status transaction failed:", error);
    return {
      error: "Unable to update traveller account. Please verify the account and try again.",
    };
  }

  revalidatePath("/admin/travellers");
  revalidatePath("/admin");

  return { success: true };
}
