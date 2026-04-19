import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  event: string;
  request_id?: string;
  test_url?: string;
  article_id?: string;
  article_title?: string;
  unread_user_ids?: string[];
  unread_user_names?: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const payload: WebhookPayload = await req.json();
    const { event, request_id, test_url, article_id, article_title, unread_user_ids, unread_user_names } = payload;

    // Get webhook URL from settings
    let webhookUrl = test_url;
    
    if (!webhookUrl) {
      const { data: settings } = await supabase
        .from('global_settings')
        .select('value')
        .eq('key', 'webhook_url')
        .single();

      if (!settings?.value) {
        return new Response(
          JSON.stringify({ success: true, message: 'No webhook configured' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const webhookSettings = settings.value as { url: string; enabled: boolean };
      
      if (!webhookSettings.enabled || !webhookSettings.url) {
        return new Response(
          JSON.stringify({ success: true, message: 'Webhook disabled' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      webhookUrl = webhookSettings.url;
    }

    // Build the payload to send
    let webhookData: Record<string, unknown> = {
      event,
      timestamp: new Date().toISOString(),
    };

    if (event === 'test') {
      webhookData = {
        event: 'test',
        message: 'This is a test webhook from Zabilo Book',
        timestamp: new Date().toISOString(),
      };
    } else if (event === 'read_reminder') {
      webhookData = {
        event: 'read_reminder',
        timestamp: new Date().toISOString(),
        article_id,
        article_title,
        unread_user_ids: unread_user_ids || [],
        unread_user_names: unread_user_names || [],
      };
    } else if (request_id) {
      const { data: request, error: requestError } = await supabase
        .from('requests')
        .select('*')
        .eq('id', request_id)
        .single();

      console.log('Request fetch result:', { request_id, request, error: requestError });

      if (request) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, user_id, username, full_name, email, phone, department_id, approver_id, calendar_emails')
          .eq('user_id', request.user_id)
          .single();

        console.log('Profile fetch result:', { user_id: request.user_id, profile, error: profileError });

        // Fetch department separately
        let department = null;
        if (profile?.department_id) {
          const { data: dept } = await supabase
            .from('departments')
            .select('id, name, icon')
            .eq('id', profile.department_id)
            .single();
          department = dept;
        }

        // Fetch designated approver for this employee
        let designatedApprover = null;
        if (profile?.approver_id) {
          const { data: approverProfile } = await supabase
            .from('profiles')
            .select('id, full_name, email, phone')
            .eq('id', profile.approver_id)
            .single();
          designatedApprover = approverProfile;
        }

        let approver = null;
        if (request.approved_by) {
          const { data: approverProfile } = await supabase
            .from('profiles')
            .select('id, full_name, email, phone')
            .eq('user_id', request.approved_by)
            .single();
          approver = approverProfile;
        }

        // Format WFH tasks as single string
        let formattedTasks: string | null = null;
        if (request.wfh_tasks && Array.isArray(request.wfh_tasks)) {
          formattedTasks = (request.wfh_tasks as Array<{ description: string; estimatedHours: number; reference?: string }>)
            .map(t => `משימה: ${t.description} | זמן: ${t.estimatedHours} שעות${t.reference ? ` | רפרנט: ${t.reference}` : ''}`)
            .join('\n');
        }

        // Format items (equipment/groceries) as single string
        let formattedItems: string | null = null;
        if (request.items && Array.isArray(request.items)) {
          formattedItems = (request.items as Array<{ name: string; quantity: number }>)
            .map(i => `פריט: ${i.name} | כמות: ${i.quantity}`)
            .join('\n');
        }

        webhookData = {
          event,
          timestamp: new Date().toISOString(),
          request: {
            id: request.id,
            type: request.type,
            status: request.status,
            created_at: request.created_at,
            updated_at: request.updated_at,
            approved_at: request.approved_at,
            notes: request.notes,
            wfh_date: request.wfh_date,
            wfh_tasks: formattedTasks,
            wfh_checklist: request.wfh_checklist,
            vacation_start_date: request.vacation_start_date,
            vacation_end_date: request.vacation_end_date,
            vacation_reason: request.vacation_reason,
            vacation_single_day: request.vacation_single_day,
            use_vacation_days: request.use_vacation_days,
            items: formattedItems,
          },
          user: profile ? {
            id: profile.id,
            user_id: profile.user_id,
            username: profile.username,
            full_name: profile.full_name,
            email: profile.email,
            phone: profile.phone,
            department: department,
            calendar_emails: profile.calendar_emails,
          } : null,
          approved_by: approver,
          designated_approver: designatedApprover ? {
            full_name: designatedApprover.full_name,
            email: designatedApprover.email,
            phone: designatedApprover.phone,
          } : null,
        };
      }
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookData),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed with status ${response.status}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook sent successfully', status: response.status }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
