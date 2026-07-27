"""Behavioral tests for the centralized exception handling in
app.middleware.error_handling, plus a source check that main.py actually
wires it in.

These tests build tiny standalone FastAPI apps (not the full `main.app`)
so they don't require Supabase/Stripe/etc. settings to be configured.
"""
import logging
from pathlib import Path

from fastapi import FastAPI, HTTPException
import httpx

from app.middleware.error_handling import (
    GENERIC_SERVER_ERROR_DETAIL,
    register_exception_handlers,
)

# The handlers log full details/tracebacks on purpose; keep test output clean.
logging.disable(logging.CRITICAL)


class _FakeSettings:
    def __init__(self, app_env: str):
        self.APP_ENV = app_env


def _make_app(app_env: str) -> FastAPI:
    app = FastAPI()
    register_exception_handlers(app, _FakeSettings(app_env))

    @app.get("/boom-http")
    def boom_http():
        raise HTTPException(
            status_code=500,
            detail="OperationalError: password authentication failed for user postgres",
        )

    @app.get("/boom-unhandled")
    def boom_unhandled():
        raise ValueError("raw internal detail that must never reach a client")

    @app.get("/not-found")
    def not_found():
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    return app


import pytest
import httpx

def _get_client(app: FastAPI) -> httpx.AsyncClient:
    return httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app, raise_app_exceptions=False),
        base_url="http://testserver",
    )


@pytest.mark.asyncio
async def test_production_hides_raw_detail_for_http_exceptions():
    async with _get_client(_make_app("production")) as client:
        res = await client.get("/boom-http")
    assert res.status_code == 500
    assert res.json() == {"detail": GENERIC_SERVER_ERROR_DETAIL}
    assert "password" not in res.text


@pytest.mark.asyncio
async def test_production_hides_raw_detail_for_unhandled_exceptions():
    async with _get_client(_make_app("production")) as client:
        res = await client.get("/boom-unhandled")
    assert res.status_code == 500
    assert res.json() == {"detail": GENERIC_SERVER_ERROR_DETAIL}
    assert "raw internal detail" not in res.text


@pytest.mark.asyncio
async def test_production_leaves_domain_4xx_errors_untouched():
    async with _get_client(_make_app("production")) as client:
        res = await client.get("/not-found")
    assert res.status_code == 404
    assert res.json() == {"detail": "USER_NOT_FOUND"}


@pytest.mark.asyncio
async def test_development_still_shows_raw_detail_for_debugging():
    async with _get_client(_make_app("development")) as client:
        res_http = await client.get("/boom-http")
        res_unhandled = await client.get("/boom-unhandled")
    assert res_http.status_code == 500
    assert "password authentication failed" in res_http.json()["detail"]
    assert res_unhandled.status_code == 500
    assert "raw internal detail" in res_unhandled.json()["detail"]


def test_main_wires_up_the_global_exception_handlers():
    main_source = (Path(__file__).parents[2] / "backend" / "main.py").read_text(
        encoding="utf-8"
    )
    assert "from app.middleware.error_handling import register_exception_handlers" in main_source
    assert "register_exception_handlers(app, settings)" in main_source
