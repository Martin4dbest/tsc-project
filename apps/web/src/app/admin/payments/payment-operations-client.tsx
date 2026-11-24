import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const instant = false;

export const metadata = {
  title: "My Payments | TSC",
  description: "View your TSC payment records and payment activity.",
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

function statusStyle(status: string) {
  switch (status) {
    case "succeeded":
      return "bg-emerald-500/10 text-emerald-700 ring-1 ring-inset ring-emerald-500/25";
    case "pending":
      return "bg-amber-500/10 text-amber-700 ring-1 ring-inset ring-amber-500/25";
    case "failed":
      return "bg-red-500/10 text-red-700 ring-1 ring-inset ring-red-500/25";
    case "refunded":
      return "bg-slate-500/10 text-slate-700 ring-1 ring-inset ring-slate-500/20";
    default:
      return "bg-slate-500/10 text-slate-600 ring-1 ring-inset ring-slate-500/20";
  }
}

function label(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default async function TravellerPaymentsPage() {
  await connection();

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

  const records = payments ?? [];

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
    <main className="tsc-dashboard-content min-h-screen bg-[#F4F7FB] px-4 py-6 sm:px-7 sm:py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col justify-between gap-4 border-b border-[#E6ECF2] pb-5 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#e98012]" />
              <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#187B83]">
                Traveller Payment Centre
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-[#102D50] sm:text-3xl">
              My Payments
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/dashboard/wallet"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#174D78] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#102D50]"
            >
              <span>Open My Wallet</span>
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E6ECF2] bg-white px-4 py-2.5 text-sm font-bold text-[#172B42] shadow-sm transition hover:border-[#187B83]/40 hover:bg-[#F0F5F9]"
            >
              Back to dashboard
            </Link>
          </div>
        </header>

        <section className="rounded-3xl bg-gradient-to-br from-[#102D50] via-[#133B63] to-[#174D78] p-5 text-white shadow-md sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4 sm:items-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-lg font-black text-white ring-1 ring-white/20">
                ₦
              </div>
              <div>
                <h2 className="text-lg font-extrabold tracking-tight text-white">
                  Your payment activity
                </h2>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-[#DCE8F4] sm:text-sm sm:leading-6">
                  Review your TSC payment records, transaction references, and
                  payment statuses in one organized view.
                </p>
              </div>
            </div>

            <Link
              href="/dashboard/wallet"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#187B83] px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white transition hover:bg-[#14686f] sm:text-sm sm:normal-case sm:tracking-normal"
            >
              Fund Wallet
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="grid grid-cols-3 gap-3 lg:col-span-7 lg:gap-4">
            <div className="rounded-2xl border border-[#E6ECF2] bg-white p-4 shadow-xs sm:p-5">
              <p className="text-xs font-semibold text-[#718096]">
                Total records
              </p>
              <p className="mt-2.5 text-2xl font-black tabular-nums text-[#102D50] sm:text-3xl">
                {records.length}
              </p>
            </div>

            <div className="rounded-2xl border border-[#E6ECF2] bg-white p-4 shadow-xs sm:p-5">
              <p className="text-xs font-semibold text-[#718096]">
                Successful
              </p>
              <p className="mt-2.5 text-2xl font-black tabular-nums text-emerald-600 sm:text-3xl">
                {successful.length}
              </p>
            </div>

            <div className="rounded-2xl border border-[#E6ECF2] bg-white p-4 shadow-xs sm:p-5">
              <p className="text-xs font-semibold text-[#718096]">
                Pending
              </p>
              <p className="mt-2.5 text-2xl font-black tabular-nums text-amber-600 sm:text-3xl">
                {pending.length}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-[#E6ECF2] bg-white p-4 shadow-xs sm:p-5 lg:col-span-5">
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#718096]">
                Successful Payment Value
              </p>
              <p className="mt-2 truncate text-xl font-black tabular-nums text-emerald-600 sm:text-2xl">
                {money(successfulValue)}
              </p>
            </div>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-base font-black text-emerald-600">
              ✓
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[#E6ECF2] bg-white p-5 shadow-xs sm:p-7">
          <div className="flex flex-col justify-between gap-2 border-b border-[#E6ECF2] pb-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-lg font-black text-[#102D50] sm:text-xl">
                Payment history
              </h2>
              <p className="mt-0.5 text-xs text-[#718096] sm:text-sm">
                Your latest 100 payment records
              </p>
            </div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#187B83]">
              {records.length} {records.length === 1 ? "record" : "records"}
            </span>
          </div>

          {error ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50/80 p-6 text-center">
              <h3 className="text-base font-extrabold text-red-900">
                Payment history unavailable
              </h3>
              <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-red-700 sm:text-sm">
                We could not load your payment history. Please refresh the page
                and try again.
              </p>
            </div>
          ) : records.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-[#DCE5EE] bg-[#F8FAFC] px-5 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#187B83]/10 text-xl font-black text-[#187B83]">
                ₦
              </div>
              <h3 className="mt-4 text-base font-black text-[#102D50] sm:text-lg">
                No payment records yet
              </h3>
              <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-[#718096] sm:text-sm sm:leading-6">
                Payments you make through TSC will appear here with their
                references and transaction statuses.
              </p>
              <Link
                href="/dashboard/wallet"
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#102D50] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#174D78]"
              >
                Go to My Wallet
              </Link>
            </div>
          ) : (
            <div className="mt-5 space-y-3.5">
              {records.map((payment) => (
                <article
                  key={payment.id}
                  className="rounded-2xl border border-[#E6ECF2] bg-white p-4 transition hover:border-[#187B83]/40 hover:shadow-xs sm:p-5"
                >
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-extrabold ${statusStyle(payment.status)}`}
                      >
                        {label(payment.status)}
                      </span>
                      <span className="rounded-md bg-[#F0F5F9] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#718096]">
                        {label(payment.provider)}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-[#718096] sm:text-right">
                      {dateLabel(payment.created_at)}
                    </p>
                  </div>

                  <div className="mt-3.5 flex flex-col justify-between gap-1 sm:flex-row sm:items-baseline">
                    <h3 className="text-xl font-black tabular-nums text-[#102D50] sm:text-2xl">
                      {money(
                        Number(payment.amount_minor),
                        payment.currency_code
                      )}
                    </h3>
                    <p className="text-xs font-extrabold text-[#187B83] sm:text-sm">
                      {label(payment.purpose)}
                    </p>
                  </div>

                  {payment.description && (
                    <p className="mt-2 text-xs leading-5 text-[#718096] sm:text-sm">
                      {payment.description}
                    </p>
                  )}

                  <div className="mt-4 grid grid-cols-1 gap-3 border-t border-[#E6ECF2] pt-3.5 sm:grid-cols-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#718096]">
                        Payment reference
                      </p>
                      <p className="mt-1 select-all break-all font-mono text-xs font-semibold text-[#172B42] sm:text-[13px]">
                        {payment.reference}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#718096]">
                        Provider transaction ID
                      </p>
                      <p className="mt-1 select-all break-all font-mono text-xs font-semibold text-[#172B42] sm:text-[13px]">
                        {payment.provider_transaction_id ||
                          "Not yet available"}
                      </p>
                    </div>
                  </div>

                  {payment.verified_at && (
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      <span aria-hidden="true">✓</span>
                      <span>Verified {dateLabel(payment.verified_at)}</span>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="pt-2 text-center text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#718096]">
          <p>Travellers Safety Covered</p>
          <p className="mt-1 font-semibold normal-case tracking-normal text-[#718096]">
            Your safety. Our priority.
          </p>
        </footer>
      </div>
    </main>
  );
}