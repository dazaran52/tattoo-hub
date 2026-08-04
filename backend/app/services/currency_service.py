import httpx
from datetime import datetime, timezone
from typing import Dict, Any
from supabase import Client
from app.utils.currency import ExchangeRateCache

FRANKFURTER_API_URL = "https://api.frankfurter.dev/v1/latest?from=EUR"
FRANKFURTER_FALLBACK_URL = "https://api.frankfurter.app/latest?from=EUR"

async def fetch_and_update_ecb_rates(supabase: Client) -> Dict[str, Any]:
    """
    Fetches latest exchange rates from the official European Central Bank data
    via Frankfurter API and updates the `exchange_rates` table in Supabase.
    Also refreshes the in-memory cache.
    """
    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        try:
            response = await client.get(FRANKFURTER_API_URL)
            response.raise_for_status()
            data = response.json()
        except Exception:
            # Fallback URL with redirect handling
            try:
                response = await client.get(FRANKFURTER_FALLBACK_URL)
                response.raise_for_status()
                data = response.json()
            except Exception as e:
                raise RuntimeError(f"Failed to fetch exchange rates from Frankfurter API: {e}")

    rates_map = data.get("rates", {})
    if not rates_map:
        raise RuntimeError("Received empty rates map from Frankfurter API")

    # Ensure base EUR is 1.0
    rates_map["EUR"] = 1.0

    # Fetch existing currencies from DB so we don't drop manual ones like UAH
    try:
        db_res = supabase.table("exchange_rates").select("currency_code, rate_to_eur, is_active").execute()
        existing_rates = {row["currency_code"].upper(): row for row in (db_res.data or [])}
    except Exception as e:
        print(f"[CurrencyService] Warning: Could not fetch existing rates from DB: {e}")
        existing_rates = {}

    rows_to_upsert = []
    now_iso = datetime.now(timezone.utc).isoformat()

    # Update or add rates returned by ECB
    for curr_code, rate_val in rates_map.items():
        curr_upper = curr_code.upper()
        # If it already exists in DB, preserve its is_active flag; otherwise default to true
        is_active = existing_rates.get(curr_upper, {}).get("is_active", True)
        rows_to_upsert.append({
            "currency_code": curr_upper,
            "rate_to_eur": float(rate_val),
            "is_active": is_active,
            "updated_at": now_iso
        })

    # For currencies that exist in our DB (like UAH) but are not in Frankfurter ECB response,
    # keep them as-is without overwriting
    for curr_upper, row_data in existing_rates.items():
        if curr_upper not in rates_map:
            rows_to_upsert.append({
                "currency_code": curr_upper,
                "rate_to_eur": float(row_data["rate_to_eur"]),
                "is_active": row_data.get("is_active", True),
                "updated_at": now_iso
            })

    try:
        upsert_res = supabase.table("exchange_rates").upsert(rows_to_upsert).execute()
    except Exception as e:
        raise RuntimeError(f"Failed to upsert exchange rates into Supabase: {e}")

    # Refresh in-memory TTL cache with new data
    updated_cache = ExchangeRateCache.refresh(supabase)

    return {
        "success": True,
        "source": "Frankfurter API (ECB)",
        "date_api": data.get("date"),
        "updated_count": len(rows_to_upsert),
        "rates": updated_cache
    }
