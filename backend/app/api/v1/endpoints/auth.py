"""
Authentication API Endpoints

Handles user registration, login, logout, and OAuth.
"""

import logging
import secrets
from typing import Optional

from fastapi import APIRouter, HTTPException, status, Query, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr, Field

from app.services.auth_service import AuthService, AuthenticationError
from app.services.credit_service import CreditService
from app.core.dependencies import AuthenticatedUser, AdminUser
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["authentication"])


# =============================================================================
# Request/Response Models
# =============================================================================

class RegisterRequest(BaseModel):
    """User registration request."""
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password (min 8 characters)")
    display_name: Optional[str] = Field(None, max_length=255)


class LoginRequest(BaseModel):
    """User login request."""
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    """Token refresh request."""
    refresh_token: str


class LogoutRequest(BaseModel):
    """Logout request."""
    refresh_token: str


class UserResponse(BaseModel):
    """User data response."""
    id: str
    email: str
    display_name: Optional[str]
    role: str
    credits: int
    auth_method: str
    github_username: Optional[str]
    github_avatar_url: Optional[str]


class AuthResponse(BaseModel):
    """Authentication response with tokens."""
    user: UserResponse
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class MessageResponse(BaseModel):
    """Simple message response."""
    message: str


class CreditTransactionResponse(BaseModel):
    """Credit transaction details."""
    id: str
    amount: int
    balance_after: int
    transaction_type: str
    reason: Optional[str]
    document_name: Optional[str]
    granted_by_email: Optional[str]
    created_at: str


class CreditHistoryResponse(BaseModel):
    """Credit history response."""
    transactions: list[CreditTransactionResponse]
    current_balance: int


# =============================================================================
# Registration Endpoint
# =============================================================================

@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register new user",
    description="Create a new user account with email and password"
)
async def register(request: RegisterRequest):
    """
    Register a new user account.
    
    - Creates user with hashed password
    - Grants initial credits (3)
    - Returns access and refresh tokens
    """
    try:
        user = await AuthService.register_user(
            email=request.email,
            password=request.password,
            display_name=request.display_name
        )
        
        # Log the user in
        auth_data = await AuthService.login_user(request.email, request.password)
        
        return AuthResponse(
            user=UserResponse(**auth_data["user"]),
            access_token=auth_data["access_token"],
            refresh_token=auth_data["refresh_token"]
        )
        
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": e.code, "message": e.message}
        )


# =============================================================================
# Login Endpoint
# =============================================================================

@router.post(
    "/login",
    response_model=AuthResponse,
    summary="Login with email/password",
    description="Authenticate with email and password"
)
async def login(request: LoginRequest):
    """
    Login with email and password.
    
    Returns access and refresh tokens on success.
    """
    try:
        auth_data = await AuthService.login_user(request.email, request.password)
        
        return AuthResponse(
            user=UserResponse(**auth_data["user"]),
            access_token=auth_data["access_token"],
            refresh_token=auth_data["refresh_token"]
        )
        
    except AuthenticationError as e:
        status_code = status.HTTP_401_UNAUTHORIZED
        if e.code == "USE_GITHUB_LOGIN":
            status_code = status.HTTP_400_BAD_REQUEST
        
        raise HTTPException(
            status_code=status_code,
            detail={"code": e.code, "message": e.message}
        )


# =============================================================================
# GitHub OAuth Endpoints
# =============================================================================

@router.get(
    "/github",
    summary="Initiate GitHub OAuth",
    description="Redirect to GitHub for OAuth authentication"
)
async def github_auth():
    """
    Initiate GitHub OAuth flow.
    
    Redirects to GitHub authorization page.
    """
    if not settings.is_github_oauth_available:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "GITHUB_NOT_CONFIGURED",
                "message": "GitHub OAuth is not configured"
            }
        )
    
    # Generate state for CSRF protection
    state = secrets.token_urlsafe(32)
    
    auth_url = AuthService.get_github_auth_url(state)
    
    return RedirectResponse(url=auth_url)


@router.get(
    "/github/callback",
    summary="GitHub OAuth callback",
    description="Handle GitHub OAuth callback"
)
async def github_callback(
    code: str = Query(..., description="Authorization code from GitHub"),
    state: str = Query(..., description="State parameter for CSRF protection"),
    error: Optional[str] = Query(None, description="Error from GitHub")
):
    """
    Handle GitHub OAuth callback.
    
    - Exchanges code for access token
    - Fetches user info from GitHub
    - Creates or links user account
    - Redirects to frontend with tokens
    """
    if error:
        # Redirect to frontend with error
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/auth/callback?error={error}"
        )
    
    try:
        auth_data = await AuthService.handle_github_callback(code)
        
        # Redirect to frontend with tokens
        access_token = auth_data["access_token"]
        refresh_token = auth_data["refresh_token"]
        
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/auth/callback?access_token={access_token}&refresh_token={refresh_token}"
        )
        
    except AuthenticationError as e:
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/auth/callback?error={e.code}&message={e.message}"
        )


# =============================================================================
# Token Refresh Endpoint
# =============================================================================

@router.post(
    "/refresh",
    response_model=AuthResponse,
    summary="Refresh access token",
    description="Get new access token using refresh token"
)
async def refresh_token(request: RefreshRequest):
    """
    Refresh access token.
    
    - Validates refresh token
    - Issues new access token
    - Rotates refresh token
    """
    try:
        auth_data = await AuthService.refresh_access_token(request.refresh_token)
        
        return AuthResponse(
            user=UserResponse(**auth_data["user"]),
            access_token=auth_data["access_token"],
            refresh_token=auth_data["refresh_token"]
        )
        
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": e.code, "message": e.message}
        )


