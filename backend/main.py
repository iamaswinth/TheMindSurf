"""
RAG Comparator Backend - Main Application

This is the entry point for the FastAPI application that provides
multimodal document processing capabilities for RAG pipelines.

Features:
- PDF document upload and processing
- Multimodal content extraction (text, tables, images)
- AI-enhanced chunk summaries using GPT-4o vision
- Semantic chunking for optimal retrieval

Run with:
    uvicorn main:app --reload --host 0.0.0.0 --port 8000

API Documentation:
    - Swagger UI: http://localhost:8000/docs
    - ReDoc: http://localhost:8000/redoc
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings

# =============================================================================
# Logging Configuration
# =============================================================================

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger(__name__)


# =============================================================================
# Application Lifespan
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    
    Handles startup and shutdown events:
    - Startup: Log configuration, validate settings
    - Shutdown: Cleanup resources
    """
    # Startup
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Debug mode: {settings.DEBUG}")
    logger.info(f"AI enhancement available: {settings.is_ai_available}")
    
    if not settings.is_ai_available:
        logger.warning(
            "AI enhancement is not available. "
            "Set OPENAI_API_KEY in .env to enable AI features."
        )
    
    yield
    
    # Shutdown
    logger.info("Shutting down application...")


# =============================================================================
# Application Factory
# =============================================================================

def create_application() -> FastAPI:
    """
    Create and configure the FastAPI application.
    
    Returns:
        Configured FastAPI application instance
    """
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="""
## RAG Comparator Backend API

A multimodal document processing pipeline for RAG (Retrieval-Augmented Generation) applications.

### Features

* **Multimodal Extraction**: Extract text, tables, and images from PDF documents
* **Intelligent Chunking**: Semantic chunking that preserves document structure
* **AI Enhancement**: GPT-4o powered summaries for visual content
* **RAG-Optimized Output**: Chunks ready for embedding and vector storage

### Processing Pipeline

1. **Upload** → PDF file received via API
2. **Partition** → Extract text, tables (HTML), images (base64)
3. **Chunk** → Create semantic chunks using title-based strategy
4. **Analyze** → Identify content types in each chunk
5. **Enhance** → AI summaries for multimodal chunks
6. **Return** → Structured output for embedding/storage

### Usage

Upload a PDF to `/api/v1/documents/process-multimodal` to receive processed chunks.
        """,
        debug=settings.DEBUG,
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )
    
    # =========================================================================
    # CORS Middleware
    # =========================================================================
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Configure appropriately for production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # =========================================================================
    # Include Routers
    # =========================================================================
    
    app.include_router(api_router, prefix="/api/v1")
    
    # =========================================================================
    # Root Endpoint
    # =========================================================================
    
    @app.get("/", tags=["root"])
    async def root():
        """Root endpoint with API information."""
        return {
            "name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "docs": "/docs",
            "health": "/api/v1/documents/health",
            "process": "/api/v1/documents/process-multimodal",
        }
    
    @app.get("/health", tags=["root"])
    async def root_health():
        """Root health check."""
        return {
            "status": "healthy",
            "version": settings.APP_VERSION,
            "ai_available": settings.is_ai_available,
        }
    
    return app


# =============================================================================
# Application Instance
# =============================================================================

app = create_application()


# =============================================================================
# Development Server
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
    )
 