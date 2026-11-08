import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { signOut } from "@/app/actions";

export const instant = false;

export const metadata: Metadata = {
  title: "TSC Command Centre",
  description: "Travellers Safety Covered administration command centre.",
};

export default async function AdminDashboard() {
  await connection();

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name, role, account_status")
    .eq("user_id", user.id)
    .single();

  if (error || !profile) {
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

  const permission = await requireAdminPermission("dashboard.view");

  if (!permission.authorized) {
    redirect("/admin/login?reason=permission");
  }

  const isSuperAdmin = profile.role === "super_admin";

  const [
    travellerAccess,
    journeyAccess,
    walletAccess,
    paymentAccess,
    emergencyAccess,
    protectionAccess,
    claimsAccess,
    partnerAccess,
    analyticsAccess,
  ] = await Promise.all([
    requireAdminPermission("travellers.view"),
    requireAdminPermission("journeys.view"),
    requireAdminPermission("wallet.view"),
    requireAdminPermission("payments.view"),
    requireAdminPermission("emergencies.view"),
    requireAdminPermission("protection.view"),
    requireAdminPermission("claims.view"),
    requireAdminPermission("partners.view"),
    requireAdminPermission("analytics.view"),
  ]);

  const modules = [
    {
      title: "Traveller Management",
      description: "View traveller profiles, manage accounts and monitor registration activity.",
      href: "/admin/travellers",
      icon: "♙",
      color: "orange",
      label: "Traveller services",
      available: travellerAccess.authorized,
      status: "Open module",
    },
    {
      title: "Journey Monitoring",
      description: "Monitor activated journeys, trip activity and traveller movement.",
      href: "/admin/journeys",
      icon: "⌖",
      color: "blue",
      label: "Journey operations",
      available: journeyAccess.authorized,
      status: "Open module",
    },
    {
      title: "Wallet Management",
      description: "View traveller wallet balances, recharge activity and transaction records.",
      href: null,
      icon: "▤",
      color: "green",
      label: "Financial operations",
      available: walletAccess.authorized,
      status: "Coming soon",
    },
    {
      title: "Payment Operations",
      description: "Monitor payment records, payment history and transaction activities.",
      href: null,
      icon: "₦",
      color: "purple",
      label: "Financial operations",
      available: paymentAccess.authorized,
      status: "Coming soon",
    },
    {
      title: "Emergency Operations",
      description: "Coordinate emergency alerts, response activities and safety incidents.",
      href: "/admin/emergencies",
      icon: "!",
      color: "red",
      label: "Safety response",
      available: emergencyAccess.authorized,
      status: "Open module",
    },
    {
      title: "Protection Management",
      description: "Oversee traveller safety protection plans and coverage records.",
      href: null,
      icon: "⬡",
      color: "teal",
      label: "Protection services",
      available: protectionAccess.authorized,
      status: "Coming soon",
    },
    {
      title: "Claims & Compensation",
      description: "Review claims, compensation requests and claims processing activities.",
      href: null,
      icon: "▣",
      color: "gold",
      label: "Claims services",
      available: claimsAccess.authorized,
      status: "Coming soon",
    },
    {
      title: "Partner Network",
      description: "Manage hospitals, emergency responders, insurers and service partners.",
      href: null,
      icon: "◇",
      color: "blue",
      label: "Partner operations",
      available: partnerAccess.authorized,
      status: "Coming soon",
    },
    {
      title: "Platform Analytics",
      description: "Access operational reports, platform insights and performance analytics.",
      href: null,
      icon: "▥",
      color: "purple",
      label: "Intelligence",
      available: analyticsAccess.authorized,
      status: "Coming soon",
    },
  ].filter((item) => item.available);

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
          <a href="/admin" className="tsc-nav-link active">
            <span>▦</span> Overview
          </a>

          {travellerAccess.authorized && (
            <a href="/admin/travellers" className="tsc-nav-link">
              <span>♙</span> Travellers
            </a>
          )}

          {journeyAccess.authorized && (
            <a href="/admin/journeys" className="tsc-nav-link">
              <span>⌖</span> Journey Monitoring
            </a>
          )}

          {emergencyAccess.authorized && (
            <a href="/admin/emergencies" className="tsc-nav-link">
              <span>!</span> Emergency Operations
            </a>
          )}

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
          <strong>Safety operations</strong>
          <p>Manage platform services from one secure workspace.</p>
        </div>

        <div className="tsc-sidebar-bottom">
          <div className="tsc-sidebar-user">
            <span className="tsc-avatar">
              {(profile.full_name || "A").charAt(0).toUpperCase()}
            </span>
            <span className="tsc-sidebar-user-info">
              <strong>{profile.full_name || "Administrator"}</strong>
              <small>{isSuperAdmin ? "Super Admin" : "Administrator"}</small>
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
            <strong>Administration / Overview</strong>
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
          <section className="tsc-welcome-banner">
            <div className="tsc-welcome-content">
              <span className="tsc-welcome-eyebrow">
                <span /> TSC ADMINISTRATION COMMAND CENTRE
              </span>

              <h1>
                Welcome back,
                <br />
                {profile.full_name || "Administrator"}
              </h1>

              <p>
                Your central workspace for traveller services, platform
                operations and safety administration.
              </p>

              <div className="tsc-welcome-bottom">
                <span className="tsc-role-chip">
                  {isSuperAdmin ? "SUPER ADMINISTRATOR" : "PLATFORM ADMINISTRATOR"}
                </span>
                <span className="tsc-welcome-status">
                  <span /> Account active
                </span>
              </div>
            </div>

            <div className="tsc-welcome-art" aria-hidden="true">
              <div className="tsc-orbit tsc-orbit-one" />
              <div className="tsc-orbit tsc-orbit-two" />
              <div className="tsc-shield">
                <span>✓</span>
              </div>
              <div className="tsc-art-caption">
                <strong>SAFETY FIRST</strong>
                <small>TRAVEL WITH CONFIDENCE</small>
              </div>
            </div>
          </section>

          <section className="tsc-overview-heading">
            <div>
              <span className="tsc-section-eyebrow">PLATFORM WORKSPACE</span>
              <h2>Operational overview</h2>
              <p>Access the services available to your administrator account.</p>
            </div>

            <span className="tsc-module-count">
              {modules.length} accessible modules
            </span>
          </section>

          <section className="tsc-module-grid">
            {modules.map((module) => (
              <article
                className={`tsc-module-card tsc-module-${module.color}`}
                key={module.title}
              >
                <div className="tsc-module-card-top">
                  <span className="tsc-module-icon">{module.icon}</span>
                  <span className="tsc-module-label">{module.label}</span>
                </div>

                <h3>{module.title}</h3>
                <p>{module.description}</p>

                <div className="tsc-module-card-bottom">
                  {module.href ? (
                    <a href={module.href}>
                      Open module <span>→</span>
                    </a>
                  ) : (
                    <span className="tsc-coming-soon">
                      <span /> {module.status}
                    </span>
                  )}
                </div>
              </article>
            ))}
          </section>

          {isSuperAdmin && (
            <section className="tsc-control-section">
              <div className="tsc-overview-heading">
                <div>
                  <span className="tsc-section-eyebrow">PRIVILEGED ACCESS</span>
                  <h2>Platform control centre</h2>
                  <p>Manage administrator access and platform security.</p>
                </div>
                <span className="tsc-superadmin-chip">SUPER ADMIN</span>
              </div>

              <div className="tsc-control-grid">
                <a
                  href="/admin/administrators"
                  className="tsc-control-card"
                >
                  <span className="tsc-control-icon orange">♧</span>
                  <span>
                    <strong>Administrator Management</strong>
                    <small>Create administrators and manage permissions.</small>
                  </span>
                  <span className="tsc-control-arrow">→</span>
                </a>

                <a
                  href="/admin/audit-logs"
                  className="tsc-control-card"
                >
                  <span className="tsc-control-icon navy">◷</span>
                  <span>
                    <strong>Security & Audit Logs</strong>
                    <small>Review administrator activity and security events.</small>
                  </span>
                  <span className="tsc-control-arrow">→</span>
                </a>

                <div className="tsc-control-card tsc-control-disabled">
                  <span className="tsc-control-icon blue">⚙</span>
                  <span>
                    <strong>Platform Settings</strong>
                    <small>Global platform configuration and controls.</small>
                    <small className="tsc-control-coming">Coming soon</small>
                  </span>
                </div>
              </div>
            </section>
          )}

          <footer className="tsc-dashboard-footer">
            <span>TRAVELLERS SAFETY COVERED</span>
            <span>Secure administration workspace</span>
          </footer>
        </div>
      </section>
    </main>
  );
}
