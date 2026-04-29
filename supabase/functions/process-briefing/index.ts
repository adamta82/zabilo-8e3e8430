import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BULLDOG_WHATSAPP_TOKEN = Deno.env.get("BULLDOG_WHATSAPP_TOKEN");
const BRIEFING_NOTIFY_PHONE = Deno.env.get("BRIEFING_NOTIFY_PHONE");
const KNOWLEDGE_HUB_URL = "https://zabilo.lovable.app/";

async function logWebhookCall(params: {
  url: string;
  method: string;
  body: unknown;
  responseStatus: number | null;
  responseBody: unknown;
  error: string | null;
}): Promise<void> {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    await supabase.from("webhook_logs").insert({
      function_name: "process-briefing → WhatsApp (Bulldog)",
      method: params.method,
      url: params.url,
      query_params: null,
      body: params.body as any,
      response_status: params.responseStatus,
      response_body: params.responseBody as any,
      error: params.error,
    });
  } catch (e) {
    console.error("Failed to log webhook call:", e);
  }
}

async function sendWhatsAppNotification(
  sections: BriefingSection[],
  attendance: AttendanceData,
  title: string,
): Promise<void> {
  if (!BULLDOG_WHATSAPP_TOKEN || !BRIEFING_NOTIFY_PHONE) {
    console.log("WhatsApp notification skipped - missing config");
    await logWebhookCall({
      url: "https://api.bulldog-wp.co.il/v1/messages",
      method: "POST",
      body: null,
      responseStatus: null,
      responseBody: null,
      error: "Skipped — missing BULLDOG_WHATSAPP_TOKEN or BRIEFING_NOTIFY_PHONE",
    });
    return;
  }

  const vacationText = attendance.vacation.length > 0 ? attendance.vacation.join(", ") : "אין";
  const wfhText = attendance.wfh.length > 0 ? attendance.wfh.join(", ") : "אין";
  const titles = sections.map((s) => `• ${s.title}`).join("\n");

  const message = `📋 *${title}*

🌴 *חופש:* ${vacationText}
🏠 *עבודה מהבית:* ${wfhText}

📌 *נושאי התדריך:*
${titles || "—"}

🔗 לצפייה בתדריך המלא:
${KNOWLEDGE_HUB_URL}`;

  const url = "https://api.bulldog-wp.co.il/v1/messages";
  const requestBody = { group: BRIEFING_NOTIFY_PHONE, message };

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Token": BULLDOG_WHATSAPP_TOKEN,
      },
      body: JSON.stringify(requestBody),
    });
    const txt = await resp.text();
    let parsedResponse: unknown = txt;
    try { parsedResponse = JSON.parse(txt); } catch (_) {}

    if (!resp.ok) {
      console.error(`WhatsApp send failed [${resp.status}]: ${txt}`);
      await logWebhookCall({
        url, method: "POST", body: requestBody,
        responseStatus: resp.status, responseBody: parsedResponse,
        error: `HTTP ${resp.status}`,
      });
    } else {
      console.log(`WhatsApp sent: ${txt}`);
      await logWebhookCall({
        url, method: "POST", body: requestBody,
        responseStatus: resp.status, responseBody: parsedResponse, error: null,
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("WhatsApp send error:", e);
    await logWebhookCall({
      url, method: "POST", body: requestBody,
      responseStatus: null, responseBody: null, error: msg,
    });
  }
}

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
            { type: "text", text: "תמלל את הקובץ הקול הבא בעברית במדויק. החזר רק את התמלול ללא תוספות או הערות." },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${audioBase64}` } },
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

interface BriefingSection { title: string; bullets: string[]; }
interface AttendanceData { vacation: string[]; wfh: string[]; }

interface BriefingPreviewPayload {
  title: string;
  transcript: string;
  sections: BriefingSection[];
  attendance: AttendanceData;
  html: string;
  audioPath: string | null;
}

async function summarizeTranscript(transcript: string): Promise<{ sections: BriefingSection[] }> {
  const systemPrompt = `אתה עוזר שמסכם תדריכי בוקר של חברת eCommerce ישראלית בעברית.

הסיכום חייב להיות:
- מובנה לפי נושאים שזוהו בתדריך
- לכל נושא כותרת קצרה וברורה (2-5 מילים)
- תחת כל כותרת בולטים תמציתיים
- שמור על הטון והניסוח של הדובר
- אל תמציא מידע
- אורך תמציתי דומה למקור
- אל תכלול נושאי נוכחות (חופש/עבודה מהבית) - הם מטופלים בנפרד

החזר באמצעות הכלי save_briefing_summary.`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `תמלול התדריך:\n\n${transcript}` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "save_briefing_summary",
          description: "שומר סיכום מובנה",
          parameters: {
            type: "object",
            properties: {
              sections: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    bullets: { type: "array", items: { type: "string" } },
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
      }],
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

async function getAttendanceForDate(supabase: any, date: string): Promise<AttendanceData> {
  const { data: vacations } = await supabase
    .from("requests")
    .select("user_id")
    .eq("type", "vacation")
    .eq("status", "approved")
    .lte("vacation_start_date", date)
    .gte("vacation_end_date", date);

  const { data: wfh } = await supabase
    .from("requests")
    .select("user_id")
    .eq("type", "wfh")
    .eq("status", "approved")
    .eq("wfh_date", date);

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

function buildBriefingHtml(sections: BriefingSection[], attendance: AttendanceData): string {
  let html = '';

  html += '<div class="briefing-attendance">';
  const vacationText = attendance.vacation.length > 0 ? attendance.vacation.join(', ') : 'אין';
  const wfhText = attendance.wfh.length > 0 ? attendance.wfh.join(', ') : 'אין';
  html += `<p><strong>🌴 חופש:</strong> ${vacationText}</p>`;
  html += `<p><strong>🏠 עבודה מהבית:</strong> ${wfhText}</p>`;
  html += '</div><hr/>';

  for (const section of sections) {
    html += `<h3>${escapeHtml(section.title)}</h3><ul>`;
    for (const b of section.bullets) {
      html += `<li>${escapeHtml(b)}</li>`;
    }
    html += '</ul>';
  }

  return html;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatBriefingTitle(briefingDate: string): string {
  const dateObj = new Date(briefingDate + 'T00:00:00');
  const hebrewDate = dateObj.toLocaleDateString('he-IL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  return `תדריך בוקר - ${hebrewDate}`;
}

function normalizePreviewData(payload: any): BriefingPreviewPayload {
  if (!payload || typeof payload !== 'object') {
    throw new Error('previewData is invalid');
  }

  const transcript = typeof payload.transcript === 'string' ? payload.transcript : '';
  const title = typeof payload.title === 'string' ? payload.title : '';
  const html = typeof payload.html === 'string' ? payload.html : '';
  const audioPath = typeof payload.audioPath === 'string' ? payload.audioPath : null;
  const sections = Array.isArray(payload.sections)
    ? payload.sections.map((section: any) => ({
        title: typeof section?.title === 'string' ? section.title : '',
        bullets: Array.isArray(section?.bullets) ? section.bullets.filter((bullet: unknown): bullet is string => typeof bullet === 'string') : [],
      }))
    : [];
  const attendance = {
    vacation: Array.isArray(payload.attendance?.vacation)
      ? payload.attendance.vacation.filter((name: unknown): name is string => typeof name === 'string')
      : [],
    wfh: Array.isArray(payload.attendance?.wfh)
      ? payload.attendance.wfh.filter((name: unknown): name is string => typeof name === 'string')
      : [],
  };

  if (!title || !html || transcript.trim().length < 10 || sections.length === 0) {
    throw new Error('previewData is incomplete');
  }

  return { title, transcript, sections, attendance, html, audioPath };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let articleIdForError: string | null = null;

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

    const userId = userData.user.id;
    const body = await req.json();
    const { briefingDate, audioPath, rawTranscript, previewOnly, previewData } = body;
    if (!briefingDate) throw new Error("briefingDate is required");

    // Get user profile id
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!profile) throw new Error("Profile not found");

    const title = formatBriefingTitle(briefingDate);

    let previewPayload: BriefingPreviewPayload;
    if (previewData) {
      previewPayload = normalizePreviewData(previewData);
    } else {
      let transcript = rawTranscript ?? "";
      if (audioPath && !transcript) {
        const { data: fileData, error: dlErr } = await supabase.storage
          .from("morning-briefings-audio")
          .download(audioPath);
        if (dlErr) throw new Error(`Failed to download audio: ${dlErr.message}`);

        const arrayBuffer = await fileData.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";
        const chunkSize = 0x8000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
        }
        const base64 = btoa(binary);
        const mimeType = fileData.type || "audio/webm";

        transcript = await transcribeAudio(base64, mimeType);
      }

      if (!transcript || transcript.trim().length < 10) {
        throw new Error("התמלול ריק או קצר מדי");
      }

      const summary = await summarizeTranscript(transcript);
      const attendance = await getAttendanceForDate(supabase, briefingDate);
      previewPayload = {
        title,
        transcript,
        sections: summary.sections,
        attendance,
        html: buildBriefingHtml(summary.sections, attendance),
        audioPath: audioPath ?? null,
      };
    }

    if (previewOnly) {
      return new Response(JSON.stringify(previewPayload), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create placeholder article
    const { data: article, error: insErr } = await supabase
      .from("knowledge_articles")
      .insert({
        title: previewPayload.title,
        content: '<p><em>מעבד את התדריך...</em></p>',
        article_type: 'briefing',
        author_id: profile.id,
        is_published: false,
        is_pinned: false,
      })
      .select()
      .single();
    if (insErr) throw insErr;
    articleIdForError = article.id;

    // Update article
    const { error: updErr } = await supabase
      .from("knowledge_articles")
      .update({
        content: previewPayload.html,
        is_published: true,
      })
      .eq("id", article.id);
    if (updErr) throw updErr;

    // Send WhatsApp notification (non-blocking — failures logged but don't fail the request)
    await sendWhatsAppNotification(previewPayload.sections, previewPayload.attendance, previewPayload.title);

    return new Response(JSON.stringify({ success: true, articleId: article.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-briefing error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";

    // Mark failed article
    if (articleIdForError) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase
          .from("knowledge_articles")
          .update({
            content: `<p><strong>עיבוד התדריך נכשל:</strong> ${msg}</p>`,
            is_published: false,
          })
          .eq("id", articleIdForError);
      } catch (_) {}
    }

    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
