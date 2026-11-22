"use client";

import { useEffect, useState } from "react";

export default function MobilePaymentCallbackPage() {
  const [appLink, setAppLink] = useState("tsc://wallet");

  useEffect(() => {
    const reference = new URLSearchParams(window.location.search).get("reference");

    if (!reference) return;

    const intentLink =
      `intent://wallet-payment?reference=${encodeURIComponent(reference)}` +
      "#Intent;scheme=tsc;package=com.core1enterprisesolutions.tsc;end";

    setAppLink(intentLink);

    const timer = window.setTimeout(() => {
      window.location.href = intentLink;
    }, 500);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center">
        <h1 className="text-2xl font-bold text-slate-900">
          Payment Successful
        </h1>

        <p className="mt-4 text-slate-600">
          Opening your TSC app to verify your payment.
        </p>

        <a
          href={appLink}
          className="mt-7 block w-full rounded-xl bg-teal-700 px-6 py-4 font-bold text-white"
        >
          Return to TSC App
        </a>
      </div>
    </main>
  );
}
