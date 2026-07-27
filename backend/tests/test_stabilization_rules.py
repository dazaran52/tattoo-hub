from pathlib import Path
import subprocess


ROOT = Path(__file__).parents[2]
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"


def source(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_security_migration_closes_legacy_financial_surfaces():
    sql = source(BACKEND / "migrations" / "051_security_stabilization.sql")
    assert 'DROP POLICY IF EXISTS "Service role can manage transactions"' in sql
    assert "REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.transactions FROM anon, authenticated" in sql
    assert "GRANT SELECT ON TABLE public.transactions TO authenticated" in sql
    assert "DROP FUNCTION IF EXISTS public.place_bid" in sql
    assert 'DROP POLICY IF EXISTS "Anyone can view active auctions"' in sql
    assert 'DROP POLICY IF EXISTS "Users can create their own auctions"' in sql
    assert 'DROP POLICY IF EXISTS "Anyone can view bids"' in sql
    assert "REVOKE ALL ON TABLE public.auctions FROM anon, authenticated" in sql
    assert "REVOKE ALL ON TABLE public.auction_bids FROM anon, authenticated" in sql
    assert "cron.unschedule" in sql
    assert "DROP FUNCTION IF EXISTS public.process_expired_auctions()" in sql


def test_stripe_funds_the_same_atomic_balance_used_by_success_fees():
    sql = source(BACKEND / "migrations" / "051_security_stabilization.sql")
    webhook = source(BACKEND / "app" / "routers" / "webhooks.py")
    assert "credit_stripe_balance" in sql
    assert "FOR UPDATE" in sql
    assert "ON CONFLICT (provider_tx_id) DO NOTHING" in sql
    assert 'rpc("credit_stripe_balance"' in webhook
    assert '"credits": current_credits' not in webhook


def test_auctions_are_not_mounted_while_legacy_authorization_is_retired():
    main = source(BACKEND / "main.py")
    leads = source(BACKEND / "app" / "routers" / "leads.py")
    assert "auctions_router" not in main
    assert "run_migrations()" not in main
    assert '@router.post("/{lead_id}/dump")' not in leads


def test_public_marketplace_form_cannot_assign_a_master_or_personal_state():
    leads = source(BACKEND / "app" / "routers" / "leads.py")
    model = leads.split("class ClientLeadCreate", 1)[1].split("@router.post", 1)[0]
    assert "assigned_master_id" not in model
    assert "is_personal" not in model
    assert '@router.post("/client/direct/{master_id}")' in leads
    assert 'rpc("create_direct_booking"' in leads
    assert "CREATE OR REPLACE FUNCTION public.create_direct_booking" in source(
        BACKEND / "migrations" / "051_security_stabilization.sql"
    )


def test_lead_status_has_one_owner_controlled_route():
    leads = source(BACKEND / "app" / "routers" / "leads.py")
    assert leads.count('@router.patch("/{lead_id}/status")') == 1
    assert "valid_statuses = {'new', 'active', 'paused', 'closed'}" in leads
    assert 'table("lead_unlocks").update' not in leads
    assert "INVALID_LEAD_STATUS_TRANSITION" in leads
    update_model = leads.split("class ClientLeadUpdate", 1)[1].split("@router.patch", 1)[0]
    assert "status:" not in update_model


def test_authenticated_client_can_receive_and_accept_full_proposals():
    leads = source(BACKEND / "app" / "routers" / "leads.py")
    assert 'price_offer, proposed_dates, offer_currency' in leads
    assert 'certificate_status' in leads
    assert '@router.post("/client/{lead_id}/proposals/{master_id}/accept")' in leads
    assert 'accept_marketplace_proposal' in leads
    portal = source(BACKEND / "app" / "routers" / "client_portal.py")
    assert "PROPOSAL_SELECTION_REQUIRES_AUTHENTICATED_DASHBOARD" in portal
    assert 'status_code=410' in portal


def test_identity_and_wallet_trust_boundaries_are_closed():
    leads = source(BACKEND / "app" / "routers" / "leads.py")
    profile = source(BACKEND / "app" / "routers" / "profile.py")
    reviews = source(BACKEND / "app" / "routers" / "reviews.py")
    main = source(BACKEND / "main.py")
    assert "generate_link" not in leads
    assert "auth.admin.create_user" not in leads
    direct = leads.split('async def create_direct_client_lead', 1)[1].split('async def _create_client_lead', 1)[0]
    assert "Depends(get_current_user)" in direct
    assert 'role = "client"' in profile
    assert "FUNDED_WALLET_CURRENCY_LOCKED" in profile
    assert "current_user: AuthUser = Depends(get_current_user)" in reviews
    assert "subscriptions_router" not in main


def test_acceptance_creates_durable_crm_state():
    sql = source(BACKEND / "migrations" / "050_marketplace_success_fee.sql")
    assert "INSERT INTO public.master_clients" in sql
    assert "INSERT INTO public.master_sessions" in sql
    assert "INSERT INTO public.notifications" in sql
    assert "master_sessions_one_per_lead_idx" in sql


def test_deploy_is_fail_closed_and_migrations_have_a_ledger():
    workflow = source(ROOT / ".github" / "workflows" / "deploy.yml")
    runner = source(BACKEND / "run_migration.py")
    assert "set -euo pipefail" in workflow
    assert "schema_migrations" in runner
    assert "pg_advisory_xact_lock" in runner
    assert "checksum mismatch" in runner.lower()


def test_readiness_checks_required_marketplace_schema_without_leaking_errors():
    main = source(BACKEND / "main.py")
    assert '@app.get("/api/readiness")' in main
    assert "certificate_status" in main
    assert "success_fee_transaction_id" in main
    assert "required_schema_unavailable" in main


def test_email_credentials_are_environment_only():
    mail = source(BACKEND / "app" / "services" / "mail.py")
    assert "RESEND_API_KEY" in mail
    assert '"Authorization": f"Bearer {api_key}"' in mail


def test_crm_board_uses_backend_sessions_api_only():
    crm_board = source(FRONTEND / "src" / "components" / "CRMBoard.tsx")
    assert ".from('master_sessions')" not in crm_board
    assert "/api/crm/sessions" in crm_board


def test_pwa_generated_files_are_not_tracked_source_assets():
    gitignore = source(FRONTEND / ".gitignore")
    assert "public/sw.js" in gitignore
    assert "public/worker-*.js" in gitignore
    tracked = subprocess.check_output(
        ["git", "ls-files", "frontend/public/sw.js", "frontend/public/workbox-*.js", "frontend/public/worker-*.js"],
        cwd=ROOT,
        text=True,
    )
    assert tracked.strip() == ""
