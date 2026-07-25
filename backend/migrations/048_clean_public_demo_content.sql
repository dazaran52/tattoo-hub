-- Replace known placeholder copy that is currently visible on the public profile.
-- Exact-value predicates keep this migration idempotent and avoid overwriting later edits.
UPDATE public.users
SET bio = 'Тату-мастер. Работаю с индивидуальными идеями и помогаю подобрать стиль, размер и расположение татуировки.'
WHERE username = 'dazaran'
  AND bio = 'делаю партаки';

UPDATE public.portfolio_posts
SET description = 'Пример выполненной работы'
WHERE master_id = (SELECT id FROM public.users WHERE username = 'dazaran')
  AND description = 'крутая работа ваще';
