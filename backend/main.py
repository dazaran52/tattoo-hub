"""Tattoo Hub - FastAPI Backend Application"""
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import get_settings
from app.database import get_supabase_client
from app.routers.profile import router as profile_router
from app.routers.leads import router as leads_router
from app.routers.webhooks import router as webhooks_router
from app.routers.admin import router as admin_router
from app.routers.payments import router as payments_router
from app.routers.notifications import router as notifications_router
from app.routers.locations import router as locations_router
from app.routers.analytics import router as analytics_router

from app.routers.chat import router as chat_router
from app.routers.client_portal import router as client_portal_router
from app.routers.public import router as public_router
from app.routers.instagram import router as instagram_router
from app.routers.reviews import router as reviews_router
from app.routers import crm, favorites

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    settings = get_settings()
    print(f"🚀 Tattoo Hub API starting in {settings.APP_ENV} mode")
    

    # Email parser background tasks have been completely extracted to `код_парсера_пока_не_применять.txt`
    # to avoid accidental activation during development.
    
    yield
    # Shutdown
    print("👋 Shutting down API")


def create_application() -> FastAPI:
    """Application factory."""
    settings = get_settings()
    
    app = FastAPI(
        title="Tattoo Hub API",
        description="B2B SaaS API for tattoo masters lead generation",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan
    )
    
    # CORS Configuration
    origins = settings.ALLOWED_ORIGINS.copy()
    
    # Add deployment domains in production
    if settings.APP_ENV == "production":
        origins.extend([
            "https://tattoo-hub.xyz",
            "https://www.tattoo-hub.xyz"
        ])
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["*"]
    )
    
    # Include routers
    app.include_router(profile_router)
    app.include_router(leads_router)
    app.include_router(webhooks_router)
    app.include_router(admin_router)
    app.include_router(payments_router)
    app.include_router(notifications_router)
    app.include_router(locations_router)
    app.include_router(analytics_router)

    app.include_router(chat_router)
    app.include_router(client_portal_router)
    app.include_router(public_router)
    app.include_router(instagram_router)
    app.include_router(reviews_router)
    app.include_router(crm.router, prefix="/api/crm", tags=["CRM"])
    app.include_router(favorites.router)

    @app.get("/health")
    @app.get("/api/health")
    async def health_check():
        """Health check endpoint."""
        return {"status": "ok", "service": "tattoo-hub-api"}

    @app.get("/api/readiness")
    async def readiness_check():
        """Verify the database schema required by the deployed marketplace code."""
        try:
            supabase = get_supabase_client()
            supabase.table("users").select(
                "id,balance,currency,certificate_status"
            ).limit(1).execute()
            supabase.table("lead_proposals").select(
                "id,success_fee_charged_at,success_fee_transaction_id"
            ).limit(1).execute()
            supabase.table("master_sessions").select(
                "id,lead_id,source"
            ).limit(1).execute()
            supabase.table("master_clients").select(
                "id,lead_id,source"
            ).limit(1).execute()
            return {"status": "ready", "service": "tattoo-hub-api"}
        except Exception:
            return JSONResponse(
                status_code=503,
                content={
                    "status": "not_ready",
                    "reason": "required_schema_unavailable",
                },
            )
    
    @app.get("/")
    async def root():
        """Root endpoint."""
        return {
            "name": "Tattoo Hub API",
            "version": "1.0.0",
            "docs": "/docs"
        }
    
    return app


# Create application instance
app = create_application()


if __name__ == "__main__":
    import uvicorn
    settings = get_settings()
    uvicorn.run(
        "main:app",
        host=settings.APP_HOST,
        port=settings.APP_PORT,
        reload=settings.APP_ENV == "development"
    )
