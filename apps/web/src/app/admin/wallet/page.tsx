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

  const canManage = (await requireAdminPermission("wallet.manage"))
    .authorized;

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
    .select(
      "id, traveller_id, transaction_type, amount_minor, currency_code, description, created_at"
    )
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

  // Quick summary metrics for the top overview strip
  const totalWallets = walletRows.length;
  const activeWallets = walletRows.filter((w) => w.status === "active").length;
  const inactiveWallets = totalWallets - activeWallets;
  const recentTxCount = transactions.length;

  return (
    <main className="min-h-screen bg-[#F4F7FA] text-slate-900 selection:bg-[#0B1F3A] selection:text-white">
      {/* Top TSC Brand Accent Bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#0B1F3A] via-[#059669] to-[#D97706]" />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Top Breadcrumb & Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="mb-6 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Link
              href="/admin"
              className="flex items-center gap-1.5 font-semibold text-[#0B1F3A] transition-colors hover:text-[#059669]"
            >
              <span className="inline-block h-2 w-2 rounded-xs bg-[#059669]" />
              TSC Command Centre
            </Link>
            <span className="text-slate-300">/</span>
            <span className="rounded-md bg-slate-200/70 px-2 py-0.5 font-medium text-slate-700">
              Wallet Management
            </span>
          </div>

          <Link
            href="/admin"
            className="group inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-[#0B1F3A] shadow-xs transition-all hover:border-[#0B1F3A]/30 hover:bg-[#0B1F3A] hover:text-white"
          >
            <svg
              className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2.2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
            <span>Back to Command Centre</span>
          </Link>
        </nav>

        {/* Branded Hero Header Card */}
        <header className="relative mb-8 overflow-hidden rounded-2xl bg-[#0B1F3A] p-6 text-white shadow-md sm:p-8">
          {/* Subtle Decorative Brand Glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#059669]/20 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-[#D97706]/10 blur-3xl"
          />

          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="space-y-2.5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-wider text-emerald-300 uppercase backdrop-blur-xs">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                TSC Financial Operations
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Wallet Management
              </h1>

              <p className="max-w-2xl text-sm leading-relaxed text-slate-300">
                Monitor traveller wallet balances, audit real-time ledger
                movements, and execute authorised credit or debit adjustments.
              </p>
            </div>

            {/* Access Level Indicator Pill */}
            <div className="flex items-center gap-3 self-start lg:self-end">
              <div
                className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold shadow-xs backdrop-blur-xs ${
                  canManage
                    ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
                    : "border-amber-400/30 bg-amber-500/15 text-amber-200"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    canManage ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                />
                <span>
                  {canManage ? "Full Adjustment Access" : "Read-Only Audit Mode"}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Error Alert Banner */}
        {(profilesError || walletsError) && (
          <section
            role="alert"
            className="mb-6 flex items-start gap-3.5 rounded-xl border border-amber-300/80 bg-amber-50 p-4 text-sm text-amber-950 shadow-xs"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2.2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xs font-bold tracking-wider text-amber-900 uppercase">
                Partial Data Sync Warning
              </h2>
              <p className="mt-0.5 text-xs leading-relaxed text-amber-800">
                Some wallet or traveller profile records could not be loaded
                from the ledger. Refresh the page to sync the latest state.
              </p>
            </div>
          </section>
        )}

        {/* Quick Metric Strip */}
        <section
          aria-label="Wallet summary metrics"
          className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          {/* Total Wallets */}
          <div className="relative overflow-hidden rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
            <div className="absolute inset-x-0 top-0 h-1 bg-[#0B1F3A]" />
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                Total Wallets
              </p>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0B1F3A]/8 text-[#0B1F3A]">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"
                  />
                </svg>
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <p className="text-2xl font-bold tracking-tight text-[#0B1F3A]">
                {totalWallets}
              </p>
              <span className="text-xs font-medium text-slate-400">
                registered accounts
              </span>
            </div>
          </div>

          {/* Active Accounts */}
          <div className="relative overflow-hidden rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
            <div className="absolute inset-x-0 top-0 h-1 bg-[#059669]" />
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                Active Accounts
              </p>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-[#059669]">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
                  />
                </svg>
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <p className="text-2xl font-bold tracking-tight text-[#059669]">
                {activeWallets}
              </p>
              {inactiveWallets > 0 && (
                <span className="text-xs font-medium text-slate-400">
                  ({inactiveWallets} inactive)
                </span>
              )}
            </div>
          </div>

          {/* Recent Ledger Entries */}
          <div className="relative overflow-hidden rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
            <div className="absolute inset-x-0 top-0 h-1 bg-[#D97706]" />
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                Recent Ledger Entries
              </p>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-[#D97706]">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
                  />
                </svg>
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <p className="text-2xl font-bold tracking-tight text-slate-900">
                {recentTxCount}
              </p>
              <span className="text-xs font-medium text-slate-400">
                latest transactions
              </span>
            </div>
          </div>
        </section>

        {/* Main Interactive Client Workspace */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
          <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3.5 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#0B1F3A]" />
                <h2 className="text-xs font-bold tracking-wider text-[#0B1F3A] uppercase">
                  Traveller Accounts & Ledger Directory
                </h2>
              </div>
              <span className="text-[11px] font-medium text-slate-400">
                Live Supabase Sync
              </span>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <WalletManagementClient
              wallets={walletRows}
              transactions={transactions}
              canManage={canManage}
              adjustAction={adjustTravellerWallet}
            />
          </div>
        </section>

        {/* Branded Footer */}
        <footer className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-slate-200/80 pt-6 text-xs text-slate-500 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-[#059669]" />
            <span className="font-bold tracking-wider text-[#0B1F3A] uppercase">
              Travellers Safety Covered
            </span>
            <span className="text-slate-300">•</span>
            <span>Admin Financial Ledger</span>
          </div>

          <Link
            href="/admin"
            className="font-semibold text-[#0B1F3A] transition-colors hover:text-[#059669]"
          >
            Return to Command Centre →
          </Link>
        </footer>
      </div>
    </main>
  );
}