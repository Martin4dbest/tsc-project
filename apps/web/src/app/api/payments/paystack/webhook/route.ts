import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import {
  getPaystackSecretKey,
  verifyPaystackTransaction,
} from "@/lib/payments/paystack";


export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-paystack-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing Paystack signature." },
        { status: 401 }
      );
    }

    const expectedSignature = createHmac(
      "sha512",
      getPaystackSecretKey()
    )
      .update(rawBody)
      .digest("hex");

    const supplied = Buffer.from(signature, "utf8");
    const expected = Buffer.from(expectedSignature, "utf8");

    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    ) {
      return NextResponse.json(
        { error: "Invalid webhook signature." },
        { status: 401 }
      );
    }

    const event = JSON.parse(rawBody);

    if (event.event !== "charge.success") {
      return NextResponse.json({ received: true });
    }

    const reference = String(event.data?.reference || "").trim();

    if (!reference) {
      return NextResponse.json(
        { error: "Payment reference is missing." },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();

    const { data: payment, error: paymentError } = await admin
      .from("tsc_payment_records")
      .select("id, purpose, provider, status")
      .eq("reference", reference)
      .maybeSingle();

    if (paymentError || !payment) {
      return NextResponse.json({ received: true });
    }

    if (
      payment.provider !== "paystack" ||
      payment.purpose !== "wallet_funding" ||
      payment.status === "succeeded"
    ) {
      return NextResponse.json({ received: true });
    }

    // Do not trust webhook payload amounts. Independently verify with Paystack.
    const verification = await verifyPaystackTransaction(reference);
    const transaction = verification.data!;

    if (
      transaction.status !== "success" ||
      transaction.reference !== reference
    ) {
      return NextResponse.json(
        { error: "Paystack transaction is not confirmed." },
        { status: 409 }
      );
    }

    const { error: creditError } = await admin.rpc(
      "tsc_wallet_credit_verified_paystack",
      {
        p_reference: reference,
        p_provider_transaction_id: String(transaction.id),
        p_metadata: {
          gateway_response: transaction.gateway_response || null,
          channel: transaction.channel || null,
          paid_at: transaction.paid_at || null,
          source: "paystack_webhook",
        },
      }
    );

    if (creditError) {
      console.error("Webhook wallet credit failed:", creditError.message);
      return NextResponse.json(
        { error: "Wallet credit could not be completed." },
        { status: 500 }
      );
    }

    return NextResponse.json({ received: true, credited: true });
  } catch (error) {
    console.error("Paystack webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 }
    );
  }
}
