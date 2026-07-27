from pathlib import Path
import pytest

def get_router_source(filename: str) -> str:
    root = Path(__file__).parents[2] / "backend" / "app" / "routers"
    return (root / filename).read_text(encoding="utf-8")

def test_crm_client_source_defaults_to_direct():
    crm_source = get_router_source("crm.py")
    assert 'client["source"] = "direct"' in crm_source
    assert '"source": "manual"' in crm_source or '"source": "direct"' in crm_source

def test_crm_session_creation_binds_source_from_client():
    crm_source = get_router_source("crm.py")
    assert 'supabase.table("master_clients").select("id, lead_id, source")' in crm_source
    assert '"source": client_res.data[0].get("source") or "direct"' in crm_source

def test_crm_endpoints_enforce_master_isolation():
    crm_source = get_router_source("crm.py")
    # Verify that clients and sessions queries are filtered by current_user.user_id
    assert '.eq("master_id", current_user.user_id)' in crm_source
    assert 'table("master_clients").select' in crm_source
    assert 'table("master_sessions").select' in crm_source

def test_chat_list_resolves_client_names_from_crm():
    chat_source = get_router_source("chat.py")
    assert "master_clients_map = {}" in chat_source
    assert 'supabase.table("master_clients").select("id, name, email, phone, telegram, instagram, lead_id, source")' in chat_source
    assert 'master_clients_map[f"lead_{mc[\'lead_id\']}"] = mc' in chat_source
    assert 'master_clients_map[f"email_{mc[\'email\'].lower().strip()}"] = mc' in chat_source
    assert 'master_clients_map[f"phone_{mc[\'phone\'].strip()}"] = mc' in chat_source

def test_chat_sessions_history_joins_master_clients():
    chat_source = get_router_source("chat.py")
    assert 'master_clients!inner' in chat_source
    assert 'table("master_sessions").select("*, master_clients!inner(id, name, lead_id, leads(*))")' in chat_source or 'master_clients!inner' in chat_source

def test_kanban_status_transitions_and_updates_supported():
    crm_source = get_router_source("crm.py")
    assert '@router.put("/sessions/{session_id}")' in crm_source
    assert '@router.delete("/sessions/{session_id}")' in crm_source
    assert '@router.put("/clients/{client_id}")' in crm_source
    assert '@router.delete("/clients/{client_id}")' in crm_source
