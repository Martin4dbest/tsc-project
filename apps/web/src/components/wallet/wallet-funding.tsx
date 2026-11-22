"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function WalletFunding({
  walletActive,
}: {
  walletActive: boolean;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("5000");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const reference = new URLSearchParams(window.location.search).get(
      "payment_reference"
    );

    if (!reference) return;

    let cancelled = false;

    async function verify() {
      setVerifying(true);
      setMessage("Verifying your payment securely...");

      try {
        const response = await fetch("/api/payments/paystack/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference }),
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Payment verification failed.");
        }

        if (cancelled) return;

        setSuccess(true);
        setMessage(
          result.alreadyProcessed
            ? "This payment has already been credited."
            : "Payment confirmed. Your wallet has been credited."
        );
        window.history.replaceState({}, "", "/dashboard/wallet");
        router.refresh();
      } catch (error) {
        if (!cancelled) {
          setSuccess(false);
          setMessage(
            error instanceof Error ? error.message : "Payment verification failed."
          );
        }
      } finally {
        if (!cancelled) setVerifying(false);
      }
    }

    void verify();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function fundWallet(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const naira = Number(amount);

    if (!Number.isSafeInteger(naira) || naira <= 0) {
      setMessage("Enter a valid amount in naira.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/payments/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountMinor: naira * 100 }),
      });
      const result = await response.json();

      if (!response.ok || !result.authorizationUrl) {
        throw new Error(result.error || "Unable to start payment.");
      }

      window.location.assign(result.authorizationUrl);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to start payment."
      );
      setLoading(false);
    }
  }

  return (
    <section className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm sm:p-7">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e98012]">
        Wallet funding
      </p>
      <h2 className="mt-2 text-lg font-extrabold text-[#10254b]">
        Add money to your wallet
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Fund your TSC wallet securely with Paystack.
      </p>

      <form onSubmit={fundWallet} className="mt-5">
        <label
          htmlFor="wallet-funding-amount"
          className="mb-2 block text-sm font-bold text-slate-700"
        >
          Amount (₦)
        </label>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="wallet-funding-amount"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            disabled={!walletActive || loading || verifying}
            className="min-h-12 w-full rounded-xl border border-slate-200 px-4 text-base font-bold text-slate-900 outline-none focus:border-[#e98012] focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
          />
          <button
            type="submit"
            disabled={!walletActive || loading || verifying}
            className="min-h-12 shrink-0 rounded-xl bg-[#e98012] px-7 py-3 text-sm font-extrabold text-white hover:bg-[#cf6d08] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Connecting..." : "Fund wallet"}
          </button>
        </div>

        {!walletActive && (
          <p className="mt-3 text-sm font-semibold text-red-600">
            Your wallet is frozen. Funding is unavailable.
          </p>
        )}

        {message && (
          <p
            role="status"
            className={`mt-4 rounded-xl p-3 text-sm font-semibold ${
              success
                ? "bg-emerald-50 text-emerald-700"
                : verifying
                  ? "bg-blue-50 text-blue-700"
                  : "bg-red-50 text-red-700"
            }`}
          >
            {message}
          </p>
        )}
      </form>

      <p className="mt-4 text-xs leading-5 text-slate-400">
        Your wallet is credited only after TSC verifies the transaction
        directly with Paystack.
      </p>
    </section>
  );
}
