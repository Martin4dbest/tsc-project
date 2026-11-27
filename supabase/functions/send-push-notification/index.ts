import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-tsc-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, {
      status: 405, headers: corsHeaders,
    });
  }

  const expectedSecret = Deno.env.get("TSC_PUSH_WEBHOOK_SECRET");
  if (!expectedSecret || request.headers.get("x-tsc-webhook-secret") !== expectedSecret) {
    return Response.json({ error: "Unauthorized" }, {
      status: 401, headers: corsHeaders,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: "Server configuration is incomplete" }, {
      status: 500, headers: corsHeaders,
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let notificationId: string | null = null;

  try {
    const payload = await request.json();
    const record = payload?.record;

    if (
      payload?.type !== "INSERT" ||
      payload?.table !== "tsc_notifications" ||
      payload?.schema !== "public" ||
      !record?.id ||
      !record?.user_id
    ) {
      return Response.json({ error: "Invalid notification event" }, {
        status: 400, headers: corsHeaders,
      });
    }

    notificationId = record.id;

    // Atomic claim: only one webhook invocation can move pending to processing.
    const { data: claimed, error: claimError } = await supabase
      .from("tsc_notifications")
      .update({
        push_status: "processing",
        push_attempts: 1,
      })
      .eq("id", notificationId)
      .eq("user_id", record.user_id)
      .eq("push_status", "pending")
      .select("id, user_id, title, message")
      .maybeSingle();

    if (claimError) throw claimError;

    if (!claimed) {
      return Response.json({ ok: true, skipped: true, reason: "Already claimed or processed" }, {
        headers: corsHeaders,
      });
    }

    const { data: tokens, error: tokenError } = await supabase
      .from("tsc_push_tokens")
      .select("id, expo_push_token")
      .eq("user_id", claimed.user_id)
      .is("disabled_at", null);

    if (tokenError) throw tokenError;

    if (!tokens?.length) {
      await supabase.from("tsc_notifications").update({
        push_status: "skipped",
        push_error: "No active mobile push tokens registered.",
      }).eq("id", claimed.id);

      return Response.json({ ok: true, skipped: true, reason: "No registered devices" }, {
        headers: corsHeaders,
      });
    }

    const messages = tokens.map((token) => ({
      to: token.expo_push_token,
      sound: "default",
      title: claimed.title,
      body: claimed.message,
      priority: "high",
      channelId: "wallet-updates",
      data: {
        type: "wallet_notification",
        notificationId: claimed.id,
        screen: "/wallet",
      },
    }));

    const expoResponse = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const expoResult = await expoResponse.json();

    if (!expoResponse.ok) {
      throw new Error(`Expo returned HTTP ${expoResponse.status}`);
    }

    const tickets = Array.isArray(expoResult?.data) ? expoResult.data : [expoResult.data];
    let accepted = 0;
    const invalidTokenIds: string[] = [];
    const errors: string[] = [];

    const attempts = tickets.map((ticket: any, index: number) => {
      const token = tokens[index];

      if (ticket?.status === "ok") accepted++;

      const ticketError = ticket?.message ?? ticket?.details?.error ?? null;
      if (ticket?.status !== "ok" && ticketError) errors.push(String(ticketError));

      if (ticket?.details?.error === "DeviceNotRegistered" && token?.id) {
        invalidTokenIds.push(token.id);
      }

      return {
        notification_id: claimed.id,
        push_token_id: token?.id ?? null,
        expo_ticket_id: ticket?.id ?? null,
        ticket_status: ticket?.status ?? "unknown",
        ticket_error: ticketError,
      };
    });

    if (attempts.length) {
      const { error: attemptError } = await supabase
        .from("tsc_push_delivery_attempts")
        .insert(attempts);

      if (attemptError) throw attemptError;
    }

    if (invalidTokenIds.length) {
      const { error } = await supabase
        .from("tsc_push_tokens")
        .update({
          disabled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in("id", invalidTokenIds);

      if (error) throw error;
    }

    const succeeded = accepted > 0;

    const { error: updateError } = await supabase
      .from("tsc_notifications")
      .update({
        push_status: succeeded ? "sent" : "failed",
        push_sent_at: succeeded ? new Date().toISOString() : null,
        push_error: errors.length ? errors.slice(0, 3).join("; ").slice(0, 1000) : null,
      })
      .eq("id", claimed.id);

    if (updateError) throw updateError;

    return Response.json({
      ok: true,
      accepted,
      failed: tickets.length - accepted,
      disabledInvalidTokens: invalidTokenIds.length,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error("TSC push delivery failed:", error);

    if (notificationId) {
      await supabase.from("tsc_notifications").update({
        push_status: "failed",
        push_error: error instanceof Error ? error.message : "Push delivery failed",
      }).eq("id", notificationId).eq("push_status", "processing");
    }

    return Response.json({ error: "Push delivery failed" }, {
      status: 500, headers: corsHeaders,
    });
  }
});
