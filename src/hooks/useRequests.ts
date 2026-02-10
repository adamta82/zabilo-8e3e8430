import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Request = Database['public']['Tables']['requests']['Row'];
type RequestInsert = Database['public']['Tables']['requests']['Insert'];
type RequestStatus = Database['public']['Enums']['request_status'];

export interface RequestWithProfile extends Request {
  profiles: {
    id: string;
    full_name: string;
    email: string;
    department_id: string | null;
    approver_id: string | null;
  } | null;
}

export function useRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['requests', user?.id],
    queryFn: async () => {
      // RLS now handles visibility: own requests + approved requests for all users
      const { data: requests, error } = await supabase
        .from('requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!requests || requests.length === 0) return [];

      // Get unique user IDs
      const userIds = [...new Set(requests.map(r => r.user_id))];
      
      // Fetch profiles for all users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, email, department_id, approver_id')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const data = requests.map(request => ({
        ...request,
        profiles: profileMap.get(request.user_id) || null,
      }));
      
      return data as RequestWithProfile[];
    },
    enabled: !!user,
  });
}

export function useCreateRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (request: Omit<RequestInsert, 'user_id'>) => {
      const { data, error } = await supabase
        .from('requests')
        .insert({
          ...request,
          user_id: user!.id,
        })
        .select()
        .single();

      if (error) throw error;

      try {
        await supabase.functions.invoke('send-webhook', {
          body: { event: 'request_created', request_id: data.id },
        });
      } catch (webhookError) {
        console.error('Webhook error:', webhookError);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      toast({ title: 'הבקשה נוצרה בהצלחה', description: 'הבקשה נשלחה לאישור' });
    },
    onError: (error) => {
      toast({ title: 'שגיאה ביצירת הבקשה', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateRequestStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ requestId, status, notes }: { requestId: string; status: RequestStatus; notes?: string }) => {
      const updateData: Partial<Request> = { status, notes };

      if (status === 'approved' || status === 'rejected') {
        updateData.approved_by = user!.id;
        updateData.approved_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('requests')
        .update(updateData)
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;

      try {
        await supabase.functions.invoke('send-webhook', {
          body: { event: `request_${status}`, request_id: data.id },
        });
      } catch (webhookError) {
        console.error('Webhook error:', webhookError);
      }

      return data;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      const statusMessages: Record<RequestStatus, string> = {
        pending: 'הבקשה הוחזרה להמתנה',
        approved: 'הבקשה אושרה בהצלחה',
        rejected: 'הבקשה נדחתה',
        ordered: 'הבקשה סומנה כהוזמנה',
        supplied: 'הבקשה סומנה כסופקה',
      };
      toast({ title: statusMessages[status] });
    },
    onError: (error) => {
      toast({ title: 'שגיאה בעדכון הסטטוס', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.from('requests').delete().eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      toast({ title: 'הבקשה נמחקה' });
    },
    onError: (error) => {
      toast({ title: 'שגיאה במחיקת הבקשה', description: error.message, variant: 'destructive' });
    },
  });
}
