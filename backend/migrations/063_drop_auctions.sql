-- Migration: Drop auctions tables and related functions completely

-- 1. Drop the RPC functions
-- Note: These were already dropped in migration 052_security_stabilization.sql,
-- but we include IF EXISTS to ensure a clean slate and avoid errors.
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, INTEGER);
DROP FUNCTION IF EXISTS public.process_expired_auctions();

-- 2. Drop the tables
-- CASCADE will also automatically clean up foreign key constraints
DROP TABLE IF EXISTS public.auction_bids CASCADE;
DROP TABLE IF EXISTS public.auctions CASCADE;
