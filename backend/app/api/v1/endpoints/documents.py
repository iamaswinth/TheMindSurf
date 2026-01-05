"""
Document Processing API Endpoints

This module provides REST API endpoints for document upload and multimodal
processing. It integrates all services to create a complete document
processing pipeline.

Endpoints:
- GET /documents: List all documents
- GET /documents/{id}: Get document details
- DELETE /documents/{id}: Delete a document
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
import uuid as uuid_module

from fastapi import APIRouter, UploadFile, File, HTTPException, Query, status
from fastapi.responses import JSONResponse

from app.models.schemas import (
    MultimodalProcessResponse,
    MultimodalChunk,
    ProcessingStats,
    ProcessingStrategy,
    ContentType,
    HealthCheckResponse,
    ErrorResponse,
    ErrorDetail,
    UpsertResponse,
    DocumentResponse,
    DocumentDetailResponse,
    DocumentListResponse,
    DocumentDeleteResponse,
    DocumentMetadata,
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
# Document CRUD Endpoints
# =============================================================================

def _format_file_size(size_bytes: int) -> str:
    """Format file size in human-readable format."""
    if size_bytes == 0:
        return "0 B"
    
    units = ["B", "KB", "MB", "GB", "TB"]
    unit_index = 0
    size = float(size_bytes)
    
    while size >= 1024 and unit_index < len(units) - 1:
        size /= 1024
        unit_index += 1
    
    return f"{size:.1f} {units[unit_index]}"


def _format_document_response(doc: dict, namespace_name: Optional[str] = None) -> DocumentResponse:
    """Format a document database record to response schema."""
    return DocumentResponse(
        id=str(doc["id"]),
        name=doc.get("original_filename") or doc.get("filename", "unknown"),
        page_count=doc.get("page_count"),
        file_size=_format_file_size(doc.get("file_size_bytes", 0)),
        file_size_bytes=doc.get("file_size_bytes", 0),
        uploaded_at=doc["uploaded_at"],
        namespace=doc.get("pinecone_dense_namespace"),
        namespace_name=namespace_name or doc.get("namespace_name"),
        metadata=DocumentMetadata(
            processing_strategy=doc.get("processing_strategy"),
            chunk_count=doc.get("chunk_count", 0),
            has_images=bool(doc.get("total_chunks_with_images", 0)),
            has_tables=bool(doc.get("total_chunks_with_tables", 0)),
        )
    )


@router.get(
    "",
    response_model=DocumentListResponse,
    summary="List all documents"
)
async def list_documents(
    namespace_id: Optional[str] = Query(
        default=None,
        description="Filter by namespace ID"
    ),
    namespace: Optional[str] = Query(
        default=None,
        description="Filter by namespace name (Pinecone namespace)"
    ),
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=10, ge=1, le=100, description="Results per page"),
):
    """
    List all documents from NeonDB.
    
    Supports filtering by namespace and pagination.
    """
    if not settings.is_database_available:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "DATABASE_NOT_CONFIGURED",
                "message": "Database is not configured"
            }
        )
    
    try:
        from app.db.repository import DocumentRepository
        
        offset = (page - 1) * limit
        
        # If namespace_id is provided, get documents for that namespace
        if namespace_id:
            try:
                ns_uuid = uuid_module.UUID(namespace_id)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "code": "INVALID_NAMESPACE_ID",
                        "message": "Invalid namespace ID format"
                    }
                )
            
            # Get namespace info for name
            ns_info = await DocumentRepository.get_namespace_by_id(ns_uuid)
            namespace_name = ns_info["name"] if ns_info else None
            
            documents = await DocumentRepository.get_documents_by_namespace_id(ns_uuid, limit=limit)
            # Apply offset manually for now
            documents = documents[offset:offset + limit] if offset < len(documents) else []
            total = len(await DocumentRepository.get_documents_by_namespace_id(ns_uuid, limit=10000))
        else:
            # List all documents with optional namespace filter
            documents = await DocumentRepository.list_documents(
                namespace=namespace,
                limit=limit,
                offset=offset
            )
            total = await DocumentRepository.get_document_count()
        
        formatted_docs = [
            _format_document_response(doc, namespace_name if namespace_id else None)
            for doc in documents
        ]
        
        return DocumentListResponse(
            documents=formatted_docs,
            total=total,
            page=page,
            limit=limit
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list documents: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "LIST_DOCUMENTS_ERROR",
                "message": f"Failed to list documents: {str(e)}"
            }
        )


@router.get(
    "/{document_id}",
    response_model=DocumentDetailResponse,
    summary="Get document details"
)
async def get_document(document_id: str):
    """
    Get detailed information about a specific document.
    
    Returns document metadata and processing statistics.
    """
    if not settings.is_database_available:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "DATABASE_NOT_CONFIGURED",
                "message": "Database is not configured"
            }
        )
    
    try:
        from app.db.repository import DocumentRepository
        
        # Validate UUID
        try:
            doc_uuid = uuid_module.UUID(document_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "INVALID_DOCUMENT_ID",
                    "message": "Invalid document ID format"
                }
            )
        
        document = await DocumentRepository.get_document_by_id(doc_uuid)
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "DOCUMENT_NOT_FOUND",
                    "message": f"Document {document_id} not found"
                }
            )
        
        # Get namespace info
        namespace = await DocumentRepository.get_namespace_for_document(doc_uuid)
        namespace_name = namespace["name"] if namespace else None
        
        return DocumentDetailResponse(
            id=str(document["id"]),
            name=document.get("original_filename") or document.get("filename", "unknown"),
            page_count=document.get("page_count"),
            file_size=_format_file_size(document.get("file_size_bytes", 0)),
            file_size_bytes=document.get("file_size_bytes", 0),
            uploaded_at=document["uploaded_at"],
            namespace=document.get("pinecone_dense_namespace"),
            namespace_name=namespace_name,
            metadata=DocumentMetadata(
                processing_strategy=document.get("processing_strategy"),
                chunk_count=document.get("chunk_count", 0),
                has_images=bool(document.get("total_chunks_with_images", 0)),
                has_tables=bool(document.get("total_chunks_with_tables", 0)),
            ),
            processing_stats={
                "total_chunks": document.get("chunk_count", 0),
                "ai_enhanced_chunks": document.get("chunk_count", 0) if document.get("ai_enhancement_enabled") else 0,
                "total_tables": document.get("total_chunks_with_tables", 0),
                "total_images": document.get("total_chunks_with_images", 0),
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get document {document_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "GET_DOCUMENT_ERROR",
                "message": f"Failed to get document: {str(e)}"
            }
        )


@router.delete(
    "/{document_id}",
    response_model=DocumentDeleteResponse,
    summary="Delete a document"
)
async def delete_document(document_id: str):
    """
    Delete a document from both NeonDB and Pinecone.
    
    This operation:
    1. Gets document info from NeonDB
    2. Deletes all vectors from Pinecone for this document
    3. Deletes the document record from NeonDB
    """
    if not settings.is_database_available:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "DATABASE_NOT_CONFIGURED",
                "message": "Database is not configured"
            }
        )
    
    try:
        from app.db.repository import DocumentRepository
        
        # Validate UUID
        try:
            doc_uuid = uuid_module.UUID(document_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "INVALID_DOCUMENT_ID",
                    "message": "Invalid document ID format"
                }
            )
        
        # Get document info
        document = await DocumentRepository.get_document_by_id(doc_uuid)
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "DOCUMENT_NOT_FOUND",
                    "message": f"Document {document_id} not found"
                }
            )
        
        chunk_count = document.get("chunk_count", 0)
        pinecone_namespace = document.get("pinecone_dense_namespace")
        
        # Delete from Pinecone
        vectors_deleted = 0
        if settings.is_pinecone_available and pinecone_namespace:
            try:
                from app.services.pinecone_service import get_pinecone_service
                pinecone_service = get_pinecone_service()
                
                # Delete using document_id filter
                pinecone_service.delete_document(
                    document_id=document_id,
                    namespace=pinecone_namespace
                )
                
                vectors_deleted = chunk_count
                logger.info(f"Deleted {vectors_deleted} vectors from Pinecone for document {document_id}")
                
            except Exception as e:
                logger.warning(f"Failed to delete from Pinecone: {e}")
        
        # Get namespace for updating counts
        namespace = await DocumentRepository.get_namespace_for_document(doc_uuid)
        
        # Delete from NeonDB (hard delete)
        await DocumentRepository.hard_delete_document(doc_uuid)
        
        # Update namespace counts if applicable
        if namespace:
            await DocumentRepository.update_namespace_counts(namespace["id"])
        
        logger.info(f"Deleted document {document_id}")
        
        return DocumentDeleteResponse(
            status="success",
            message="Document deleted successfully",
            document_id=document_id,
            vectors_deleted=vectors_deleted
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete document {document_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "DELETE_DOCUMENT_ERROR",
                "message": f"Failed to delete document: {str(e)}"
            }
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
    # Step 8: Save to NeonDB FIRST (to get document_id for Pinecone)
    # =========================================================================
    
    document_id = None
    namespace_record = None
    if settings.is_database_available:
        logger.info("Step 8: Saving document metadata to NeonDB...")
        
        try:
            from app.db.repository import DocumentRepository
            
            # Determine namespace to use
            namespace_name = pinecone_namespace or settings.PINECONE_NAMESPACE
            
            # Ensure namespace exists
            namespace_record = await DocumentRepository.get_namespace_by_name(namespace_name)
            if not namespace_record:
                namespace_record = await DocumentRepository.create_namespace(
                    name=namespace_name,
                    description=f"Auto-created namespace for {namespace_name}",
                    default_dense_namespace=namespace_name,
                    default_sparse_namespace=namespace_name,
                )
                logger.info(f"Created new namespace: {namespace_name}")
            
            # Count chunks with tables/images
            chunks_with_tables = sum(
                1 for c in multimodal_chunks 
                if ContentType.TABLE in c.content_types
            )
            chunks_with_images = sum(
                1 for c in multimodal_chunks 
                if ContentType.IMAGE in c.content_types
            )
            
            # Create document record - THIS GENERATES THE document_id
            doc_record = await DocumentRepository.create_document(
                filename=file.filename or "unknown.pdf",
                original_filename=file.filename or "unknown.pdf",
                file_size_bytes=file_size,
                page_count=len(page_numbers) if page_numbers else None,
                pinecone_dense_namespace=namespace_name,
                pinecone_sparse_namespace=namespace_name,
                processing_strategy=strategy.value,
                chunk_count=len(multimodal_chunks),
                total_chunks_with_tables=chunks_with_tables,
                total_chunks_with_images=chunks_with_images,
                ai_enhancement_enabled=ai_actually_enabled,
            )
            
            document_id = str(doc_record['id'])  # Convert UUID to string for Pinecone
            
            # Link document to namespace
            await DocumentRepository.link_document_to_namespace(
                document_id=doc_record['id'],
                namespace_id=namespace_record['id']
            )
            
            logger.info(f"NeonDB document created with ID: {document_id}")
            warnings.append(f"Document metadata saved to NeonDB (ID: {document_id})")
            
        except Exception as e:
            warning_msg = f"NeonDB save failed: {str(e)}"
            warnings.append(warning_msg)
            logger.error(warning_msg, exc_info=True)
    
    # =========================================================================
    # Step 9: Upsert to Pinecone (using NeonDB document_id)
    # =========================================================================
    
    upsert_result = None
    if upsert_to_pinecone:
        logger.info("Step 9: Upserting chunks to Pinecone...")
        
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
                
                # IMPORTANT: Pass the NeonDB document_id to Pinecone
                upsert_result = pinecone_service.upsert_chunks(
                    chunks=multimodal_chunks,
                    document_id=document_id,  # Use NeonDB document_id!
                    filename=file.filename or "unknown.pdf",
                    namespace=pinecone_namespace
                )
                
                logger.info(
                    f"Pinecone upsert complete: {upsert_result.get('records_upserted', 0)} records "
                    f"to namespace '{upsert_result.get('namespace', pinecone_namespace)}' "
                    f"with document_id '{document_id}'"
                )
                
            except Exception as e:
                warning_msg = f"Pinecone upsert failed: {str(e)}"
                warnings.append(warning_msg)
                logger.error(warning_msg, exc_info=True)
    
    # =========================================================================
    # Step 10: Create chunk records in NeonDB (track vector IDs)
    # =========================================================================
    
    if settings.is_database_available and document_id:
        try:
            from app.db.repository import DocumentRepository
            
            for idx, chunk in enumerate(multimodal_chunks):
                # Generate vector IDs (same format as Pinecone uses)
                dense_vector_id = f"{document_id}_{idx}"
                sparse_vector_id = f"{document_id}_{idx}"
                
                # Extract first 200 chars for preview
                text_preview = chunk.enhanced_content[:200] if chunk.enhanced_content else None
                
                # Determine content type based on content_types list
                has_tables = ContentType.TABLE in chunk.content_types
                has_images = ContentType.IMAGE in chunk.content_types
                
                if has_images and has_tables:
                    content_type = "mixed"
                elif has_images:
                    content_type = "image"
                elif has_tables:
                    content_type = "table"
                else:
                    content_type = "text"
                
                await DocumentRepository.create_chunk(
                    document_id=uuid_module.UUID(document_id),
                    dense_vector_id=dense_vector_id,
                    sparse_vector_id=sparse_vector_id,
                    chunk_index=idx,
                    text_preview=text_preview,
                    has_table=has_tables,
                    has_image=has_images,
                    content_type=content_type,
                    page_numbers=chunk.metadata.page_numbers or [],
                )
            
            logger.info(f"Created {len(multimodal_chunks)} chunk records in NeonDB")
            
        except Exception as e:
            warning_msg = f"NeonDB chunk records failed: {str(e)}"
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
            f"{upsert_result.get('records_upserted', 0)} upserted to Pinecone, "
            f"{processing_time:.2f}s total"
        )
        # Add upsert info to warnings for visibility
        if upsert_result.get('records_upserted', 0) > 0:
            warnings.append(
                f"Successfully upserted {upsert_result.get('records_upserted', 0)} records to Pinecone "
                f"(namespace: {upsert_result.get('namespace', pinecone_namespace)})"
            )
        else:
            warnings.append(
                f"No records were upserted to Pinecone - {upsert_result.get('message', 'no chunks available')}"
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
