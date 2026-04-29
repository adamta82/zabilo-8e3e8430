import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TOKEN = Deno.env.get("BULLDOG_WHATSAPP_TOKEN");
const PHONE = Deno.env.get("BRIEFING_NOTIFY_PHONE");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!TOKEN || !PHONE) {
    return new Response(JSON.stringify({ error: "Missing config", phone: PHONE ?? null }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = "https://api.bulldog-wp.co.il/v1/messages";
  const message = `📋 *בדיקה - Zabilo Book*

זוהי הודעת בדיקה לאימות שהמספר המעודכן תקין.

🔗 https://zabilo.lovable.app/`;

  const requestBody = { phone: PHONE, message };

  let status: number | null = null;
  let respText = "";
  let parsedResponse: unknown = null;
  let errorMsg: string | null = null;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Token": TOKEN },
      body: JSON.stringify(requestBody),
    });
    status = resp.status;
    respText = await resp.text();
    try { parsedResponse = JSON.parse(respText); } catch (_) { parsedResponse = respText; }
    if (!resp.ok) errorMsg = `HTTP ${resp.status}`;
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : String(e);
  }

  // Log to webhook_logs
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    await supabase.from("webhook_logs").insert({
      function_name: "test-whatsapp → WhatsApp (Bulldog)",
      method: "POST",
      url,
      body: requestBody as any,
      response_status: status,
      response_body: parsedResponse as any,
      error: errorMsg,
    });
  } catch (e) {
    console.error("Log failed:", e);
  }

  return new Response(JSON.stringify({
    sent_to: PHONE, status, response: parsedResponse, error: errorMsg,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
