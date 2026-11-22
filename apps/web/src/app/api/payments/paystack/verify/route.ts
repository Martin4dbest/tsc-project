import { NextRequest, NextResponse } from "next/server";
import { getPaymentRequestUser } from "@/lib/payments/request-user";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { verifyPaystackTransaction } from "@/lib/payments/paystack";


export async function POST(request: NextRequest) {
  try {
    const user = await getPaymentRequestUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Please sign in to verify your payment." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const reference = String(body.reference || "").trim();

    if (!reference) {
      return NextResponse.json(
        { error: "Payment reference is required." },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();

    const { data: payment, error: paymentError } = await admin
      .from("tsc_payment_records")
      .select("id, traveller_id, amount_minor, currency_code, status, purpose, provider")
      .eq("reference", reference)
      .maybeSingle();

    if (paymentError || !payment) {
      return NextResponse.json(
        { error: "Payment record was not found." },
        { status: 404 }
      );
    }

    if (payment.traveller_id !== user.id) {
      return NextResponse.json(
        { error: "You are not authorised to verify this payment." },
        { status: 403 }
      );
    }

    if (
      payment.provider !== "paystack" ||
      payment.purpose !== "wallet_funding"
    ) {
      return NextResponse.json(
        { error: "This is not a valid wallet funding payment." },
        { status: 400 }
      );
    }

    if (payment.status === "succeeded") {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        message: "This payment has already been credited to your wallet.",
      });
    }

    const verification = await verifyPaystackTransaction(reference);
    const transaction = verification.data!;

    if (
      transaction.status !== "success" ||
      transaction.reference !== reference ||
      Number(transaction.amount) !== Number(payment.amount_minor) ||
      transaction.currency !== payment.currency_code
    ) {
      return NextResponse.json(
        {
          error: "Paystack has not confirmed the exact amount and currency for this payment.",
        },
        { status: 409 }
      );
    }

    const { data: walletTransactionId, error: creditError } = await admin.rpc(
      "tsc_wallet_credit_verified_paystack",
      {
        p_reference: reference,
        p_provider_transaction_id: String(transaction.id),
        p_metadata: {
          gateway_response: transaction.gateway_response || null,
          channel: transaction.channel || null,
          paid_at: transaction.paid_at || null,
        },
      }
    );

    if (creditError) {
      console.error("Verified wallet credit failed:", creditError.message);
      return NextResponse.json(
        { error: "Payment was verified, but wallet credit could not be completed. Please contact support with your payment reference." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified and wallet funded successfully.",
      reference,
      walletTransactionId,
    });
  } catch (error) {
    console.error("Paystack verification error:", error);
    return NextResponse.json(
      { error: "Unable to verify this payment. Please try again." },
      { status: 500 }
    );
  }
}
