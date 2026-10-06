ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS can_publish_articles boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.can_publish_articles(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin') OR EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = _user_id AND can_publish_articles = true AND is_active = true)
$$;

CREATE POLICY "Publishers can insert own articles" ON public.knowledge_articles
FOR INSERT TO authenticated
WITH CHECK (public.can_publish_articles(auth.uid()) AND author_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Publishers can update own articles" ON public.knowledge_articles
FOR UPDATE TO authenticated
USING (public.can_publish_articles(auth.uid()) AND author_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
WITH CHECK (author_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Publishers can delete own articles" ON public.knowledge_articles
FOR DELETE TO authenticated
USING (public.can_publish_articles(auth.uid()) AND author_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Authors can view own drafts" ON public.knowledge_articles
FOR SELECT TO authenticated
USING (author_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));