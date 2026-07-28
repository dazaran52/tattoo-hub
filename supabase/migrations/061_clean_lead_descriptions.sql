-- 061_clean_lead_descriptions.sql
-- Remove "Бюджет: ..." and "Город: ..." lines from lead descriptions

UPDATE public.leads
SET description = regexp_replace(description, '(\n*\s*Бюджет:.*?(\n|$))', '', 'g')
WHERE description ILIKE '%Бюджет:%';

UPDATE public.leads
SET description = regexp_replace(description, '(\n*\s*Город:.*?(\n|$))', '', 'g')
WHERE description ILIKE '%Город:%';
