CREATE TABLE IF NOT EXISTS public.portfolio_posts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    master_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    media jsonb NOT NULL DEFAULT '[]'::jsonb,
    description text,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.portfolio_posts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'portfolio_posts' AND policyname = 'Public profiles are viewable by everyone.'
    ) THEN
        CREATE POLICY "Public profiles are viewable by everyone." ON public.portfolio_posts FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'portfolio_posts' AND policyname = 'Masters can insert their own posts.'
    ) THEN
        CREATE POLICY "Masters can insert their own posts." ON public.portfolio_posts FOR INSERT WITH CHECK (auth.uid() = master_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'portfolio_posts' AND policyname = 'Masters can update their own posts.'
    ) THEN
        CREATE POLICY "Masters can update their own posts." ON public.portfolio_posts FOR UPDATE USING (auth.uid() = master_id) WITH CHECK (auth.uid() = master_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'portfolio_posts' AND policyname = 'Masters can delete their own posts.'
    ) THEN
        CREATE POLICY "Masters can delete their own posts." ON public.portfolio_posts FOR DELETE USING (auth.uid() = master_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_portfolio_posts_master_id ON public.portfolio_posts(master_id);

-- Backfill from users table
INSERT INTO public.portfolio_posts (master_id, media)
SELECT 
    id AS master_id,
    jsonb_agg(jsonb_build_object('url', value, 'type', 'image')) AS media
FROM public.users, jsonb_array_elements_text(portfolio_image_urls) AS value
WHERE portfolio_image_urls IS NOT NULL 
  AND jsonb_array_length(portfolio_image_urls) > 0
GROUP BY id, value;
