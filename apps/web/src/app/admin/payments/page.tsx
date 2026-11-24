import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";


export const metadata = {
  title: "My Payments | TSC",
  description: "View your TSC payment records and payment activity.",
};

type PaymentRecord = {
  id: string;
  amount_minor: number;
  currency_code: string;
  provider: string;
  purpose: string;
  status: string;
  reference: string;
  provider_transaction_id: string | null;
  description: string | null;
  created_at: string;
  verified_at: string | null;
};

function money(amount: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

function dateLabel(value: string) {
  return new Date(value).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  });
}

function statusBadgeStyle(status: string) {
  switch (status) {
    case "succeeded":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "pending":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "failed":
      return "bg-red-50 text-red-700 border-red-200";
    case "refunded":
      return "bg-slate-100 text-slate-700 border-slate-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function label(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

async function TravellerPaymentsContent() {

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: payments, error } = await supabase
    .from("tsc_payment_records")
    .select(
      "id, amount_minor, currency_code, provider, purpose, status, reference, provider_transaction_id, description, created_at, verified_at"
    )
    .eq("traveller_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const records = (payments ?? []) as PaymentRecord[];

  const successful = records.filter(
    (payment) => payment.status === "succeeded"
  );

  const pending = records.filter(
    (payment) => payment.status === "pending"
  );

  const successfulValue = successful.reduce(
    (total, payment) => total + Number(payment.amount_minor),
    0
  );

  return (
    <main className="min-h-screen bg-[#F4F7FB] text-[#172B42]">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Top Bar */}
        <header className="flex flex-col justify-between gap-4 rounded-2xl border border-[#E6ECF2] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:px-6">
          <div className="flex items-start gap-3.5 sm:items-center">
            <Link
              href="/dashboard"
              aria-label="Back to dashboard"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E6ECF2] bg-[#F0F5F9] text-[#102D50] transition hover:border-[#187B83]/40 hover:bg-[#E6F4F3]"
            >
              ←
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#E98012]" />
                <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#187B83]">
                  Traveller Payment Centre
                </span>
              </div>
              <h1 className="mt-0.5 text-xl font-black tracking-tight text-[#102D50] sm:text-2xl">
                My Payments
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/dashboard/wallet"
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#187B83] px-4 py-2 text-xs font-extrabold text-white transition hover:bg-[#14686F] sm:text-sm"
            >
              Open My Wallet
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#E6ECF2] bg-white px-4 py-2 text-xs font-bold text-[#102D50] transition hover:bg-[#F0F5F9] sm:text-sm"
            >
              Dashboard
            </Link>
          </div>
        </header>

        {/* Intro / Hero Banner matching Mobile */}
        <section className="rounded-3xl bg-[#102D50] p-5 text-white shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-xl font-black text-white">
                ₦
              </div>
              <div>
                <h2 className="text-lg font-extrabold tracking-tight text-white">
                  Your payment activity
                </h2>
                <p className="mt-1 max-w-xl text-xs leading-5 text-[#DCE8F4] sm:text-sm">
                  Review your TSC payment records, transaction references, and
                  payment statuses in one organized view.
                </p>
              </div>
            </div>

            <Link
              href="/dashboard/wallet"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#187B83] px-5 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#14686F]"
            >
              <span>Open My Wallet</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>

        {/* Summary Stats Grid */}
        <section className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#E6ECF2] bg-white p-4 shadow-sm sm:p-5">
            <p className="text-xs font-semibold text-[#718096]">
              Total records
            </p>
            <p className="mt-2 text-2xl font-black tabular-nums text-[#102D50]">
              {records.length}
            </p>
          </div>

          <div className="rounded-2xl border border-[#E6ECF2] bg-white p-4 shadow-sm sm:p-5">
            <p className="text-xs font-semibold text-[#718096]">
              Successful
            </p>
            <p className="mt-2 text-2xl font-black tabular-nums text-[#059669]">
              {successful.length}
            </p>
          </div>

          <div className="rounded-2xl border border-[#E6ECF2] bg-white p-4 shadow-sm sm:p-5">
            <p className="text-xs font-semibold text-[#718096]">
              Pending
            </p>
            <p className="mt-2 text-2xl font-black tabular-nums text-[#D97706]">
              {pending.length}
            </p>
          </div>
        </section>

        {/* Successful Payment Value Card */}
        <section className="flex items-center justify-between gap-4 rounded-2xl border border-[#E6ECF2] bg-white p-4 shadow-sm sm:px-6 sm:py-5">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#718096]">
              Successful payment value
            </p>
            <p className="mt-1.5 text-2xl font-black tabular-nums text-[#059669] sm:text-[26px]">
              {money(successfulValue)}
            </p>
          </div>

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#E8F7EF] text-lg font-black text-[#059669]">
            ✓
          </div>
        </section>

        {/* Payment History Section */}
        <section className="space-y-4">
          <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-lg font-black text-[#102D50] sm:text-xl">
                Payment history
              </h2>
              <p className="text-xs text-[#718096] sm:text-sm">
                Your latest 100 payment records
              </p>
            </div>
            <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#187B83]">
              {records.length} {records.length === 1 ? "record" : "records"}
            </span>
          </div>

          {error ? (
            <div className="rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-lg font-black text-[#DC2626]">
                !
              </div>
              <h3 className="mt-3.5 text-base font-black text-[#102D50]">
                Payment history unavailable
              </h3>
              <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-[#718096] sm:text-sm">
                We could not load your payment history. Please refresh the page
                and try again.
              </p>
            </div>
          ) : records.length === 0 ? (
            <div className="rounded-3xl border border-[#E6ECF2] bg-white p-8 text-center shadow-sm sm:p-10">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E6F4F3] text-2xl font-black text-[#187B83]">
                ₦
              </div>
              <h3 className="mt-4 text-base font-black text-[#102D50] sm:text-lg">
                No payment records yet
              </h3>
              <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-[#718096] sm:text-sm">
                Payments you make through TSC will appear here with their
                references and transaction statuses.
              </p>
              <Link
                href="/dashboard/wallet"
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#174D78] px-5 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#102D50] sm:text-sm"
              >
                Go to My Wallet
              </Link>
            </div>
          ) : (
            <div className="space-y-3.5">
              {records.map((payment) => (
                <article
                  key={payment.id}
                  className="rounded-2xl border border-[#E6ECF2] bg-white p-4 shadow-sm transition hover:border-[#187B83]/35 sm:p-5"
                >
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-extrabold ${statusBadgeStyle(payment.status)}`}
                      >
                        {label(payment.status)}
                      </span>
                      <span className="rounded-md bg-[#F0F5F9] px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#718096]">
                        {label(payment.provider)}
                      </span>
                    </div>

                    <time className="text-xs font-medium text-[#718096]">
                      {dateLabel(payment.created_at)}
                    </time>
                  </div>

                  <div className="mt-3.5 flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-xl font-black tabular-nums text-[#102D50] sm:text-2xl">
                      {money(
                        Number(payment.amount_minor),
                        payment.currency_code
                      )}
                    </h3>
                    <span className="text-xs font-extrabold text-[#187B83] sm:text-sm">
                      {label(payment.purpose)}
                    </span>
                  </div>

                  {payment.description && (
                    <p className="mt-1.5 text-xs leading-5 text-[#718096] sm:text-sm">
                      {payment.description}
                    </p>
                  )}

                  <div className="my-3.5 h-px bg-[#E6ECF2]" />

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="min-w-0 rounded-xl bg-[#F8FAFC] p-3">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#718096]">
                        Payment reference
                      </p>
                      <p className="mt-1 select-all break-all text-xs font-bold text-[#172B42]">
                        {payment.reference}
                      </p>
                    </div>

                    <div className="min-w-0 rounded-xl bg-[#F8FAFC] p-3">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#718096]">
                        Provider transaction ID
                      </p>
                      <p className="mt-1 select-all break-all text-xs font-bold text-[#172B42]">
                        {payment.provider_transaction_id ||
                          "Not yet available"}
                      </p>
                    </div>
                  </div>

                  {payment.verified_at && (
                    <div className="mt-3.5 inline-flex items-center gap-1.5 rounded-lg bg-[#E8F7EF] px-2.5 py-1.5 text-xs font-bold text-[#059669]">
                      <span>✓</span>
                      <span>Verified {dateLabel(payment.verified_at)}</span>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Helpful Wallet Prompt */}
        <section className="rounded-2xl border border-[#E6ECF2] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-sm font-extrabold text-[#102D50]">
                Need to fund your TSC wallet?
              </h2>
              <p className="mt-1 text-xs leading-5 text-[#718096]">
                Completed wallet funding payments automatically appear in your
                payment history above.
              </p>
            </div>
            <Link
              href="/dashboard/wallet"
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-[#E6F4F3] px-4 py-2 text-xs font-extrabold text-[#187B83] transition hover:bg-[#d5ecea]"
            >
              Go to My Wallet →
            </Link>
          </div>
        </section>

        {/* Footer matching Mobile */}
        <footer className="pt-4 pb-6 text-center">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#718096]">
            Travellers Safety Covered
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-[#718096]">
            Your safety. Our priority.
          </p>
        </footer>
      </div>
    </main>
  );
}
export default function TravellerPaymentsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#F4F7FB] px-4 py-10 text-[#172B42]">
          <div className="mx-auto max-w-5xl rounded-2xl border border-[#E6ECF2] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#E6ECF2] border-t-[#187B83]" />
            <p className="mt-4 text-sm font-bold">
              Loading payment records...
            </p>
          </div>
        </main>
      }
    >
      <TravellerPaymentsContent />
    </Suspense>
  );
}
