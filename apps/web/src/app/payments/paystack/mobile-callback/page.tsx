"use client";

import { useEffect, useState } from "react";

export default function MobilePaystackCallbackPage() {
  const [reference, setReference] = useState("");

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("reference");

    if (value) {
      setReference(value);
      window.location.href = `tsc://wallet-payment?reference=${encodeURIComponent(value)}`;
    }
  }, []);

  const appUrl = reference
    ? `tsc://wallet-payment?reference=${encodeURIComponent(reference)}`
    : "tsc://wallet";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-12 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-3xl text-emerald-400">
          ✓
        </div>

        <h1 className="text-2xl font-black">Returning to TSC</h1>

        <p className="mt-3 text-sm leading-6 text-slate-300">
          Your checkout has finished. Open the TSC app to securely confirm
          your wallet payment.
        </p>

        <a
          href={appUrl}
          className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-emerald-500 px-5 py-3 font-bold text-white"
        >
          Return to TSC app
        </a>

        <p className="mt-4 text-xs text-slate-400">
          If the app does not open automatically, tap the button above.
        </p>
      </div>
    </main>
  );
}
