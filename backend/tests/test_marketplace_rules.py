from decimal import Decimal

import pytest

from app.services.marketplace import (
    MAX_PROPOSALS_PER_LEAD,
    build_admin_balance_update,
    calculate_success_fee,
    ensure_master_can_access_marketplace,
    ensure_proposal_slot_available,
    ensure_proposal_status_transition,
    should_schedule_auto_verification,
)


def test_marketplace_access_requires_master_role_and_access_verification():
    ensure_master_can_access_marketplace({"role": "master", "is_verified_master": True})

    with pytest.raises(ValueError, match="MARKETPLACE_ACCESS_REQUIRED"):
        ensure_master_can_access_marketplace({"role": "client", "is_verified_master": True})
    with pytest.raises(ValueError, match="MARKETPLACE_ACCESS_REQUIRED"):
        ensure_master_can_access_marketplace({"role": "master", "is_verified_master": False})


def test_success_fee_is_ten_percent_for_small_tattoo():
    fee = calculate_success_fee(Decimal("5000"), "CZK")
    assert fee.rate == Decimal("0.10")
    assert fee.amount == Decimal("500.00")


def test_success_fee_is_ten_percent_for_large_tattoo():
    fee = calculate_success_fee(Decimal("6000"), "CZK")
    assert fee.rate == Decimal("0.10")
    assert fee.amount == Decimal("600.00")


def test_success_fee_is_ten_percent_in_every_supported_currency():
    assert calculate_success_fee(Decimal("100"), "EUR").rate == Decimal("0.10")
    assert calculate_success_fee(Decimal("1000"), "CZK").rate == Decimal("0.10")


def test_fee_rejects_non_positive_unknown_currency_and_zero_rounded_fee():
    with pytest.raises(ValueError):
        calculate_success_fee(Decimal("0"), "CZK")
    with pytest.raises(ValueError):
        calculate_success_fee(Decimal("100"), "GBP")
    with pytest.raises(ValueError, match="SUCCESS_FEE_TOO_SMALL"):
        calculate_success_fee(Decimal("0.01"), "EUR")


def test_existing_proposer_can_edit_when_five_slots_are_full():
    proposers = [f"master-{index}" for index in range(MAX_PROPOSALS_PER_LEAD)]
    ensure_proposal_slot_available(proposers, "master-2")


def test_sixth_distinct_master_is_rejected():
    proposers = [f"master-{index}" for index in range(MAX_PROPOSALS_PER_LEAD)]
    with pytest.raises(ValueError, match="MAX_PROPOSALS_REACHED"):
        ensure_proposal_slot_available(proposers, "master-new")


def test_admin_balance_update_targets_fiat_balance_not_legacy_credits():
    assert build_admin_balance_update(credits=None, balance=Decimal("125.50")) == {
        "balance": Decimal("125.50")
    }
    assert build_admin_balance_update(credits=40, balance=None) == {"credits": 40}


def test_only_accepted_proposal_can_move_to_booked_or_completed():
    ensure_proposal_status_transition("accepted", "booked")
    ensure_proposal_status_transition("booked", "completed")
    with pytest.raises(ValueError, match="PROPOSAL_MUST_BE_ACCEPTED"):
        ensure_proposal_status_transition("pending", "booked")


def test_interrupted_auto_verification_is_rescheduled():
    assert should_schedule_auto_verification({
        "role": "master", "is_verified_master": False, "status": "verifying"
    })
    assert not should_schedule_auto_verification({
        "role": "master", "is_verified_master": True, "status": "approved"
    })


