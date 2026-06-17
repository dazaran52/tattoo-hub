"""Database connection and Supabase client management."""
from supabase import create_client, Client
from app.config import get_settings

# Global Supabase client instance
_supabase_client: Client | None = None


def get_supabase_client() -> Client:
    """Get or create Supabase client instance."""
    settings = get_settings()
    return create_client(
        supabase_url=settings.SUPABASE_URL,
        supabase_key=settings.SUPABASE_KEY
    )
