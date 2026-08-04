# Implementation Plan: Targeted Marketplace Leads

## Goal
Correctly handle marketplace leads that are targeted to a specific master (e.g. when a client books a master directly from the Top Masters list in the marketplace).

These leads should:
1. Immediately create a chat with a system message "Новая заявка с маркетплейса" (New marketplace lead).
2. **Hide** the client's contact info and the chat from the master *until* the master explicitly accepts the lead and pays the commission.

## User Review Required
> [!IMPORTANT]
> **Auto-Accepting Targeted Leads:** For a regular marketplace lead, the master makes a proposal, and the *client* must accept it (which charges the master). 
> For a *targeted* marketplace lead, since the client already chose the master, my plan is to **skip the client's acceptance step**. When the master clicks "Откликнуться" (Propose) and enters their price/dates, it will **automatically accept the lead**, charge the commission from the master's balance, unlock the contact info in the CRM, and make the chat visible to the master. 
> 
> Does this auto-accept behavior sound correct to you?

## Proposed Changes

### Backend

#### [MODIFY] `backend/app/routers/leads.py`
- In `_create_client_lead`: Change the routing logic. If `is_personal_booking` is false but `trusted_master_id` is set (Targeted Marketplace Lead), do **not** call `create_direct_booking` (which creates CRM sessions for free). Instead, insert the lead directly into `leads`, create the chat with a custom system message "Новая заявка с маркетплейса", and send a notification.
- In `create_proposal`: Add logic to detect if the lead is a Targeted Marketplace Lead (`assigned_master_id == current_user.id` and `is_personal == False`). If it is, automatically deduct the commission, create the CRM `master_clients` and `master_sessions` records (unlocking contact info), and set the lead/proposal status to `accepted`.

### Database / RPC

#### [NEW] Migration for targeted lead auto-accept
- Create a new RPC `master_accept_targeted_lead` (or similar) that handles the transaction of charging the commission, creating the CRM session, and marking the proposal as accepted. This keeps the database state consistent.

### Frontend

#### [MODIFY] `frontend/src/components/LeadWizard.tsx`
- Ensure that when booking a specific master from the marketplace (`masterId` is set but `source === 'marketplace'`), the form posts to `/api/leads/client/direct/{masterId}` so the backend knows who the targeted master is.

## Verification Plan
1. Send a targeted marketplace lead as a client.
2. Verify the master receives a push notification and sees the lead in the `LeadsFeed`.
3. Verify the master CANNOT see the client's contacts in the CRM and CANNOT see the chat in the Messages tab.
4. The master clicks "Откликнуться", sets a price, and submits.
5. Verify the master's balance is deducted.
6. Verify the lead appears in the master's CRM with contact info, and the chat becomes active in the Messages tab.
