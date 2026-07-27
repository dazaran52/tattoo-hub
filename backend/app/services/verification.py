"""Pure helpers for manual master certificate verification."""

from datetime import datetime
from pathlib import PurePosixPath

_ALLOWED_CERTIFICATE_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}


def validate_certificate_object_path(user_id: str, object_path: str) -> str:
    """Validate that a storage object belongs to the authenticated master."""
    if not object_path or object_path.startswith("/"):
        raise ValueError("Invalid certificate path")

    path = PurePosixPath(object_path)
    if ".." in path.parts or len(path.parts) != 2 or path.parts[0] != user_id:
        raise ValueError("Certificate path must belong to the current master")
    if not path.name or path.suffix.lower() not in _ALLOWED_CERTIFICATE_EXTENSIONS:
        raise ValueError("Unsupported certificate file type")

    return str(path)


def build_certificate_submission_update(object_path: str, submitted_at: datetime) -> dict:
    """Reset verification whenever a master uploads a new certificate."""
    return {
        "certificate_url": object_path,
        "certificate_status": "pending",
        "certificate_submitted_at": submitted_at.isoformat(),
        "certificate_reviewed_at": None,
        "certificate_reviewed_by": None,
        "certificate_rejection_reason": None,
    }


def build_certificate_review_update(
    review_status: str,
    reason: str | None,
    admin_id: str,
    reviewed_at: datetime,
) -> dict:
    """Build the auditable admin decision persisted on a master profile."""
    if review_status not in {"approved", "rejected"}:
        raise ValueError("Certificate status must be approved or rejected")

    normalized_reason = reason.strip() if reason else None
    if review_status == "rejected" and not normalized_reason:
        raise ValueError("A rejection reason is required")

    return {
        "certificate_status": review_status,
        "certificate_reviewed_at": reviewed_at.isoformat(),
        "certificate_reviewed_by": admin_id,
        "certificate_rejection_reason": normalized_reason if review_status == "rejected" else None,
    }


def ensure_certificate_reviewable(certificate_status: str) -> None:
    """Only a currently pending document may receive an admin decision."""
    if certificate_status != "pending":
        raise ValueError("Certificate is not pending review")
