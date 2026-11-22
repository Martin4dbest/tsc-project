export const instant = false;

import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import WalletFunding from "@/components/wallet/wallet-funding";

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
    <div className="min-h-screen bg-gradient-to-b from-[#EEF3FA] via-[#F5F8FC] to-[#EEF3FA] text-[#0F2952] selection:bg-[#F5A623] selection:text-[#0F2952]">
      {/* Vibrant TSC Navy & Gold Top Accent Bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#0F2952] via-[#1D4ED8] to-[#F5A623]" />

      {/* Sticky Top Navigation Header */}
      <header className="sticky top-0 z-30 border-b border-[#1D4ED8]/15 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-[#1D4ED8]/20 bg-[#EEF4FF] px-3.5 py-2 text-sm font-bold text-[#1D4ED8] transition-all hover:bg-[#0F2952] hover:text-[#F5A623]"
            >
              <span aria-hidden="true">⬅️</span>
              <span>Dashboard</span>
            </Link>

            <span className="hidden text-sm text-[#94A3B8] sm:inline">/</span>

            <span className="hidden items-center gap-1.5 rounded-full bg-amber-100/90 px-3 py-1 text-xs font-bold text-[#B45309] sm:inline-flex">
              <span aria-hidden="true">💳</span>
              <span>My Wallet</span>
            </span>
          </div>

          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0F2952] to-[#1D4ED8] text-sm font-extrabold tracking-wider text-[#F5A623] shadow-xs">
              TSC
            </span>
            <div className="hidden leading-tight sm:block">
              <p className="text-sm font-extrabold tracking-wide text-[#0F2952]">
                🛡️ TRAVELLERS SAFETY
              </p>
              <p className="text-xs font-bold tracking-widest text-[#D97706]">
                COVERED
              </p>
            </div>
          </Link>
        </div>
      </header>

      <main className="tsc-dashboard-content mx-auto max-w-6xl space-y-7 px-4 py-6 sm:px-6 sm:py-8">
        {/* Page heading */}
        <header className="flex flex-col justify-between gap-4 rounded-2xl border border-[#1D4ED8]/15 bg-white p-5 shadow-2xs sm:flex-row sm:items-center sm:p-6">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span aria-hidden="true" className="text-sm">
                💼
              </span>
              <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#B45309]">
                Traveller Financial Centre
              </span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#0F2952] sm:text-3xl">
              <span aria-hidden="true" className="mr-2">
                💳
              </span>
              My Wallet
            </h1>
            <p className="mt-1.5 max-w-xl text-sm leading-6 text-[#1E3A8A] sm:text-base">
              Your money, your records, all in one secure place.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-[#F5A623] px-5 py-3 text-sm font-extrabold text-[#0F2952] shadow-xs transition hover:bg-[#FBBF24] sm:self-auto"
          >
            <span aria-hidden="true">↩️</span>
            <span>Back to dashboard</span>
          </Link>
        </header>

        {wallet && (
          <div className="rounded-2xl border border-[#1D4ED8]/15 bg-white p-4 shadow-2xs sm:p-5">
            <WalletFunding walletActive={wallet.status === "active"} />
          </div>
        )}

        {walletError ? (
          <section className="rounded-3xl border border-amber-300 bg-amber-50 p-7 shadow-xs">
            <h2 className="text-lg font-extrabold text-[#B45309]">
              ⚠️ Wallet temporarily unavailable
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#0F2952]">
              We could not load your wallet at the moment. Please refresh the page and try again.
            </p>
          </section>
        ) : !wallet ? (
          <section className="rounded-3xl border border-[#1D4ED8]/15 bg-white p-8 text-center shadow-sm sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#1D4ED8]">
              <WalletIcon />
            </div>
            <h2 className="mt-5 text-xl font-extrabold text-[#0F2952]">
              🧳 Your wallet is being prepared
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 sm:text-base">
              Your TSC wallet account has not been created yet. Please check again shortly.
            </p>
          </section>
        ) : (
          <>
            {/* Main balance card */}
            <section className="relative isolate overflow-hidden rounded-[28px] border border-[#F5A623]/35 bg-gradient-to-br from-[#0F2952] via-[#13356B] to-[#1E40AF] p-6 text-white shadow-xl shadow-[#0F2952]/15 sm:p-9">
              <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full border border-[#F5A623]/15" />
              <div className="pointer-events-none absolute -right-8 -top-16 h-56 w-56 rounded-full border border-white/10" />
              <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-[#F5A623]/15 blur-3xl" />

              <div className="relative">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#F5A623]/40 bg-[#F5A623]/15 text-[#FBBF24] backdrop-blur">
                      <WalletIcon />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#FCD34D]">
                        💰 TSC Digital Wallet
                      </p>
                      <p className="mt-1 text-sm text-blue-100">
                        Traveller account balance
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-extrabold sm:text-sm ${
                      isActive
                        ? "border-emerald-300/35 bg-emerald-500/20 text-emerald-200"
                        : "border-amber-300/35 bg-amber-400/20 text-[#FCD34D]"
                    }`}
                  >
                    <span aria-hidden="true">
                      {isActive ? "✅" : "⏳"}
                    </span>
                    <span>{isActive ? "Wallet Active" : "Wallet Frozen"}</span>
                  </span>
                </div>

                <div className="mt-9">
                  <p className="text-sm font-semibold text-blue-100">
                    Available wallet balance
                  </p>
                  <h2 className="mt-2.5 break-words text-2xl font-extrabold tracking-tight text-[#FBBF24] sm:text-3xl lg:text-4xl">
                    {money(Number(wallet.balance_minor), wallet.currency_code)}
                  </h2>
                  <p className="mt-3 text-sm text-blue-100/80">
                    Your current available balance
                  </p>
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/15 pt-5">
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-200">
                    <ShieldIcon />
                    <span>Protected by TSC wallet security</span>
                  </div>
                  <span className="rounded-lg bg-[#F5A623]/20 px-3 py-1 text-xs font-extrabold tracking-wider text-[#FCD34D]">
                    {wallet.currency_code || "NGN"} WALLET
                  </span>
                </div>
              </div>
            </section>

            {/* Activity summary */}
            <section>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-extrabold text-[#0F2952] sm:text-xl">
                    📊 Wallet overview
                  </h2>
                  <p className="mt-1 text-sm text-[#1E3A8A]">
                    A quick look at your latest account activity.
                  </p>
                </div>
                <span className="rounded-full border border-[#1D4ED8]/15 bg-white px-3.5 py-1.5 text-xs font-bold text-[#1D4ED8] shadow-2xs">
                  Latest 50 transactions
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* Credits in Green */}
                <div className="rounded-2xl border border-emerald-200/90 bg-white p-5 shadow-2xs">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-emerald-700">
                      📥 Money received
                    </span>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <ActivityIcon type="credit" />
                    </span>
                  </div>
                  <p className="mt-4 break-words text-xl font-extrabold text-emerald-700 sm:text-2xl">
                    {money(totalCredits, wallet.currency_code)}
                  </p>
                  <p className="mt-1 text-xs font-medium text-emerald-700/80 sm:text-sm">
                    Credits in latest 50 records
                  </p>
                </div>

                {/* Debits in Royal Navy / Amber */}
                <div className="rounded-2xl border border-amber-200/90 bg-white p-5 shadow-2xs">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-[#B45309]">
                      📤 Money spent
                    </span>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-[#B45309]">
                      <ActivityIcon type="debit" />
                    </span>
                  </div>
                  <p className="mt-4 break-words text-xl font-extrabold text-[#0F2952] sm:text-2xl">
                    {money(totalDebits, wallet.currency_code)}
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-600 sm:text-sm">
                    Debits in latest 50 records
                  </p>
                </div>

                {/* Count in Sapphire Blue */}
                <div className="rounded-2xl border border-blue-200/90 bg-white p-5 shadow-2xs">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-[#1D4ED8]">
                      🧾 Transactions
                    </span>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1D4ED8]">
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                        <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </span>
                  </div>
                  <p className="mt-4 text-xl font-extrabold text-[#1D4ED8] sm:text-2xl">
                    {activity.length}
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-600 sm:text-sm">
                    Records displayed
                  </p>
                </div>
              </div>
            </section>

            {/* Transaction history */}
            <section className="overflow-hidden rounded-3xl border border-[#1D4ED8]/15 bg-white shadow-sm">
              <div className="flex flex-col justify-between gap-3 border-b border-blue-100 bg-gradient-to-r from-[#0F2952] to-[#1E3A8A] px-5 py-4 text-white sm:flex-row sm:items-center sm:px-7">
                <div>
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true" className="text-sm">
                      📋
                    </span>
                    <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#FCD34D]">
                      Account activity
                    </span>
                  </div>
                  <h2 className="mt-1.5 text-lg font-extrabold text-white sm:text-xl">
                    Transaction history
                  </h2>
                  <p className="mt-1 text-sm text-blue-100">
                    Track money coming into and leaving your wallet.
                  </p>
                </div>
                <span className="self-start rounded-xl bg-white/15 px-3.5 py-2 text-xs font-bold text-[#FCD34D]">
                  🕒 Most recent first
                </span>
              </div>

              {!activity.length ? (
                <div className="px-6 py-14 text-center sm:py-16">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#1D4ED8]">
                    <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8" aria-hidden="true">
                      <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.6" />
                      <path d="M7 9h10M7 13h6M7 16h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </div>
                  <h3 className="mt-5 text-lg font-extrabold text-[#0F2952]">
                    No transactions yet
                  </h3>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-600">
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
                          <div className="flex items-start gap-3.5">
                            <span
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                                isCredit
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-[#B45309]"
                              }`}
                            >
                              <ActivityIcon type={isCredit ? "credit" : "debit"} />
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="break-words text-sm font-extrabold text-[#0F2952]">
                                    {item.description || "Wallet transaction"}
                                  </p>
                                  <p className="mt-1 text-xs font-medium text-slate-500">
                                    🗓️ {dateLabel(item.created_at)}
                                  </p>
                                </div>
                                <p
                                  className={`shrink-0 text-sm font-extrabold sm:text-base ${
                                    isCredit ? "text-emerald-700" : "text-[#B45309]"
                                  }`}
                                >
                                  {isCredit ? "🟢 +" : "🟡 −"}
                                  {money(Number(item.amount_minor), item.currency_code)}
                                </p>
                              </div>

                              <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs sm:text-sm">
                                <span
                                  className={`font-bold ${
                                    isCredit ? "text-emerald-700" : "text-[#1D4ED8]"
                                  }`}
                                >
                                  {isCredit ? "Credit" : "Debit"}
                                </span>
                                <span className="font-bold text-[#0F2952]">
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
                        <tr className="bg-[#F4F8FF] text-xs font-extrabold uppercase tracking-wider text-[#0F2952]">
                          <th className="px-6 py-4">Transaction</th>
                          <th className="px-6 py-4">Description</th>
                          <th className="px-6 py-4">Date</th>
                          <th className="px-6 py-4 text-right">Amount</th>
                          <th className="px-6 py-4 text-right">Balance after</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {activity.map((item) => {
                          const isCredit = item.transaction_type === "credit";

                          return (
                            <tr key={item.id} className="transition hover:bg-blue-50/40">
                              <td className="px-6 py-5">
                                <span className="inline-flex items-center gap-2.5">
                                  <span
                                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                                      isCredit
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-amber-50 text-[#B45309]"
                                    }`}
                                  >
                                    <ActivityIcon type={isCredit ? "credit" : "debit"} />
                                  </span>
                                  <span
                                    className={`font-extrabold ${
                                      isCredit ? "text-emerald-700" : "text-[#1D4ED8]"
                                    }`}
                                  >
                                    {isCredit ? "Credit" : "Debit"}
                                  </span>
                                </span>
                              </td>
                              <td className="max-w-[260px] px-6 py-5 font-medium text-[#0F2952]">
                                <span className="block truncate">
                                  {item.description || "Wallet transaction"}
                                </span>
                              </td>
                              <td className="whitespace-nowrap px-6 py-5 text-slate-600">
                                {dateLabel(item.created_at)}
                              </td>
                              <td
                                className={`whitespace-nowrap px-6 py-5 text-right font-extrabold ${
                                  isCredit ? "text-emerald-700" : "text-[#B45309]"
                                }`}
                              >
                                {isCredit ? "🟢 +" : "🟡 −"}
                                {money(Number(item.amount_minor), item.currency_code)}
                              </td>
                              <td className="whitespace-nowrap px-6 py-5 text-right font-extrabold text-[#0F2952]">
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

              <div className="border-t border-slate-100 bg-[#F8FAFD] px-5 py-4 sm:px-7">
                <p className="text-xs font-medium leading-5 text-slate-600 sm:text-sm">
                  Showing your latest {activity.length} of up to 50 wallet transactions.
                  All displayed dates use West Africa Time (WAT).
                </p>
              </div>
            </section>

            {/* Security reassurance */}
            <section className="flex flex-col gap-4 rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/80 via-white to-amber-50/70 p-5 shadow-2xs sm:flex-row sm:items-center sm:p-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs">
                <ShieldIcon />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#0F2952]">
                  🛡️ Your wallet. Your records. Your peace of mind.
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-700">
                  Your wallet balance and transaction records are securely maintained by TSC.
                  Your transaction history provides a clear record of your wallet activity.
                </p>
              </div>
            </section>
          </>
        )}

        <footer className="flex flex-col justify-between gap-3 rounded-2xl border border-blue-100 bg-white px-5 py-4 text-xs text-slate-600 sm:flex-row sm:items-center sm:text-sm">
          <span className="font-extrabold tracking-[0.14em] text-[#0F2952]">
            🌐 TRAVELLERS SAFETY COVERED
          </span>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 font-extrabold text-[#B45309] transition hover:text-[#0F2952]"
          >
            <span>Return to dashboard</span>
            <span aria-hidden="true">↩️</span>
          </Link>
        </footer>
      </main>
    </div>
  );
}