-- 1. Rename price_credits to base_unlock_price_eur
ALTER TABLE leads RENAME COLUMN price_credits TO base_unlock_price_eur;

-- Change type to NUMERIC(10,2)
ALTER TABLE leads ALTER COLUMN base_unlock_price_eur TYPE NUMERIC(10,2) USING base_unlock_price_eur::numeric;

-- 2. Update unlock_lead RPC to use p_deduct_amount and deduct from balance
DROP FUNCTION IF EXISTS unlock_lead(UUID, UUID, NUMERIC);
DROP FUNCTION IF EXISTS unlock_lead(UUID, UUID);

CREATE OR REPLACE FUNCTION unlock_lead(p_user_id UUID, p_lead_id UUID, p_deduct_amount NUMERIC)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_lead record;
    v_user record;
    v_tokens_to_deduct int := 0;
BEGIN
    -- Check if already unlocked
    IF EXISTS (SELECT 1 FROM lead_unlocks WHERE user_id = p_user_id AND lead_id = p_lead_id) THEN
        RETURN json_build_object('success', true, 'message', 'Already unlocked', 'contacts', (SELECT contacts FROM leads WHERE id = p_lead_id));
    END IF;

    -- Get lead
    SELECT * INTO v_lead FROM leads WHERE id = p_lead_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lead not found';
    END IF;

    -- Get user
    SELECT * INTO v_user FROM users WHERE id = p_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- If user has discount token, apply 50% discount to fiat price (optional logic, can just consume token)
    IF COALESCE(v_user.discount_tokens, 0) > 0 THEN
        p_deduct_amount := GREATEST(0, p_deduct_amount / 2);
        v_tokens_to_deduct := 1;
    END IF;

    IF v_user.balance < p_deduct_amount THEN
        RAISE EXCEPTION 'INSUFFICIENT_FUNDS';
    END IF;

    -- Deduct balance
    UPDATE users 
    SET balance = balance - p_deduct_amount,
        discount_tokens = COALESCE(discount_tokens, 0) - v_tokens_to_deduct
    WHERE id = p_user_id;

    -- Add unlock record
    INSERT INTO lead_unlocks (user_id, lead_id) VALUES (p_user_id, p_lead_id);

    RETURN json_build_object(
        'success', true, 
        'new_balance', v_user.balance - p_deduct_amount,
        'contacts', v_lead.contacts
    );
END;
$$;
