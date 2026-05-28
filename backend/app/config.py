from pydantic_settings import BaseSettings
from functools import lru_cache
import base64


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""
    
    # Supabase Configuration
    SUPABASE_URL: str
    SUPABASE_KEY: str
    _jwt_secret_raw: str  # Store raw base64
    
    # Database Connection (for migrations)
    POSTGRES_URL: str | None = None  # e.g., postgresql://user:pass@host:5432/db
    
    @property
    def SUPABASE_JWT_SECRET(self) -> str:
        """Decode base64 JWT secret to PEM format."""
        try:
            # Try to decode base64
            decoded = base64.b64decode(self._jwt_secret_raw).decode('utf-8')
            return decoded
        except Exception:
            # If not base64, return as-is
            return self._jwt_secret_raw
    
    # App Configuration
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    APP_ENV: str = "development"
    DONATELLO_X_KEY: str = "OUT_TATTOO_SECRET_123"
    
    @property
    def DATABASE_URL(self) -> str:
        """Get database URL, fallback to constructing from Supabase URL."""
        if self.POSTGRES_URL:
            return self.POSTGRES_URL
        # Construct from Supabase URL: https://xxx.supabase.co -> postgresql://postgres.xxx:5432/postgres
        # This is a simplified approach - actual connection requires password
        return ""
    
    # CORS Origins - explicit list for credentials support
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "https://localhost:3000",
        "https://out-tattoo-web.vercel.app",
        "https://out-tattoo-leads.vercel.app",
    ]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
