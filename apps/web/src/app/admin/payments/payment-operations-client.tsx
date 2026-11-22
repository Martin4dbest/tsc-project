"use client";

import { useMemo, useState } from "react";

type Payment = {
  id: string;
  traveller_id: string;
  wallet_id: string | null;
  wallet_transaction_id: string | null;
  provider: string;
  purpose: string;
  status: string;
  amount_minor: number;
  currency_code: string;
  reference: string;
  provider_transaction_id: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  verified_at: string | null;
  traveller_name: string;
  traveller_phone: string;
};

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount) / 100);

const dateTime = (value: string | null) => {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  }).format(new Date(value));
};

const statusStyle: Record<string, string> = {
  succeeded: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-slate-200 text-slate-700",
};

export default function PaymentOperationsClient({
  payments,
}: {
  payments: Payment[];
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [purpose, setPurpose] = useState("all");
  const [provider, setProvider] = useState("all");
  const [selected, setSelected] = useState<Payment | null>(null);

  const stats = useMemo(() => {
    const succeeded = payments.filter((p) => p.status === "succeeded");

    return {
      total: payments.length,
      succeeded: succeeded.length,
      pending: payments.filter((p) => p.status === "pending").length,
      failed: payments.filter((p) => p.status === "failed").length,
      refunded: payments.filter((p) => p.status === "refunded").length,
      successfulValue: succeeded.reduce(
        (sum, p) => sum + Number(p.amount_minor),
        0
      ),
    };
  }, [payments]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return payments.filter((p) => {
      const matchesSearch =
        !term ||
        p.reference.toLowerCase().includes(term) ||
        p.traveller_name.toLowerCase().includes(term) ||
        p.traveller_phone.toLowerCase().includes(term) ||
        (p.provider_transaction_id ?? "").toLowerCase().includes(term);

      return (
        matchesSearch &&
        (status === "all" || p.status === status) &&
        (purpose === "all" || p.purpose === purpose) &&
        (provider === "all" || p.provider === provider)
      );
    });
  }, [payments, search, status, purpose, provider]);

  const exportCsv = () => {
    const headers = [
      "Reference",
      "Traveller",
      "Phone",
      "Amount",
      "Currency",
      "Provider",
      "Purpose",
      "Status",
      "Provider Transaction ID",
      "Created At",
      "Verified At",
    ];

    const rows = filtered.map((p) => [
      p.reference,
      p.traveller_name,
      p.traveller_phone,
      (Number(p.amount_minor) / 100).toFixed(2),
      p.currency_code,
      p.provider,
      p.purpose,
      p.status,
      p.provider_transaction_id ?? "",
      p.created_at,
      p.verified_at ?? "",
    ]);

    const escapeCsv = (value: string) =>
      `"${String(value).replace(/"/g, '""')}"`;

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => escapeCsv(String(value))).join(","))
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tsc-payment-records-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const cardClass =
    "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";

  return (
    <div className="mt-8 space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className={cardClass}>
          <p className="text-sm text-slate-500">Total payment records</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {stats.total.toLocaleString("en-NG")}
          </p>
        </div>

        <div className={cardClass}>
          <p className="text-sm text-slate-500">Successful payments</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">
            {stats.succeeded.toLocaleString("en-NG")}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {money(stats.successfulValue, "NGN")} received
          </p>
        </div>

        <div className={cardClass}>
          <p className="text-sm text-slate-500">Pending payments</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">
            {stats.pending.toLocaleString("en-NG")}
          </p>
        </div>

        <div className={cardClass}>
          <p className="text-sm text-slate-500">Failed payments</p>
          <p className="mt-2 text-3xl font-bold text-red-600">
            {stats.failed.toLocaleString("en-NG")}
          </p>
        </div>

        <div className={cardClass}>
          <p className="text-sm text-slate-500">Refunded payments</p>
          <p className="mt-2 text-3xl font-bold text-slate-700">
            {stats.refunded.toLocaleString("en-NG")}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Transaction records
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Search and review payment activity.
            </p>
          </div>

          <button
            type="button"
            onClick={exportCsv}
            className="rounded-xl bg-[#174D78] px-5 py-3 text-sm font-semibold text-white hover:bg-[#102D50]"
          >
            Export CSV
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search traveller, phone or reference..."
            className="min-w-0 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-600 md:col-span-2"
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="succeeded">Successful</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>

          <select
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm"
          >
            <option value="all">All purposes</option>
            <option value="wallet_funding">Wallet funding</option>
            <option value="service_payment">Service payment</option>
            <option value="booking_payment">Booking payment</option>
            <option value="refund">Refund</option>
          </select>

          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm"
          >
            <option value="all">All providers</option>
            <option value="paystack">Paystack</option>
            <option value="wallet">Wallet</option>
            <option value="admin">Admin</option>
            <option value="manual">Manual</option>
          </select>
        </div>

        <p className="mt-4 text-sm text-slate-500">
          Showing {filtered.length} of {payments.length} loaded records
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Traveller</th>
                <th className="px-5 py-4">Reference</th>
                <th className="px-5 py-4">Amount</th>
                <th className="px-5 py-4">Provider</th>
                <th className="px-5 py-4">Purpose</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Details</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-900">
                      {p.traveller_name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {p.traveller_phone || "No phone recorded"}
                    </p>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-slate-700">
                    {p.reference}
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-900">
                    {money(Number(p.amount_minor), p.currency_code)}
                  </td>
                  <td className="px-5 py-4 capitalize">{p.provider}</td>
                  <td className="px-5 py-4 text-slate-700">
                    {p.purpose.replaceAll("_", " ")}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                        statusStyle[p.status] ?? "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-600">
                    {dateTime(p.created_at)}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => setSelected(p)}
                      className="font-semibold text-blue-700 hover:underline"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-500">
                    No payment records match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-detail-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="payment-detail-title" className="text-xl font-bold text-slate-900">
                  Payment details
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Complete transaction record
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close payment details"
                className="rounded-lg px-3 py-2 text-xl text-slate-500 hover:bg-slate-100"
              >
                ×
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                ["Traveller", selected.traveller_name],
                ["Phone", selected.traveller_phone || "Not recorded"],
                ["Amount", money(Number(selected.amount_minor), selected.currency_code)],
                ["Status", selected.status],
                ["Provider", selected.provider],
                ["Purpose", selected.purpose.replaceAll("_", " ")],
                ["Reference", selected.reference],
                ["Provider transaction ID", selected.provider_transaction_id ?? "Not available"],
                ["Wallet ID", selected.wallet_id ?? "Not linked"],
                ["Wallet transaction ID", selected.wallet_transaction_id ?? "Not credited"],
                ["Created", dateTime(selected.created_at)],
                ["Last updated", dateTime(selected.updated_at)],
                ["Verified", dateTime(selected.verified_at)],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0 rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {label}
                  </p>
                  <p className="mt-2 break-all text-sm font-semibold text-slate-900">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {selected.description && (
              <div className="mt-4 rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Description
                </p>
                <p className="mt-2 text-sm text-slate-800">
                  {selected.description}
                </p>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-xl bg-[#174D78] px-5 py-3 text-sm font-semibold text-white hover:bg-[#102D50]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
