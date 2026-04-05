
-- Add emergency contact and hire date to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS emergency_contact_name text,
ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
ADD COLUMN IF NOT EXISTS hire_date date,
ADD COLUMN IF NOT EXISTS address text;

-- Create employee_documents table
CREATE TABLE public.employee_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('form_101', 'pay_slip', 'contract', 'certificate', 'other')),
  file_name text NOT NULL,
  file_path text NOT NULL,
  description text,
  document_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

-- Employees can only view their own documents
CREATE POLICY "Employees can view own documents"
ON public.employee_documents FOR SELECT
TO authenticated
USING (
  employee_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
);

-- Admins can manage all documents
CREATE POLICY "Admins can manage all documents"
ON public.employee_documents FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create storage bucket for employee documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-documents', 'employee-documents', false);

-- Storage RLS: admins can upload
CREATE POLICY "Admins can upload employee documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employee-documents' AND is_admin(auth.uid())
);

-- Storage RLS: admins can view all, employees only their own folder
CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'employee-documents' AND (
    is_admin(auth.uid()) OR
    (storage.foldername(name))[1] = (SELECT id::text FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
  )
);

-- Storage RLS: admins can delete
CREATE POLICY "Admins can delete employee documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'employee-documents' AND is_admin(auth.uid())
);
