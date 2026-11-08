"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function getAuditLogData() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Your session has expired. Please sign in again." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !== "super_admin" ||
    profile.account_status !== "active"
  ) {
    return { error: "Only an active Super Admin can view audit logs." };
  }

  const adminClient = createSupabaseAdminClient();

  const { data: logs, error: logsError } = await adminClient
    .from("admin_audit_logs")
    .select("id, actor_user_id, target_user_id, action, details, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (logsError) {
    return { error: "Unable to load audit logs." };
  }

  const userIds = Array.from(
    new Set(
      (logs ?? [])
        .flatMap((log) => [log.actor_user_id, log.target_user_id])
        .filter((id): id is string => Boolean(id))
    )
  );

  const [profilesResult, usersResult] = await Promise.all([
    userIds.length
      ? adminClient
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds)
      : Promise.resolve({ data: [], error: null }),

    adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    }),
  ]);

  if (profilesResult.error || usersResult.error) {
    return { error: "Unable to load audit-log account details." };
  }

  const nameById = new Map(
    (profilesResult.data ?? []).map((item) => [
      item.user_id,
      item.full_name || "Unnamed account",
    ])
  );

  const emailById = new Map(
    usersResult.data.users.map((item) => [
      item.id,
      item.email ?? "",
    ])
  );

  return {
    logs: (logs ?? []).map((log) => ({
      ...log,
      actor_name: log.actor_user_id
        ? nameById.get(log.actor_user_id) ?? "Account unavailable"
        : "System",
      actor_email: log.actor_user_id
        ? emailById.get(log.actor_user_id) ?? ""
        : "",
      target_name: log.target_user_id
        ? nameById.get(log.target_user_id) ?? "Account unavailable"
        : "—",
      target_email: log.target_user_id
        ? emailById.get(log.target_user_id) ?? ""
        : "",
    })),
  };
}
