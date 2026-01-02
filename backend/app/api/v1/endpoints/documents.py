"""
Document Processing API Endpoints

This module provides REST API endpoints for document upload and multimodal
processing. It integrates all services to create a complete document
processing pipeline.

Endpoints:
- POST /documents/process-multimodal: Full multimodal PDF processing
- GET /documents/health: Health check with AI status

The multimodal endpoint provides:
- PDF text extraction
- Table extraction with HTML structure
- Image extraction with base64 encoding
- AI-enhanced summaries for visual content
- Semantic chunking for RAG optimization
"""

import logging
import time
from typing import Optional

from fastapi import APIRouter, UploadFile, File, HTTPException, Query, status
from fastapi.responses import JSONResponse

from app.models.schemas import (
    MultimodalProcessResponse,
    MultimodalChunk,
    ProcessingStats,
    ProcessingStrategy,
    HealthCheckResponse,
    ErrorResponse,
    ErrorDetail,
    UpsertResponse,
)
from app.services.multimodal_processor import (
    MultimodalProcessor,
    PDFParsingError,
)
from app.services.chunking_service import (
    ChunkingService,
    ChunkingServiceError,
)
from app.core.config import settings

# Configure logging
logger = logging.getLogger(__name__)

# Create router with prefix and tags
router = APIRouter(
    prefix="/documents",
    tags=["documents"],
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        413: {"model": ErrorResponse, "description": "File too large"},
        500: {"model": ErrorResponse, "description": "Processing error"},
        503: {"model": ErrorResponse, "description": "Service unavailable"},
    }
)


# =============================================================================
# Health Check Endpoint
# =============================================================================

@router.get(
    "/health",
    response_model=HealthCheckResponse,
    summary="Check document processing service health",
    description="Returns service status and AI availability"
)
async def health_check() -> HealthCheckResponse:
    """
    Health check endpoint for monitoring.
    
    Returns:
        - Service status
        - Application version
        - AI enhancement availability
        - Current timestamp
    """
    return HealthCheckResponse(
        status="healthy",
        version=settings.APP_VERSION,
        ai_available=settings.is_ai_available,
    )


# =============================================================================
# Multimodal Processing Endpoint
# =============================================================================