# =============================================================================
# Logout Endpoint
# =============================================================================

@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Logout user",
    description="Revoke refresh token"
)
async def logout(request: LogoutRequest):
    """
    Logout user by revoking refresh token.
    """
    try:
        await AuthService.logout(request.refresh_token)
        return MessageResponse(message="Successfully logged out")
    except Exception as e:
        # Still return success even if token wasn't found
        logger.warning(f"Logout error: {e}")
        return MessageResponse(message="Successfully logged out")


# =============================================================================
# Current User Endpoints
# =============================================================================

@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user",
    description="Get current authenticated user's profile"
)
async def get_current_user(current_user: AuthenticatedUser):
    """
    Get the current authenticated user's profile.
    """
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        display_name=current_user.display_name,
        role=current_user.role,
        credits=current_user.credits,
        auth_method=current_user.auth_method or "email",
        github_username=current_user.github_username,
        github_avatar_url=current_user.github_avatar_url
    )


@router.get(
    "/me/credits",
    response_model=CreditHistoryResponse,
    summary="Get credit history",
    description="Get current user's credit balance and transaction history"
)
async def get_credit_history(current_user: AuthenticatedUser):
    """
    Get the current user's credit balance and transaction history.
    """
    transactions = await CreditService.get_credit_transactions(current_user.id)
    
    return CreditHistoryResponse(
        transactions=[
            CreditTransactionResponse(
                id=str(t["id"]),
                amount=t["amount"],
                balance_after=t["balance_after"],
                transaction_type=t["transaction_type"],
                reason=t.get("reason"),
                document_name=t.get("document_name"),
                granted_by_email=t.get("granted_by_email"),
                created_at=t["created_at"].isoformat()
            )
            for t in transactions
        ],
        current_balance=current_user.credits
    )


# =============================================================================
# Credit Request Endpoints (User)
# =============================================================================

class CreateCreditRequestRequest(BaseModel):
    """Request to create a credit request."""
    amount: int = Field(default=10, gt=0, le=100, description="Amount of credits to request")
    reason: Optional[str] = Field(None, max_length=500, description="Reason for requesting credits")


class CreditRequestResponse(BaseModel):
    """Credit request response."""
    id: str
    amount_requested: int
    reason: Optional[str]
    status: str
    created_at: str


class UserCreditRequestsResponse(BaseModel):
    """User's credit requests response."""
    requests: list[CreditRequestResponse]
    has_pending: bool


@router.post(
    "/credits/request",
    response_model=CreditRequestResponse,
    summary="Request credits",
    description="Submit a request for additional credits"
)
async def request_credits(
    request: CreateCreditRequestRequest,
    current_user: AuthenticatedUser
):
    """
    Submit a credit request to administrators.
    
    Users can request credits when they run out. Admins will review and approve/reject.
    """
    from app.db.connection import db
    
    # Check if user already has a pending request
    check_query = """
    SELECT COUNT(*) as pending_count 
    FROM credit_requests 
    WHERE user_id = $1 AND status = 'pending'
    """
    result = await db.execute_one(check_query, current_user.id)
    
    if result and result["pending_count"] > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "PENDING_REQUEST_EXISTS",
                "message": "You already have a pending credit request. Please wait for admin review."
            }
        )
    
    # Create the credit request
    insert_query = """
    INSERT INTO credit_requests (user_id, amount_requested, reason)
    VALUES ($1, $2, $3)
    RETURNING id, amount_requested, reason, status, created_at
    """
    new_request = await db.execute_one(
        insert_query,
        current_user.id,
        request.amount,
        request.reason
    )
    
    logger.info(f"User {current_user.email} requested {request.amount} credits")
    
    return CreditRequestResponse(
        id=str(new_request["id"]),
        amount_requested=new_request["amount_requested"],
        reason=new_request.get("reason"),
        status=new_request["status"],
        created_at=new_request["created_at"].isoformat()
    )


@router.get(
    "/credits/requests",
    response_model=UserCreditRequestsResponse,
    summary="Get my credit requests",
    description="Get the current user's credit request history"
)
async def get_my_credit_requests(current_user: AuthenticatedUser):
    """
    Get the current user's credit requests.
    """
    from app.db.connection import db
    
    query = """
    SELECT id, amount_requested, reason, status, admin_response, 
           amount_granted, created_at, reviewed_at
    FROM credit_requests
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT 10
    """
    results = await db.execute_query(query, current_user.id)
    
    requests = [
        CreditRequestResponse(
            id=str(row["id"]),
            amount_requested=row["amount_requested"],
            reason=row.get("reason"),
            status=row["status"],
            created_at=row["created_at"].isoformat()
        )
        for row in results
    ]
    
    has_pending = any(r.status == "pending" for r in requests)
    
    return UserCreditRequestsResponse(
        requests=requests,
        has_pending=has_pending
    )


# =============================================================================
# OAuth Status Endpoint
# =============================================================================

@router.get(
    "/providers",
    summary="Get available auth providers",
    description="Check which authentication providers are available"
)
async def get_auth_providers():
    """
    Get available authentication providers.
    """
    return {
        "email": True,  # Always available
        "github": settings.is_github_oauth_available
    }
