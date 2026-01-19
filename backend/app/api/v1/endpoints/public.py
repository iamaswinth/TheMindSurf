"""
Public endpoints - no authentication required
"""

from fastapi import APIRouter
from pydantic import BaseModel
from app.db.connection import db

router = APIRouter(prefix="/public")


class PublicStats(BaseModel):
    """Public platform statistics."""
    total_documents: int
    total_users: int
    total_questions: int


@router.get(
    "/stats",
    response_model=PublicStats,
    summary="Get public platform statistics",
    description="Get public platform statistics - no authentication required"
)
async def get_public_stats():
    """
    Get public platform statistics for display on landing page.
    No authentication required.
    """
    query = """
    SELECT 
        (SELECT COUNT(*) FROM documents WHERE deleted_at IS NULL) as total_documents,
        (SELECT COUNT(*) FROM users WHERE is_active = TRUE) as total_users,
        (SELECT COALESCE(COUNT(*), 0) FROM chunks) as total_questions
    """
    
    result = await db.execute_one(query)
    
    # Use chunk count as a proxy for questions since each chunk represents processed content
    # that can be queried. In future, create a proper chat_sessions table for accurate tracking
    return PublicStats(
        total_documents=result["total_documents"],
        total_users=result["total_users"],
        total_questions=result["total_questions"]
    )
