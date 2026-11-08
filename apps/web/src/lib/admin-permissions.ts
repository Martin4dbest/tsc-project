import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase-server";

export type AdminPermissionKey =
  | "dashboard.view"
  | "travellers.view"
  | "travellers.manage"
  | "journeys.view"
  | "journeys.manage"
  | "wallet.view"
  | "wallet.manage"
  | "payments.view"
  | "payments.manage"
  | "emergencies.view"
  | "emergencies.manage"
  | "protection.view"
  | "protection.manage"
  | "claims.view"
  | "claims.manage"
  | "partners.view"
  | "partners.manage"
  | "analytics.view"
  | "platform.settings.manage"
  | "admins.view"
  | "admins.manage"
  | "audit_logs.view";

type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

export type AdminPermissionResult =
  | {
      authorized: true;
      supabase: SupabaseServerClient;
      userId: string;
      role: "admin" | "super_admin";
    }
  | {
      authorized: false;
      reason:
        | "unauthenticated"
        | "inactive"
        | "forbidden"
        | "permission_check_failed";
    };

export async function requireAdminPermission(
  permissionKey: AdminPermissionKey
): Promise<AdminPermissionResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      authorized: false,
      reason: "unauthenticated",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.account_status !== "active"
  ) {
    return {
      authorized: false,
      reason: "inactive",
    };
  }

  if (
    profile.role !== "admin" &&
    profile.role !== "super_admin"
  ) {
    return {
      authorized: false,
      reason: "forbidden",
    };
  }

  const { data: hasPermission, error: permissionError } =
    await supabase.rpc("tsc_has_permission", {
      p_permission_key: permissionKey,
    });

  if (permissionError) {
    return {
      authorized: false,
      reason: "permission_check_failed",
    };
  }

  if (hasPermission !== true) {
    return {
      authorized: false,
      reason: "forbidden",
    };
  }

  return {
    authorized: true,
    supabase,
    userId: user.id,
    role: profile.role,
  };
}
