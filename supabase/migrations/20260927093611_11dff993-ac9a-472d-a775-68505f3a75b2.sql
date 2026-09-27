ALTER TABLE public.shift_roles ADD COLUMN IF NOT EXISTS is_custom boolean NOT NULL DEFAULT false;
ALTER TABLE public.shift_cells ADD COLUMN IF NOT EXISTS custom_label text;
INSERT INTO public.shift_roles (name, color, sort_order, is_off, is_custom)
SELECT 'מותאם אישית', '#94a3b8', 90, false, true
WHERE NOT EXISTS (SELECT 1 FROM public.shift_roles WHERE is_custom = true);