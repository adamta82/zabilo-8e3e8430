import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface CreateArticleBody {
  text?: string;
  task_name?: string;
  task_description?: string;
  task_assignee?: string;
  task_priority?: string;
  author_email?: string;
  department_name?: string;
}

interface AiArticle {
  title: string;
  content: string;
  article_type: 'article' | 'update' | 'procedure';
  department_guess?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse params from query string (GET) or JSON body (POST)
    const url = new URL(req.url);
    const qp = url.searchParams;

    let body: CreateArticleBody = {
      text: qp.get('text') || undefined,
      task_name: qp.get('task_name') || qp.get('name') || undefined,
      task_description: qp.get('task_description') || qp.get('description') || undefined,
      task_assignee: qp.get('task_assignee') || qp.get('assignee') || undefined,
      task_priority: qp.get('task_priority') || qp.get('priority') || undefined,
      author_email: qp.get('author_email') || qp.get('email') || undefined,
      department_name: qp.get('department_name') || qp.get('department') || undefined,
    };

    // Fallback: still allow POST with JSON body for backward compatibility
    if (req.method === 'POST') {
      try {
        const json = await req.json();
        body = { ...body, ...json };
      } catch {
        // ignore
      }
    }

    // Build a unified text from either raw text OR ClickUp task fields
    const composedParts: string[] = [];
    if (body.task_name) composedParts.push(`שם משימה: ${body.task_name}`);
    if (body.task_description) composedParts.push(`תיאור:\n${body.task_description}`);
    if (body.task_assignee) composedParts.push(`אחראי: ${body.task_assignee}`);
    if (body.task_priority) composedParts.push(`עדיפות: ${body.task_priority}`);
    if (body.text) composedParts.push(body.text);

    const sourceText = composedParts.join('\n\n').trim();

