"use client";

import { useSearchParams } from "next/navigation";

export default function MobilePaymentCallbackPage() {
  const params = useSearchParams();
  const reference = params.get("reference");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl">
        ✓
      </div>
      <h1 className="text-xl font-bold">Payment received</h1>
      <p className="text-sm text-gray-600">
        Return to TSC to confirm your wallet funding.
      </p>
      {reference ? (
        <p className="text-xs text-gray-400 break-all">
          Reference: {reference}
        </p>
      ) : null}
    </main>
  );
}
