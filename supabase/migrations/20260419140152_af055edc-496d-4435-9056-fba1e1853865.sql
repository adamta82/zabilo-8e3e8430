
-- Convert existing announcements to updates
UPDATE public.knowledge_articles SET article_type = 'update' WHERE article_type = 'announcement';

-- Drop unused columns
ALTER TABLE public.knowledge_articles DROP COLUMN IF EXISTS topic;
ALTER TABLE public.knowledge_articles DROP COLUMN IF EXISTS summary;

-- Tighten check constraint to remove 'announcement'
ALTER TABLE public.knowledge_articles DROP CONSTRAINT IF EXISTS knowledge_articles_article_type_check;
ALTER TABLE public.knowledge_articles ADD CONSTRAINT knowledge_articles_article_type_check
  CHECK (article_type IN ('article','update','procedure'));
