export const instant = false;
import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const metadata = {
  title: "My Wallet | TSC",
  description: "View your TSC wallet balance and transaction history.",
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

export default async function TravellerWalletPage() {
  await connection();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: wallet, error: walletError } = await supabase
    .from("wallet_accounts")
    .select("id, balance_minor, currency_code, status, created_at")
    .eq("traveller_id", user.id)
    .maybeSingle();

  if (walletError) {
    console.error("Wallet loading failed:", walletError);
  }

  const { data: transactions, error: transactionError } = wallet
    ? await supabase
        .from("wallet_transactions")
        .select("id, transaction_type, amount_minor, balance_after_minor, currency_code, description, reference, created_at")
        .eq("wallet_id", wallet.id)
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [], error: null };

  if (transactionError) {
    console.error("Wallet transactions loading failed:", transactionError);
  }

  return (
    <main className="tsc-dashboard-content">
      <header className="tsc-overview-heading">
        <div>
          <span className="tsc-section-eyebrow">TRAVELLER FINANCIAL CENTRE</span>
          <h1>My Wallet</h1>
          <p>View your available balance and wallet transaction history.</p>
        </div>
        <Link href="/dashboard" className="tsc-button tsc-button-light">
          Back to dashboard
        </Link>
      </header>

      {walletError ? (
        <section className="tsc-module-card">
          <h2>Wallet temporarily unavailable</h2>
          <p>We could not load your wallet. Please refresh and try again.</p>
        </section>
      ) : !wallet ? (
        <section className="tsc-module-card">
          <h2>Your wallet is being prepared</h2>
          <p>Your wallet account has not been created yet. Please check again shortly.</p>
        </section>
      ) : (
        <>
          <section className="tsc-module-card" style={{ marginBottom: 24 }}>
            <span className="tsc-section-eyebrow">AVAILABLE WALLET BALANCE</span>
            <h2 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", margin: "12px 0" }}>
              {money(Number(wallet.balance_minor), wallet.currency_code)}
            </h2>
            <p>
              Wallet status:{" "}
              <strong>{wallet.status === "active" ? "Active" : "Frozen"}</strong>
            </p>
            <p style={{ marginTop: 12 }}>
              Your wallet balance and transaction records are securely maintained by TSC.
            </p>
          </section>

          <section className="tsc-module-card">
            <div className="tsc-overview-heading">
              <div>
                <span className="tsc-section-eyebrow">ACCOUNT ACTIVITY</span>
                <h2>Transaction history</h2>
                <p>Your latest 50 wallet transactions.</p>
              </div>
            </div>

            {!transactions?.length ? (
              <p>No wallet transactions have been recorded yet.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: 12 }}>Transaction</th>
                      <th style={{ textAlign: "left", padding: 12 }}>Description</th>
                      <th style={{ textAlign: "left", padding: 12 }}>Date</th>
                      <th style={{ textAlign: "right", padding: 12 }}>Amount</th>
                      <th style={{ textAlign: "right", padding: 12 }}>Balance after</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((item) => (
                      <tr key={item.id} style={{ borderTop: "1px solid #E2E8F0" }}>
                        <td style={{ padding: 12 }}>
                          <strong>{item.transaction_type.toUpperCase()}</strong>
                        </td>
                        <td style={{ padding: 12 }}>
                          {item.description || "Wallet transaction"}
                        </td>
                        <td style={{ padding: 12 }}>{dateLabel(item.created_at)}</td>
                        <td
                          style={{
                            padding: 12,
                            textAlign: "right",
                            fontWeight: 700,
                            color: item.transaction_type === "credit" ? "#059669" : "#DC2626",
                          }}
                        >
                          {item.transaction_type === "credit" ? "+" : "−"}
                          {money(Number(item.amount_minor), item.currency_code)}
                        </td>
                        <td style={{ padding: 12, textAlign: "right" }}>
                          {money(Number(item.balance_after_minor), item.currency_code)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      <footer className="tsc-dashboard-footer" style={{ marginTop: 32 }}>
        <span>TRAVELLERS SAFETY COVERED</span>
        <Link href="/dashboard">Return to dashboard</Link>
      </footer>
    </main>
  );
}
