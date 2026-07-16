# BRIEFING — 2026-07-16T02:00:00+02:00

## Mission
Audit security/RLS policies and booking field consistency across Tattoo HUB.

## 🔒 My Identity
- Archetype: Codebase Explorer
- Roles: Security Auditor, Codebase Explorer
- Working directory: /home/dazaran/Загрузки/Tattoo HUB/.agents/explorer_1_audit
- Original parent: 56b26d66-6ace-4b07-a338-0df2f9d7db54
- Milestone: Security & Booking Audit

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- CODE_ONLY network mode: no external HTTP/HTTPS clients

## Current Parent
- Conversation ID: 56b26d66-6ace-4b07-a338-0df2f9d7db54
- Updated: not yet

## Investigation State
- **Explored paths**: `backend/app/routers/` (`chat.py`, `crm.py`, `leads.py`, `profile.py`, `client_portal.py`), `backend/app/middleware/auth.py`, `backend/migrations/` (RLS definitions), `frontend/src/app/book/[username]/page.tsx` (direct booking), `frontend/src/components/LeadForm.tsx` (marketplace lead form).
- **Key findings**: Critical JWT signature verification bypass in backend, non-atomic concurrency race condition in client-portal balance updates, overly permissive insert policy on reviews (RLS `WITH CHECK (true)`), direct vs marketplace booking field inconsistencies (missing budget key, hardcoded CZK currency, mismatching storage paths).
- **Unexplored areas**: None in current scope.

## Key Decisions Made
- Auditing complete. Report generation in progress.

## Artifact Index
- /home/dazaran/Загрузки/Tattoo HUB/.agents/explorer_1_audit/analysis.md — Audit Report
- /home/dazaran/Загрузки/Tattoo HUB/.agents/explorer_1_audit/handoff.md — Handoff Report
