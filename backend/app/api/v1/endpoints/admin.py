"""
Admin API Endpoints

Admin-only endpoints for user management and credit granting.
"""

import logging
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel, Field

from app.services.credit_service import CreditService
from app.core.dependencies import AdminUser
from app.db.connection import db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


# =============================================================================
# Request/Response Models
# =============================================================================

class UserListItem(BaseModel):
    """User item in admin list."""
    id: str
    email: str
    display_name: Optional[str]
    role: str
    credits: int
    auth_method: str
    github_username: Optional[str]
    is_active: bool
    created_at: str
    last_login_at: Optional[str]


class UserListResponse(BaseModel):
    """Response for user list."""
    users: List[UserListItem]
    total: int
    page: int
    limit: int


class GrantCreditsRequest(BaseModel):
    """Request to grant credits to a user."""
    user_id: str
    amount: int = Field(..., gt=0, description="Number of credits to grant")
    reason: str = Field(..., min_length=3, max_length=500, description="Reason for granting credits")


class GrantCreditsResponse(BaseModel):
    """Response after granting credits."""
    user_id: str
    email: str
    credits_granted: int
    new_balance: int
    reason: str


class UserDetailResponse(BaseModel):
    """Detailed user response for admin."""
    id: str
    email: str
    display_name: Optional[str]
    role: str
    credits: int
    auth_method: str
    github_id: Optional[str]
    github_username: Optional[str]
    github_avatar_url: Optional[str]
    is_active: bool
    email_verified: bool
    created_at: str
    last_login_at: Optional[str]
    namespace_count: int
    document_count: int


class UpdateUserRoleRequest(BaseModel):
    """Request to update user role."""
    role: str = Field(..., pattern="^(user|admin)$", description="New role (user or admin)")


class MessageResponse(BaseModel):
    """Simple message response."""
    message: str


# =============================================================================
# List Users Endpoint
# =============================================================================

@router.get(
    "/users",
    response_model=UserListResponse,
    summary="List all users",
    description="Get a paginated list of all users (admin only)"
)
async def list_users(
    admin: AdminUser,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = Query(default=None, description="Search by email or display name"),
    role: Optional[str] = Query(default=None, description="Filter by role")
):
    """
    List all users with pagination.
    
    Admin only endpoint.
    """
    offset = (page - 1) * limit
    
    # Build query with optional filters
    where_clauses = []
    params = []
    param_index = 1
    
    if search:
        where_clauses.append(f"(email ILIKE ${param_index} OR display_name ILIKE ${param_index})")
        params.append(f"%{search}%")
        param_index += 1
    
    if role:
        where_clauses.append(f"role = ${param_index}")
        params.append(role)
        param_index += 1
    
    where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
    
    # Count total
    count_query = f"SELECT COUNT(*) as total FROM users {where_sql}"
    count_result = await db.execute_one(count_query, *params)
    total = count_result["total"] if count_result else 0
    
    # Get users
    query = f"""
    SELECT id, email, display_name, role, credits, auth_method,
           github_username, is_active, created_at, last_login_at
    FROM users
    {where_sql}
    ORDER BY created_at DESC
    LIMIT ${param_index} OFFSET ${param_index + 1}
    """
    params.extend([limit, offset])
    
    results = await db.execute_query(query, *params)
    
    users = [
        UserListItem(
            id=str(row["id"]),
            email=row["email"],
            display_name=row.get("display_name"),
            role=row["role"],
            credits=row["credits"],
            auth_method=row["auth_method"],
            github_username=row.get("github_username"),
            is_active=row["is_active"],
            created_at=row["created_at"].isoformat(),
            last_login_at=row["last_login_at"].isoformat() if row.get("last_login_at") else None
        )
        for row in results
    ]
    
    return UserListResponse(
        users=users,
        total=total,
        page=page,
        limit=limit
    )


# =============================================================================
# Get User Details Endpoint
# =============================================================================

