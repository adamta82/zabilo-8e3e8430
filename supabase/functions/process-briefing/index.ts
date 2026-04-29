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
const KNOWLEDGE_HUB_URL = "https://zabilo.lovable.app/knowledge";

async function sendWhatsAppNotification(
  sections: BriefingSection[],
  attendance: AttendanceData,
  title: string,
): Promise<void> {
  if (!BULLDOG_WHATSAPP_TOKEN || !BRIEFING_NOTIFY_PHONE) {
    console.log("WhatsApp notification skipped - missing config");
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

  try {
    const resp = await fetch("https://api.bulldog-wp.co.il/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Token": BULLDOG_WHATSAPP_TOKEN,
      },
      body: JSON.stringify({
        phone: BRIEFING_NOTIFY_PHONE,
        message,
      }),
    });
    const txt = await resp.text();
    if (!resp.ok) {
      console.error(`WhatsApp send failed [${resp.status}]: ${txt}`);
    } else {
      console.log(`WhatsApp sent: ${txt}`);
    }
  } catch (e) {
    console.error("WhatsApp send error:", e);
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
    const { briefingDate, audioPath, rawTranscript } = body;
    if (!briefingDate) throw new Error("briefingDate is required");

    // Get user profile id
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!profile) throw new Error("Profile not found");

    // Format Hebrew title
    const dateObj = new Date(briefingDate + 'T00:00:00');
    const hebrewDate = dateObj.toLocaleDateString('he-IL', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
    const title = `תדריך בוקר - ${hebrewDate}`;

    // Create placeholder article
    const { data: article, error: insErr } = await supabase
      .from("knowledge_articles")
      .insert({
        title,
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

    // Get transcript (transcribe if audio)
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

    // Summarize and get attendance
    const summary = await summarizeTranscript(transcript);
    const attendance = await getAttendanceForDate(supabase, briefingDate);

    // Build final HTML
    const html = buildBriefingHtml(summary.sections, attendance);

    // Update article
    const { error: updErr } = await supabase
      .from("knowledge_articles")
      .update({
        content: html,
        is_published: true,
      })
      .eq("id", article.id);
    if (updErr) throw updErr;

    // Send WhatsApp notification (non-blocking — failures logged but don't fail the request)
    await sendWhatsAppNotification(summary.sections, attendance, title);

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
