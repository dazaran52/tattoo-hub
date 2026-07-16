# Handoff Report — Security and Integration Audit

## 1. Observation

### 1.1 JWT Signature Verification Bypass
- **File**: `/home/dazaran/Загрузки/Tattoo HUB/backend/app/middleware/auth.py`
- **Lines**: 36-40
- **Verbatim Code**:
  ```python
  # For now, just decode without verification (get user info from payload)
  # The token is already validated by Supabase on the frontend
  try:
      # Try to decode JWT payload without verification
      payload = jwt.get_unverified_claims(token)
  ```

### 1.2 Non-Atomic Credit Deduction Race Condition
- **File**: `/home/dazaran/Загрузки/Tattoo HUB/backend/app/routers/client_portal.py`
- **Lines**: 103-114
- **Verbatim Code**:
  ```python
    # 1. Check master balance
    master_res = supabase.table("users").select("credits").eq("id", master_id).execute()
    if not master_res.data or master_res.data[0]["credits"] < price_credits:
        # ...
        raise HTTPException(status_code=400, detail="Master no longer has enough credits")

    # 2. Deduct credits via RPC or update
    new_balance = master_res.data[0]["credits"] - price_credits
    supabase.table("users").update({"credits": new_balance}).eq("id", master_id).execute()
  ```

### 1.3 Permissive Reviews RLS Insert Policy
- **File**: `/home/dazaran/Загрузки/Tattoo HUB/backend/migrations/040_create_reviews.sql`
- **Lines**: 18
- **Verbatim Code**:
  ```sql
  CREATE POLICY "Clients can create reviews" ON master_reviews FOR INSERT WITH CHECK (true); -- We will validate in backend
  ```

### 1.4 Direct vs. Marketplace Booking Mismatches
- **Files**: 
  - Direct Booking Page: `/home/dazaran/Загрузки/Tattoo HUB/frontend/src/app/book/[username]/page.tsx`
  - Marketplace Lead Form Component: `/home/dazaran/Загрузки/Tattoo HUB/frontend/src/components/LeadForm.tsx`
- **Mismatches**:
  - `BookMasterPage` hardcodes `"CZK"` as the currency: `budget_currency: 'CZK'` (line 202) and fails to pass the `budget` text key.
  - `LeadForm` passes dynamic currency (line 235) and the `budget` key: `budget: formData.is_negotiable ? 'Договорная цена' : formData.budget || null`.
  - Image upload paths differ: `BookMasterPage` uploads to bucket root (line 165: `const filePath = \`\${fileName}\``), while `LeadForm` uploads to `client_leads/` folder (line 220: `const filePath = \`client_leads/\${fileName}\``).

### 1.5 Database Staging and Gaps
- **Files**:
  - `/home/dazaran/Загрузки/Tattoo HUB/backend/app/routers/leads.py`
- **Details**:
  - Endpoint `/api/leads/client` appends client `city` and `budget` directly into the string `description` column (lines 500-506), keeping the structured `city_id` column value `None` (line 520).
  - During automatic CRM creation (lines 627-658), lead budget inputs are NOT written to `master_sessions.price`, leaving it `NULL`.

---

## 2. Logic Chain

1. **Observation 1.1** shows that backend JWT authentication only uses `jwt.get_unverified_claims(token)`. Since signature checking is completely omitted, any HTTP client can forge a JWT payload with an arbitrary user's UUID and impersonate that identity on all endpoints using the `get_current_user` dependency.
2. **Observation 1.2** details the credit deduction sequence. The two operations (read current credits, compute difference, write back new balance) occur sequentially without locking the row. Under concurrency (e.g. rapid multiple clicks), two requests could read the same initial balance, leading to race conditions where credits are not correctly subtracted.
3. **Observation 1.3** establishes that `master_reviews` enables RLS but has a policy allowing inserts `WITH CHECK (true)`. Therefore, anyone can bypass the FastAPI endpoint and insert fake reviews directly via Supabase client library.
4. **Observation 1.4** demonstrates inconsistencies between front-end interfaces. Hardcoding `'CZK'` in `BookMasterPage` prevents masters who use Euros (EUR) or Polish Zlotys (PLN) from receiving budgets in their respective local currencies. Missing key properties (`budget` text) may cause partial parsing issues.
5. **Observation 1.5** shows database propagation holes where unstructured budget/city strings are dumped to description text rather than written to normalized fields (`city_id` is ignored, and `master_sessions.price` is not populated from budget val).

---

## 3. Caveats
- No active system behavior was tested with live network calls since we are operating in a read-only investigation mode under `CODE_ONLY` network constraints.
- We assume that the PostgreSQL schema matches the migration files sequentially applied up to `042_add_avatar_url.sql`.

---

## 4. Conclusion
1. **Critical Authentication Vulnerability**: The backend is exposed to complete user/admin takeover via token spoofing. Fixing the auth middleware signature verification is a priority.
2. **Database Integrity & RLS Vulnerabilities**: `master_reviews` allows spammed/unauthenticated direct inserts. Balance updates in `client_portal` are vulnerable to double-spending and balance desync under high load.
3. **Frontend Inconsistencies**: The direct booking form forces CZK currency, fails to pass the `budget` key, and stores images in the bucket root instead of a structured subdirectory compared to the marketplace form.

---

## 5. Verification Method

- **JWT Signature Verification**:
  - Inspect `/home/dazaran/Загрузки/Tattoo HUB/backend/app/middleware/auth.py` and search for `get_unverified_claims`. If it is used without subsequent validation of signature with `settings.SUPABASE_JWT_SECRET`, it is insecure.
- **Reviews RLS Policies**:
  - Review `/home/dazaran/Загрузки/Tattoo HUB/backend/migrations/040_create_reviews.sql` to check that the insert policy on `master_reviews` does not verify authentication.
- **Currency & Field Mismatches**:
  - Compare line 202 in `/home/dazaran/Загрузки/Tattoo HUB/frontend/src/app/book/[username]/page.tsx` (`budget_currency: 'CZK'`) with the dynamic currency code logic in `/home/dazaran/Загрузки/Tattoo HUB/frontend/src/components/LeadForm.tsx`.
