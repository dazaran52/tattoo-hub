from typing import Dict

# MVP Exchange rates relative to EUR
# Later this can be replaced with an external API or database table
EXCHANGE_RATES: Dict[str, float] = {
    "EUR": 1.0,
    "CZK": 25.0,
    "UAH": 42.0,
    "PLN": 4.3,
    "USD": 1.08,
}

def convert_currency(amount: float, from_currency: str, to_currency: str) -> float:
    """
    Converts amount from one currency to another using fixed exchange rates.
    Returns the amount rounded to 2 decimal places.
    """
    from_curr = from_currency.upper()
    to_curr = to_currency.upper()
    
    # If same currency, no conversion needed
    if from_curr == to_curr:
        return round(amount, 2)
        
    rate_from = EXCHANGE_RATES.get(from_curr)
    rate_to = EXCHANGE_RATES.get(to_curr)
    
    if not rate_from or not rate_to:
        raise ValueError(f"Unsupported currency: {from_curr} or {to_curr}")
        
    # Convert to EUR first, then to target currency
    amount_in_eur = amount / rate_from
    converted_amount = amount_in_eur * rate_to
    
    return round(converted_amount, 2)

def calculate_unlock_price_base(client_budget: float, client_currency: str) -> int:
    """
    Calculates the unlock price in Credits (1 to 5).
    """
    if not client_budget or client_budget <= 0:
        return 1  # 1 credit for negotiable or no-budget leads
        
    try:
        budget_in_eur = convert_currency(client_budget, client_currency, "EUR")
    except ValueError:
        return 1
        
    if budget_in_eur < 100:
        return 1
    elif budget_in_eur < 300:
        return 2
    elif budget_in_eur < 600:
        return 3
    elif budget_in_eur < 1000:
        return 4
    else:
        return 5
