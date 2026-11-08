import { connection } from "next/server";
import { redirect } from "next/navigation";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { getTravellerManagementData } from "./traveller-actions";
import TravellerManagementClient from "./TravellerManagementClient";

export const instant = false;

export default async function TravellerManagementPage() {
  await connection();

  const viewAccess = await requireAdminPermission("travellers.view");

  if (!viewAccess.authorized) {
    if (viewAccess.reason === "unauthenticated") {
      redirect("/admin/login");
    }

    redirect("/admin?reason=permission");
  }

  const manageAccess = await requireAdminPermission("travellers.manage");
  const result = await getTravellerManagementData();

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <a href="/" className="dashboard-brand">
          Travelers Safety Covered
        </a>
        <a href="/admin" className="admin-back-link">
          Back to dashboard
        </a>
      </header>

      <section className="dashboard-content">
        <span className="dashboard-eyebrow">
          TSC ADMINISTRATION PORTAL
        </span>
        <h1>Traveller Management</h1>
        <p>
          View traveller accounts and manage account status according
          to your assigned permissions.
        </p>

        {result.error ? (
          <p role="alert">{result.error}</p>
        ) : (
          <TravellerManagementClient
            travellers={result.travellers ?? []}
            canManage={manageAccess.authorized}
          />
        )}
      </section>
    </main>
  );
}
