import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

type GeocodedPlace = {
  lat: number;
  lon: number;
  state: string;
  display_name: string;
};

async function geocodeAddress(address: string): Promise<GeocodedPlace | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", address);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "ng");

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent":
        process.env.TSC_NOMINATIM_USER_AGENT ||
        "TSC-Journey-Route-Verification/1.0",
      Accept: "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error("Address verification service is unavailable.");
  }

  const results = (await response.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
    address?: {
      state?: string;
      region?: string;
    };
  }>;

  const first = results[0];
  if (!first) return null;

  const lat = Number(first.lat);
  const lon = Number(first.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  return {
    lat,
    lon,
    state: first.address?.state || first.address?.region || "",
    display_name: first.display_name,
  };
}

async function getDrivingDistanceMeters(
  origin: GeocodedPlace,
  destination: GeocodedPlace
): Promise<number> {
  const coordinates = `${origin.lon},${origin.lat};${destination.lon},${destination.lat}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=false`;

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    throw new Error("Driving route service is unavailable.");
  }

  const result = (await response.json()) as {
    code?: string;
    routes?: Array<{ distance: number }>;
  };

  if (result.code !== "Ok" || !result.routes?.length) {
    throw new Error("No driving route could be found for these addresses.");
  }

  const distance = result.routes[0].distance;

  if (!Number.isFinite(distance) || distance < 0) {
    throw new Error("Invalid driving distance returned.");
  }

  return distance;
}

export async function POST(request: Request) {
  try {
    const admin = createSupabaseAdminClient();

    // Support mobile Bearer-token authentication.
    const authorization = request.headers.get("authorization");
    const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

    let user = null;

    if (bearerToken) {
      const {
        data: { user: tokenUser },
        error: tokenAuthError,
      } = await admin.auth.getUser(bearerToken);

      if (tokenAuthError || !tokenUser) {
        return NextResponse.json(
          { error: "Your session is invalid or expired. Please sign in again." },
          { status: 401 }
        );
      }

      user = tokenUser;
    } else {
      // Preserve cookie-based authentication for web clients.
      const supabase = await createSupabaseServerClient();

      const {
        data: { user: cookieUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !cookieUser) {
        return NextResponse.json(
          { error: "Authentication required." },
          { status: 401 }
        );
      }

      user = cookieUser;
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

    const origin = await geocodeAddress(originAddress);

    // Respect Nominatim's public-service request rate.
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const destination = await geocodeAddress(destinationAddress);

    if (!origin || !destination) {
      return NextResponse.json(
        {
          error:
            "We could not verify one or both addresses. Please be more specific.",
        },
        { status: 422 }
      );
    }

    if (!origin.state || !destination.state) {
      return NextResponse.json(
        { error: "We could not verify the states for this route." },
        { status: 422 }
      );
    }

    const distanceMeters = await getDrivingDistanceMeters(origin, destination);
    const distanceKm = distanceMeters / 1000;

    const interState =
      origin.state.trim().toLowerCase() !==
      destination.state.trim().toLowerCase();

    const qualifiesForFee =
      settings.enabled &&
      ((interState && settings.interstate_enabled) ||
        (!interState &&
          distanceKm > Number(settings.intra_state_threshold_km)));

    const feeNgn = qualifiesForFee ? Number(settings.fee_ngn) : 0;

    const expiresAt = new Date(
      Date.now() + 15 * 60 * 1000
    ).toISOString();

    const { data: quote, error: quoteError } = await admin
      .from("tsc_journey_route_quotes")
      .insert({
        traveller_id: user.id,

        origin_input: originAddress,
        destination_input: destinationAddress,

        origin_verified_address: origin.display_name,
        destination_verified_address: destination.display_name,

        origin_state: origin.state,
        destination_state: destination.state,

        origin_latitude: origin.lat,
        origin_longitude: origin.lon,
        destination_latitude: destination.lat,
        destination_longitude: destination.lon,

        distance_meters: Math.round(distanceMeters),
        inter_state: interState,
        fee_required: qualifiesForFee,
        fee_ngn: feeNgn,

        settings_snapshot: {
          enabled: settings.enabled,
          interstate_enabled: settings.interstate_enabled,
          fee_ngn: Number(settings.fee_ngn),
          intra_state_threshold_km: Number(
            settings.intra_state_threshold_km
          ),
        },

        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (quoteError || !quote) {
      console.error("Route quote storage error:", quoteError);

      return NextResponse.json(
        { error: "Unable to save verified route quote." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      verified: true,
      quoteId: quote.id,
      expiresAt,

      origin: {
        address: origin.display_name,
        state: origin.state,
        latitude: origin.lat,
        longitude: origin.lon,
      },

      destination: {
        address: destination.display_name,
        state: destination.state,
        latitude: destination.lat,
        longitude: destination.lon,
      },

      distanceMeters: Math.round(distanceMeters),
      distanceKm: Number(distanceKm.toFixed(2)),
      interState,
      qualifiesForFee,
      feeNgn,

      reason: interState
        ? "inter_state"
        : distanceKm > Number(settings.intra_state_threshold_km)
          ? "same_state_over_threshold"
          : "same_state_at_or_below_threshold",
    });
  } catch (error) {
    console.error("Journey route verification error:", error);

    return NextResponse.json(
      { error: "Unable to verify route right now. Please try again." },
      { status: 502 }
    );
  }
}
