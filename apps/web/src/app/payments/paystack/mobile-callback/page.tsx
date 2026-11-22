"use client";

import { useEffect } from "react";

export default function MobilePaymentCallbackPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference");
    const returnUrl = params.get("returnUrl");

    if (!reference || !returnUrl) return;

    if (!/^exp:\/\//.test(returnUrl) && !/^tsc:\/\//.test(returnUrl)) {
      return;
    }

    const destination = new URL(returnUrl);
    destination.searchParams.set("reference", reference);

    window.location.replace(destination.toString());
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <p className="text-lg font-semibold">
        Returning to TSC payment verification...
      </p>
    </main>
  );
}
