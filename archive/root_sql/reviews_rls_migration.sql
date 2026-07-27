-- Secure master_reviews insert policy by setting WITH CHECK to false to prevent direct anonymous inserts
ALTER POLICY "Clients can create reviews" ON master_reviews WITH CHECK (false);
