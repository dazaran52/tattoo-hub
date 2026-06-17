-- Migration: Fix RLS Vulnerabilities
-- Removes overly permissive update policies that allowed users to grant themselves admin access, infinite credits, and manipulate auctions/disputes.

-- 1. Fix Users Table Privilege Escalation (IDOR)
-- Previously allowed users to update their own `is_admin` and `credits` directly via Supabase API.
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
-- Note: User profile updates are handled securely via the backend API using the Service Role Key.


-- 2. Fix Auction Fraud
-- Previously allowed sellers to unilaterally modify `current_price`, `winner_id` and `status` of their own auctions.
DROP POLICY IF EXISTS "Users can update active auctions if they are the seller" ON public.auctions;


-- 3. Fix Dispute Manipulation
-- Previously used 'FOR ALL', allowing users to update their own dispute status to 'approved' or delete them.
DROP POLICY IF EXISTS "Users can create and view own disputes" ON public.disputes;

-- Recreate with proper restrictions (SELECT and INSERT only)
CREATE POLICY "Users can view own disputes"
ON public.disputes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own disputes"
ON public.disputes FOR INSERT
WITH CHECK (auth.uid() = user_id);
