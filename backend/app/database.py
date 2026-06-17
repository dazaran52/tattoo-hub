"""Database connection and Supabase client management."""
from supabase import create_client, Client
from supabase._async.client import create_client as create_async_client, AsyncClient
from app.config import get_settings

# Global Supabase client instances
_supabase_client: Client | None = None
_async_supabase_client: AsyncClient | None = None


def get_supabase_client() -> Client:
    """Get or create Supabase client instance."""
    settings = get_settings()
    return create_client(
        supabase_url=settings.SUPABASE_URL,
        supabase_key=settings.SUPABASE_KEY
    )


async def get_async_supabase_client() -> AsyncClient:
    """Get or create async Supabase client instance."""
    global _async_supabase_client
    if _async_supabase_client is None:
        settings = get_settings()
        _async_supabase_client = await create_async_client(
            supabase_url=settings.SUPABASE_URL,
            supabase_key=settings.SUPABASE_KEY
        )
    return _async_supabase_client

