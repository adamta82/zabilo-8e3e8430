import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type DocumentType = 'form_101' | 'pay_slip' | 'contract' | 'certificate' | 'other';

export interface EmployeeDocument {
  id: string;
  employee_id: string;
  uploaded_by: string;
  document_type: DocumentType;
  file_name: string;
  file_path: string;
  description: string | null;
  document_date: string | null;
  created_at: string;
  updated_at: string;
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  form_101: 'טופס 101',
  pay_slip: 'תלוש שכר',
  contract: 'חוזה העסקה',
  certificate: 'אישור',
  other: 'אחר',
};

export function useEmployeeDocuments(employeeId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['employee-documents', employeeId],
    queryFn: async () => {
      let query = supabase
        .from('employee_documents')
        .select('*')
        .order('document_date', { ascending: false });

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EmployeeDocument[];
    },
    enabled: !!user && !!employeeId,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      file,
      employeeId,
      documentType,
      description,
      documentDate,
    }: {
      file: File;
      employeeId: string;
      documentType: DocumentType;
      description?: string;
      documentDate?: string;
    }) => {
      const filePath = `${employeeId}/${documentType}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('employee-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from('employee_documents')
        .insert({
          employee_id: employeeId,
          uploaded_by: user!.id,
          document_type: documentType,
          file_name: file.name,
          file_path: filePath,
          description: description || null,
          document_date: documentDate || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-documents'] });
      toast({ title: 'המסמך הועלה בהצלחה' });
    },
    onError: (error) => {
      toast({ title: 'שגיאה בהעלאת המסמך', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (doc: EmployeeDocument) => {
      await supabase.storage.from('employee-documents').remove([doc.file_path]);
      const { error } = await supabase.from('employee_documents').delete().eq('id', doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-documents'] });
      toast({ title: 'המסמך נמחק' });
    },
    onError: (error) => {
      toast({ title: 'שגיאה במחיקת המסמך', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDownloadDocument() {
  return async (doc: EmployeeDocument) => {
    const { data, error } = await supabase.storage
      .from('employee-documents')
      .createSignedUrl(doc.file_path, 60);

    if (error) throw error;
    window.open(data.signedUrl, '_blank');
  };
}
