
-- Knowledge Hub: knowledge_articles + article_reads tables

CREATE TABLE public.knowledge_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  topic TEXT NOT NULL,
  article_type TEXT NOT NULL DEFAULT 'article' CHECK (article_type IN ('article','update','announcement','procedure')),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view published articles"
ON public.knowledge_articles FOR SELECT TO authenticated
USING (is_published = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage articles"
ON public.knowledge_articles FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_knowledge_articles_updated_at
BEFORE UPDATE ON public.knowledge_articles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_knowledge_articles_published ON public.knowledge_articles(is_published, is_pinned, created_at DESC);
CREATE INDEX idx_knowledge_articles_department ON public.knowledge_articles(department_id);

-- article_reads
CREATE TABLE public.article_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES public.knowledge_articles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (article_id, user_id)
);

ALTER TABLE public.article_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reads"
ON public.article_reads FOR ALL TO authenticated
USING (user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1))
WITH CHECK (user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "Admins can view all reads"
ON public.article_reads FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE INDEX idx_article_reads_article ON public.article_reads(article_id);
CREATE INDEX idx_article_reads_user ON public.article_reads(user_id);
