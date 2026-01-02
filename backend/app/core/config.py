"""
Application Configuration Module

This module provides centralized configuration management for the RAG Comparator
backend using Pydantic Settings. All environment variables and application
settings are defined and validated here.

Configuration Categories:
- Application: Basic app settings (name, version, debug mode)
- OpenAI: API key, model settings for vision and text processing
- Multimodal Processing: Chunking parameters, processing strategies
- File Handling: Upload limits, supported formats

Environment Variables:
- OPENAI_API_KEY: Required for AI enhancement features
- OPENAI_VISION_MODEL: Model for vision processing (default: gpt-4o)
- MAX_FILE_SIZE_MB: Maximum file upload size (default: 50MB)
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
