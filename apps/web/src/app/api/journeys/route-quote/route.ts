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
  const queries = [address, `${address}, Nigeria`];

  for (const query of queries) {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "5");
    url.searchParams.set("countrycodes", "ng");

    try {
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

      if (response.ok) {
        const results = (await response.json()) as Array<{
          lat: string;
          lon: string;
          display_name: string;
          address?: { state?: string; region?: string };
        }>;

        for (const result of results) {
          const lat = Number(result.lat);
          const lon = Number(result.lon);

          if (Number.isFinite(lat) && Number.isFinite(lon)) {
            return {
              lat,
              lon,
              state: result.address?.state || result.address?.region || "",
              display_name: result.display_name,
            };
          }
        }
      }
    } catch {
      // Continue to the next query/provider.
    }

    await new Promise((resolve) => setTimeout(resolve, 1100));
  }

  // Photon fallback.
  for (const query of queries) {
    const url = new URL("https://photon.komoot.io/api/");
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "5");
    url.searchParams.set("lang", "en");

    try {
      const response = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) continue;

      const result = (await response.json()) as {
        features?: Array<{
          geometry?: { coordinates?: number[] };
          properties?: {
            name?: string;
            street?: string;
            city?: string;
            county?: string;
            state?: string;
            country?: string;
          };
        }>;
      };

      for (const feature of result.features || []) {
        const coordinates = feature.geometry?.coordinates;
        const properties = feature.properties;

        if (!coordinates || !properties) continue;

        const [lon, lat] = coordinates;
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

        if (
          properties.country &&
          !properties.country.toLowerCase().includes("nigeria")
        ) {
          continue;
        }

        return {
          lat,
          lon,
          state: properties.state || "",
          display_name: [
            properties.name,
            properties.street,
            properties.city,
            properties.county,
            properties.state,
            properties.country,
          ]
            .filter(Boolean)
            .join(", "),
        };
      }
    } catch {
      // Continue to the next query.
    }
  }

  return null;
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

  if (!Number.isFinite(distance) || distance <= 0) {
    throw new Error("Invalid driving distance returned.");
  }

  return distance;
}

export async function POST(request: Request) {
  try {
    const admin = createSupabaseAdminClient();

    // Mobile Bearer-token authentication.
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
      // Web cookie authentication.
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

    const expiresAt = new Date(
      Date.now() + 15 * 60 * 1000
    ).toISOString();

    const settingsSnapshot = {
      enabled: settings.enabled,
      interstate_enabled: settings.interstate_enabled,
      fee_ngn: Number(settings.fee_ngn),
      intra_state_threshold_km: Number(settings.intra_state_threshold_km),
    };

    /*
     * NO-FEE MODE:
     * Do not depend on external geocoding or routing.
     * The SQL RPC explicitly permits these placeholders only while
     * fee collection is disabled.
     */
    if (!settings.enabled) {
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
          fee_required: false,
          fee_ngn: 0,

          settings_snapshot: {
            ...settingsSnapshot,
            route_verified: false,
            fee_disabled_scheduling: true,
          },

          expires_at: expiresAt,
        })
        .select("id")
        .single();

      if (quoteError || !quote) {
        console.error("No-fee route quote storage error:", quoteError);

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
        qualifiesForFee: false,
        feeRequired: false,
        feeNgn: 0,
        fee_ngn: 0,
        amount_ngn: 0,
        amount: 0,
        reason: "fee_disabled",
      });
    }

    /*
     * FEE-ENABLED MODE:
     * Require full route verification and distance calculation.
     */
    const origin = await geocodeAddress(originAddress);

    // Respect public Nominatim request rate.
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
          ...settingsSnapshot,
          route_verified: true,
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
      routeVerified: true,
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
      distance_km: Number(distanceKm.toFixed(2)),
      interState,
      inter_state: interState,
      qualifiesForFee,
      feeRequired: qualifiesForFee,
      feeNgn,
      fee_ngn: feeNgn,
      amount_ngn: feeNgn,
      amount: feeNgn,

      reason: interState
        ? "inter_state"
        : distanceKm > Number(settings.intra_state_threshold_km)
          ? "same_state_over_threshold"
          : "same_state_at_or_below_threshold",
    });
  } catch (error) {
    console.error("Journey route verification error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to verify route right now. Please try again.",
      },
      { status: 502 }
    );
  }
}
