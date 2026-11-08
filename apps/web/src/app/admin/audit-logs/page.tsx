import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getAuditLogData } from "../audit-actions";
import AuditLogsClient from "./AuditLogsClient";

export const instant = false;

export const metadata: Metadata = {
  title: "Audit Logs | TSC",
  description: "Review administrator activity across TSC.",
};

export default async function AuditLogsPage() {
  await connection();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !profile || profile.account_status !== "active") {
    await supabase.auth.signOut();
    redirect("/admin/login");
  }

  if (profile.role !== "super_admin") {
    redirect("/admin");
  }

  const result = await getAuditLogData();

  if ("error" in result) {
    return (
      <main className="dashboard-page">
        <section className="dashboard-content">
          <h1>Audit Logs</h1>
          <p>{result.error}</p>
          <a href="/admin">Return to dashboard</a>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <a href="/" className="dashboard-brand">
          Travelers Safety Covered
        </a>
        <a href="/admin" className="dashboard-logout">
          Back to dashboard
        </a>
      </header>

      <AuditLogsClient logs={result.logs} />
    </main>
  );
}