    if (!sourceText || sourceText.length < 5) {
      return new Response(
        JSON.stringify({ error: 'Missing input: provide text OR task_name/task_description' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Load departments list to help the AI choose
    const { data: allDepartments } = await supabase
      .from('departments')
      .select('id, name');
    const deptNames = (allDepartments || []).map((d) => d.name);

    // Call Lovable AI to extract structured article
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `אתה עורך תוכן מקצועי שמייצר מאמרים אינפורמטיביים ומפורטים למרכז ידע פנימי בעברית.

## המטרה העליונה
להעביר את כל המידע שבמלל הגולמי בצורה הברורה, המסודרת והמפורטת ביותר. **אסור לקצר או להשמיט מידע** - כל פרט, נתון, מספר, שם, תאריך או הוראה חייב להופיע במאמר הסופי. אם המלל ארוך - המאמר ארוך. אם יש פרטים טכניים - הם נשארים.

## טיפול במלל הקלט
- המלל הגולמי עשוי להגיע עם תגיות HTML (כמו <p>, <br>, <div>), עם פורמט markdown, או כטקסט נקי. **התעלם מתגיות שבורות או מקושקשות במלל הקלט** - חלץ את המידע הטהור והרכב מחדש HTML נקי משלך.
- אם רואה תגיות כמו "<p>", "</p>", "<b>", "</b>" כטקסט במלל - אלה שאריות. נקה אותן ובנה מבנה חדש ונכון.
- אל תעתיק את המלל כמו שהוא - **שכתב ושפר** את הניסוח כדי שיהיה ברור, רהוט ומקצועי, אבל **שמור על כל פרט מידע**.

## מבנה המאמר (HTML)
השתמש בתגיות HTML סמנטיות נכונות:
- <p> לפסקאות. כל רעיון בפסקה נפרדת.
- <h2> לכותרות משנה גדולות (חלוקה לחלקים עיקריים).
- <h3> לתת-כותרות.
- <ul><li> לרשימות לא-ממוספרות (פריטים, נקודות, דוגמאות).
- <ol><li> לרשימות ממוספרות (שלבים, סדר פעולות).
- <strong> להדגשת מונחים חשובים, מספרים, שמות מערכות.
- <blockquote> לציטוטים או הערות חשובות.
- <a href="..."> לקישורים אם מופיעים במלל.

## עקרונות כתיבה
1. **פתיחה**: פסקה קצרה שמסבירה במה המאמר עוסק ולמי הוא מיועד.
2. **גוף**: חלק את המידע לחלקים הגיוניים עם כותרות משנה. כל חלק - פסקאות + רשימות במידת הצורך.
3. **רשימות**: כל פעם שיש מספר פריטים, שלבים, או נקודות - השתמש ברשימה במקום פסקה ארוכה.
4. **סיכום/הוראות פעולה**: אם רלוונטי, סיים בחלק של "מה הלאה" או "צעדים מעשיים".
5. **שמור על שמות אנשים, חברות, מערכות, מספרי גרסאות, תאריכים, מחירים, אחוזים - בדיוק כפי שהופיעו**.

## כותרת
קצרה (3-8 מילים), ברורה, מתארת את התוכן המרכזי. ללא סימני פיסוק מיותרים.

## סיווג סוג המאמר
- "update" - עדכון, חדשות, שינוי בתהליך, גרסה חדשה, הודעה.
- "procedure" - נוהל, הוראת עבודה, מדריך step-by-step, איך לעשות משהו.
- "article" - מאמר ידע כללי, רקע, הסבר על נושא.

## בחירת מחלקה
חובה לבחור את המחלקה המתאימה ביותר מהרשימה הנתונה. נתח את הנושא, המונחים המקצועיים וההקשר. החזר ב-department_guess את שם המחלקה בדיוק כפי שהיא מופיעה ברשימה. רק אם באמת אין שום קשר - השאר ריק.`,
          },
          {
            role: 'user',
            content: `מחלקות זמינות במערכת: ${deptNames.join(', ') || '(אין)'}\n${
              body.department_name
                ? `\nרמז מהמשתמש לגבי מחלקה: "${body.department_name}" - אם זה תואם בדיוק לאחת המחלקות ברשימה, השתמש בה. אם לא תואם בדיוק, בחר את המחלקה הקרובה/דומה ביותר מהרשימה (למשל "שיווק" ≈ "מרקטינג", "כספים" ≈ "הנהלת חשבונות"). אם הרמז לא קשור לאף מחלקה, התעלם ממנו ובחר לפי תוכן המלל.\n`
                : ''
            }\nטקסט גולמי:\n${body.text}`,
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'create_article',
              description: 'Create a structured knowledge article from raw text',
              parameters: {
                type: 'object',
                properties: {
                  title: { type: 'string', description: 'כותרת קצרה וברורה בעברית' },
                  content: { type: 'string', description: 'תוכן המאמר ב-HTML פשוט בעברית' },
                  article_type: {
                    type: 'string',
                    enum: ['article', 'update', 'procedure'],
                    description: 'סוג המאמר',
                  },
                  department_guess: {
                    type: 'string',
                    description: 'שם המחלקה המתאימה מתוך הרשימה הזמינה, אם ניתן לזהות',
                  },
                },
                required: ['title', 'content', 'article_type'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'create_article' } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: 'AI rate limit exceeded, try again later' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const t = await aiResp.text();
      console.error('AI error:', aiResp.status, t);
      throw new Error('AI generation failed');
    }

    const aiData = await aiResp.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error('No tool call in AI response:', JSON.stringify(aiData));
      throw new Error('AI did not return structured article');
    }
    const article: AiArticle = JSON.parse(toolCall.function.arguments);

    // Resolve department: try explicit match first, then fall back to AI guess
    let departmentId: string | null = null;
    const tryMatch = (name?: string) => {
      if (!name) return null;
      const m = (allDepartments || []).find(
        (d) => d.name.trim().toLowerCase() === name.trim().toLowerCase()
      );
      return m?.id || null;
    };
    departmentId = tryMatch(body.department_name) || tryMatch(article.department_guess);

    // Resolve author by email, fallback to first admin
    let authorId: string | null = null;
    if (body.author_email) {
      const { data: author } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', body.author_email)
        .maybeSingle();
      if (author) authorId = author.id;
    }
    if (!authorId) {
      const { data: anyAdmin } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
        .limit(1)
        .maybeSingle();
      if (anyAdmin) {
        const { data: adminProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', anyAdmin.user_id)
          .maybeSingle();
        if (adminProfile) authorId = adminProfile.id;
      }
    }
    if (!authorId) {
      return new Response(
        JSON.stringify({ error: 'Could not resolve author (no matching email and no admin fallback)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('knowledge_articles')
      .insert({
        title: article.title,
        content: article.content,
        article_type: article.article_type,
        department_id: departmentId,
        author_id: authorId,
        is_pinned: false,
        is_published: true,
      })
      .select('id')
      .single();

    if (insertErr) throw insertErr;

    return new Response(
      JSON.stringify({
        success: true,
        article_id: inserted.id,
        title: article.title,
        article_type: article.article_type,
        department_id: departmentId,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('create-article error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
