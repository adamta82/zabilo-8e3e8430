-- Create knowledge_folders table
CREATE TABLE public.knowledge_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  parent_folder_id UUID REFERENCES public.knowledge_folders(id) ON DELETE CASCADE,
  icon TEXT DEFAULT 'folder',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.knowledge_folders ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated can view folders"
  ON public.knowledge_folders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage folders"
  ON public.knowledge_folders FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_knowledge_folders_updated_at
  BEFORE UPDATE ON public.knowledge_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add folder_id to knowledge_articles
ALTER TABLE public.knowledge_articles
  ADD COLUMN folder_id UUID REFERENCES public.knowledge_folders(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX idx_knowledge_folders_department ON public.knowledge_folders(department_id);
CREATE INDEX idx_knowledge_folders_parent ON public.knowledge_folders(parent_folder_id);
CREATE INDEX idx_knowledge_articles_folder ON public.knowledge_articles(folder_id);