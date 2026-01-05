"""
Database Connection Management

Provides async connection pooling for NeonDB using asyncpg.
"""

import logging
from typing import Optional
import asyncpg

from app.core.config import settings

logger = logging.getLogger(__name__)


class DatabaseConnection:
    """Manages PostgreSQL connection pool."""
    
    _pool: Optional[asyncpg.Pool] = None
    
    @classmethod
    async def connect(cls) -> None:
        """Initialize database connection pool."""
        if not settings.is_database_available:
            logger.warning("DATABASE_URL not configured. Database features disabled.")
            return
        
        try:
            logger.info("Connecting to NeonDB...")
            cls._pool = await asyncpg.create_pool(
                settings.DATABASE_URL,
                min_size=5,
                max_size=settings.DATABASE_POOL_SIZE,
                command_timeout=60,
            )
            logger.info("Database connection pool created successfully")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}", exc_info=True)
            raise
    
    @classmethod
    async def disconnect(cls) -> None:
        """Close database connection pool."""
        if cls._pool:
            logger.info("Closing database connection pool...")
            await cls._pool.close()
            cls._pool = None
            logger.info("Database connection pool closed")
    
    @classmethod
    def get_pool(cls) -> asyncpg.Pool:
        """Get the connection pool instance."""
        if not cls._pool:
            raise RuntimeError("Database pool not initialized. Call connect() first.")
        return cls._pool
    
    @classmethod
    async def execute_query(cls, query: str, *args):
        """Execute a query and return results."""
        pool = cls.get_pool()
        async with pool.acquire() as connection:
            return await connection.fetch(query, *args)
    
    @classmethod
    async def execute_one(cls, query: str, *args):
        """Execute a query and return a single result."""
        pool = cls.get_pool()
        async with pool.acquire() as connection:
            return await connection.fetchrow(query, *args)
    
    @classmethod
    async def execute(cls, query: str, *args):
        """Execute a query without returning results."""
        pool = cls.get_pool()
        async with pool.acquire() as connection:
            return await connection.execute(query, *args)


# Convenience instance
db = DatabaseConnection
