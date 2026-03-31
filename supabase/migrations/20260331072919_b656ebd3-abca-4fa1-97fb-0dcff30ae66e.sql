-- Add manager_id to departments
ALTER TABLE public.departments ADD COLUMN manager_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Move all employees from שירות לקוחות to לוגיסטיקה
UPDATE public.profiles 
SET department_id = '376b9737-7dce-45cb-a9d6-812771505aa6'
WHERE department_id = 'ec8e1405-d331-45d8-adab-ef98417586b3';

-- Delete שירות לקוחות department
DELETE FROM public.departments WHERE id = 'ec8e1405-d331-45d8-adab-ef98417586b3';

-- Rename לוגיסטיקה to לוגיסטיקה ושירות לקוחות
UPDATE public.departments SET name = 'לוגיסטיקה ושירות לקוחות' WHERE id = '376b9737-7dce-45cb-a9d6-812771505aa6';