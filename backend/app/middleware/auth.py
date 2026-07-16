"""Fixed authentication middleware with proper JWT handling via Supabase Auth API."""
from fastapi import HTTPException, status, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from app.database import get_supabase_client

security = HTTPBearer()


class AuthUser(BaseModel):
    """Authenticated user data."""
    user_id: str
    email: str
    user_metadata: dict = {}


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> AuthUser:
    """
    Validate JWT token securely and extract user information.
    This calls Supabase Auth API directly to ensure the token is cryptographically valid, 
    has not expired, and the user hasn't been deleted or banned.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No authorization header"
        )
    
    token = credentials.credentials
    
    try:
        supabase = get_supabase_client()
        # Securely validate token with Supabase (handles both HS256 and ES256 automatically)
        res = supabase.auth.get_user(token)
        
        if not res or not res.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
            
        user = res.user
        return AuthUser(
            user_id=user.id, 
            email=user.email, 
            user_metadata=user.user_metadata or {}
        )
        
    except Exception as e:
        print(f"DEBUG: Token validation error: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token or session expired"
        )


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Security(HTTPBearer(auto_error=False))
) -> AuthUser | None:
    """Optional authentication check helper."""
    if not credentials:
        return None
        
    token = credentials.credentials
    
    try:
        supabase = get_supabase_client()
        res = supabase.auth.get_user(token)
        
        if not res or not res.user:
            return None
            
        user = res.user
        return AuthUser(
            user_id=user.id, 
            email=user.email, 
            user_metadata=user.user_metadata or {}
        )
    except Exception:
        return None
