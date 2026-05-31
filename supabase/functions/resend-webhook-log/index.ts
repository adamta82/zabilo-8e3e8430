import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Headers we should NOT forward when replaying a request
const STRIPPED_HEADERS = new Set([
  "host", "content-length", "connection", "accept-encoding",
  "cf-connecting-ip", "cf-ipcountry", "cf-ray", "cf-visitor",
  "x-forwarded-for", "x-forwarded-host", "x-forwarded-proto",
  "x-real-ip", "x-request-id", "x-deno-subhost",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Require admin auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: userData.user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { log_id } = await req.json();
    if (!log_id) {
      return new Response(JSON.stringify({ error: "log_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: log, error: logErr } = await admin
      .from("webhook_logs")
      .select("*")
      .eq("id", log_id)
      .single();

    if (logErr || !log) {
      return new Response(JSON.stringify({ error: "Log not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!log.url) {
      return new Response(JSON.stringify({ error: "Log has no URL to resend to" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build headers
    const outHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (log.headers && typeof log.headers === "object") {
      for (const [k, v] of Object.entries(log.headers as Record<string, string>)) {
        if (!STRIPPED_HEADERS.has(k.toLowerCase()) && typeof v === "string") {
          outHeaders[k] = v;
        }
      }
    }

    const method = (log.method || "POST").toUpperCase();
    const bodyStr = log.body === null || log.body === undefined
      ? undefined
      : typeof log.body === "string" ? log.body : JSON.stringify(log.body);

    let status: number | null = null;
    let responseBody: unknown = null;
    let errorMsg: string | null = null;

    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 15_000);
      const resp = await fetch(log.url, {
        method,
        headers: outHeaders,
        body: method === "GET" || method === "HEAD" ? undefined : bodyStr,
        signal: controller.signal,
      });
      clearTimeout(t);
      status = resp.status;
      const text = await resp.text();
      try { responseBody = JSON.parse(text); } catch { responseBody = text; }
      if (!resp.ok) errorMsg = `HTTP ${resp.status}`;
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : String(e);
    }

    // Write a new log entry
    await admin.from("webhook_logs").insert({
      function_name: `${log.function_name} (שליחה חוזרת)`,
      method,
      url: log.url,
      query_params: log.query_params,
      body: log.body,
      headers: log.headers,
      response_status: status,
      response_body: responseBody,
      error: errorMsg,
    });

    return new Response(
      JSON.stringify({ success: !errorMsg, status, response: responseBody, error: errorMsg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