@router.get(
    "/users/{user_id}",
    response_model=UserDetailResponse,
    summary="Get user details",
    description="Get detailed information about a specific user (admin only)"
)
async def get_user_details(user_id: str, admin: AdminUser):
    """
    Get detailed user information including namespace and document counts.
    """
    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_USER_ID", "message": "Invalid user ID format"}
        )
    
    query = """
    SELECT 
        u.id, u.email, u.display_name, u.role, u.credits, u.auth_method,
        u.github_id, u.github_username, u.github_avatar_url,
        u.is_active, u.email_verified, u.created_at, u.last_login_at,
        (SELECT COUNT(*) FROM namespaces WHERE user_id = u.id) as namespace_count,
        (SELECT COUNT(*) FROM documents WHERE user_id = u.id AND deleted_at IS NULL) as document_count
    FROM users u
    WHERE u.id = $1
    """
    
    result = await db.execute_one(query, user_uuid)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "USER_NOT_FOUND", "message": "User not found"}
        )
    
    return UserDetailResponse(
        id=str(result["id"]),
        email=result["email"],
        display_name=result.get("display_name"),
        role=result["role"],
        credits=result["credits"],
        auth_method=result["auth_method"],
        github_id=result.get("github_id"),
        github_username=result.get("github_username"),
        github_avatar_url=result.get("github_avatar_url"),
        is_active=result["is_active"],
        email_verified=result.get("email_verified", False),
        created_at=result["created_at"].isoformat(),
        last_login_at=result["last_login_at"].isoformat() if result.get("last_login_at") else None,
        namespace_count=result["namespace_count"],
        document_count=result["document_count"]
    )


# =============================================================================
# Grant Credits Endpoint
# =============================================================================

@router.post(
    "/users/credits",
    response_model=GrantCreditsResponse,
    summary="Grant credits to user",
    description="Grant credits to a specific user (admin only)"
)
async def grant_credits(request: GrantCreditsRequest, admin: AdminUser):
    """
    Grant credits to a user.
    
    Records the transaction with admin info for audit trail.
    """
    try:
        user_uuid = UUID(request.user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_USER_ID", "message": "Invalid user ID format"}
        )
    
    # Get user info
    query = "SELECT id, email FROM users WHERE id = $1"
    user = await db.execute_one(query, user_uuid)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "USER_NOT_FOUND", "message": "User not found"}
        )
    
    # Grant credits
    new_balance = await CreditService.grant_credits(
        user_id=user_uuid,
        amount=request.amount,
        granted_by=admin.id,
        reason=request.reason
    )
    
    logger.info(f"Admin {admin.email} granted {request.amount} credits to user {user['email']}")
    
    return GrantCreditsResponse(
        user_id=str(user["id"]),
        email=user["email"],
        credits_granted=request.amount,
        new_balance=new_balance,
        reason=request.reason
    )


# =============================================================================
# Update User Role Endpoint
# =============================================================================

@router.patch(
    "/users/{user_id}/role",
    response_model=MessageResponse,
    summary="Update user role",
    description="Change a user's role (admin only)"
)
async def update_user_role(user_id: str, request: UpdateUserRoleRequest, admin: AdminUser):
    """
    Update a user's role.
    
    Can promote user to admin or demote admin to user.
    """
    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_USER_ID", "message": "Invalid user ID format"}
        )
    
    # Prevent self-demotion
    if user_uuid == admin.id and request.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "CANNOT_DEMOTE_SELF", "message": "Cannot demote yourself"}
        )
    
    # Update role
    query = "UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING email"
    result = await db.execute_one(query, request.role, user_uuid)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "USER_NOT_FOUND", "message": "User not found"}
        )
    
    logger.info(f"Admin {admin.email} updated user {result['email']} role to {request.role}")
    
    return MessageResponse(message=f"User role updated to {request.role}")


# =============================================================================
# Toggle User Active Status
# =============================================================================

