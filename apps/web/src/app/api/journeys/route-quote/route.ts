import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const admin = createSupabaseAdminClient();

    // Mobile Bearer authentication or web cookie authentication.
    const authorization = request.headers.get("authorization");
    const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

    let user: { id: string } | null = null;

    if (bearerToken) {
      const { data, error } = await admin.auth.getUser(bearerToken);

      if (error || !data.user) {
        return NextResponse.json(
          { error: "Your session is invalid or expired. Please sign in again." },
          { status: 401 }
        );
      }

      user = data.user;
    } else {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        return NextResponse.json(
          { error: "Authentication required." },
          { status: 401 }
        );
      }

      user = data.user;
    }

    const body = (await request.json()) as {
      origin?: string;
      destination?: string;
    };

    const originAddress = body.origin?.trim();
    const destinationAddress = body.destination?.trim();

    if (
      !originAddress ||
      !destinationAddress ||
      originAddress.length > 300 ||
      destinationAddress.length > 300
    ) {
      return NextResponse.json(
        { error: "Enter valid origin and destination addresses." },
        { status: 400 }
      );
    }

    const { data: settings, error: settingsError } = await admin
      .from("tsc_journey_fee_settings")
      .select("enabled,interstate_enabled,fee_ngn,intra_state_threshold_km")
      .eq("id", 1)
      .single();

    if (settingsError || !settings) {
      return NextResponse.json(
        { error: "Journey fee settings are unavailable." },
        { status: 503 }
      );
    }

    // Fixed-fee quote. No geocoder, map, or routing service is required.
    const feeRequired = Boolean(settings.enabled);
    const feeNgn = feeRequired ? Number(settings.fee_ngn) : 0;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const settingsSnapshot = {
      enabled: settings.enabled,
      interstate_enabled: settings.interstate_enabled,
      fee_ngn: Number(settings.fee_ngn),
      intra_state_threshold_km: Number(settings.intra_state_threshold_km),
      route_verified: false,
      external_route_services_used: false,
      fixed_fee_scheduling: true,
    };

    const { data: quote, error: quoteError } = await admin
      .from("tsc_journey_route_quotes")
      .insert({
        traveller_id: user.id,
        origin_input: originAddress,
        destination_input: destinationAddress,
        origin_verified_address: originAddress,
        destination_verified_address: destinationAddress,
        origin_state: "UNVERIFIED",
        destination_state: "UNVERIFIED",
        origin_latitude: 0,
        origin_longitude: 0,
        destination_latitude: 0,
        destination_longitude: 0,
        distance_meters: 0,
        inter_state: false,
        fee_required: feeRequired,
        fee_ngn: feeNgn,
        settings_snapshot: settingsSnapshot,
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (quoteError || !quote) {
      console.error("Fixed-fee journey quote error:", quoteError);
      return NextResponse.json(
        { error: "Unable to create scheduling quote." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      verified: true,
      routeVerified: false,
      quoteId: quote.id,
      expiresAt,
      origin: {
        address: originAddress,
        state: null,
        latitude: null,
        longitude: null,
      },
      destination: {
        address: destinationAddress,
        state: null,
        latitude: null,
        longitude: null,
      },
      distanceMeters: 0,
      distanceKm: 0,
      distance_km: 0,
      interState: false,
      inter_state: false,
      qualifiesForFee: feeRequired,
      feeRequired,
      feeNgn,
      fee_ngn: feeNgn,
      amount_ngn: feeNgn,
      amount: feeNgn,
      reason: "fixed_fee",
    });
  } catch (error) {
    console.error("Journey fixed-fee quote failed:", error);

    return NextResponse.json(
      { error: "Unable to create journey scheduling quote." },
      { status: 500 }
    );
  }
}
