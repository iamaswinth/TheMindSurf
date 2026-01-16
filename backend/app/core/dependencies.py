"""
Authentication Dependencies

FastAPI dependencies for authentication and authorization.
"""

import logging
from typing import Optional, Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.services.auth_service import AuthService, AuthenticationError
from app.db.connection import db

logger = logging.getLogger(__name__)

# Security scheme for JWT Bearer tokens
security = HTTPBearer(auto_error=False)


class CurrentUser:
    """Represents the currently authenticated user."""
    
    def __init__(
        self,
        id: UUID,
        email: str,
        role: str = "user",
        credits: int = 0,
        display_name: Optional[str] = None,
        auth_method: Optional[str] = None,
        github_username: Optional[str] = None,
        github_avatar_url: Optional[str] = None
    ):
        self.id = id
        self.email = email
        self.role = role
        self.credits = credits
        self.display_name = display_name
        self.auth_method = auth_method
        self.github_username = github_username
        self.github_avatar_url = github_avatar_url
    
    @property
    def is_admin(self) -> bool:
        return self.role == "admin"
    
    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "email": self.email,
            "role": self.role,
            "credits": self.credits,
            "display_name": self.display_name,
            "auth_method": self.auth_method,
            "github_username": self.github_username,
            "github_avatar_url": self.github_avatar_url,
        }


async def get_current_user(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)]
) -> CurrentUser:
    """
    Dependency to get the current authenticated user.
    
    Raises HTTPException 401 if not authenticated.
    """
    if not credentials:
        logger.warning("Authentication failed: No credentials provided")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "NOT_AUTHENTICATED",
                "message": "Not authenticated. Please provide a Bearer token in the Authorization header."
            },
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    try:
        # Decode the JWT token
        payload = AuthService.decode_access_token(credentials.credentials)
        user_id = payload.get("sub")
        
        if not user_id:
            logger.warning("Authentication failed: Token has no user ID")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "code": "INVALID_TOKEN",
                    "message": "Invalid token payload"
                },
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        # Fetch full user from database
        user = await AuthService.get_user_by_id(UUID(user_id))
        
        if not user:
            logger.warning(f"Authentication failed: User {user_id} not found in database")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "code": "USER_NOT_FOUND",
                    "message": "User not found"
                },
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        if not user.get("is_active", True):
            logger.warning(f"Authentication failed: User {user_id} account is disabled")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "ACCOUNT_DISABLED",
                    "message": "Account is disabled"
                }
            )
        
        logger.debug(f"User {user['email']} authenticated successfully")
        return CurrentUser(
            id=user["id"],
            email=user["email"],
            role=user.get("role", "user"),
            credits=user.get("credits", 0),
            display_name=user.get("display_name"),
            auth_method=user.get("auth_method"),
            github_username=user.get("github_username"),
            github_avatar_url=user.get("github_avatar_url")
        )
        
    except AuthenticationError as e:
        logger.warning(f"Authentication failed: {e.code} - {e.message}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": e.code,
                "message": e.message
            },
            headers={"WWW-Authenticate": "Bearer"}
        )
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "AUTH_ERROR",
                "message": "Authentication failed"
            },
            headers={"WWW-Authenticate": "Bearer"}
        )


async def get_current_user_optional(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)]
) -> Optional[CurrentUser]:
    """
    Dependency to optionally get the current user.
    
    Returns None if not authenticated (doesn't raise exception).
    Useful for endpoints that work differently for authenticated vs anonymous users.
    """
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


async def get_current_admin_user(
    current_user: Annotated[CurrentUser, Depends(get_current_user)]
) -> CurrentUser:
    """
    Dependency to get the current user, requiring admin role.
    
    Raises HTTPException 403 if user is not an admin.
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "ADMIN_REQUIRED",
                "message": "Admin privileges required"
            }
        )
    return current_user


# Type aliases for cleaner dependency injection
AuthenticatedUser = Annotated[CurrentUser, Depends(get_current_user)]
OptionalUser = Annotated[Optional[CurrentUser], Depends(get_current_user_optional)]
AdminUser = Annotated[CurrentUser, Depends(get_current_admin_user)]
