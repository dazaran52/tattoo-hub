from datetime import datetime, timezone

import pytest

from app.services.verification import (
    build_certificate_review_update,
    build_certificate_submission_update,
    ensure_certificate_reviewable,
    validate_certificate_object_path,
)


def test_accepts_owner_scoped_certificate_paths():
    path = validate_certificate_object_path(
        "master-123",
        "master-123/certificate-1.pdf",
    )
    assert path == "master-123/certificate-1.pdf"


@pytest.mark.parametrize(
    "path",
    [
        "other-master/certificate.pdf",
        "master-123/../secret.pdf",
        "master-123/certificate.exe",
        "master-123/",
        "/master-123/certificate.pdf",
    ],
)
def test_rejects_unsafe_or_unsupported_certificate_paths(path):
    with pytest.raises(ValueError):
        validate_certificate_object_path("master-123", path)


def test_submission_resets_previous_verification():
    now = datetime(2026, 7, 25, 12, 0, tzinfo=timezone.utc)
    update = build_certificate_submission_update("master-123/new.pdf", now)

    assert update == {
        "certificate_url": "master-123/new.pdf",
        "certificate_status": "pending",
        "certificate_submitted_at": "2026-07-25T12:00:00+00:00",
        "certificate_reviewed_at": None,
        "certificate_reviewed_by": None,
        "certificate_rejection_reason": None,
    }


def test_admin_approval_marks_only_certificate_verified():
    now = datetime(2026, 7, 25, 12, 0, tzinfo=timezone.utc)
    update = build_certificate_review_update("approved", None, "admin-1", now)

    assert update["certificate_status"] == "approved"
    assert "is_verified_master" not in update
    assert update["certificate_reviewed_by"] == "admin-1"
    assert update["certificate_rejection_reason"] is None


def test_rejection_requires_a_reason_without_changing_marketplace_access():
    now = datetime(2026, 7, 25, 12, 0, tzinfo=timezone.utc)

    with pytest.raises(ValueError):
        build_certificate_review_update("rejected", " ", "admin-1", now)

    update = build_certificate_review_update("rejected", "Фото нечитаемое", "admin-1", now)
    assert update["certificate_status"] == "rejected"
    assert "is_verified_master" not in update
    assert update["certificate_rejection_reason"] == "Фото нечитаемое"


def test_review_rejects_unknown_status():
    with pytest.raises(ValueError):
        build_certificate_review_update(
            "pending",
            None,
            "admin-1",
            datetime.now(timezone.utc),
        )


def test_only_pending_certificate_can_be_reviewed():
    ensure_certificate_reviewable("pending")
    with pytest.raises(ValueError, match="Certificate is not pending review"):
        ensure_certificate_reviewable("approved")


def test_numbered_migration_adds_private_certificate_path_column():
    migration = (
        __import__("pathlib").Path(__file__).parents[2]
        / "backend"
        / "migrations"
        / "049_manual_certificate_verification.sql"
    ).read_text()
    assert "ADD COLUMN IF NOT EXISTS certificate_url TEXT" in migration
    assert 'DROP POLICY IF EXISTS "Certificates are publicly accessible"' in migration
    assert 'DROP POLICY IF EXISTS "Authenticated users can upload certificates"' in migration
    assert 'DROP POLICY IF EXISTS "Masters replace own certificates"' in migration
    assert "ON storage.objects FOR UPDATE TO authenticated" not in migration
    assert "certificate_status = 'approved'" in migration
    assert "certificate_url = storage.objects.name" in migration
