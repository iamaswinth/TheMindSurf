"""
Application Configuration Module

This module provides centralized configuration management for the RAG Comparator
backend using Pydantic Settings. All environment variables and application
settings are defined and validated here.

Configuration Categories:
- Application: Basic app settings (name, version, debug mode)
- Authentication: JWT secrets, OAuth settings, token expiry
- OpenAI: API key, model settings for vision and text processing
- Multimodal Processing: Chunking parameters, processing strategies
- File Handling: Upload limits, supported formats

Environment Variables:
- OPENAI_API_KEY: Required for AI enhancement features
- OPENAI_VISION_MODEL: Model for vision processing (default: gpt-4o)
- MAX_FILE_SIZE_MB: Maximum file upload size (default: 50MB)
- JWT_SECRET_KEY: Required for authentication
- GITHUB_CLIENT_ID: Required for GitHub OAuth
- GITHUB_CLIENT_SECRET: Required for GitHub OAuth
"""

from typing import Optional
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    
    Uses .env file for local development and environment variables
    for production deployment.
    """
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    # ==========================================================================
    # Application Settings
    # ==========================================================================
    APP_NAME: str = Field(
        default="RAG Comparator Backend",
        description="Application name for logging and identification"
    )
    APP_VERSION: str = Field(
        default="1.0.0",
        description="Application version"
    )
    DEBUG: bool = Field(
        default=False,
        description="Enable debug mode with verbose logging"
    )
    FRONTEND_URL: str = Field(
        default="http://localhost:3000",
        description="Frontend URL for OAuth redirects and CORS"
    )
    
    # ==========================================================================
    # Authentication Settings
    # ==========================================================================
    JWT_SECRET_KEY: str = Field(
        default="your-secret-key-change-in-production",
        description="Secret key for JWT token signing"
    )
    JWT_ALGORITHM: str = Field(
        default="HS256",
        description="Algorithm for JWT token signing"
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=30,
        description="Access token expiry time in minutes"
    )
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(
        default=7,
        description="Refresh token expiry time in days"
    )
    
    # GitHub OAuth Settings
    GITHUB_CLIENT_ID: Optional[str] = Field(
        default=None,
        description="GitHub OAuth App Client ID"
    )
    GITHUB_CLIENT_SECRET: Optional[str] = Field(
        default=None,
        description="GitHub OAuth App Client Secret"
    )
    GITHUB_REDIRECT_URI: str = Field(
        default="http://localhost:8000/api/v1/auth/github/callback",
        description="GitHub OAuth callback URL"
    )
    
    # Credits System
    INITIAL_USER_CREDITS: int = Field(
        default=3,
        description="Number of credits given to new users"
    )
    AI_UPLOAD_CREDIT_COST: int = Field(
        default=1,
        description="Credits required for AI-enhanced upload"
    )
    
    # ==========================================================================
    # OpenAI Configuration
    # ==========================================================================
    OPENAI_API_KEY: Optional[str] = Field(
        default=None,
        description="OpenAI API key for GPT-4o vision and text processing"
    )
    OPENAI_VISION_MODEL: str = Field(
        default="gpt-4o",
        description="OpenAI model to use for vision processing (must support images)"
    )
    OPENAI_MAX_TOKENS: int = Field(
        default=2000,
        description="Maximum tokens for AI response generation"
    )
    OPENAI_TEMPERATURE: float = Field(
        default=0.3,
        description="Temperature for AI responses (lower = more deterministic)"
    )
    
    # ==========================================================================
    # Multimodal Processing Configuration
    # ==========================================================================
    ENABLE_MULTIMODAL_PROCESSING: bool = Field(
        default=True,
        description="Enable advanced multimodal document processing"
    )
    DEFAULT_PROCESSING_STRATEGY: str = Field(
        default="hi_res",
        description="Default PDF processing strategy: 'hi_res' (accurate) or 'fast'"
    )
    
    # Chunking Parameters
    MAX_CHUNK_CHARACTERS: int = Field(
        default=3000,
        description="Hard maximum characters per chunk"
    )
    NEW_CHUNK_AFTER_N_CHARS: int = Field(
        default=2400,
        description="Preferred soft limit - start new chunk after this many chars"
    )
    MIN_CHUNK_CHARACTERS: int = Field(
        default=500,
        description="Minimum characters to keep a chunk separate (merge if smaller)"
    )
    
    # AI Enhancement Settings
    ENABLE_AI_ENHANCEMENT: bool = Field(
        default=True,
        description="Enable AI-powered chunk enhancement for tables/images"
    )
    AI_ENHANCEMENT_TIMEOUT: int = Field(
        default=60,
        description="Timeout in seconds for AI enhancement API calls"
    )
    
    # ==========================================================================
    # File Handling Configuration
    # ==========================================================================
    MAX_FILE_SIZE_MB: int = Field(
        default=50,
        description="Maximum file upload size in megabytes"
    )
    SUPPORTED_FILE_TYPES: list[str] = Field(
        default=["application/pdf"],
        description="List of supported MIME types for document upload"
    )
    
    # ==========================================================================
    # Pinecone Configuration
    # ==========================================================================
    PINECONE_API_KEY: Optional[str] = Field(
        default=None,
        description="Pinecone API key for vector database operations"
    )
    PINECONE_DENSE_INDEX_NAME: str = Field(
        default="rag-comparator-dense",
        description="Name of the Pinecone dense index for semantic search"
    )
    PINECONE_SPARSE_INDEX_NAME: str = Field(
        default="rag-comparator-sparse",
        description="Name of the Pinecone sparse index for lexical search"
    )
    PINECONE_CLOUD: str = Field(
        default="aws",
        description="Cloud provider for Pinecone index"
    )
    PINECONE_REGION: str = Field(
        default="us-east-1",
        description="Region for Pinecone index"
    )
    PINECONE_NAMESPACE: str = Field(
        default="documents",
        description="Default namespace for document vectors"
    )
    PINECONE_DENSE_MODEL: str = Field(
        default="llama-text-embed-v2",
        description="Dense embedding model for semantic search"
    )
    PINECONE_SPARSE_MODEL: str = Field(
        default="pinecone-sparse-english-v0",
        description="Sparse embedding model for lexical search"
    )
    PINECONE_RERANK_MODEL: str = Field(
        default="bge-reranker-v2-m3",
        description="Reranking model for hybrid search"
    )
    PINECONE_TOP_K: int = Field(
        default=5,
        description="Number of results to retrieve from each index"
    )
    PINECONE_RERANK_TOP_N: int = Field(
        default=5,
        description="Number of results to return after reranking"
    )
    PINECONE_UPSERT_BATCH_SIZE: int = Field(
        default=40,
        description="Batch size for upserting records to Pinecone"
    )
    
    # ==========================================================================
    # Logging Configuration
    # ==========================================================================
    LOG_LEVEL: str = Field(
        default="INFO",
        description="Logging level: DEBUG, INFO, WARNING, ERROR, CRITICAL"
    )
    LOG_AI_USAGE: bool = Field(
        default=True,
        description="Log when AI enhancement is used (for cost tracking)"
    )
    
    # ==========================================================================
    # NeonDB / PostgreSQL Configuration
    # ==========================================================================
    DATABASE_URL: Optional[str] = Field(
        default=None,
        description="PostgreSQL connection string (NeonDB). Format: postgresql://user:pass@host/db"
    )
    DATABASE_POOL_SIZE: int = Field(
        default=10,
        description="Database connection pool size"
    )
    DATABASE_MAX_OVERFLOW: int = Field(
        default=20,
        description="Maximum overflow connections in pool"
    )
    
    # ==========================================================================
    # Computed Properties
    # ==========================================================================
    @property
    def max_file_size_bytes(self) -> int:
        """Get maximum file size in bytes."""
        return self.MAX_FILE_SIZE_MB * 1024 * 1024
    
    @property
    def is_ai_available(self) -> bool:
        """Check if AI features can be used."""
        return bool(self.OPENAI_API_KEY) and self.ENABLE_AI_ENHANCEMENT
    
    @property
    def is_pinecone_available(self) -> bool:
        """Check if Pinecone features can be used."""
        return bool(self.PINECONE_API_KEY)
    
    @property
    def is_database_available(self) -> bool:
        """Check if NeonDB database is configured."""
        return bool(self.DATABASE_URL)
    
    @property
    def is_github_oauth_available(self) -> bool:
        """Check if GitHub OAuth is configured."""
        return bool(self.GITHUB_CLIENT_ID and self.GITHUB_CLIENT_SECRET)
    
    def validate_ai_config(self) -> tuple[bool, str]:
        """
        Validate AI configuration is complete.
        
        Returns:
            Tuple of (is_valid, message)
        """
        if not self.OPENAI_API_KEY:
            return False, "OPENAI_API_KEY not configured. AI enhancement disabled."
        if not self.ENABLE_AI_ENHANCEMENT:
            return False, "AI enhancement is disabled in configuration."
        return True, "AI configuration valid."


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.
    
    Uses lru_cache to ensure settings are only loaded once from
    environment variables, improving performance.
    
    Returns:
        Settings: Application settings instance
    """
    return Settings()


# Export settings instance for convenience
settings = get_settings()
