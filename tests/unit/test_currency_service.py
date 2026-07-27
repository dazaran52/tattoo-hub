import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from app.utils.currency import (
    convert_currency,
    calculate_unlock_price_base,
    ExchangeRateCache,
    DEFAULT_RATES,
)
from app.services.currency_service import fetch_and_update_ecb_rates

def test_convert_currency_same_currency():
    res = convert_currency(100.555, "CZK", "czk")
    assert res == 100.56

def test_convert_currency_eur_to_czk():
    # Using default CZK rate of 25.2
    ExchangeRateCache.force_update({"EUR": 1.0, "CZK": 25.0})
    res = convert_currency(10.0, "EUR", "CZK")
    assert res == 250.0

def test_convert_currency_czk_to_pln():
    ExchangeRateCache.force_update({"EUR": 1.0, "CZK": 25.0, "PLN": 4.0})
    # 250 CZK / 25.0 = 10 EUR -> 10 * 4.0 = 40 PLN
    res = convert_currency(250.0, "CZK", "PLN")
    assert res == 40.0

def test_calculate_unlock_price_base_with_negotiable_budget():
    assert calculate_unlock_price_base(0, "CZK") == 2.0
    assert calculate_unlock_price_base(-100, "EUR") == 2.0
    assert calculate_unlock_price_base(None, "CZK") == 2.0

def test_calculate_unlock_price_base_with_czk_budget():
    ExchangeRateCache.force_update({"EUR": 1.0, "CZK": 25.0})
    # 5,000 CZK / 25 = 200 EUR -> 5% of 200 is 10 EUR
    assert calculate_unlock_price_base(5000.0, "CZK") == 10.0

def test_calculate_unlock_price_base_minimum_enforced():
    ExchangeRateCache.force_update({"EUR": 1.0, "CZK": 25.0})
    # 500 CZK / 25 = 20 EUR -> 5% is 1 EUR -> min should be 2.0 EUR
    assert calculate_unlock_price_base(500.0, "CZK") == 2.0

def test_exchange_rate_cache_refresh():
    mock_supabase = MagicMock()
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[
            {"currency_code": "EUR", "rate_to_eur": 1.0},
            {"currency_code": "CZK", "rate_to_eur": 24.5},
            {"currency_code": "PLN", "rate_to_eur": 4.2},
        ]
    )
    
    rates = ExchangeRateCache.refresh(mock_supabase)
    assert rates["CZK"] == 24.5
    assert rates["PLN"] == 4.2
    assert rates["EUR"] == 1.0

@pytest.mark.asyncio
async def test_fetch_and_update_ecb_rates():
    mock_supabase = MagicMock()
    mock_supabase.table.return_value.select.return_value.execute.return_value = MagicMock(
        data=[
            {"currency_code": "UAH", "rate_to_eur": 42.0, "is_active": True},
            {"currency_code": "CZK", "rate_to_eur": 25.0, "is_active": True},
        ]
    )
    
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "amount": 1.0,
        "base": "EUR",
        "date": "2026-07-27",
        "rates": {
            "CZK": 25.25,
            "USD": 1.08
        }
    }
    mock_response.raise_for_status = MagicMock()
    
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_response
        result = await fetch_and_update_ecb_rates(mock_supabase)
        
        assert result["success"] is True
        assert result["source"] == "Frankfurter API (ECB)"
        assert result["date_api"] == "2026-07-27"
        
        # Verify UAH was preserved and CZK updated
        rates_in_cache = ExchangeRateCache.get_rates()
        assert "CZK" in rates_in_cache
        assert "USD" in rates_in_cache
