import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdminPermission } from "@/lib/admin-permissions";
import PaymentOperationsClient from "./payment-operations-client";

export const instant = false;

export const metadata = {
  title: "Payment Operations | TSC Admin",
  description: "Monitor and review traveller payment transactions.",
};

export default async function AdminPaymentsPage() {
  await connection();

  const access = await requireAdminPermission("payments.view");

  if (!access.authorized) {
    if (access.reason === "unauthenticated") redirect("/admin/login");
    redirect("/admin");
  }

  const [paymentsResult, profilesResult] = await Promise.all([
    access.supabase
      .from("tsc_payment_records")
      .select(
        "id, traveller_id, wallet_id, wallet_transaction_id, provider, purpose, status, amount_minor, currency_code, reference, provider_transaction_id, description, metadata, created_at, updated_at, verified_at"
      )
      .order("created_at", { ascending: false })
      .limit(500),

    access.supabase
      .from("profiles")
      .select("user_id, full_name, phone")
      .eq("role", "traveller"),
  ]);

  if (paymentsResult.error) {
    throw new Error("Unable to load payment records.");
  }

  if (profilesResult.error) {
    throw new Error("Unable to load traveller information.");
  }

  const profiles = profilesResult.data ?? [];

  const payments = (paymentsResult.data ?? []).map((payment) => {
    const traveller = profiles.find(
      (profile) => profile.user_id === payment.traveller_id
    );

    return {
      ...payment,
      traveller_name: traveller?.full_name ?? "Unknown traveller",
      traveller_phone: traveller?.phone ?? "",
    };
  });

  return (
    <main className="tsc-dashboard-content">
      <div className="tsc-overview-heading">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
            Financial management
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            Payment Operations
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Monitor Paystack transactions, wallet funding and payment
            verification records.
          </p>
        </div>

        <Link href="/admin" className="tsc-button tsc-button-light">
          Back to dashboard
        </Link>
      </div>

      <PaymentOperationsClient payments={payments} />
    </main>
  );
}
