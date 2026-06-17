-- Enable RLS for email_lead_conversations
ALTER TABLE email_lead_conversations ENABLE ROW LEVEL SECURITY;
-- Only backend (service_role) needs access to this table
-- So we don't need to add any anon or authenticated policies for now.
-- Service role bypasses RLS by default.

-- Enable RLS for subscription_plans
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
-- Anyone can read subscription plans
CREATE POLICY "Anyone can view subscription plans" ON subscription_plans
    FOR SELECT USING (true);

-- Enable RLS for user_subscriptions
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
-- Users can read their own subscriptions
CREATE POLICY "Users can view their own subscriptions" ON user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);
