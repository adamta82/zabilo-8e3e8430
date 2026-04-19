import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CreateArticleBody {
  title: string;
  content: string;
  article_type?: 'article' | 'update' | 'procedure';
  department_name?: string;
  department_id?: string;
  author_email?: string;
  author_id?: string;
  is_pinned?: boolean;
  is_published?: boolean;
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

    // Validate required fields
    if (!body.title || !body.content) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: title, content' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const articleType = body.article_type || 'article';
    if (!['article', 'update', 'procedure'].includes(articleType)) {
      return new Response(
        JSON.stringify({ error: 'article_type must be: article | update | procedure' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Resolve department
    let departmentId: string | null = body.department_id || null;
    if (!departmentId && body.department_name) {
      const { data: dept, error: deptErr } = await supabase
        .from('departments')
        .select('id')
        .ilike('name', body.department_name)
        .maybeSingle();
      if (deptErr) throw deptErr;
      if (!dept) {
        return new Response(
          JSON.stringify({ error: `Department not found: ${body.department_name}` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      departmentId = dept.id;
    }

    if (!departmentId) {
      return new Response(
        JSON.stringify({ error: 'department_id or department_name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve author
    let authorId: string | null = body.author_id || null;
    if (!authorId && body.author_email) {
      const { data: author, error: authorErr } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', body.author_email)
        .maybeSingle();
      if (authorErr) throw authorErr;
      if (!author) {
        return new Response(
          JSON.stringify({ error: `Author not found: ${body.author_email}` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      authorId = author.id;
    }

    if (!authorId) {
      // Fallback: pick first admin profile
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
        JSON.stringify({ error: 'author_id or author_email is required (no admin fallback found)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: article, error: insertErr } = await supabase
      .from('knowledge_articles')
      .insert({
        title: body.title,
        content: body.content,
        article_type: articleType,
        department_id: departmentId,
        author_id: authorId,
        is_pinned: body.is_pinned ?? false,
        is_published: body.is_published ?? true,
      })
      .select('id')
      .single();

    if (insertErr) throw insertErr;

    return new Response(
      JSON.stringify({ success: true, article_id: article.id }),
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
