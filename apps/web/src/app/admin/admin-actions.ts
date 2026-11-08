"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

async function requireSuperAdmin() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Your session has expired. Please sign in again." } as const;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    error ||
    !profile ||
    profile.role !== "super_admin" ||
    profile.account_status !== "active"
  ) {
    return {
      error: "Only an active Super Admin can perform this operation.",
    } as const;
  }

  return { supabase, user } as const;
}

export async function getAdminManagementData() {
  const access = await requireSuperAdmin();

  if ("error" in access) {
    return { error: access.error };
  }

  const adminClient = createSupabaseAdminClient();

  const [
    profilesResult,
    usersResult,
    permissionsResult,
    catalogueResult,
  ] = await Promise.all([
    adminClient
      .from("profiles")
      .select("user_id, full_name, role, account_status, created_at")
      .in("role", ["admin", "super_admin"])
      .order("created_at", { ascending: false }),

    adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    }),

    adminClient
      .from("admin_user_permissions")
      .select("user_id, permission_key, assigned_by, assigned_at"),

    adminClient
      .from("admin_permission_catalog")
      .select(
        "permission_key, module_name, permission_name, description, is_active, sort_order"
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);

  if (profilesResult.error) {
    return { error: "Unable to load administrator profiles." };
  }

  if (usersResult.error) {
    return { error: "Unable to load administrator authentication records." };
  }

  if (permissionsResult.error || catalogueResult.error) {
    return { error: "Unable to load administrator permissions." };
  }

  const emailByUserId = new Map(
    usersResult.data.users.map((authUser) => [
      authUser.id,
      authUser.email ?? "",
    ])
  );

  const administrators = profilesResult.data.map((profile) => ({
    ...profile,
    email: emailByUserId.get(profile.user_id) ?? "",
  }));

  return {
    administrators,
    permissions: permissionsResult.data,
    catalogue: catalogueResult.data,
  };
}

export async function createAdminAccount(input: unknown) {
  if (!input || typeof input !== "object") {
    return { success: false, error: "Invalid administrator details." };
  }

  const details = input as Record<string, unknown>;

  const access = await requireSuperAdmin();

  if ("error" in access) {
    return { success: false, error: access.error };
  }

  const fullName = typeof details.fullName === "string" ? details.fullName.trim() : "";
  const email = typeof details.email === "string" ? details.email.trim().toLowerCase() : "";
  const phone = typeof details.phone === "string" ? details.phone.trim() : "";
  const password = typeof details.temporaryPassword === "string" ? details.temporaryPassword : "";

  if (!fullName || fullName.length < 2) {
    return { success: false, error: "Enter the administrator's full name." };
  }

  if (
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return { success: false, error: "Enter a valid email address." };
  }

  if (password.length < 12) {
    return {
      success: false,
      error: "The temporary password must contain at least 12 characters.",
    };
  }

  if (
    !Array.isArray(details.permissionKeys) ||
    details.permissionKeys.length === 0
  ) {
    return {
      success: false,
      error: "Select at least one administrator permission.",
    };
  }

  if (!details.permissionKeys.every(
    (key) => typeof key === "string" && key.trim().length > 0
  )) {
    return {
      success: false,
      error: "The permission selection contains invalid entries.",
    };
  }

  const permissionKeys = [...new Set(details.permissionKeys)];

  if (!permissionKeys.includes("dashboard.view")) {
    return {
      success: false,
      error: "The Dashboard View permission is required.",
    };
  }

  const adminClient = createSupabaseAdminClient();

  const { data: created, error: createError } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone,
      },
    });

  if (createError || !created.user) {
    return {
      success: false,
      error: createError?.message ?? "Unable to create the administrator account.",
    };
  }

  const newUserId = created.user.id;

  const { error: roleError } = await access.supabase.rpc(
    "tsc_set_admin_role",
    {
      target_user_id: newUserId,
      new_role: "admin",
    }
  );

  if (roleError) {
    await adminClient.auth.admin.deleteUser(newUserId);

    return {
      success: false,
      error: "Administrator role assignment failed. No account was retained.",
    };
  }

  const { error: permissionError } = await access.supabase.rpc(
    "tsc_set_admin_permissions",
    {
      p_target_user_id: newUserId,
      p_permission_keys: permissionKeys,
    }
  );

  if (permissionError) {
    await adminClient.auth.admin.deleteUser(newUserId);

    return {
      success: false,
      error: "Permission assignment failed. The new account was rolled back.",
    };
  }

  return {
    success: true,
    message: "Administrator account created and permissions assigned.",
  };
}

export async function updateAdminPermissions(
  targetUserId: string,
  permissionKeys: unknown
) {
  const access = await requireSuperAdmin();

  if ("error" in access) {
    return { success: false, error: access.error };
  }

  if (
    typeof targetUserId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetUserId)
  ) {
    return { success: false, error: "Invalid administrator account." };
  }

  if (
    !Array.isArray(permissionKeys) ||
    permissionKeys.length === 0 ||
    !permissionKeys.every(
      (key) => typeof key === "string" && key.trim().length > 0
    )
  ) {
    return {
      success: false,
      error: "Select valid administrator permissions.",
    };
  }

  const uniquePermissions = [...new Set(permissionKeys)];

  if (!uniquePermissions.includes("dashboard.view")) {
    return {
      success: false,
      error: "The Dashboard View permission is required.",
    };
  }

  const { error } = await access.supabase.rpc(
    "tsc_set_admin_permissions",
    {
      p_target_user_id: targetUserId,
      p_permission_keys: uniquePermissions,
    }
  );

  if (error) {
    return {
      success: false,
      error: "Unable to update administrator permissions.",
    };
  }

  revalidatePath("/admin/administrators");

  return {
    success: true,
    message: "Administrator permissions updated successfully.",
  };
}

export async function setAdminAccountStatus(
  targetUserId: string,
  newStatus: unknown
) {
  const access = await requireSuperAdmin();

  if ("error" in access) {
    return { success: false, error: access.error };
  }

  if (
    typeof targetUserId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetUserId)
  ) {
    return { success: false, error: "Invalid administrator account." };
  }

  if (newStatus !== "active" && newStatus !== "suspended") {
    return { success: false, error: "Invalid account status." };
  }

  const { error } = await access.supabase.rpc(
    "tsc_set_admin_status",
    {
      p_target_user_id: targetUserId,
      p_new_status: newStatus,
    }
  );

  if (error) {
    return {
      success: false,
      error: "Unable to update administrator account status.",
    };
  }

  revalidatePath("/admin/administrators");

  return {
    success: true,
    message:
      newStatus === "active"
        ? "Administrator account activated successfully."
        : "Administrator account suspended successfully.",
  };
}
