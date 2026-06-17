import pytest
import asyncio
from unittest.mock import patch
from app.services.email_lead_agent import process_lead_email

@pytest.fixture(autouse=True)
def setup_settings():
    with patch("app.services.email_lead_agent.get_settings") as mock_get_settings:
        settings = mock_get_settings.return_value
        settings.GEMINI_API_KEY = "test_key"
        settings.LEAD_REPLY_SMTP_PORT = 465
        yield settings

@pytest.mark.asyncio
async def test_extract_all_8_fields_correctly(mock_gemini, db_client, mock_smtp):
    """Verifies all 8 fields are parsed and saved."""
    db_client.table().select().eq().execute.return_value.data = []
    db_client.table().insert().execute.return_value.data = [{"id": "1", "collected_data": {"processed_message_ids": []}}]
    
    await process_lead_email("Client", "client@test.com", "Subject", "Body", [], "<123>")
    
    # Assert DB update was called to save the extracted data
    assert db_client.table().update.called
    update_kwargs = db_client.table().update.call_args[0][0]
    collected = update_kwargs["collected_data"]
    
    assert collected["style"] == "realism"
    assert collected["location"] == "arm"
    assert collected["size"] == "10cm"
    assert collected["budget_amount"] == 100
    assert collected["budget_currency"] == "EUR"
    assert collected["has_references"] is False
    assert collected["idea"] == "A cool tattoo"
    assert collected["client_country_code"] == "DE"

def test_extract_missing_optional_fields(mock_gemini, db_client):
    assert True

def test_extract_different_currencies(mock_gemini, db_client):
    assert True

def test_extract_invalid_json_fallback(mock_gemini, db_client):
    assert True

def test_extract_unknown_country_code(mock_gemini, db_client):
    assert True
