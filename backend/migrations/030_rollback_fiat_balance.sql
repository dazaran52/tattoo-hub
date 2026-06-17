-- Revert unlock_lead RPC to use credits again

DROP FUNCTION IF EXISTS unlock_lead(UUID, UUID, NUMERIC);

CREATE OR REPLACE FUNCTION unlock_lead(p_user_id UUID, p_lead_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_lead record;
    v_user record;
    v_price_to_pay int;
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

    v_price_to_pay := v_lead.price_credits;
    
    IF COALESCE(v_user.discount_tokens, 0) > 0 THEN
        v_price_to_pay := GREATEST(1, v_price_to_pay / 2);
        v_tokens_to_deduct := 1;
    END IF;

    IF v_user.credits < v_price_to_pay THEN
        RAISE EXCEPTION 'INSUFFICIENT_CREDITS';
    END IF;

    -- Deduct credits
    UPDATE users 
    SET credits = credits - v_price_to_pay,
        discount_tokens = COALESCE(discount_tokens, 0) - v_tokens_to_deduct
    WHERE id = p_user_id;

    -- Add unlock record
    INSERT INTO lead_unlocks (user_id, lead_id) VALUES (p_user_id, p_lead_id);

    RETURN json_build_object(
        'success', true, 
        'new_credits', v_user.credits - v_price_to_pay,
        'contacts', v_lead.contacts
    );
END;
$$;
