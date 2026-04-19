import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CreateArticleBody {
  text: string;
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

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Auth check
    const apiKey = req.headers.get('x-api-key');
    const expectedKey = Deno.env.get('ARTICLE_API_KEY');
    if (!expectedKey || apiKey !== expectedKey) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: CreateArticleBody = await req.json();

    if (!body.text || typeof body.text !== 'string' || body.text.trim().length < 5) {
      return new Response(
        JSON.stringify({ error: 'Missing or too short field: text' }),
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
            content:
              'אתה עוזר שמייצר מאמרים למרכז ידע פנימי בעברית. קבל טקסט גולמי והפק ממנו מאמר מסודר. הכותרת קצרה וברורה, התוכן ב-HTML פשוט (פסקאות <p>, רשימות <ul><li>, הדגשות <strong>). זהה את סוג המאמר: "update" לעדכון/חדשות, "procedure" לנוהל/הוראת עבודה, "article" למאמר כללי. אם רלוונטי, נחש לאיזו מחלקה זה שייך מתוך הרשימה הנתונה.',
          },
          {
            role: 'user',
            content: `מחלקות זמינות: ${deptNames.join(', ') || '(אין)'}\n\nטקסט גולמי:\n${body.text}`,
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

    // Resolve department: prefer explicit, then AI guess
    let departmentId: string | null = null;
    const wantedDept = body.department_name || article.department_guess;
    if (wantedDept) {
      const match = (allDepartments || []).find(
        (d) => d.name.trim().toLowerCase() === wantedDept.trim().toLowerCase()
      );
      if (match) departmentId = match.id;
    }

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
