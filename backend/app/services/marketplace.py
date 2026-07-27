"""Pure marketplace access, proposal-limit and success-fee rules."""

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP

from app.utils.currency import EXCHANGE_RATES

MAX_PROPOSALS_PER_LEAD = 5
SUCCESS_FEE_RATE = Decimal("0.10")


@dataclass(frozen=True)
class SuccessFee:
    rate: Decimal
    amount: Decimal
    currency: str


def ensure_master_can_access_marketplace(profile: dict) -> None:
    """Require the temporary account-access verification, not a certificate."""
    if profile.get("role") != "master" or not profile.get("is_verified_master"):
        raise ValueError("MARKETPLACE_ACCESS_REQUIRED")


def should_schedule_auto_verification(profile: dict) -> bool:
    """Recover MVP verification jobs that were interrupted after status changed."""
    return (
        profile.get("role") == "master"
        and not profile.get("is_verified_master")
        and profile.get("status") in {"pending", "verifying"}
    )


def ensure_proposal_slot_available(
    existing_master_ids: list[str],
    current_master_id: str,
    max_proposals: int = MAX_PROPOSALS_PER_LEAD,
) -> None:
    """Allow edits by existing proposers but reject a new proposer after the cap."""
    if current_master_id not in existing_master_ids and len(set(existing_master_ids)) >= max_proposals:
        raise ValueError("MAX_PROPOSALS_REACHED")


def ensure_proposal_status_transition(current_status: str, new_status: str) -> None:
    """Prevent a master from booking or completing an unaccepted proposal."""
    allowed = {
        "accepted": {"booked", "completed"},
        "booked": {"booked", "completed"},
        "completed": {"completed"},
    }
    if new_status not in allowed.get(current_status, set()):
        raise ValueError("PROPOSAL_MUST_BE_ACCEPTED")


def build_admin_balance_update(
    credits: int | None,
    balance: Decimal | None,
) -> dict[str, int | Decimal]:
    """Map admin input to the correct legacy-credit or fiat-balance column."""
    if balance is not None:
        if balance < 0:
            raise ValueError("BALANCE_CANNOT_BE_NEGATIVE")
        return {"balance": balance}
    if credits is not None:
        if credits < 0:
            raise ValueError("BALANCE_CANNOT_BE_NEGATIVE")
        return {"credits": credits}
    raise ValueError("BALANCE_VALUE_REQUIRED")


def calculate_success_fee(price_offer: Decimal, currency: str) -> SuccessFee:
    """Apply the same 10% success fee to every accepted proposal."""
    normalized_currency = currency.upper()
    if price_offer <= 0:
        raise ValueError("PRICE_OFFER_MUST_BE_POSITIVE")
    if normalized_currency not in EXCHANGE_RATES:
        raise ValueError("UNSUPPORTED_CURRENCY")

    amount = (price_offer * SUCCESS_FEE_RATE).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    if amount <= 0:
        raise ValueError("SUCCESS_FEE_TOO_SMALL")
    return SuccessFee(
        rate=SUCCESS_FEE_RATE,
        amount=amount,
        currency=normalized_currency,
    )
