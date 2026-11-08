import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getAdminManagementData } from "../admin-actions";
import AdminManagementClient from "./AdminManagementClient";

export const instant = false;

export const metadata: Metadata = {
  title: "Administrator Management | TSC",
  description: "Manage TSC administrator accounts and permissions.",
};

export default async function AdministratorManagementPage() {
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

  const result = await getAdminManagementData();

  if ("error" in result) {
    return (
      <main className="dashboard-page">
        <section className="dashboard-content">
          <h1>Administrator Management</h1>
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

      <AdminManagementClient
        administrators={result.administrators}
        permissions={result.permissions}
        catalogue={result.catalogue}
      />
    </main>
  );
}
