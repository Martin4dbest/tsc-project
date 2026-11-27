export const instant = false;
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { requireAdminPermission } from "@/lib/admin-permissions";
import JourneyFeeSettingsClient from "./JourneyFeeSettingsClient";

export const metadata: Metadata = {
  title: "Journey Fee Settings | TSC Command Centre",
};

export default async function JourneyFeeSettingsPage() {
  await connection();

  const access = await requireAdminPermission("journeys.manage");

  if (!access.authorized) {
    if (access.reason === "unauthenticated") {
      redirect("/admin/login");
    }

    redirect("/admin?reason=permission");
  }

  return (
    <div className="tsc-command">
      <aside className="tsc-sidebar">
        <div className="tsc-sidebar-brand">
          <strong>TSC Command Centre</strong>
        </div>

        <div className="tsc-sidebar-label">Management</div>
        <nav className="tsc-side-nav">
          <a className="tsc-nav-link" href="/admin">
            Overview
          </a>
          <a className="tsc-nav-link" href="/admin/journeys">
            Journey Monitoring
          </a>
          <a
            className="tsc-nav-link active"
            href="/admin/journeys/fees"
          >
            Journey Fee Settings
          </a>
        </nav>

        <div className="tsc-sidebar-bottom">
          <div className="tsc-sidebar-note">
            Protected administrator settings
          </div>
        </div>
      </aside>

      <main className="tsc-main">
        <header className="tsc-topbar">
          <div>
            <div className="tsc-topbar-label">Journey Management</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>
              Journey Fee Settings
            </h1>
          </div>
          <div className="tsc-topbar-right">
            <span className="tsc-security-indicator">Admin access</span>
          </div>
        </header>

        <div className="tsc-dashboard-content">
          <JourneyFeeSettingsClient />
        </div>

        <footer className="tsc-dashboard-footer">
          Travellers Safety Covered — Journey Fee Configuration
        </footer>
      </main>
    </div>
  );
}
