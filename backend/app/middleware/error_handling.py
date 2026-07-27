"""Centralized exception handling.

Endpoints across the codebase commonly do `except Exception as e: raise
HTTPException(status_code=500, detail=str(e))`. That pattern is convenient for
local debugging, but in production it can leak internal details (table/column
names, SQL error text, stack traces) straight into API responses.

Rather than touching every call site, we sanitize at the ASGI boundary:
- Every 5xx response (whether an explicit HTTPException or a truly unhandled
  exception) is logged in full, with traceback, on the server.
- The client only receives the raw detail when NOT running in production,
  which keeps local/staging debugging convenient without any code changes.
- 4xx responses (validation errors, "not found", "forbidden", intentional
  domain error codes, etc.) are left untouched — those are meant to be seen
  by the client.
"""
import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import Settings

logger = logging.getLogger("tattoo_hub.errors")

GENERIC_SERVER_ERROR_DETAIL = "Internal server error. Please try again later."


def register_exception_handlers(app: FastAPI, settings: Settings) -> None:
    """Register global handlers that hide 5xx error internals in production."""
    is_production = settings.APP_ENV == "production"

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        if exc.status_code >= 500:
            logger.error(
                "HTTP %s on %s %s: %s",
                exc.status_code,
                request.method,
                request.url.path,
                exc.detail,
                exc_info=exc,
            )
            if is_production:
                return JSONResponse(
                    status_code=exc.status_code,
                    content={"detail": GENERIC_SERVER_ERROR_DETAIL},
                    headers=getattr(exc, "headers", None),
                )
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers=getattr(exc, "headers", None),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
        detail = GENERIC_SERVER_ERROR_DETAIL if is_production else str(exc)
        return JSONResponse(status_code=500, content={"detail": detail})