def test_migration_enforces_cap_and_reconciles_legacy_acceptance():
    migration = (
        __import__("pathlib").Path(__file__).parents[1]
        / "migrations"
        / "050_marketplace_success_fee.sql"
    ).read_text()
    assert "enforce_marketplace_proposal_limit" in migration
    assert "upsert_marketplace_proposal" in migration
    assert "FOR UPDATE" in migration
    assert "ACCEPTED_PROPOSAL_CANNOT_BE_EDITED" in migration
    assert "status = 'pending'" in migration
    assert 'DROP POLICY IF EXISTS "Users can view all leads"' in migration
    assert 'DROP POLICY IF EXISTS "Users can create own proposals"' in migration
    assert "ALTER COLUMN price_offer TYPE NUMERIC(12,2)" in migration
    assert "FROM public.users AS master" in migration
    assert "INSERT INTO public.lead_chats" in migration
    assert "'chat_id', v_chat_id" in migration
    assert 'DROP POLICY IF EXISTS "Masters can view own chats"' in migration
    assert 'DROP POLICY IF EXISTS "Masters can view own clients"' in migration
    assert 'DROP POLICY IF EXISTS "Masters can view own sessions"' in migration
    assert "proposal.success_fee_rate IS NULL" in migration
    assert "DROP FUNCTION IF EXISTS public.unlock_lead(UUID, UUID, NUMERIC)" in migration
    assert "lead.assigned_master_id IS DISTINCT FROM proposal.user_id" in migration
    assert migration.index("SET status = 'pending'") < migration.index("success_fee_rate = 0.10")
    assert "AND v_proposal.success_fee_transaction_id IS NOT NULL" in migration
    assert "OR v_proposal.status IN ('accepted', 'booked', 'completed')" not in migration

    client_portal = (
        __import__("pathlib").Path(__file__).parents[1]
        / "app"
        / "routers"
        / "client_portal.py"
    ).read_text()
    assert 'table("lead_chats").insert' not in client_portal

    chat_router = (
        __import__("pathlib").Path(__file__).parents[1]
        / "app"
        / "routers"
        / "chat.py"
    ).read_text()
    assert "filter_accepted_chats" in chat_router
    assert '["accepted", "booked", "completed"]' in chat_router
    assert "assigned_master_id" in chat_router

    leads_router = (
        __import__("pathlib").Path(__file__).parents[1]
        / "app"
        / "routers"
        / "leads.py"
    ).read_text()
    assert 'status_code=410, detail="CONTACTS_AVAILABLE_AFTER_ACCEPTANCE"' in leads_router


def test_legacy_contact_endpoints_no_longer_authorize_with_paid_unlocks():
    root = __import__("pathlib").Path(__file__).parents[1] / "app" / "routers"
    leads_source = (root / "leads.py").read_text()
    profile_source = (root / "profile.py").read_text()
    crm_source = (root / "crm.py").read_text()

    legacy_feed = leads_source.split('@router.get("", response_model=List[LeadResponse])', 1)[1]
    legacy_feed = legacy_feed.split('@router.post("/{lead_id}/unlock"', 1)[0]
    my_leads = profile_source.split('@router.get("/my-leads")', 1)[1]
    my_leads = my_leads.split('@router.get("/proposals")', 1)[0]
    crm_clients = crm_source.split('@router.get("/clients")', 1)[1]
    crm_clients = crm_clients.split('@router.delete("/clients/{client_id}")', 1)[0]
    crm_session_update = crm_source.split('@router.put("/sessions/{session_id}")', 1)[1]
    crm_session_update = crm_session_update.split('@router.delete("/sessions/{session_id}")', 1)[0]

    assert "lead_unlocks" not in legacy_feed
    assert "ensure_master_can_access_marketplace" in legacy_feed
    assert "lead_unlocks" not in my_leads
    assert "lead_unlocks" not in crm_clients
    assert "lead_unlocks" not in crm_session_update
    assert "MARKETPLACE_SESSION_REQUIRES_ACCEPTED_PROPOSAL" in crm_session_update
    assert "ensure_crm_session_access" in crm_source
    assert "CRM_LEAD_NOT_ASSIGNED" in crm_source
    assert "CRM_LEAD_NOT_SELECTED" in crm_source
    assert "assigned_master_id" in crm_session_update
    assert '.eq("master_id", current_user.user_id)' in crm_session_update
    for source in (legacy_feed, my_leads, crm_clients):
        assert "accepted" in source
        assert "booked" in source
        assert "completed" in source
        assert "assigned_master_id" in source


def test_marketplace_feed_excludes_personal_leads():
    router = (
        __import__("pathlib").Path(__file__).parents[1]
        / "app"
        / "routers"
        / "leads.py"
    ).read_text()
    assert 'if not lead.get("is_personal")' in router