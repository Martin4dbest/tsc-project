"use client";

import { useEffect, useState } from "react";

export default function MobilePaymentCallbackPage() {
  const [appLink, setAppLink] = useState("tsc://wallet");

  useEffect(() => {
    const reference = new URLSearchParams(window.location.search).get("reference");

    if (!reference) return;

    const url = `tsc://wallet-payment?reference=${encodeURIComponent(reference)}`;
    setAppLink(url);

    window.location.href = url;
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl">
        <h1 className="text-2xl font-bold text-slate-900">
          Payment Successful
        </h1>

        <p className="mt-4 text-slate-600">
          Returning to TSC to verify your payment.
        </p>

        <a
          href={appLink}
          className="mt-7 flex w-full items-center justify-center rounded-xl bg-teal-700 px-6 py-4 font-bold text-white"
        >
          Return to TSC App
        </a>

        <p className="mt-4 text-sm text-slate-500">
          If TSC does not open automatically, tap the button above.
        </p>
      </div>
    </main>
  );
}
