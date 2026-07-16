# Security & Integration Audit Report

This report presents findings from an audit of the Supabase RLS policies, backend FastAPI endpoint authorization, direct vs. marketplace booking forms, and backend CRM database integration.

---

## 1. Supabase RLS Policies Audit

### 1.1 Chat Tables
- **File**: `backend/migrations/025_create_escrow_chat.sql`
- **Tables**: `public.lead_chats`, `public.chat_messages`
- **Policies**:
  - `lead_chats` allows SELECT and INSERT only to authenticated users where `auth.uid() = master_id`.
  - `chat_messages` allows SELECT and INSERT only to authenticated users where the linked chat has `master_id = auth.uid()`.
- **Finding**: Clients (the customers submitting leads) are not granted direct access via Supabase RLS. They must interact with the chat via the FastAPI backend proxy routes (which require a valid capability-based `client_token`). This design secures the database from unauthorized direct access, but prevents client-side Supabase direct subscriptions for clients.

### 1.2 CRM Tables
- **File**: `backend/migrations/034_create_crm_tables.sql`
- **Tables**: `public.master_clients`, `public.master_sessions`
- **Policies**:
  - `master_clients` and `master_sessions` restrict SELECT, INSERT, UPDATE, and DELETE to `auth.uid() = master_id`.
- **Finding**: Safe and secure for masters. Clients have no direct access to these tables.

### 1.3 Review Table (VULNERABILITY)
- **File**: `backend/migrations/040_create_reviews.sql`
- **Table**: `public.master_reviews`
- **Policy**: 
  - `CREATE POLICY "Clients can create reviews" ON master_reviews FOR SELECT/INSERT FOR INSERT WITH CHECK (true);`
- **Vulnerability**: The policy specifies `FOR INSERT WITH CHECK (true)`. This allows **any unauthenticated client/attacker** to bypass backend validation and insert arbitrary/spam reviews directly into the database via Supabase's public API.
- **Recommendation**: Restrict direct inserts via Supabase RLS, or enforce signature/token verification in the check clause.

---

## 2. FastAPI Endpoints & Token Authorization Audit

### 2.1 JWT Verification Bypass (CRITICAL VULNERABILITY)
- **File**: `backend/app/middleware/auth.py`
- **Function**: `get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> AuthUser`
- **Code**:
  ```python
  # For now, just decode without verification (get user info from payload)
  # The token is already validated by Supabase on the frontend
  try:
      # Try to decode JWT payload without verification
      payload = jwt.get_unverified_claims(token)
  ```
- **Vulnerability**: The backend decodes the incoming JWT token *without verifying its signature* (using `jose.jwt.get_unverified_claims(token)` instead of `jwt.decode`). An attacker can forge an arbitrary JWT payload containing a targeted `sub` (user UUID) or `role`, and the backend will fully trust the identity. This leads to complete identity takeover (IDOR) and admin privilege escalation.
- **Recommendation**: Properly decode the JWT token using `jwt.decode(token, key=settings.SUPABASE_JWT_SECRET, algorithms=["HS256"])` to verify the signature.

### 2.2 Concurrency & Double-Spend Risk (HIGH VULNERABILITY)
- **File**: `backend/app/routers/client_portal.py`
- **Endpoint**: `/api/client-portal/leads/{lead_id}/proposals/{master_id}/accept`
- **Code**:
  ```python
  # 1. Check master balance
  master_res = supabase.table("users").select("credits").eq("id", master_id).execute()
  if not master_res.data or master_res.data[0]["credits"] < price_credits:
      raise HTTPException(status_code=400, detail="Master no longer has enough credits")

  # 2. Deduct credits via RPC or update
  new_balance = master_res.data[0]["credits"] - price_credits
  supabase.table("users").update({"credits": new_balance}).eq("id", master_id).execute()
  ```
- **Vulnerability**: This check-then-update pattern is not atomic. If two proposals are accepted concurrently, or if another transaction runs at the same time, this will lead to a race condition (lost updates or credit duplication/bypass).
- **Recommendation**: Perform the deduction atomically using a PostgreSQL RPC function or row-locking transaction.

---

## 3. Direct vs. Marketplace Booking Mismatches

Comparison between Direct Booking (`frontend/src/app/book/[username]/page.tsx`) and Marketplace Lead Form (`frontend/src/components/LeadForm.tsx`):

| Feature / Field | Direct Booking (`BookMasterPage`) | Marketplace Lead Form (`LeadForm`) | Mismatch Details |
| :--- | :--- | :--- | :--- |
| **Budget Key** | Missing from payload | Submits `budget` key in payload | Direct booking payload does not send `budget` key, only `budget_val` / `budget_currency`. |
| **Currency Support** | Hardcoded to `'CZK'` | Dynamic based on country (`CZK`, `EUR`, `PLN`) | Direct booking ignores the master's currency preferences and hardcodes CZK. |
| **Styles** | Custom text input + `TATTOO_STYLES` | Predefined list only (no custom input) | Direct booking allows custom styles, whereas Marketplace form restricts users to 12 categories. |
| **Body Location** | Custom text input + `BODY_PLACES` | Predefined list only (no custom input) | Direct booking has an extra free-text field for details (e.g. "inner forearm"). |
| **Size** | Predefined `TATTOO_SIZES` + custom text input | Predefined buttons only (no custom input) | Direct booking allows precise size specifications (e.g., "15x10 cm"). |
| **is_personal** | Hardcoded to `true` | Missing from payload | Marketplace form does not send this field, relying on DB default (`false`). |
| **Image Storage Path** | Root of bucket (`${fileName}`) | Subdirectory (`client_leads/${fileName}`) | Image files are uploaded to inconsistent directories inside the same `lead_images` bucket. |

---

## 4. Backend Database Integration Audit

### 4.1 Leads Endpoint Field Processing
- **File**: `backend/app/routers/leads.py` (Endpoint `/api/leads/client`)
- **Staging / Storage**:
  - `city` and `budget` from the payload are parsed and appended to the text `description` column (e.g., `full_description = f"{lead_data.description}\n\nБюджет: ...\nГород: ..."`).
  - The database column `city_id` is set to `None` because city UUID resolution is not implemented (`"city_id": None, # City UUID lookup logic needs implementation later`).
  - Only `country_id` is resolved and saved as a foreign key.

### 4.2 Lead Propagation to CRM (Clients & Sessions)
- **Staging / Storage**:
  - When `is_personal: true` leads are processed:
    - A record is added to `master_clients`. It copies: `master_id`, `lead_id`, `name`, `contact_info`, `phone`, `instagram`, `email`, `source='lead'`.
    - A record is added to `master_sessions`. It copies: `master_id`, `client_id`, `session_date`, `session_time` (as `start_time`), `style`, `body_place`, `size`, `reference_images` (derived from lead's `image_urls`).
- **Gaps / Inconsistencies**:
  - **No Budget Propagation**: The `budget_val` or `budget_currency` is **never** propagated to `master_sessions.price`. The price remains `NULL` when generated from a lead.
  - **No Client Field Persistence**: Client-specific preferences like `style`, `size`, and `body_place` are saved in the `master_sessions` row but are completely absent from `master_clients` table metadata.
