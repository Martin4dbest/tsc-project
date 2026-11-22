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

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
      <rect x="3" y="5" width="18" height="15" rx="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3 9h18M16 14h2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M7 5V4a2 2 0 0 1 2-2h9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ActivityIcon({ type }: { type: "credit" | "debit" }) {
  return type === "credit" ? (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="M12 19V5m-6 6 6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="M12 5v14m-6-6 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
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

  const activity = transactions ?? [];
  const totalCredits = activity
    .filter((item) => item.transaction_type === "credit")
    .reduce((sum, item) => sum + Number(item.amount_minor), 0);

  const totalDebits = activity
    .filter((item) => item.transaction_type === "debit")
    .reduce((sum, item) => sum + Number(item.amount_minor), 0);

  const isActive = wallet?.status === "active";

  return (
    <main className="tsc-dashboard-content space-y-7 pb-10">
      {/* Page heading */}
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
              Traveller Financial Centre
            </span>
          </div>
          <h1 className="text-lg font-extrabold tracking-tight text-slate-950 sm:text-lg">
            My Wallet
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
            Your money, your records, all in one secure place.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 sm:self-auto"
        >
          <span aria-hidden="true">←</span>
          Back to dashboard
        </Link>
      </header>

      {walletError ? (
        <section className="rounded-3xl border border-red-200 bg-red-50 p-7">
          <h2 className="text-lg font-bold text-red-900">Wallet temporarily unavailable</h2>
          <p className="mt-2 text-sm leading-6 text-red-700">
            We could not load your wallet at the moment. Please refresh the page and try again.
          </p>
        </section>
      ) : !wallet ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <WalletIcon />
          </div>
          <h2 className="mt-5 text-lg font-extrabold text-slate-900">
            Your wallet is being prepared
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Your TSC wallet account has not been created yet. Please check again shortly.
          </p>
        </section>
      ) : (
        <>
          {/* Main balance card */}
          <section className="relative isolate overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 p-6 text-white shadow-xl shadow-blue-950/15 sm:p-9">
            <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -right-8 -top-16 h-56 w-56 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

            <div className="relative">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-blue-100 backdrop-blur">
                    <WalletIcon />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">
                      TSC Digital Wallet
                    </p>
                    <p className="mt-1 text-sm text-blue-100/75">
                      Traveller account balance
                    </p>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-bold ${
                    isActive
                      ? "border-emerald-300/25 bg-emerald-400/15 text-emerald-200"
                      : "border-amber-300/25 bg-amber-400/15 text-amber-200"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${isActive ? "bg-emerald-400" : "bg-amber-400"}`} />
                  {isActive ? "Wallet Active" : "Wallet Frozen"}
                </span>
              </div>

              <div className="mt-10">
                <p className="text-sm font-medium text-blue-100/75">
                  Available wallet balance
                </p>
                <h2 className="mt-3 break-words text-lg font-extrabold tracking-tight sm:text-lg lg:text-xl">
                  {money(Number(wallet.balance_minor), wallet.currency_code)}
                </h2>
                <p className="mt-4 text-sm text-blue-100/65">
                  Your current available balance
                </p>
              </div>

              <div className="mt-9 flex flex-wrap items-center justify-between gap-4 border-t border-white/15 pt-5">
                <div className="flex items-center gap-2 text-sm text-blue-100/80">
                  <ShieldIcon />
                  <span>Protected by TSC wallet security</span>
                </div>
                <span className="text-xs font-semibold tracking-wider text-blue-200/70">
                  NGN WALLET
                </span>
              </div>
            </div>
          </section>

          {/* Activity summary */}
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  Wallet overview
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  A quick look at your latest account activity.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                Latest 50 transactions
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-500">Money received</span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <ActivityIcon type="credit" />
                  </span>
                </div>
                <p className="mt-4 break-words text-lg font-extrabold text-slate-950">
                  {money(totalCredits, wallet.currency_code)}
                </p>
                <p className="mt-1 text-xs text-slate-400">Credits in latest 50 records</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-500">Money spent</span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                    <ActivityIcon type="debit" />
                  </span>
                </div>
                <p className="mt-4 break-words text-lg font-extrabold text-slate-950">
                  {money(totalDebits, wallet.currency_code)}
                </p>
                <p className="mt-1 text-xs text-slate-400">Debits in latest 50 records</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-500">Transactions</span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </span>
                </div>
                <p className="mt-4 text-lg font-extrabold text-slate-950">
                  {activity.length}
                </p>
                <p className="mt-1 text-xs text-slate-400">Records displayed</p>
              </div>
            </div>
          </section>

          {/* Transaction history */}
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:p-7">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-600" />
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
                    Account activity
                  </span>
                </div>
                <h2 className="mt-2 text-lg font-extrabold text-slate-950">
                  Transaction history
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Track money coming into and leaving your wallet.
                </p>
              </div>
              <span className="self-start rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                Most recent first
              </span>
            </div>

            {!activity.length ? (
              <div className="px-6 py-14 text-center sm:py-16">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M7 9h10M7 13h6M7 16h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </div>
                <h3 className="mt-5 text-lg font-extrabold text-slate-900">
                  No transactions yet
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                  Your wallet activity will appear here whenever a transaction is recorded.
                  Your transaction history will always be available for you to review.
                </p>
              </div>
            ) : (
              <>
                {/* Mobile transaction cards */}
                <div className="divide-y divide-slate-100 md:hidden">
                  {activity.map((item) => {
                    const isCredit = item.transaction_type === "credit";

                    return (
                      <div key={item.id} className="p-5">
                        <div className="flex items-start gap-3">
                          <span
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                              isCredit
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-rose-50 text-rose-600"
                            }`}
                          >
                            <ActivityIcon type={isCredit ? "credit" : "debit"} />
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="break-words text-sm font-bold text-slate-900">
                                  {item.description || "Wallet transaction"}
                                </p>
                                <p className="mt-1 text-xs text-slate-400">
                                  {dateLabel(item.created_at)}
                                </p>
                              </div>
                              <p className={`shrink-0 text-sm font-extrabold ${isCredit ? "text-emerald-600" : "text-rose-600"}`}>
                                {isCredit ? "+" : "−"}
                                {money(Number(item.amount_minor), item.currency_code)}
                              </p>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                              <span className="text-xs font-semibold text-slate-400">
                                {isCredit ? "Credit" : "Debit"}
                              </span>
                              <span className="text-xs font-bold text-slate-600">
                                Balance: {money(Number(item.balance_after_minor), item.currency_code)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop transaction table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[720px] border-collapse text-left">
                    <thead>
                      <tr className="bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500">
                        <th className="px-6 py-4">Transaction</th>
                        <th className="px-6 py-4">Description</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4 text-right">Amount</th>
                        <th className="px-6 py-4 text-right">Balance after</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activity.map((item) => {
                        const isCredit = item.transaction_type === "credit";

                        return (
                          <tr key={item.id} className="transition hover:bg-slate-50/70">
                            <td className="px-6 py-5">
                              <span className="inline-flex items-center gap-2.5">
                                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                                  isCredit
                                    ? "bg-emerald-50 text-emerald-600"
                                    : "bg-rose-50 text-rose-600"
                                }`}>
                                  <ActivityIcon type={isCredit ? "credit" : "debit"} />
                                </span>
                                <span className="text-sm font-bold text-slate-700">
                                  {isCredit ? "Credit" : "Debit"}
                                </span>
                              </span>
                            </td>
                            <td className="max-w-[240px] px-6 py-5 text-sm text-slate-600">
                              <span className="block truncate">
                                {item.description || "Wallet transaction"}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-6 py-5 text-sm text-slate-500">
                              {dateLabel(item.created_at)}
                            </td>
                            <td className={`whitespace-nowrap px-6 py-5 text-right text-sm font-extrabold ${
                              isCredit ? "text-emerald-600" : "text-rose-600"
                            }`}>
                              {isCredit ? "+" : "−"}
                              {money(Number(item.amount_minor), item.currency_code)}
                            </td>
                            <td className="whitespace-nowrap px-6 py-5 text-right text-sm font-bold text-slate-700">
                              {money(Number(item.balance_after_minor), item.currency_code)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-7">
              <p className="text-xs leading-5 text-slate-500">
                Showing your latest {activity.length} of up to 50 wallet transactions.
                All displayed dates use West Africa Time (WAT).
              </p>
            </div>
          </section>

          {/* Security reassurance */}
          <section className="flex flex-col gap-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-5 sm:flex-row sm:items-center sm:p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
              <ShieldIcon />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900">
                Your wallet. Your records. Your peace of mind.
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Your wallet balance and transaction records are securely maintained by TSC.
                Your transaction history provides a clear record of your wallet activity.
              </p>
            </div>
          </section>
        </>
      )}

      <footer className="flex flex-col justify-between gap-3 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center">
        <span className="font-bold tracking-[0.16em] text-slate-600">
          TRAVELLERS SAFETY COVERED
        </span>
        <Link
          href="/dashboard"
          className="font-semibold text-blue-700 transition hover:text-blue-900"
        >
          Return to dashboard →
        </Link>
      </footer>
    </main>
  );
}
