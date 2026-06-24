-- Migration: Add portfolio_image_urls to users

ALTER TABLE public.users 
    ADD COLUMN IF NOT EXISTS portfolio_image_urls JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.users.portfolio_image_urls IS 'Array of image URLs for the master''s portfolio grid';
