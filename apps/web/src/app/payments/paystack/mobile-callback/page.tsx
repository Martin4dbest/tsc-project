"use client";

import { useSearchParams } from "next/navigation";

export default function MobilePaymentCallbackPage() {
  const reference = useSearchParams().get("reference");

  const openTSC = () => {
    const url = reference
      ? `tsc://wallet-payment?reference=${encodeURIComponent(reference)}`
      : "tsc://wallet";

    window.location.href = url;
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center">
        <h1 className="text-2xl font-bold text-slate-900">
          Payment Successful
        </h1>

        <p className="mt-3 text-slate-600">
          Your payment is complete. Tap below to return to TSC.
        </p>

        <button
          type="button"
          onClick={openTSC}
          className="mt-7 w-full rounded-xl bg-teal-700 px-6 py-4 font-bold text-white"
        >
          Return to TSC App
        </button>
      </div>
    </main>
  );
}
