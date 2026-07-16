## 2026-07-15T23:59:43Z
You are the teamwork_preview_worker. Your task is to implement security and booking form consistency changes in the Tattoo HUB codebase.

Please perform the following tasks:

### 1. Fix JWT Signature Verification Bypass
- Location: `backend/app/middleware/auth.py`
- Modify both `get_current_user` and `get_optional_user` to verify the incoming JWT token signature using the `SUPABASE_JWT_SECRET` from config settings, using `jwt.decode` with HS256 algorithm. Raise HTTP 401 on validation errors.

### 2. Secure Supabase RLS Policy for Reviews
- Table: `master_reviews`
- Modify the insert RLS policy so that direct public/unauthenticated inserts are restricted (e.g. set `WITH CHECK (false)` or drop/recreate the policy to prevent unauthorized anonymous inserts). The FastAPI backend uses a `service_role` client to create reviews, so the backend route will continue to function. Use `db_execute_sql` or direct migration scripts to apply this.

### 3. Align Direct Booking Form with Marketplace Form Fields
- Backend changes (`backend/app/routers/public.py`):
  - Expose the master's currency in the `/api/public/master/{username_or_id}` endpoint. Update `PublicMasterResponse` Pydantic model to include `currency: str = "CZK"` and select `currency` from the `users` table in the Supabase query.
- Frontend changes (`frontend/src/app/book/[username]/page.tsx`):
  - Use `master.currency` dynamically instead of hardcoding `"CZK"`.
  - Format the currency symbol based on master's currency (e.g. CZK -> Kč, EUR -> €, PLN -> zł).
  - Send the `budget` key in the request payload (as `isNegotiable ? 'Договорная цена' : budgetVal ? `${budgetVal} ${master.currency}` : null`).
  - Update the Supabase storage upload path for reference images from the root directory to `client_leads/${fileName}` (consistent with `LeadForm.tsx`).

### 4. CRM Backend Field Propagation
- Location: `backend/app/routers/leads.py` (Endpoint `/api/leads/client`)
- Ensure that when a personal lead (`is_personal: true`) automatically registers a CRM session in `master_sessions`, the lead's budget (`lead_data.budget_val`) is written to the `price` column in `master_sessions`.

### 5. Verification & Local Validation
- Run tests (`run_tests.py` or similar) to ensure all tests pass.
- Run `npm run build` in `frontend/` directory to verify the frontend builds successfully.
- Check that all changes are kept local. Do NOT perform any git remote push.
