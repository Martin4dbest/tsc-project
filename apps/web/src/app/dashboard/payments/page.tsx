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
  }).format(amount / 100);
}

function dateLabel(value: string) {
  return new Date(value).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  });
}

function statusStyle(status: string) {
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
    <main className="tsc-dashboard-content space-y-7 pb-10">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#e98012]" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#10254b]">
              Traveller Payment Centre
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">
            My Payments
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
            Review your payment records, transaction references and payment
            statuses in one place.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/wallet"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#10254b] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#183b68]"
          >
            Open My Wallet
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-orange-300 hover:bg-orange-50"
          >
            Back to dashboard
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Total payment records
          </p>
          <p className="mt-3 text-2xl font-extrabold text-slate-950">
            {records.length}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Successful payments
          </p>
          <p className="mt-3 text-2xl font-extrabold text-emerald-700">
            {successful.length}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Pending payments
          </p>
          <p className="mt-3 text-2xl font-extrabold text-amber-600">
            {pending.length}
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-xl font-extrabold text-slate-950">
              Payment history
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Your latest 100 payment records.
            </p>
          </div>
          <div className="text-sm font-semibold text-slate-600">
            Successful value:{" "}
            <span className="text-emerald-700">
              {money(successfulValue)}
            </span>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <h3 className="font-bold text-red-900">
              Payment history temporarily unavailable
            </h3>
            <p className="mt-2 text-sm leading-6 text-red-700">
              We could not retrieve your payment records. Please refresh and
              try again.
            </p>
          </div>
        ) : records.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
              ₦
            </div>
            <h3 className="mt-4 text-lg font-extrabold text-slate-900">
              No payment records yet
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Payments you make through TSC will appear here with their
              references and transaction statuses.
            </p>
            <Link
              href="/dashboard/wallet"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#10254b] px-5 py-3 text-sm font-bold text-white hover:bg-[#183b68]"
            >
              Go to My Wallet
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {records.map((payment) => (
              <article
                key={payment.id}
                className="rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 sm:p-5"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold capitalize ${statusStyle(payment.status)}`}
                      >
                        {label(payment.status)}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {label(payment.provider)}
                      </span>
                    </div>

                    <h3 className="mt-3 text-lg font-extrabold text-slate-950">
                      {money(
                        Number(payment.amount_minor),
                        payment.currency_code
                      )}
                    </h3>

                    <p className="mt-1 text-sm text-slate-600">
                      {label(payment.purpose)}
                    </p>

                    {payment.description && (
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {payment.description}
                      </p>
                    )}
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Payment date
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {dateLabel(payment.created_at)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Payment reference
                    </p>
                    <p className="mt-1 break-all text-sm font-semibold text-slate-700">
                      {payment.reference}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Provider transaction ID
                    </p>
                    <p className="mt-1 break-all text-sm font-semibold text-slate-700">
                      {payment.provider_transaction_id || "Not yet available"}
                    </p>
                  </div>
                </div>

                {payment.verified_at && (
                  <p className="mt-3 text-xs text-emerald-700">
                    Verified on {dateLabel(payment.verified_at)}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <h2 className="font-bold text-[#10254b]">
          Need to fund your TSC wallet?
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Wallet funding is available securely through your wallet page.
          Completed wallet funding payments will also appear in this payment
          history.
        </p>
        <Link
          href="/dashboard/wallet"
          className="mt-4 inline-flex font-bold text-[#10254b] underline underline-offset-4"
        >
          Continue to My Wallet →
        </Link>
      </section>
    </main>
  );
}