@router.patch(
    "/users/{user_id}/status",
    response_model=MessageResponse,
    summary="Toggle user active status",
    description="Enable or disable a user account (admin only)"
)
async def toggle_user_status(user_id: str, admin: AdminUser):
    """
    Toggle a user's active status.
    
    Disabled users cannot log in.
    """
    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_USER_ID", "message": "Invalid user ID format"}
        )
    
    # Prevent self-disable
    if user_uuid == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "CANNOT_DISABLE_SELF", "message": "Cannot disable your own account"}
        )
    
    # Toggle status
    query = """
    UPDATE users 
    SET is_active = NOT is_active, updated_at = NOW() 
    WHERE id = $1 
    RETURNING email, is_active
    """
    result = await db.execute_one(query, user_uuid)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "USER_NOT_FOUND", "message": "User not found"}
        )
    
    status_text = "enabled" if result["is_active"] else "disabled"
    logger.info(f"Admin {admin.email} {status_text} user {result['email']}")
    
    return MessageResponse(message=f"User account {status_text}")


# =============================================================================
# Admin Stats Endpoint
# =============================================================================

@router.get(
    "/stats",
    summary="Get admin statistics",
    description="Get overall system statistics (admin only)"
)
async def get_admin_stats(admin: AdminUser):
    """
    Get system-wide statistics.
    """
    query = """
    SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'admin') as admin_count,
        (SELECT COUNT(*) FROM users WHERE is_active = TRUE) as active_users,
        (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days') as new_users_week,
        (SELECT COUNT(*) FROM namespaces) as total_namespaces,
        (SELECT COUNT(*) FROM documents WHERE deleted_at IS NULL) as total_documents,
        (SELECT SUM(credits) FROM users) as total_credits_in_system,
        (SELECT COUNT(*) FROM credit_transactions WHERE transaction_type = 'grant') as total_credit_grants
    """
    
    result = await db.execute_one(query)
    
    return {
        "users": {
            "total": result["total_users"],
            "admins": result["admin_count"],
            "active": result["active_users"],
            "new_this_week": result["new_users_week"]
        },
        "content": {
            "namespaces": result["total_namespaces"],
            "documents": result["total_documents"]
        },
        "credits": {
            "total_in_system": result["total_credits_in_system"] or 0,
            "total_grants": result["total_credit_grants"]
        }
    }


# =============================================================================
# Credit Request Models
# =============================================================================

class CreditRequestItem(BaseModel):
    """Credit request item."""
    id: str
    user_id: str
    user_email: str
    user_display_name: Optional[str]
    amount_requested: int
    reason: Optional[str]
    status: str
    admin_response: Optional[str]
    amount_granted: Optional[int]
    created_at: str
    reviewed_at: Optional[str]


class CreditRequestListResponse(BaseModel):
    """Response for credit request list."""
    requests: List[CreditRequestItem]
    total: int
    page: int
    limit: int


class ReviewCreditRequestRequest(BaseModel):
    """Request to review a credit request."""
    action: str = Field(..., pattern="^(approve|reject)$", description="Action to take (approve or reject)")
    amount: Optional[int] = Field(None, gt=0, description="Amount to grant (for approval)")
    response: Optional[str] = Field(None, max_length=500, description="Admin response message")


# =============================================================================
# Credit Request Endpoints (Admin)
# =============================================================================

