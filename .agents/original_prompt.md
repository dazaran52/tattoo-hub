# Original User Request

## 2026-07-16T01:50:54Z

Audit, refactor, and complete features (marketplace consistency, RLS check, security audit) for the Tattoo HUB project (frontend and backend). Ensure that direct-link requests match the marketplace requests fields. Do NOT push changes to origin/main.

Working directory: /home/dazaran/Загрузки/Tattoo HUB
Integrity mode: development

## Requirements

### R1. Security and RLS Audit
- Audit all Supabase RLS policies (use auditor_check_rls or SQL inspections if needed) to ensure no unauthorized access to chats, sessions, or leads.
- Audit the FastAPI backend endpoints for correct authorization (e.g. check jwt tokens, verify ownership of requested resources).

### R2. Feature Completeness and Field Consistency
- Compare the direct booking form (/book/[username]/page.tsx) with the marketplace booking form (LeadForm.tsx / new-lead).
- Ensure all fields (budget, description, style, reference images, body location, size, and is_personal) are fully aligned in both forms.
- Ensure that the backend endpoints (/api/leads, /api/crm, etc.) correctly accept, store, and propagate these fields in Supabase tables (leads, master_clients, master_sessions).

### R3. Safe Local Environment (NO REMOTE PUSH)
- The team must implement and verify the changes locally.
- Do NOT push any git commits to the remote repository. Changes must remain local in the workspace.

## Acceptance Criteria

### Security
- [ ] RLS policies and endpoints verified to be secure against data leakage.

### Feature Consistency
- [ ] Direct booking form contains the budget field and other missing fields to match the marketplace form.
- [ ] CRM backend creates records with identical structure regardless of the lead source.

### Verification
- [ ] Local build (npm run build in frontend/) completes successfully.
- [ ] Local tests run and pass without errors.
- [ ] git remote remains untouched (no pushes).
