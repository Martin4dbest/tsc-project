import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { signOut } from "@/app/actions";
import { getProtectionMonitoringData } from "./protection-actions";
import ProtectionManagementClient from "./ProtectionManagementClient";

export const instant = false;

export const metadata: Metadata = {
  title: "Protection Management | TSC Command Centre",
  description:
    "Monitor traveller safety alerts, check-ins, journey risks and protection coverage.",
};

export default async function ProtectionManagementPage() {
  await connection();

  const access = await requireAdminPermission("protection.view");

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

  const data = await getProtectionMonitoringData();
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
          <a href="/admin/emergencies" className="tsc-nav-link">
            <span>🚨</span> Emergency Operations
          </a>
          <a
            href="/admin/protection"
            className="tsc-nav-link active"
            aria-current="page"
          >
            <span>⬡</span> Protection Management
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
          <strong>Protection services</strong>
          <p>
            Monitor traveller safety records, protection coverage and
            journey risk information.
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
            <strong>Administration / Protection Management</strong>
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
          {data.error ? (
            <section className="journey-load-error" role="alert">
              <strong>Protection records unavailable</strong>
              <p>{data.error}</p>
              <a href="/admin">Return to Command Centre</a>
            </section>
          ) : (
            <ProtectionManagementClient data={data} />
          )}

          <footer className="tsc-dashboard-footer">
            <span>TRAVELLERS SAFETY COVERED</span>
            <span>Protection management workspace</span>
          </footer>
        </div>
      </section>
    </main>
  );
}
