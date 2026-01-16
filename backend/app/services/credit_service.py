"""
Credit Service

Handles credit management for users - checking, deducting, and granting credits.
"""

import logging
from typing import Optional, Dict, Any, List
from uuid import UUID

from app.db.connection import db
from app.core.config import settings

logger = logging.getLogger(__name__)


class InsufficientCreditsError(Exception):
    """Raised when user doesn't have enough credits."""
    def __init__(self, required: int, available: int):
        self.required = required
        self.available = available
        self.message = f"Insufficient credits. Required: {required}, Available: {available}"
        super().__init__(self.message)


class CreditService:
    """Service for managing user credits."""
    
    @staticmethod
    async def get_user_credits(user_id: UUID) -> int:
        """Get current credit balance for a user."""
        query = "SELECT credits FROM users WHERE id = $1"
        result = await db.execute_one(query, user_id)
        return result["credits"] if result else 0
    
    @staticmethod
    async def check_credits(user_id: UUID, required: int) -> bool:
        """Check if user has enough credits."""
        current_credits = await CreditService.get_user_credits(user_id)
        return current_credits >= required
    
    @staticmethod
    async def deduct_credits(
        user_id: UUID,
        amount: int,
        document_id: Optional[UUID] = None,
        reason: Optional[str] = None
    ) -> int:
        """
        Deduct credits from a user's balance.
        
        Returns the new balance.
        Raises InsufficientCreditsError if not enough credits.
        """
        # Get current balance
        current_credits = await CreditService.get_user_credits(user_id)
        
        if current_credits < amount:
            raise InsufficientCreditsError(amount, current_credits)
        
        new_balance = current_credits - amount
        
        # Update user credits
        update_query = "UPDATE users SET credits = $1, updated_at = NOW() WHERE id = $2"
        await db.execute(update_query, new_balance, user_id)
        
        # Record transaction
        await CreditService._record_transaction(
            user_id=user_id,
            amount=-amount,  # Negative for deduction
            balance_after=new_balance,
            transaction_type="usage",
            reason=reason or "AI-enhanced document upload",
            document_id=document_id
        )
        
        logger.info(f"Deducted {amount} credits from user {user_id}. New balance: {new_balance}")
        return new_balance
    
    @staticmethod
    async def grant_credits(
        user_id: UUID,
        amount: int,
        granted_by: UUID,
        reason: str
    ) -> int:
        """
        Grant credits to a user (admin function).
        
        Returns the new balance.
        """
        # Get current balance
        current_credits = await CreditService.get_user_credits(user_id)
        new_balance = current_credits + amount
        
        # Update user credits
        update_query = "UPDATE users SET credits = $1, updated_at = NOW() WHERE id = $2"
        await db.execute(update_query, new_balance, user_id)
        
        # Record transaction
        await CreditService._record_transaction(
            user_id=user_id,
            amount=amount,
            balance_after=new_balance,
            transaction_type="grant",
            reason=reason,
            granted_by=granted_by
        )
        
        logger.info(f"Granted {amount} credits to user {user_id} by admin {granted_by}. New balance: {new_balance}")
        return new_balance
    
    @staticmethod
    async def get_credit_transactions(
        user_id: UUID,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get credit transaction history for a user."""
        query = """
        SELECT 
            ct.id,
            ct.amount,
            ct.balance_after,
            ct.transaction_type,
            ct.reason,
            ct.document_id,
            ct.created_at,
            d.original_filename as document_name,
            admin.email as granted_by_email
        FROM credit_transactions ct
        LEFT JOIN documents d ON ct.document_id = d.id
        LEFT JOIN users admin ON ct.granted_by = admin.id
        WHERE ct.user_id = $1
        ORDER BY ct.created_at DESC
        LIMIT $2
        """
        results = await db.execute_query(query, user_id, limit)
        return [dict(row) for row in results]
    
    @staticmethod
    async def get_credit_cost_for_upload(ai_enhancement_enabled: bool) -> int:
        """Get the credit cost for a document upload."""
        if ai_enhancement_enabled:
            return settings.AI_UPLOAD_CREDIT_COST
        return 0  # Regular uploads are free
    
    @staticmethod
    async def _record_transaction(
        user_id: UUID,
        amount: int,
        balance_after: int,
        transaction_type: str,
        reason: Optional[str] = None,
        document_id: Optional[UUID] = None,
        granted_by: Optional[UUID] = None
    ) -> None:
        """Record a credit transaction in the database."""
        query = """
        INSERT INTO credit_transactions 
            (user_id, amount, balance_after, transaction_type, reason, document_id, granted_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        """
        await db.execute(
            query,
            user_id,
            amount,
            balance_after,
            transaction_type,
            reason,
            document_id,
            granted_by
        )
