export default function MobilePaymentCallbackPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-slate-900">
          Payment received
        </h1>

        <p className="mt-3 text-slate-600">
          Your payment has been received. Return to TSC while we confirm
          your wallet funding.
        </p>
      </div>
    </main>
  );
}
