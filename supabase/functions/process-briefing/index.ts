import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function transcribeAudio(audioBase64: string, mimeType: string): Promise<string> {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "תמלל את הקובץ הקול הבא בעברית במדויק. החזר רק את התמלול ללא תוספות או הערות.",
            },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${audioBase64}` },
            },
          ],
        },
      ],
    }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Transcription failed: ${resp.status} ${t}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function summarizeTranscript(transcript: string): Promise<any> {
  const systemPrompt = `אתה עוזר שמסכם תדריכי בוקר של חברת eCommerce ישראלית בעברית.

המבנה של הסיכום:
- זהה את הנושאים המרכזיים בתדריך
- לכל נושא תן כותרת קצרה וברורה (2-5 מילים)
- תחת כל כותרת רשום בולטים תמציתיים של הנקודות החשובות
- שמור על הטון והניסוח של הדובר
- אל תמציא מידע, רק סכם מה שנאמר
- אורך הסיכום: דומה למקור, תמציתי וענייני
- כתוב בעברית טבעית, ללא אימוג'ים מיותרים
- אל תכלול נושאי נוכחות (חופש/עבודה מהבית) - הם מטופלים בנפרד

החזר את הסיכום באמצעות הכלי save_briefing_summary.`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `תמלול התדריך:\n\n${transcript}` },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "save_briefing_summary",
            description: "שומר סיכום מובנה של תדריך הבוקר",
            parameters: {
              type: "object",
              properties: {
                sections: {
                  type: "array",
                  description: "סקשנים דינמיים של הסיכום, לפי הנושאים שזוהו",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string", description: "כותרת הסקשן" },
                      bullets: {
                        type: "array",
                        items: { type: "string" },
                        description: "בולטים תמציתיים",
                      },
                    },
                    required: ["title", "bullets"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["sections"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "save_briefing_summary" } },
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Summarization failed: ${resp.status} ${t}`);
  }
  const data = await resp.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No tool call in response");
  return JSON.parse(toolCall.function.arguments);
}

async function getAttendanceForDate(supabase: any, date: string) {
  // Approved vacations covering this date
  const { data: vacations } = await supabase
    .from("requests")
    .select("user_id, vacation_start_date, vacation_end_date, profiles:user_id(full_name)")
    .eq("type", "vacation")
    .eq("status", "approved")
    .lte("vacation_start_date", date)
    .gte("vacation_end_date", date);

  // Approved WFH for this date
  const { data: wfh } = await supabase
    .from("requests")
    .select("user_id, wfh_date, profiles:user_id(full_name)")
    .eq("type", "wfh")
    .eq("status", "approved")
    .eq("wfh_date", date);

  // Fetch profile names separately (no FK relationship defined)
  const allUserIds = [
    ...(vacations?.map((v: any) => v.user_id) ?? []),
    ...(wfh?.map((w: any) => w.user_id) ?? []),
  ];
  let nameMap: Record<string, string> = {};
  if (allUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", allUserIds);
    nameMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.user_id, p.full_name]));
  }

  return {
    vacation: (vacations ?? []).map((v: any) => nameMap[v.user_id] ?? "לא ידוע"),
    wfh: (wfh ?? []).map((w: any) => nameMap[w.user_id] ?? "לא ידוע"),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { briefingId } = body;
    if (!briefingId) throw new Error("briefingId is required");

    // Load briefing
    const { data: briefing, error: loadErr } = await supabase
      .from("morning_briefings")
      .select("*")
      .eq("id", briefingId)
      .single();
    if (loadErr || !briefing) throw new Error("Briefing not found");

    let transcript = briefing.raw_transcript ?? "";

    // If audio exists and no transcript, transcribe
    if (briefing.audio_path && !transcript) {
      const { data: fileData, error: dlErr } = await supabase.storage
        .from("morning-briefings-audio")
        .download(briefing.audio_path);
      if (dlErr) throw new Error(`Failed to download audio: ${dlErr.message}`);

      const arrayBuffer = await fileData.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      // Convert to base64 in chunks to avoid stack overflow
      let binary = "";
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
      }
      const base64 = btoa(binary);
      const mimeType = fileData.type || "audio/webm";

      transcript = await transcribeAudio(base64, mimeType);

      await supabase
        .from("morning_briefings")
        .update({ raw_transcript: transcript })
        .eq("id", briefingId);
    }

    if (!transcript || transcript.trim().length < 10) {
      throw new Error("Transcript is empty or too short");
    }

    // Summarize
    const summary = await summarizeTranscript(transcript);

    // Get attendance
    const attendance = await getAttendanceForDate(supabase, briefing.briefing_date);

    // Save
    await supabase
      .from("morning_briefings")
      .update({
        summary_sections: summary.sections,
        attendance,
        status: "ready",
        error_message: null,
      })
      .eq("id", briefingId);

    return new Response(JSON.stringify({ success: true, summary, attendance }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-briefing error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";

    try {
      const body = await req.clone().json();
      if (body.briefingId) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase
          .from("morning_briefings")
          .update({ status: "failed", error_message: msg })
          .eq("id", body.briefingId);
      }
    } catch (_) {}

    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