@router.get(
    "/credit-requests",
    response_model=CreditRequestListResponse,
    summary="List credit requests",
    description="Get a paginated list of credit requests (admin only)"
)
async def list_credit_requests(
    admin: AdminUser,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    status_filter: Optional[str] = Query(default=None, description="Filter by status (pending, approved, rejected)")
):
    """
    List all credit requests with pagination.
    """
    offset = (page - 1) * limit
    
    # Build query with optional filters
    where_clauses = ["1=1"]
    params = []
    param_index = 1
    
    if status_filter:
        where_clauses.append(f"cr.status = ${param_index}")
        params.append(status_filter)
        param_index += 1
    
    where_sql = " AND ".join(where_clauses)
    
    # Count total
    count_query = f"""
    SELECT COUNT(*) as total 
    FROM credit_requests cr 
    WHERE {where_sql}
    """
    count_result = await db.execute_one(count_query, *params)
    total = count_result["total"] if count_result else 0
    
    # Get requests with user info
    query = f"""
    SELECT 
        cr.id, cr.user_id, cr.amount_requested, cr.reason, cr.status,
        cr.admin_response, cr.amount_granted, cr.created_at, cr.reviewed_at,
        u.email as user_email, u.display_name as user_display_name
    FROM credit_requests cr
    JOIN users u ON cr.user_id = u.id
    WHERE {where_sql}
    ORDER BY 
        CASE WHEN cr.status = 'pending' THEN 0 ELSE 1 END,
        cr.created_at DESC
    LIMIT ${param_index} OFFSET ${param_index + 1}
    """
    params.extend([limit, offset])
    
    results = await db.execute_query(query, *params)
    
    requests = [
        CreditRequestItem(
            id=str(row["id"]),
            user_id=str(row["user_id"]),
            user_email=row["user_email"],
            user_display_name=row.get("user_display_name"),
            amount_requested=row["amount_requested"],
            reason=row.get("reason"),
            status=row["status"],
            admin_response=row.get("admin_response"),
            amount_granted=row.get("amount_granted"),
            created_at=row["created_at"].isoformat(),
            reviewed_at=row["reviewed_at"].isoformat() if row.get("reviewed_at") else None
        )
        for row in results
    ]
    
    return CreditRequestListResponse(
        requests=requests,
        total=total,
        page=page,
        limit=limit
    )


@router.patch(
    "/credit-requests/{request_id}",
    response_model=MessageResponse,
    summary="Review credit request",
    description="Approve or reject a credit request (admin only)"
)
async def review_credit_request(
    request_id: str,
    request: ReviewCreditRequestRequest,
    admin: AdminUser
):
    """
    Review a credit request (approve or reject).
    """
    try:
        request_uuid = UUID(request_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_REQUEST_ID", "message": "Invalid request ID format"}
        )
    
    # Get the credit request
    query = """
    SELECT cr.*, u.email as user_email
    FROM credit_requests cr
    JOIN users u ON cr.user_id = u.id
    WHERE cr.id = $1
    """
    credit_request = await db.execute_one(query, request_uuid)
    
    if not credit_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "REQUEST_NOT_FOUND", "message": "Credit request not found"}
        )
    
    if credit_request["status"] != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "ALREADY_REVIEWED", "message": "This request has already been reviewed"}
        )
    
    if request.action == "approve":
        # Determine amount to grant
        amount_to_grant = request.amount or credit_request["amount_requested"]
        
        # Grant credits
        await CreditService.grant_credits(
            user_id=credit_request["user_id"],
            amount=amount_to_grant,
            granted_by=admin.id,
            reason=f"Credit request approved: {request.response or 'No message'}"
        )
        
        # Update request status
        update_query = """
        UPDATE credit_requests 
        SET status = 'approved', admin_id = $1, admin_response = $2, 
            amount_granted = $3, reviewed_at = NOW()
        WHERE id = $4
        """
        await db.execute_one(update_query, admin.id, request.response, amount_to_grant, request_uuid)
        
        logger.info(f"Admin {admin.email} approved credit request from {credit_request['user_email']} for {amount_to_grant} credits")
        
        return MessageResponse(message=f"Approved and granted {amount_to_grant} credits")
    
    else:  # reject
        update_query = """
        UPDATE credit_requests 
        SET status = 'rejected', admin_id = $1, admin_response = $2, reviewed_at = NOW()
        WHERE id = $3
        """
        await db.execute_one(update_query, admin.id, request.response, request_uuid)
        
        logger.info(f"Admin {admin.email} rejected credit request from {credit_request['user_email']}")
        
        return MessageResponse(message="Credit request rejected")
