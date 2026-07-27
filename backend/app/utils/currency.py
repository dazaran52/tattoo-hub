import time
from typing import Dict, Optional, Any
from supabase import Client

# Default fallback rates relative to EUR in case DB is unreachable
DEFAULT_RATES: Dict[str, float] = {
    "EUR": 1.0,
    "CZK": 25.2,
    "UAH": 42.0,
    "PLN": 4.3,
    "USD": 1.08,
    "GBP": 0.84,
}

class ExchangeRateCache:
    _rates: Dict[str, float] = DEFAULT_RATES.copy()
    _last_updated: float = 0.0
    _ttl: float = 3600.0  # 1 hour in seconds

    @classmethod
    def get_rates(cls, supabase: Optional[Client] = None) -> Dict[str, float]:
        now = time.time()
        # Refresh if TTL expired and supabase client is provided
        if supabase and (now - cls._last_updated > cls._ttl or cls._last_updated == 0.0):
            cls.refresh(supabase)
        return cls._rates

    @classmethod
    def refresh(cls, supabase: Client) -> Dict[str, float]:
        try:
            res = supabase.table("exchange_rates").select("currency_code, rate_to_eur").eq("is_active", True).execute()
            if res and res.data:
                new_rates = {}
                for row in res.data:
                    code = row.get("currency_code", "").upper()
                    rate = row.get("rate_to_eur")
                    if code and rate and rate > 0:
                        new_rates[code] = float(rate)
                if "EUR" not in new_rates:
                    new_rates["EUR"] = 1.0
                cls._rates.update(new_rates)
                cls._last_updated = time.time()
                print(f"[ExchangeRateCache] Refreshed {len(new_rates)} rates from Supabase DB.")
        except Exception as e:
            print(f"[ExchangeRateCache] Error refreshing rates from DB: {e}. Using cached/default rates.")
        return cls._rates

    @classmethod
    def force_update(cls, new_rates: Dict[str, float]):
        cls._rates.update(new_rates)
        cls._last_updated = time.time()

# Backwards compatibility alias for any direct imports of EXCHANGE_RATES
EXCHANGE_RATES = ExchangeRateCache.get_rates()

def convert_currency(amount: float, from_currency: str, to_currency: str, supabase: Optional[Client] = None) -> float:
    """
    Converts amount from one currency to another using dynamic exchange rates from cache/DB.
    Returns the amount rounded to 2 decimal places.
    """
    if amount is None:
        return 0.0
    from_curr = (from_currency or "EUR").upper()
    to_curr = (to_currency or "EUR").upper()
    
    # If same currency, no conversion needed
    if from_curr == to_curr:
        return round(amount, 2)
        
    rates = ExchangeRateCache.get_rates(supabase)
    rate_from = rates.get(from_curr)
    rate_to = rates.get(to_curr)
    
    if not rate_from or not rate_to:
        # Fallback to default rates if missing in active cache
        rate_from = rate_from or DEFAULT_RATES.get(from_curr)
        rate_to = rate_to or DEFAULT_RATES.get(to_curr)
        if not rate_from or not rate_to:
            raise ValueError(f"Unsupported currency: {from_curr} or {to_curr}")
        
    # Convert to EUR first, then to target currency
    amount_in_eur = amount / rate_from
    converted_amount = amount_in_eur * rate_to
    
    return round(converted_amount, 2)

def calculate_unlock_price_base(client_budget: float, client_currency: str, supabase: Optional[Client] = None) -> float:
    """
    Calculates the base unlock price in EUR (5% of the budget, min 2 EUR).
    """
    if not client_budget or client_budget <= 0:
        return 2.0  # 2 EUR for negotiable or no-budget leads
        
    try:
        budget_in_eur = convert_currency(client_budget, client_currency, "EUR", supabase=supabase)
    except ValueError:
        return 2.0
        
    price = budget_in_eur * 0.05
    return max(2.0, round(price, 2))
