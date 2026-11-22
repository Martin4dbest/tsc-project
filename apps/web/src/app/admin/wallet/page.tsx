export const instant = false;

import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { adjustTravellerWallet } from "./wallet-actions";
import WalletManagementClient from "./wallet-management-client";

export const metadata = {
  title: "Wallet Management | TSC Command Centre",
};

export default async function AdminWalletPage() {
  await connection();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const permission = await requireAdminPermission("wallet.view");
  if (!permission.authorized) redirect("/admin");

  const canManage = (
    await requireAdminPermission("wallet.manage")
  ).authorized;

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("user_id, full_name, phone, account_status")
    .eq("role", "traveller")
    .order("full_name", { ascending: true });

  const { data: wallets, error: walletsError } = await supabase
    .from("wallet_accounts")
    .select("id, traveller_id, balance_minor, currency_code, status, created_at")
    .order("created_at", { ascending: false });

  const { data: recentTransactions } = await supabase
    .from("wallet_transactions")
    .select("id, traveller_id, transaction_type, amount_minor, currency_code, description, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  const profileMap = new Map(
    (profiles ?? []).map((profile) => [profile.user_id, profile])
  );

  const walletRows = (wallets ?? []).map((wallet) => ({
    ...wallet,
    profile: profileMap.get(wallet.traveller_id),
  }));

  const transactions = (recentTransactions ?? []).map((item) => ({
    ...item,
    traveller_name:
      profileMap.get(item.traveller_id)?.full_name || "Traveller",
  }));

  return (
    <main className="tsc-dashboard-content">
      <header className="tsc-overview-heading">
        <div>
          <span className="tsc-section-eyebrow">FINANCIAL OPERATIONS</span>
          <h1>Wallet Management</h1>
          <p>
            Monitor balances, review wallet activity and manage
            authorised adjustments.
          </p>
        </div>

        <Link href="/admin" className="tsc-button tsc-button-light">
          ← Back to command centre
        </Link>
      </header>

      {(profilesError || walletsError) && (
        <section className="tsc-module-card" style={{ marginBottom: 20 }}>
          <p>
            Some wallet records could not be loaded. Refresh the page to try again.
          </p>
        </section>
      )}

      <WalletManagementClient
        wallets={walletRows}
        transactions={transactions}
        canManage={canManage}
        adjustAction={adjustTravellerWallet}
      />

      <footer className="tsc-dashboard-footer" style={{ marginTop: 32 }}>
        <span>TRAVELLERS SAFETY COVERED</span>
        <Link href="/admin">Return to command centre</Link>
      </footer>
    </main>
  );
}
