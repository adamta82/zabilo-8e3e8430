import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Department = Database['public']['Tables']['departments']['Row'];
type DepartmentInsert = Database['public']['Tables']['departments']['Insert'];

export interface DepartmentWithCount extends Department {
  employee_count: number;
  manager_name?: string;
}

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      // Get departments
      const { data: departments, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (deptError) throw deptError;

      // Get employee counts per department
      const { data: counts, error: countError } = await supabase
        .from('profiles')
        .select('department_id');

      if (countError) throw countError;

      // Calculate counts
      const countMap = counts.reduce((acc, profile) => {
        if (profile.department_id) {
          acc[profile.department_id] = (acc[profile.department_id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      return departments.map((dept) => ({
        ...dept,
        employee_count: countMap[dept.id] || 0,
      })) as DepartmentWithCount[];
    },
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (department: DepartmentInsert) => {
      const { data, error } = await supabase
        .from('departments')
        .insert(department)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast({
        title: 'המחלקה נוצרה בהצלחה',
      });
    },
    onError: (error) => {
      toast({
        title: 'שגיאה ביצירת המחלקה',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Department>;
    }) => {
      const { error } = await supabase
        .from('departments')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast({
        title: 'המחלקה עודכנה בהצלחה',
      });
    },
    onError: (error) => {
      toast({
        title: 'שגיאה בעדכון המחלקה',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast({
        title: 'המחלקה נמחקה',
      });
    },
    onError: (error) => {
      toast({
        title: 'שגיאה במחיקת המחלקה',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
