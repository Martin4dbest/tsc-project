import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : null;

    let supabase: any;
    let user: any;

    if (token) {
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        }
      );

      const {
        data: { user: authenticatedUser },
        error: authError,
      } = await supabase.auth.getUser(token);

      if (authError || !authenticatedUser) {
        return NextResponse.json(
          { error: "Authentication required." },
          { status: 401 }
        );
      }

      user = authenticatedUser;
    } else {
      supabase = await createSupabaseServerClient();

      const {
        data: { user: authenticatedUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authenticatedUser) {
        return NextResponse.json(
          { error: "Authentication required." },
          { status: 401 }
        );
      }

      user = authenticatedUser;
    }

    const body = await request.json();

    if (!body?.journeyId || !body?.quoteId) {
      return NextResponse.json(
        { error: "Journey and quote IDs required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc(
      "tsc_schedule_journey_with_fee",
      {
        p_journey_id: body.journeyId,
        p_quote_id: body.quoteId,
      }
    );

    if (error) {
      console.error("Journey scheduling RPC failed:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Journey scheduling failed:", error);

    return NextResponse.json(
      { error: "Unable to schedule journey." },
      { status: 500 }
    );
  }
}
