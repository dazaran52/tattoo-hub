# Project: Tattoo HUB - Security Audit and Feature Completeness

## Architecture
- **Frontend**: Next.js App Router in `frontend/src/`.
  - Direct Booking Page: `frontend/src/app/book/[username]/page.tsx`
  - Marketplace Form: `frontend/src/components/LeadForm.tsx`
- **Backend**: FastAPI in `backend/app/`.
  - Leads router: `backend/app/routers/leads.py`
  - CRM router: `backend/app/routers/crm.py`
  - Auth Middleware: `backend/app/middleware/auth.py`
- **Database**: Supabase PostgreSQL.
  - Tables: `leads`, `master_clients`, `master_sessions`.
  - RLS Policies.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Codebase Audit & Security Analysis | Audit Supabase RLS policies and FastAPI authorization checks on chat, sessions, and leads endpoints. Identify vulnerabilities. | none | PLANNED |
| 2 | Backend Consistency Implementation | Update endpoints `/api/leads`, `/api/crm`, etc. to correctly accept, store, and propagate all booking fields (budget, description, style, reference images, body location, size, is_personal) in `leads`, `master_clients`, and `master_sessions` tables. | M1 | PLANNED |
| 3 | Frontend Booking Form Alignment | Refactor direct booking form at `/book/[username]/page.tsx` to align with the marketplace form fields. Ensure all required fields are visual, interactive, validated, and sent to backend. | M1 | PLANNED |
| 4 | Verification & E2E Testing | Verify frontend build (`npm run build`), backend tests, database constraints, RLS policies, and ensure no remote pushes. | M2, M3 | PLANNED |

## Interface Contracts
- **Booking Fields Consistency**:
  - `budget` (numeric/decimal/integer/text, match schema)
  - `description` (text)
  - `style` (text)
  - `reference_images` (array of text URLs)
  - `body_location` (text)
  - `size` (text/numeric, match schema)
  - `is_personal` (boolean)
- **FastAPI Endpoint Auth**:
  - Chat/session/lead endpoints must verify JWT tokens, and verify that the user owns or is authorized to access the requested resource.

## Code Layout
- Backend Services: `backend/app/`
- Frontend Pages/Components: `frontend/src/`