@router.post(
    "/process-multimodal",
    response_model=MultimodalProcessResponse,
    summary="Process PDF with multimodal extraction and AI enhancement",
    description="""
    Processes a PDF document with full multimodal support:
    
    **Extraction:**
    - Text content (paragraphs, titles, lists)
    - Tables with HTML structure preservation
    - Images encoded as base64
    
    **Processing:**
    - Semantic chunking by document sections
    - AI-enhanced summaries for chunks with tables/images
    - Metadata extraction (page numbers, element types)
    
    **Output:**
    - Optimized chunks for RAG embedding
    - Original content preserved for reference
    - Detailed processing statistics
    
    **Performance Notes:**
    - 'hi_res' strategy is more accurate but slower
    - 'fast' strategy is quicker but may miss complex content
    - AI enhancement adds latency but improves searchability
    """,
    responses={
        200: {
            "description": "Successfully processed document",
            "model": MultimodalProcessResponse
        },
        400: {
            "description": "Invalid file format or parameters",
            "content": {
                "application/json": {
                    "example": {
                        "error": {
                            "code": "INVALID_FILE_TYPE",
                            "message": "Only PDF files are supported",
                            "details": {"received_type": "image/png"}
                        }
                    }
                }
            }
        }
    }
)
async def process_multimodal(
    file: UploadFile = File(
        ...,
        description="PDF file to process"
    ),
    strategy: ProcessingStrategy = Query(
        default=ProcessingStrategy.HI_RES,
        description="Processing strategy: 'hi_res' for accuracy, 'fast' for speed"
    ),
    max_chunk_size: int = Query(
        default=None,
        ge=500,
        le=10000,
        description="Maximum characters per chunk (default: 3000)"
    ),
    enable_ai_enhancement: bool = Query(
        default=True,
        description="Enable AI-powered summaries for multimodal content"
    ),
    upsert_to_pinecone: bool = Query(
        default=True,
        description="Automatically upsert chunks to Pinecone vector database"
    ),
    pinecone_namespace: Optional[str] = Query(
        default=None,
        description="Pinecone namespace for upserting (defaults to configured namespace)"
    ),
) -> MultimodalProcessResponse:
    """
    Process a PDF document with multimodal extraction and AI enhancement.
    
    This endpoint provides comprehensive document processing:
    
    1. **Validation**: Checks file type and size
    2. **Partitioning**: Extracts text, tables, and images using Unstructured
    3. **Chunking**: Creates semantic chunks preserving document structure
    4. **Analysis**: Identifies content types in each chunk
    5. **Enhancement**: Generates AI summaries for multimodal chunks
    6. **Response**: Returns structured data ready for embedding
    
    Args:
        file: PDF file to process (required)
        strategy: Processing strategy (hi_res or fast)
        max_chunk_size: Override default chunk size limit
        enable_ai_enhancement: Whether to use AI for multimodal content
    
    Returns:
        MultimodalProcessResponse with:
        - Processing statistics
        - All processed chunks with enhanced content
        - Original content preserved in metadata
    
    Raises:
        HTTPException 400: Invalid file type
        HTTPException 413: File too large
        HTTPException 500: Processing error
        HTTPException 503: AI service unavailable (if required)
    """
    start_time = time.time()
    warnings: list[str] = []
    
    logger.info(
        f"Processing request: file={file.filename}, "
        f"strategy={strategy.value}, "
        f"ai_enabled={enable_ai_enhancement}"
    )
    
    # =========================================================================
    # Step 1: Validate File
    # =========================================================================
    
    # Check file type
    if file.content_type not in settings.SUPPORTED_FILE_TYPES:
        logger.warning(f"Invalid file type: {file.content_type}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVALID_FILE_TYPE",
                "message": "Only PDF files are supported",
                "details": {
                    "received_type": file.content_type,
                    "supported_types": settings.SUPPORTED_FILE_TYPES
                }
            }
        )
    
    # Read file content
    try:
        file_content = await file.read()
    except Exception as e:
        logger.error(f"Failed to read file: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "FILE_READ_ERROR",
                "message": "Failed to read uploaded file",
                "details": {"error": str(e)}
            }
        )
    
    # Check file size
    file_size = len(file_content)
    if file_size > settings.max_file_size_bytes:
        logger.warning(f"File too large: {file_size} bytes")
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={
                "code": "FILE_TOO_LARGE",
                "message": f"File exceeds maximum size of {settings.MAX_FILE_SIZE_MB}MB",
                "details": {
                    "file_size_mb": round(file_size / (1024 * 1024), 2),
                    "max_size_mb": settings.MAX_FILE_SIZE_MB
                }
            }
        )
    
    logger.info(f"File validated: {file.filename} ({file_size} bytes)")
    
    # =========================================================================
    # Step 2: Check AI Availability
    # =========================================================================
    
    ai_actually_enabled = enable_ai_enhancement
    
    if enable_ai_enhancement and not settings.is_ai_available:
        ai_actually_enabled = False
        warning_msg = (
            "AI enhancement requested but unavailable. "
            "Check OPENAI_API_KEY configuration. Processing will continue without AI."
        )
        warnings.append(warning_msg)
        logger.warning(warning_msg)
    
    # =========================================================================
    # Step 3: Initialize Services
    # =========================================================================
    
    try:
        processor = MultimodalProcessor(default_strategy=strategy.value)
        chunker = ChunkingService(
            max_characters=max_chunk_size or settings.MAX_CHUNK_CHARACTERS
        )
    except Exception as e:
        logger.error(f"Failed to initialize services: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "SERVICE_INIT_ERROR",
                "message": "Failed to initialize processing services",
                "details": {"error": str(e)}
            }
        )
    
    # =========================================================================
    # Step 4: Partition PDF (Extract Multimodal Content)
    # =========================================================================
    
    logger.info("Step 4: Partitioning PDF with multimodal extraction...")
    
    try:
        elements = await processor.partition_pdf_multimodal(
            pdf_bytes=file_content,
            strategy=strategy.value,
        )
    except PDFParsingError as e:
        logger.error(f"PDF parsing failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "PDF_PARSING_ERROR",
                "message": "Failed to parse PDF document",
                "details": {
                    "error": str(e),
                    "suggestion": "Ensure the PDF is not corrupted or password-protected"
                }
            }
        )
    except Exception as e:
        logger.error(f"Unexpected partitioning error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "PARTITIONING_ERROR",
                "message": "Unexpected error during PDF partitioning",
                "details": {"error": str(e)}
            }
        )
    
    logger.info(f"Extracted {len(elements)} elements from PDF")
    
    # Get initial content stats
    content_summary = processor.extract_multimodal_content(elements)
    page_numbers = processor.get_page_numbers(elements)
    
    # =========================================================================
    # Step 5: Chunk Content by Title
    # =========================================================================
    
    logger.info("Step 5: Chunking content by title boundaries...")
    
    try:
        chunks = chunker.chunk_by_title(
            elements,
            max_characters=max_chunk_size,
        )
    except ChunkingServiceError as e:
        logger.error(f"Chunking failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "CHUNKING_ERROR",
                "message": "Failed to chunk document content",
                "details": {"error": str(e)}
            }
        )
    
    logger.info(f"Created {len(chunks)} semantic chunks")
    
    # =========================================================================
    # Step 6: Process Chunks with AI Enhancement
    # =========================================================================
    
    logger.info(
        f"Step 6: Processing chunks with AI enhancement "
        f"(enabled: {ai_actually_enabled})..."
    )
    
    try:
        documents, stats = await chunker.process_chunks_with_ai(
            chunks=chunks,
            processor=processor,
            enable_ai=ai_actually_enabled,
        )
    except Exception as e:
        logger.error(f"Chunk processing failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "PROCESSING_ERROR",
                "message": "Failed to process document chunks",
                "details": {"error": str(e)}
            }
        )
    
    # =========================================================================
    # Step 7: Build Response
    # =========================================================================
    
    logger.info("Step 7: Building response...")
    
    # Update stats with document-level info
    stats.total_pages = len(page_numbers) if page_numbers else 0
    stats.total_tables_found = len(content_summary.tables)
    stats.total_images_found = len(content_summary.images)
    
    # Convert documents to MultimodalChunk objects
    multimodal_chunks = chunker.create_multimodal_chunks_response(
        chunks=chunks,
        processor=processor,
        documents=documents,
        stats=stats,
    )
    
    # =========================================================================
    # Step 8: Upsert to Pinecone (Optional)
    # =========================================================================
    
    upsert_result = None
    if upsert_to_pinecone:
        logger.info("Step 8: Upserting chunks to Pinecone...")
        
        if not settings.is_pinecone_available:
            warning_msg = (
                "Pinecone upsert requested but PINECONE_API_KEY not configured. "
                "Skipping upsert."
            )
            warnings.append(warning_msg)
            logger.warning(warning_msg)
        else:
            try:
                from app.services.pinecone_service import get_pinecone_service
                
                pinecone_service = get_pinecone_service()
                upsert_result = pinecone_service.upsert_chunks(
                    chunks=multimodal_chunks,
                    filename=file.filename or "unknown.pdf",
                    namespace=pinecone_namespace
                )
                
                logger.info(
                    f"Pinecone upsert complete: {upsert_result['records_upserted']} records "
                    f"to namespace '{upsert_result['namespace']}'"
                )
                
            except Exception as e:
                warning_msg = f"Pinecone upsert failed: {str(e)}"
                warnings.append(warning_msg)
                logger.error(warning_msg, exc_info=True)
    
    # Calculate processing time
    processing_time = time.time() - start_time
    
    # Build final response
    response = MultimodalProcessResponse(
        filename=file.filename or "unknown.pdf",
        total_chunks=len(multimodal_chunks),
        processing_strategy=strategy,
        ai_enhancement_enabled=ai_actually_enabled,
        processing_stats=stats,
        chunks=multimodal_chunks,
        processing_time_seconds=round(processing_time, 2),
        warnings=warnings,
    )
    
    # Log upsert info if available
    if upsert_result:
        logger.info(
            f"Processing complete: {len(multimodal_chunks)} chunks, "
            f"{stats.ai_enhanced_chunks} AI-enhanced, "
            f"{upsert_result['records_upserted']} upserted to Pinecone, "
            f"{processing_time:.2f}s total"
        )
        # Add upsert info to warnings for visibility
        warnings.append(
            f"Successfully upserted {upsert_result['records_upserted']} records to Pinecone "
            f"(namespace: {upsert_result['namespace']})"
        )
        
        # Update response warnings
        response.warnings = warnings
        return response
    
    logger.info(
        f"Processing complete: {len(multimodal_chunks)} chunks, "
        f"{stats.ai_enhanced_chunks} AI-enhanced, "
        f"{processing_time:.2f}s total"
    )
    
    return response
