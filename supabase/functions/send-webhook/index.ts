import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  event: string;
  request_id?: string;
  test_url?: string;
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
    const { event, request_id, test_url } = payload;

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

    // If it's a test, send a simple test payload
    if (event === 'test') {
      webhookData = {
        event: 'test',
        message: 'This is a test webhook from Zabilo Book',
        timestamp: new Date().toISOString(),
      };
    } 
    // For actual request events, fetch full request and user data
    else if (request_id) {
      // Fetch request with all details
      const { data: request } = await supabase
        .from('requests')
        .select('*')
        .eq('id', request_id)
        .single();

      if (request) {
        // Fetch user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select(`
            id,
            user_id,
            username,
            full_name,
            email,
            phone,
            department_id,
            approver_id,
            calendar_emails,
            departments (id, name, icon)
          `)
          .eq('user_id', request.user_id)
          .single();

        // Fetch approver details if exists
        let approver = null;
        if (request.approved_by) {
          const { data: approverProfile } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('user_id', request.approved_by)
            .single();
          approver = approverProfile;
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
            // WFH specific
            wfh_date: request.wfh_date,
            wfh_tasks: request.wfh_tasks,
            wfh_checklist: request.wfh_checklist,
            // Vacation specific
            vacation_start_date: request.vacation_start_date,
            vacation_end_date: request.vacation_end_date,
            vacation_reason: request.vacation_reason,
            // Equipment/Groceries specific
            items: request.items,
          },
          user: profile ? {
            id: profile.id,
            user_id: profile.user_id,
            username: profile.username,
            full_name: profile.full_name,
            email: profile.email,
            phone: profile.phone,
            department: profile.departments,
            calendar_emails: profile.calendar_emails,
          } : null,
          approved_by: approver,
        };
      }
    }

    // Send webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookData),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed with status ${response.status}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook sent successfully',
        status: response.status 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
