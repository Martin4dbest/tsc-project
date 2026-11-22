import "server-only";

type PaystackVerification = {
  status: boolean;
  message?: string;
  data?: {
    id: number;
    status: string;
    reference: string;
    amount: number;
    currency: string;
    gateway_response?: string;
    paid_at?: string;
    channel?: string;
  };
};

export function getPaystackSecretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;

  if (!key || !key.startsWith("sk_test_") && !key.startsWith("sk_live_")) {
    throw new Error("Paystack secret key is missing or invalid.");
  }

  return key;
}

export async function verifyPaystackTransaction(
  reference: string
): Promise<PaystackVerification> {
  const secretKey = getPaystackSecretKey();

  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  const result = (await response.json()) as PaystackVerification;

  if (!response.ok || !result.status || !result.data) {
    throw new Error(result.message || "Unable to verify payment with Paystack.");
  }

  return result;
}
