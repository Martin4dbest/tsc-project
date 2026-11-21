import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { adjustTravellerWallet } from "./wallet-actions";

export const metadata = {
  title: "Wallet Management | TSC Command Centre",
};

function money(amount: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
  }).format(amount / 100);
}

function dateLabel(value: string) {
  return new Date(value).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  });
}

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

  const totalBalance = (wallets ?? []).reduce(
    (total, wallet) => total + Number(wallet.balance_minor),
    0
  );

  return (
    <main className="tsc-dashboard-content">
      <header className="tsc-overview-heading">
        <div>
          <span className="tsc-section-eyebrow">FINANCIAL OPERATIONS</span>
          <h1>Wallet Management</h1>
          <p>Review traveller wallet balances and manage authorised adjustments.</p>
        </div>
        <Link href="/admin" className="tsc-button tsc-button-light">
          Back to command centre
        </Link>
      </header>

      {(profilesError || walletsError) && (
        <section className="tsc-module-card">
          <p>Some wallet records could not be loaded. Refresh the page to try again.</p>
        </section>
      )}

      <section className="tsc-module-grid" style={{ marginBottom: 28 }}>
        <article className="tsc-module-card tsc-module-green">
          <span className="tsc-section-eyebrow">TOTAL WALLET BALANCE</span>
          <h2>{money(totalBalance)}</h2>
          <p>Combined balance across the wallets returned by the database.</p>
        </article>
        <article className="tsc-module-card tsc-module-blue">
          <span className="tsc-section-eyebrow">WALLET ACCOUNTS</span>
          <h2>{walletRows.length}</h2>
          <p>Traveller wallet accounts.</p>
        </article>
        <article className="tsc-module-card tsc-module-orange">
          <span className="tsc-section-eyebrow">ACTIVE WALLETS</span>
          <h2>{walletRows.filter((wallet) => wallet.status === "active").length}</h2>
          <p>Wallets currently marked active.</p>
        </article>
      </section>

      <section className="tsc-module-card" style={{ marginBottom: 28 }}>
        <span className="tsc-section-eyebrow">TRAVELLER ACCOUNTS</span>
        <h2>Wallet balances</h2>
        <p>Wallet balances and account status for registered travellers.</p>

        <div style={{ overflowX: "auto", marginTop: 18 }}>
          <table style={{ width: "100%", minWidth: 760, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 12 }}>Traveller</th>
                <th style={{ textAlign: "left", padding: 12 }}>Phone</th>
                <th style={{ textAlign: "right", padding: 12 }}>Balance</th>
                <th style={{ textAlign: "left", padding: 12 }}>Wallet status</th>
                {canManage && <th style={{ textAlign: "left", padding: 12 }}>Adjust wallet</th>}
              </tr>
            </thead>
            <tbody>
              {walletRows.map((wallet) => (
                <tr key={wallet.id} style={{ borderTop: "1px solid #E2E8F0" }}>
                  <td style={{ padding: 12 }}>
                    <strong>{wallet.profile?.full_name || "Unnamed traveller"}</strong>
                    <div style={{ fontSize: 12, color: "#64748B" }}>
                      {wallet.traveller_id}
                    </div>
                  </td>
                  <td style={{ padding: 12 }}>{wallet.profile?.phone || "—"}</td>
                  <td style={{ padding: 12, textAlign: "right", fontWeight: 700 }}>
                    {money(Number(wallet.balance_minor), wallet.currency_code)}
                  </td>
                  <td style={{ padding: 12 }}>
                    {wallet.status === "active" ? "Active" : "Frozen"}
                  </td>
                  {canManage && (
                    <td style={{ padding: 12, minWidth: 260 }}>
                      <form action={adjustTravellerWallet} style={{ display: "grid", gap: 8 }}>
                        <input type="hidden" name="traveller_id" value={wallet.traveller_id} />
                        <select
                          name="direction"
                          required
                          defaultValue="credit"
                          className="tsc-form-input"
                        >
                          <option value="credit">Credit wallet</option>
                          <option value="debit">Debit wallet</option>
                        </select>
                        <input
                          name="amount"
                          type="number"
                          min="0.01"
                          step="0.01"
                          required
                          placeholder="Amount in NGN"
                          className="tsc-form-input"
                        />
                        <input
                          name="reason"
                          type="text"
                          minLength={5}
                          required
                          placeholder="Reason for adjustment"
                          className="tsc-form-input"
                        />
                        <button type="submit" className="tsc-button tsc-button-primary">
                          Submit adjustment
                        </button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!walletRows.length && <p>No wallet accounts were found.</p>}
      </section>

      <section className="tsc-module-card">
        <span className="tsc-section-eyebrow">RECENT ACTIVITY</span>
        <h2>Latest transactions</h2>
        <div style={{ overflowX: "auto", marginTop: 18 }}>
          <table style={{ width: "100%", minWidth: 650, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 12 }}>Traveller</th>
                <th style={{ textAlign: "left", padding: 12 }}>Type</th>
                <th style={{ textAlign: "left", padding: 12 }}>Description</th>
                <th style={{ textAlign: "right", padding: 12 }}>Amount</th>
                <th style={{ textAlign: "left", padding: 12 }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {(recentTransactions ?? []).map((item) => (
                <tr key={item.id} style={{ borderTop: "1px solid #E2E8F0" }}>
                  <td style={{ padding: 12 }}>
                    {profileMap.get(item.traveller_id)?.full_name || "Traveller"}
                  </td>
                  <td style={{ padding: 12 }}>{item.transaction_type.toUpperCase()}</td>
                  <td style={{ padding: 12 }}>{item.description || "Wallet transaction"}</td>
                  <td style={{ padding: 12, textAlign: "right" }}>
                    {money(Number(item.amount_minor), item.currency_code)}
                  </td>
                  <td style={{ padding: 12 }}>{dateLabel(item.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!recentTransactions?.length && <p>No transactions have been recorded yet.</p>}
      </section>

      <footer className="tsc-dashboard-footer" style={{ marginTop: 32 }}>
        <span>TRAVELLERS SAFETY COVERED</span>
        <Link href="/admin">Return to command centre</Link>
      </footer>
    </main>
  );
}
