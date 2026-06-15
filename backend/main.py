"""Tattoo Hub - FastAPI Backend Application"""
import os
import glob
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import get_settings
from app.routers.profile import router as profile_router
from app.routers.leads import router as leads_router
from app.routers.webhooks import router as webhooks_router
from app.routers.admin import router as admin_router
from app.routers.payments import router as payments_router
from app.routers.notifications import router as notifications_router
from app.routers.locations import router as locations_router
from app.routers.disputes import router as disputes_router
from app.routers.auctions import router as auctions_router
from app.routers.analytics import router as analytics_router
from app.routers.subscriptions import router as subscriptions_router
from app.routers.chat import router as chat_router
from app.routers.client_portal import router as client_portal_router


def run_migrations():
    """Run SQL migrations automatically on startup using direct Postgres connection."""
    settings = get_settings()
    
    if not settings.POSTGRES_URL:
        print("⚠️  POSTGRES_URL not set, skipping auto-migrations")
        print("   Set POSTGRES_URL in environment to enable auto-migrations")
        return
    
    migrations_dir = Path(__file__).parent / "migrations"
    if not migrations_dir.exists():
        print("📁 No migrations directory found")
        return
    
    # Get all SQL files and sort them
    sql_files = sorted(glob.glob(str(migrations_dir / "*.sql")))
    
    if not sql_files:
        print("📁 No migration files found")
        return
    
    print(f"🔄 Found {len(sql_files)} migration file(s)")
    
    try:
        import psycopg2
        
        # Connect directly to PostgreSQL
        conn = psycopg2.connect(settings.POSTGRES_URL)
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Create migrations tracking table if not exists
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS _migrations (
                filename VARCHAR(255) PRIMARY KEY,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        for sql_file in sql_files:
            filename = os.path.basename(sql_file)
            
            # Check if already applied
            cursor.execute("SELECT 1 FROM _migrations WHERE filename = %s", (filename,))
            if cursor.fetchone():
                print(f"  ⏭️  {filename} already applied")
                continue
            
            print(f"  ⏳ Running: {filename}")
            
            try:
                with open(sql_file, 'r') as f:
                    sql = f.read()
                
                # Execute the migration
                cursor.execute(sql)
                
                # Record migration
                cursor.execute(
                    "INSERT INTO _migrations (filename) VALUES (%s)",
                    (filename,)
                )
                
                print(f"  ✅ {filename} applied")
                
            except Exception as e:
                print(f"  ❌ {filename} failed: {e}")
                # Continue with other migrations
        
        cursor.close()
        conn.close()
        print("🔄 Migrations complete")
        
    except ImportError:
        print("⚠️  psycopg2 not installed, skipping auto-migrations")
        print("   Run: pip install psycopg2-binary")
    except Exception as e:
        print(f"⚠️  Migration runner error: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    settings = get_settings()
    print(f"🚀 Tattoo Hub API starting in {settings.APP_ENV} mode")
    
    # Run migrations
    run_migrations()
    
    # Start email parser background task
    import asyncio
    from app.services.email_parser import start_email_parser
    from app.services.email_lead_agent import start_email_lead_agent
    parser_task = asyncio.create_task(start_email_parser())
    lead_agent_task = asyncio.create_task(start_email_lead_agent())
    
    yield
    # Shutdown
    print("👋 Shutting down API")
    parser_task.cancel()
    lead_agent_task.cancel()


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
    
    # Add Vercel deployment domains in production
    if settings.APP_ENV == "production":
        origins.extend([
            "https://out-tattoo-leads.vercel.app",
            "https://out-tattoo-web.vercel.app",
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
    app.include_router(disputes_router)
    app.include_router(auctions_router)
    app.include_router(analytics_router)
    app.include_router(subscriptions_router)
    app.include_router(chat_router)
    app.include_router(client_portal_router)
    
    @app.get("/health")
    async def health_check():
        """Health check endpoint."""
        return {"status": "ok", "service": "out-tattoo-leads-api"}
    
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
