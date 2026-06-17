# Project: Tattoo HUB - Email Parser Upgrade

## Architecture
- `backend/app/services/email_lead_agent.py`: Handles fetching emails, parsing with Gemini, calculating prices, and replying.
- `backend/app/routers/admin.py`: Handles admin API endpoints.
- Supabase table `email_lead_conversations`: Stores conversations and metadata.
- `frontend/src/components/AdminAiChats.tsx`: Admin UI for AI conversations.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Backend Finalization (M1+M2) | Verify and fix UNSEEN logic, Gemini extraction, price calc, IMAP append, AND fix Pause logic bugs (synthetic hash, cache query, commit after reply, race condition unpausing). | none | DONE |
| 2 | Backend Pause Logic | Add `is_paused` field logic, ignore paused, and PUT `/api/admin/conversations/{id}/pause` endpoint (R5 backend) | none | DONE |
| 3 | Frontend UI | Add country tag, country filter, and "Intercept dialog" button in `AdminAiChats.tsx` (R5 frontend) | M1, M2 | DONE |
| 4 | Final Milestone (E2E Phase 1) | Pass 100% of the E2E test suite (Tiers 1-4) | M1, M2, M3 | IN_PROGRESS (9d918dc3-475d-443b-ab55-c245f4686d7b) |
| 5 | Final Milestone (E2E Phase 2) | Adversarial Coverage Hardening (Tier 5) | M4 | PLANNED |

## Interface Contracts
### Admin API ↔ Frontend
- `PUT /api/admin/conversations/{id}/pause`
  - Body: JSON `{ "is_paused": boolean }`
  - Result: Updates `is_paused` flag in DB.

## Code Layout
- Backend Services: `backend/app/services/`
- Backend Routers: `backend/app/routers/`
- Frontend Components: `frontend/src/components/`
