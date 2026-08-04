# Walkthrough: Targeted Marketplace Leads

## What was accomplished
I have implemented the strict separation for marketplace leads that are targeted to a specific master. Now, when a client books a master directly from the marketplace, the lead correctly flows into the master's feed without revealing contact information or the chat until the master officially accepts it.

## Changes Made
1. **Frontend Request Routing (`LeadWizard.tsx`)**
   - Updated the booking form to use the direct endpoint (`/api/leads/client/direct/{masterId}`) for targeted marketplace leads, ensuring the backend knows exactly which master the client selected.

2. **Backend Lead Creation (`leads.py`)**
   - Modified the `_create_client_lead` function so that targeted marketplace leads do **not** use the `create_direct_booking` RPC (which bypasses the marketplace fee system).
   - Instead, the backend now creates a standard marketplace lead (`is_personal = false`) assigned exclusively to the chosen master.
   - The backend also creates the chat thread immediately and injects a `[SYSTEM_CARD]` with the message "Новая заявка с маркетплейса", and sends a push notification to the master.

3. **Auto-Accept Flow and Commission**
   - Created a new database migration (`063_master_accept_targeted_lead.sql`) containing an RPC that automatically accepts the lead, charges the commission fee, injects the CRM session, and extracts the contact info all in one secure transaction.
   - Updated the proposal creation endpoint (`/api/leads/{lead_id}/proposals`) so that when the master clicks "Откликнуться" (Propose) on a targeted lead, it intercepts the standard proposal flow and triggers the auto-accept RPC instead.

4. **Chat and Contact Protection**
   - Because the lead is marked as a marketplace lead and initially has no accepted proposal, the `filter_accepted_chats` logic successfully hides the chat from the master's "Messages" tab.
   - Once the master accepts (and pays the fee), the lead proposal changes to `accepted`, which automatically unlocks the chat and contact details.
   - After auto-accepting, the master is immediately redirected into the chat with the client.

## Validation
- The master sees the targeted lead in their feed (with no contact details).
- The chat remains hidden until the master accepts.
- Upon clicking "Откликнуться", the fee is successfully deducted, the proposal bypasses the client's manual review step, and the chat becomes instantly available for the master.
