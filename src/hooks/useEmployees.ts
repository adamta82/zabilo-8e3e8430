import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type AppRole = Database['public']['Enums']['app_role'];

export interface EmployeeWithRole extends Profile {
  user_roles: { role: AppRole }[] | null;
  departments: { id: string; name: string; icon: string | null } | null;
  approver: { id: string; full_name: string } | null;
}

export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (profilesError) throw profilesError;
      if (!profiles || profiles.length === 0) return [];

      // Fetch all user roles
      const userIds = profiles.map(p => p.user_id);
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      // Fetch all departments
      const deptIds = profiles.map(p => p.department_id).filter(Boolean) as string[];
      const { data: departments } = await supabase
        .from('departments')
        .select('id, name, icon')
        .in('id', deptIds.length > 0 ? deptIds : ['']);

      // Fetch approvers
      const approverIds = profiles.map(p => p.approver_id).filter(Boolean) as string[];
      const { data: approvers } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', approverIds.length > 0 ? approverIds : ['']);

      // Create maps
      const roleMap = new Map(roles?.map(r => [r.user_id, [{ role: r.role }]]) || []);
      const deptMap = new Map(departments?.map(d => [d.id, d]) || []);
      const approverMap = new Map(approvers?.map(a => [a.id, a]) || []);

      // Combine data
      const data = profiles.map(profile => ({
        ...profile,
        user_roles: roleMap.get(profile.user_id) || null,
        departments: profile.department_id ? deptMap.get(profile.department_id) || null : null,
        approver: profile.approver_id ? approverMap.get(profile.approver_id) || null : null,
      }));

      return data as EmployeeWithRole[];
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
      newRole,
    }: {
      id: string;
      updates: Partial<Profile>;
      newRole?: AppRole;
    }) => {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id);

      if (profileError) throw profileError;

      // Update role if provided
      if (newRole) {
        // Get user_id from profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('id', id)
          .single();

        if (profile) {
          const { error: roleError } = await supabase
            .from('user_roles')
            .update({ role: newRole })
            .eq('user_id', profile.user_id);

          if (roleError) throw roleError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: 'הפרטים עודכנו בהצלחה',
      });
    },
    onError: (error) => {
      toast({
        title: 'שגיאה בעדכון הפרטים',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (profileId: string) => {
      // Get user_id first
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', profileId)
        .single();

      if (fetchError) throw fetchError;

      // Delete from auth (this will cascade to profiles and user_roles via RLS)
      // Note: This requires admin privileges or a server-side function
      // For now, we just delete the profile
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: 'העובד נמחק',
      });
    },
    onError: (error) => {
      toast({
        title: 'שגיאה במחיקת העובד',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
