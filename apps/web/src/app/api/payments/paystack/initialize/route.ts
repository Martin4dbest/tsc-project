import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getPaymentRequestUser } from "@/lib/payments/request-user";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { getPaystackSecretKey } from "@/lib/payments/paystack";

export async function POST(request: NextRequest) {
  try {
    const user = await getPaymentRequestUser(request);

    if (!user || !user.email) {
      return NextResponse.json(
        { error: "Please sign in before funding your wallet." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const amountMinor = Number(body.amountMinor);
    const platform = body.platform === "mobile" ? "mobile" : "web";

    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
      return NextResponse.json(
        { error: "Enter a valid wallet funding amount." },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("user_id, role")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "traveller") {
      return NextResponse.json(
        { error: "Only registered travellers can fund a wallet." },
        { status: 403 }
      );
    }

    const { data: wallet, error: walletError } = await admin
      .from("wallet_accounts")
      .select("id, status, currency_code")
      .eq("traveller_id", user.id)
      .maybeSingle();

    if (walletError || !wallet) {
      return NextResponse.json(
        { error: "Your wallet could not be found." },
        { status: 404 }
      );
    }

    if (wallet.status !== "active") {
      return NextResponse.json(
        { error: "Your wallet is currently frozen." },
        { status: 403 }
      );
    }

    if (wallet.currency_code !== "NGN") {
      return NextResponse.json(
        { error: "Paystack wallet funding currently supports NGN only." },
        { status: 400 }
      );
    }

    const reference = `TSC-${Date.now()}-${randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const origin = new URL(request.url).origin;

    let callbackUrl = `${origin}/dashboard/wallet?payment_reference=${encodeURIComponent(reference)}`;

    if (platform === "mobile") {
      const returnUrl = body.returnUrl;

      if (
        typeof returnUrl !== "string" ||
        (!/^exp:\/\//.test(returnUrl) && !/^tsc:\/\//.test(returnUrl))
      ) {
        return NextResponse.json(
          { error: "Invalid mobile payment return address." },
          { status: 400 }
        );
      }

      callbackUrl =
        `${origin}/payments/paystack/mobile-callback?returnUrl=${encodeURIComponent(returnUrl)}`;
    }

    const { error: insertError } = await admin
      .from("tsc_payment_records")
      .insert({
        traveller_id: user.id,
        wallet_id: wallet.id,
        provider: "paystack",
        purpose: "wallet_funding",
        status: "pending",
        amount_minor: amountMinor,
        currency_code: wallet.currency_code,
        reference,
        description: "Wallet funding via Paystack",
        metadata: {
          source: "traveller_wallet",
          platform,
        },
      });

    if (insertError) {
      console.error("Payment record creation failed:", insertError.message);
      return NextResponse.json(
        { error: "Unable to create your payment record." },
        { status: 500 }
      );
    }

    const secretKey = getPaystackSecretKey();

    const paystackResponse = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          amount: amountMinor,
          currency: wallet.currency_code,
          reference,
          callback_url: callbackUrl,
          metadata: {
            traveller_id: user.id,
            purpose: "wallet_funding",
            platform: "TSC",
            client: platform,
          },
        }),
        cache: "no-store",
      }
    );

    const result = await paystackResponse.json();

    if (
      !paystackResponse.ok ||
      !result.status ||
      !result.data?.authorization_url
    ) {
      await admin
        .from("tsc_payment_records")
        .update({ status: "failed" })
        .eq("reference", reference)
        .eq("status", "pending");

      return NextResponse.json(
        { error: result.message || "Paystack could not initialise this payment." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      authorizationUrl: result.data.authorization_url,
      reference,
    });
  } catch (error) {
    console.error("Paystack initialization error:", error);
    return NextResponse.json(
      { error: "Unable to initialise payment. Please try again." },
      { status: 500 }
    );
  }
}
