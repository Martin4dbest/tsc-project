import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { signOut } from "@/app/actions";
import {
  getEmergencyMonitoringData,
  getEmergencyResponders,
} from "./emergency-actions";
import EmergencyOperationsClient from "./EmergencyOperationsClient";

export const instant = false;

export const metadata: Metadata = {
  title: "Emergency Operations | TSC Command Centre",
  description:
    "Monitor emergency reports, coordinate responders, and manage incident resolution.",
};

export default async function EmergencyOperationsPage() {
  await connection();

  const access = await requireAdminPermission("emergencies.view");

  if (!access.authorized) {
    if (access.reason === "unauthenticated") {
      redirect("/admin/login");
    }

    redirect("/admin?reason=permission");
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, role, account_status")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    redirect("/admin/login?reason=profile");
  }

  if (profile.account_status !== "active") {
    await supabase.auth.signOut();
    redirect("/admin/login?reason=suspended");
  }

  if (profile.role !== "admin" && profile.role !== "super_admin") {
    redirect("/dashboard");
  }

  const [manageAccess, emergencyResult, responderResult] = await Promise.all([
    requireAdminPermission("emergencies.manage"),
    getEmergencyMonitoringData(),
    getEmergencyResponders(),
  ]);

  const isSuperAdmin = profile.role === "super_admin";

  return (
    <main className="tsc-command">
      <aside className="tsc-sidebar">
        <a href="/" className="tsc-sidebar-brand">
          <span className="tsc-brand-mark">T</span>
          <span>
            <strong>TSC</strong>
            <small>TRAVELLERS SAFETY COVERED</small>
          </span>
        </a>

        <div className="tsc-sidebar-label">WORKSPACE</div>

        <nav className="tsc-side-nav">
          <a href="/admin" className="tsc-nav-link">
            <span>▦</span> Overview
          </a>

          <a href="/admin/travellers" className="tsc-nav-link">
            <span>♙</span> Travellers
          </a>

          <a href="/admin/journeys" className="tsc-nav-link">
            <span>⌖</span> Journey Monitoring
          </a>

          <a
            href="/admin/emergencies"
            className="tsc-nav-link active"
            aria-current="page"
          >
            <span>🚨</span> Emergency Operations
          </a>

          {isSuperAdmin && (
            <>
              <a href="/admin/administrators" className="tsc-nav-link">
                <span>♧</span> Administrators
              </a>
              <a href="/admin/audit-logs" className="tsc-nav-link">
                <span>◷</span> Audit logs
              </a>
            </>
          )}
        </nav>

        <div className="tsc-sidebar-label tsc-sidebar-label-lower">
          PLATFORM
        </div>

        <div className="tsc-sidebar-note">
          <span className="tsc-sidebar-note-icon">⬡</span>
          <strong>Emergency coordination</strong>
          <p>
            Review traveller alerts, coordinate response teams, and maintain
            an accountable incident history.
          </p>
        </div>

        <div className="tsc-sidebar-bottom">
          <div className="tsc-sidebar-user">
            <span className="tsc-avatar">
              {(profile.full_name || "A").charAt(0).toUpperCase()}
            </span>
            <span className="tsc-sidebar-user-info">
              <strong>{profile.full_name || "Administrator"}</strong>
              <small>
                {isSuperAdmin ? "Super Admin" : "Administrator"}
              </small>
            </span>
          </div>

          <form action={signOut}>
            <button type="submit" className="tsc-sidebar-signout">
              <span>↪</span> Sign out
            </button>
          </form>
        </div>
      </aside>

      <section className="tsc-main">
        <header className="tsc-topbar">
          <div>
            <span className="tsc-topbar-label">TSC PLATFORM</span>
            <strong>Administration / Emergency Operations</strong>
          </div>

          <div className="tsc-topbar-right">
            <span className="tsc-security-indicator">
              <span />
              Secure session
            </span>
            <span className="tsc-topbar-avatar">
              {(profile.full_name || "A").charAt(0).toUpperCase()}
            </span>
          </div>
        </header>

        <div className="tsc-dashboard-content">
          {emergencyResult.error ? (
            <section className="journey-load-error" role="alert">
              <strong>Emergency reports unavailable</strong>
              <p>{emergencyResult.error}</p>
              <a href="/admin">Return to Command Centre</a>
            </section>
          ) : (
            <EmergencyOperationsClient
              records={emergencyResult.records ?? []}
              responders={responderResult.responders ?? []}
              canManage={manageAccess.authorized}
              responderError={responderResult.error ?? null}
            />
          )}

          <footer className="tsc-dashboard-footer">
            <span>TRAVELLERS SAFETY COVERED</span>
            <span>Emergency operations workspace</span>
          </footer>
        </div>
      </section>
    </main>
  );
}
