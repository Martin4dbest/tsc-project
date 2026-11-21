"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPermission } from "@/lib/admin-permissions";

export async function adjustTravellerWallet(formData: FormData): Promise<void> {
  const permission = await requireAdminPermission("wallet.manage");

  if (!permission.authorized) {
    throw new Error("You are not authorised to manage wallets.");
  }

  const travellerId = String(formData.get("traveller_id") ?? "").trim();
  const direction = String(formData.get("direction") ?? "").trim();
  const amountNaira = Number(formData.get("amount") ?? 0);
  const reason = String(formData.get("reason") ?? "").trim();

  if (!travellerId) {
    throw new Error("Select a valid traveller.");
  }

  if (!["credit", "debit"].includes(direction)) {
    throw new Error("Choose credit or debit.");
  }

  if (!Number.isFinite(amountNaira) || amountNaira <= 0) {
    throw new Error("Enter a valid amount.");
  }

  if (reason.length < 5) {
    throw new Error("Provide a reason of at least 5 characters.");
  }

  const amountMinor = Math.round(amountNaira * 100);

  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new Error("The amount is too large or invalid.");
  }

  const { error } = await permission.supabase.rpc("tsc_wallet_admin_adjust", {
    p_traveller_id: travellerId,
    p_direction: direction,
    p_amount_minor: amountMinor,
    p_reason: reason,
  });

  if (error) {
    console.error("Wallet adjustment failed:", error);
    throw new Error(error.message || "The wallet adjustment could not be completed.");
  }

  revalidatePath("/admin/wallet");
  revalidatePath("/dashboard/wallet");
}
