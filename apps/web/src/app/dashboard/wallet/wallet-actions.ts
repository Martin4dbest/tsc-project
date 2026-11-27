"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function markWalletNotificationRead(
  formData: FormData
): Promise<void> {
  const notificationId = String(formData.get("notificationId") ?? "");

  if (!notificationId) {
    throw new Error("A valid notification is required.");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please sign in to update your notifications.");
  }

  const { error } = await supabase
    .from("tsc_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) {
    console.error("Wallet notification update failed:", error);
    throw new Error("Unable to update this notification.");
  }

  revalidatePath("/dashboard/wallet");
}
