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
    <div className="tsc-command jfs-shell">
      <style>{`
        .jfs-shell {
          --jfs-serif: Georgia, "Times New Roman", Times, serif;
          --jfs-sans: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
          --jfs-ink: #0f172a;
          --jfs-muted: #526075;
          --jfs-border: #dce3ee;
          --jfs-navy-deep: #091120;
          --jfs-navy-mid: #12203b;
          --jfs-gold: #d4a24c;
          --jfs-gold-dark: #966619;
          --jfs-gold-soft: rgba(212, 162, 76, 0.14);
          --jfs-gold-tint: #fef8eb;
          --jfs-indigo: #3730a3;
          --jfs-indigo-soft: #eef2ff;
          --jfs-emerald: #10b981;
          --jfs-emerald-soft: #ecfdf5;
          font-family: var(--jfs-sans);
          background:
            radial-gradient(circle at 85% 0%, rgba(55, 48, 163, 0.06), transparent 42%),
            radial-gradient(circle at 15% 15%, rgba(212, 162, 76, 0.08), transparent 38%),
            #f5f7fb;
          color: var(--jfs-ink);
          min-height: 100vh;
        }

        /* Classical Deep Navy Sidebar */
        .jfs-shell .tsc-sidebar {
          background: linear-gradient(180deg, var(--jfs-navy-deep) 0%, var(--jfs-navy-mid) 100%);
          color: #f8fafc;
          border-right: 1px solid rgba(212, 162, 76, 0.22);
          box-shadow: 4px 0 24px rgba(9, 17, 32, 0.08);
        }

        .jfs-shell .tsc-sidebar-brand {
          padding-bottom: 18px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .jfs-brand-wrap {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .jfs-brand-kicker {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          color: var(--jfs-gold);
        }

        .jfs-brand-title {
          font-family: var(--jfs-serif);
          font-size: 18.5px;
          font-weight: 700;
          letter-spacing: -0.015em;
          color: #ffffff;
        }

        .jfs-shell .tsc-sidebar-label {
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #94a3b8;
        }

        .jfs-shell .tsc-side-nav {
          display: grid;
          gap: 6px;
        }

        .jfs-shell .tsc-nav-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 13.5px;
          font-weight: 500;
          color: #cbd5e1;
          text-decoration: none;
          border: 1px solid transparent;
          transition: all 0.16s ease;
        }

        .jfs-shell .tsc-nav-link:hover {
          background: rgba(255, 255, 255, 0.07);
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.08);
        }

        .jfs-shell .tsc-nav-link.active {
          background: linear-gradient(135deg, rgba(212, 162, 76, 0.22), rgba(212, 162, 76, 0.1));
          color: #fde68a;
          font-weight: 650;
          border-color: rgba(212, 162, 76, 0.45);
          box-shadow: inset 3px 0 0 var(--jfs-gold);
        }

        .jfs-shell .tsc-sidebar-note {
          font-size: 12px;
          line-height: 1.45;
          color: #fde68a;
          padding: 11px 13px;
          border-radius: 10px;
          background: rgba(212, 162, 76, 0.12);
          border: 1px solid rgba(212, 162, 76, 0.28);
        }

        /* Main Area & Topbar */
        .jfs-shell .tsc-main {
          background: transparent;
        }

        .jfs-shell .tsc-topbar {
          background: linear-gradient(90deg, #ffffff 0%, #f8faff 65%, #fef9ee 100%);
          border-bottom: 1px solid var(--jfs-border);
          box-shadow: 0 1px 8px rgba(15, 23, 42, 0.03);
        }

        .jfs-shell .tsc-topbar-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--jfs-indigo);
        }

        .jfs-page-heading {
          font-family: var(--jfs-serif);
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--jfs-ink);
          margin: 3px 0 0 0;
          line-height: 1.2;
        }

        .jfs-shell .tsc-security-indicator {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 12px;
          font-weight: 700;
          color: var(--jfs-gold-dark);
          background: var(--jfs-gold-tint);
          border: 1px solid #ecd19c;
          padding: 6px 12px;
          border-radius: 999px;
        }

        .jfs-shell .tsc-security-indicator::before {
          content: "";
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--jfs-gold);
          box-shadow: 0 0 0 3px rgba(212, 162, 76, 0.25);
        }

        .jfs-shell .tsc-dashboard-footer {
          font-size: 12.5px;
          color: var(--jfs-muted);
          background: rgba(255, 255, 255, 0.72);
          border-top: 1px solid var(--jfs-border);
        }
      `}</style>

      <aside className="tsc-sidebar">
        <div className="tsc-sidebar-brand">
          <div className="jfs-brand-wrap">
            <span className="jfs-brand-kicker">Travellers Safety Covered</span>
            <strong className="jfs-brand-title">TSC Command Centre</strong>
          </div>
        </div>

        <div className="tsc-sidebar-label">Management</div>
        <nav className="tsc-side-nav" aria-label="Admin navigation">
          <a className="tsc-nav-link" href="/admin">
            <span>Overview</span>
          </a>
          <a className="tsc-nav-link" href="/admin/journeys">
            <span>Journey Monitoring</span>
          </a>
          <a
            className="tsc-nav-link active"
            href="/admin/journeys/fees"
            aria-current="page"
          >
            <span>Journey Fee Settings</span>
          </a>
        </nav>

        <div className="tsc-sidebar-bottom">
          <div className="tsc-sidebar-note">
            Protected administrator settings · RBAC enforced
          </div>
        </div>
      </aside>

      <main className="tsc-main">
        <header className="tsc-topbar">
          <div>
            <div className="tsc-topbar-label">Journey Management</div>
            <h1 className="jfs-page-heading">Journey Fee Settings</h1>
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