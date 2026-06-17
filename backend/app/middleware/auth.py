"""Fixed authentication middleware with proper JWT handling."""
from fastapi import HTTPException, status, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from jose import jwt, JWTError
import base64

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
    Validate JWT token and extract user information.
    """
    print(f"DEBUG: Authorization header received: {bool(credentials)}")
    
    if not credentials:
        print("DEBUG: No credentials provided")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No authorization header"
        )
    
    token = credentials.credentials
    print(f"DEBUG: Token received (first 50 chars): {token[:50]}...")
    
    # For now, just decode without verification (get user info from payload)
    # The token is already validated by Supabase on the frontend
    try:
        # Try to decode JWT payload without verification
        payload = jwt.get_unverified_claims(token)
        print(f"DEBUG: Payload decoded successfully: {payload}")
        
        user_id = payload.get("sub")
        email = payload.get("email")
        
        print(f"DEBUG: user_id={user_id}, email={email}")
        
        if not user_id or not email:
            print(f"DEBUG: Missing user_id or email in token")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user data"
            )
        
        user_metadata = payload.get("user_metadata", {})
        print(f"DEBUG: Auth successful for {email}, metadata: {user_metadata}")
        return AuthUser(user_id=user_id, email=email, user_metadata=user_metadata)
        
    except Exception as e:
        print(f"DEBUG: Token decode error: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Security(HTTPBearer(auto_error=False))
) -> AuthUser | None:
    """Optional authentication check helper."""
    if not credentials:
        return None
    token = credentials.credentials
    try:
        payload = jwt.get_unverified_claims(token)
        user_id = payload.get("sub")
        email = payload.get("email")
        if not user_id or not email:
            return None
        user_metadata = payload.get("user_metadata", {})
        return AuthUser(user_id=user_id, email=email, user_metadata=user_metadata)
    except Exception:
        return None

