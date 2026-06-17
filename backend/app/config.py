from pydantic_settings import BaseSettings
from functools import lru_cache
import base64


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""
    
    # Supabase Configuration
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_JWT_SECRET: str
    
    # Database Connection (for migrations)
    POSTGRES_URL: str | None = None  # e.g., postgresql://user:pass@host:5432/db
    
    # Email Parser (IMAP)
    EMAIL_IMAP_SERVER: str | None = None
    EMAIL_ACCOUNT: str | None = None
    EMAIL_PASSWORD: str | None = None
    
    # SMTP (Brevo)
    SMTP_SERVER: str = "smtp-relay.brevo.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_FROM_EMAIL: str = "noreply@outtattoo.com"
    
    # App Configuration
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    APP_ENV: str = "development"
    DONATELLO_X_KEY: str = "OUT_TATTOO_SECRET_123"
    
    # Conversational AI
    GEMINI_API_KEY: str | None = None
    
    # Lead Interceptor IMAP (Main Studio Box - Vean Tattoo)
    LEAD_CAPTURE_IMAP_SERVER: str | None = None
    LEAD_CAPTURE_EMAIL: str | None = None
    LEAD_CAPTURE_PASSWORD: str | None = None
    
    # Lead Reply SMTP (Second Studio Box - VK WorkSpace)
    LEAD_REPLY_SMTP_SERVER: str | None = "smtp.mail.ru"
    LEAD_REPLY_SMTP_PORT: int = 465
    LEAD_REPLY_EMAIL: str | None = None
    LEAD_REPLY_PASSWORD: str | None = None
    LEAD_REPLY_FROM_NAME: str = "Tattoo Booking Helper"
    
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
        "https://tattoo-hub.xyz",
        "https://www.tattoo-hub.xyz"
    ]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
