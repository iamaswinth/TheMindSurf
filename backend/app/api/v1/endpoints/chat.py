"""
Chat API Endpoints

This module provides REST API endpoints for chat functionality with RAG.
Supports three chat modes:
- Namespace Mode: Chat with all documents in a namespace
- Single Doc Mode: Chat with a single document
- Multi-Doc Mode: Chat with multiple selected documents

Endpoints:
- POST /chat: Send a message and get an AI response
"""

import logging
import time
from typing import Optional
import uuid

from fastapi import APIRouter, HTTPException, status

from app.models.schemas import (
    ChatRequest,
    ChatResponse,
    ChatSource,
    ChatMetadata,
    ChatMode,
    SearchStats,
)
from app.db.repository import DocumentRepository
from app.core.config import settings

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/chat",
    tags=["chat"]
)


# =============================================================================
# Chat Endpoint
# =============================================================================

@router.post(
    "",
    response_model=ChatResponse,
    summary="Chat with documents using RAG"
)
async def chat(request: ChatRequest):
    """
    Send a message and get an AI response based on the selected mode.
    
    **Chat Modes:**
    
    1. **Namespace Mode** (`mode: "namespace"`):
       - Chat with ALL documents in a namespace
       - Requires `namespace_id` parameter
    
    2. **Single Doc Mode** (`mode: "single"`):
       - Chat with ONE specific document
       - Requires `document_id` parameter
    
    3. **Multi-Doc Mode** (`mode: "multi"`):
       - Chat with MULTIPLE selected documents
       - Requires `document_ids` array parameter
    
    **Request Body:**
    - message: Question/message to send
    - mode: Chat mode (namespace, single, multi)
    - namespace_id: Namespace ID (required for namespace mode)
    - document_id: Document ID (required for single mode)
    - document_ids: Array of document IDs (required for multi mode)
    - temperature: Sampling temperature (0-2, default: 0.3)
    - max_tokens: Maximum response tokens (100-4000, default: 2000)
    - top_k: Number of search results (1-50, default: 5)
    - use_hybrid_search: Use hybrid search (default: true)
    
    **Response:**
    - response: Generated answer
    - sources: List of source documents with scores
    - metadata: Response metadata (model, timing, etc.)
    """
    # Validate services
    if not settings.is_pinecone_available:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "PINECONE_NOT_CONFIGURED",
                "message": "Pinecone is not configured"
            }
        )
    
    if not settings.is_ai_available:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "AI_NOT_CONFIGURED",
                "message": "OpenAI is not configured for answer generation"
            }
        )
    
    if not settings.is_database_available:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "DATABASE_NOT_CONFIGURED",
                "message": "Database is not configured"
            }
        )
    
    # Validate mode-specific parameters
    _validate_chat_request(request)
    
    logger.info(f"Chat request: mode={request.mode}, message='{request.message[:50]}...'")
    
    try:
        start_time = time.time()
        
        # Get document IDs and namespace based on mode
        document_ids, pinecone_namespace, documents_info = await _get_documents_for_mode(request)
        
        # DEBUG: Log the document IDs being used for filtering
        logger.info(f"Chat filtering by document_ids: {document_ids}")
        logger.info(f"Chat searching in namespace: {pinecone_namespace}")
        
        if not document_ids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "NO_DOCUMENTS_FOUND",
                    "message": "No documents found for the specified filter"
                }
            )
        
        # Build document ID filter for Pinecone search
        document_filter = _build_pinecone_filter(document_ids)
        
        # Perform search with filter
        search_start = time.time()
        search_results = await _search_with_filter(
            query=request.message,
            document_filter=document_filter,
            namespace=pinecone_namespace,
            top_k=request.top_k or 5,
            use_hybrid=request.use_hybrid_search
        )
        search_time_ms = (time.time() - search_start) * 1000
        
        # Generate response
        generation_start = time.time()
        answer, model_used = await _generate_response(
            question=request.message,
            search_results=search_results,
            max_tokens=request.max_tokens or 2000,
            temperature=request.temperature or 0.3
        )
        generation_time_ms = (time.time() - generation_start) * 1000
        
        # Format sources
        sources = _format_sources(search_results, documents_info)
        
        total_time = time.time() - start_time
        logger.info(
            f"Chat completed in {total_time:.2f}s "
            f"(search: {search_time_ms:.0f}ms, generation: {generation_time_ms:.0f}ms)"
        )
        
        return ChatResponse(
            response=answer,
            sources=sources,
            metadata=ChatMetadata(
                model_used=model_used,
                search_time_ms=search_time_ms,
                generation_time_ms=generation_time_ms,
                total_tokens=None,  # Could be added if tracking tokens
                mode=request.mode,
                documents_searched=len(document_ids)
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "CHAT_ERROR",
                "message": f"Chat failed: {str(e)}"
            }
        )


# =============================================================================
# Helper Functions
# =============================================================================

def _validate_chat_request(request: ChatRequest) -> None:
    """Validate mode-specific parameters."""
    if request.mode == ChatMode.NAMESPACE:
        if not request.namespace_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "MISSING_NAMESPACE_ID",
                    "message": "namespace_id is required for namespace mode"
                }
            )
    
    elif request.mode == ChatMode.SINGLE:
        if not request.document_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "MISSING_DOCUMENT_ID",
                    "message": "document_id is required for single mode"
                }
            )
    
    elif request.mode == ChatMode.MULTI:
        if not request.document_ids or len(request.document_ids) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "MISSING_DOCUMENT_IDS",
                    "message": "document_ids array is required for multi mode"
                }
            )


async def _get_documents_for_mode(request: ChatRequest) -> tuple[list[str], str, dict]:
    """
    Get document IDs and namespace based on chat mode.
    
    Returns:
        Tuple of (document_ids, pinecone_namespace, documents_info)
    """
    documents_info = {}  # Map of doc_id -> doc info for source formatting
    
    if request.mode == ChatMode.NAMESPACE:
        # Get all documents in the namespace
        try:
            ns_uuid = uuid.UUID(request.namespace_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "INVALID_NAMESPACE_ID",
                    "message": "Invalid namespace ID format"
                }
            )
        
        namespace = await DocumentRepository.get_namespace_by_id(ns_uuid)
        if not namespace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "NAMESPACE_NOT_FOUND",
                    "message": f"Namespace {request.namespace_id} not found"
                }
            )
        
        documents = await DocumentRepository.get_documents_by_namespace_id(ns_uuid)
        document_ids = [str(doc["id"]) for doc in documents]
        pinecone_namespace = namespace.get("default_dense_namespace", namespace["name"])
        
        for doc in documents:
            documents_info[str(doc["id"])] = {
                "name": doc.get("original_filename") or doc.get("filename"),
                "namespace": pinecone_namespace
            }
        
        return document_ids, pinecone_namespace, documents_info
    
    elif request.mode == ChatMode.SINGLE:
        # Get single document - document_id already validated as not None by _validate_chat_request
        doc_id_str = str(request.document_id)  # Cast to str since validation ensures it's not None
        try:
            doc_uuid = uuid.UUID(doc_id_str)
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
                    "message": f"Document {doc_id_str} not found"
                }
            )
        
        pinecone_namespace = document.get("pinecone_dense_namespace", settings.PINECONE_NAMESPACE)
        documents_info[doc_id_str] = {
            "name": document.get("original_filename") or document.get("filename"),
            "namespace": pinecone_namespace
        }
        
        return [doc_id_str], pinecone_namespace, documents_info
    
    elif request.mode == ChatMode.MULTI:
        # Get multiple documents
        document_ids = []
        pinecone_namespace = None
        
        # Already validated that document_ids is not None/empty
        doc_ids_list = request.document_ids or []
        for doc_id_str in doc_ids_list:
            try:
                doc_uuid = uuid.UUID(doc_id_str)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "code": "INVALID_DOCUMENT_ID",
                        "message": f"Invalid document ID format: {doc_id_str}"
                    }
                )
            
            document = await DocumentRepository.get_document_by_id(doc_uuid)
            if not document:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={
                        "code": "DOCUMENT_NOT_FOUND",
                        "message": f"Document {doc_id_str} not found"
                    }
                )
            
            document_ids.append(doc_id_str)
            doc_namespace = document.get("pinecone_dense_namespace", settings.PINECONE_NAMESPACE)
            
            # Use the first document's namespace as the search namespace
            if pinecone_namespace is None:
                pinecone_namespace = doc_namespace
            
            documents_info[doc_id_str] = {
                "name": document.get("original_filename") or document.get("filename"),
                "namespace": doc_namespace
            }
        
        return document_ids, pinecone_namespace or settings.PINECONE_NAMESPACE, documents_info
    
    # Should not reach here
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={
            "code": "INVALID_MODE",
            "message": f"Invalid chat mode: {request.mode}"
        }
    )


def _build_pinecone_filter(document_ids: list[str]) -> dict:
    """Build Pinecone filter for document IDs."""
    if len(document_ids) == 1:
        return {"document_id": {"$eq": document_ids[0]}}
    else:
        return {"document_id": {"$in": document_ids}}


async def _search_with_filter(
    query: str,
    document_filter: dict,
    namespace: str,
    top_k: int,
    use_hybrid: bool
) -> list[dict]:
    """
    Perform search with document filter.
    
    Uses the enhanced Pinecone service with document_ids filtering.
    """
    from app.services.pinecone_service import get_pinecone_service
    
    pinecone_service = get_pinecone_service()
    
    # Extract document IDs from filter
    document_ids = None
    if "$in" in document_filter.get("document_id", {}):
        document_ids = document_filter["document_id"]["$in"]
    elif "$eq" in document_filter.get("document_id", {}):
        document_ids = [document_filter["document_id"]["$eq"]]
    
    # Perform hybrid search with document_ids filter
    search_result = pinecone_service.hybrid_search(
        query=query,
        top_k=top_k,
        rerank_top_n=top_k,
        namespace=namespace,
        include_metadata=True,
        document_ids=document_ids
    )
    
    return search_result.get("results", [])


async def _generate_response(
    question: str,
    search_results: list[dict],
    max_tokens: int,
    temperature: float
) -> tuple[str, str]:
    """
    Generate response using RAG.
    
    Returns:
        Tuple of (answer, model_used)
    """
    from app.services.generation_service import get_generation_service
    
    if not search_results:
        return (
            "I couldn't find any relevant information in the selected documents "
            "to answer your question. Please try rephrasing or ask about a different topic.",
            settings.OPENAI_VISION_MODEL
        )
    
    generation_service = get_generation_service()
    
    rag_result = generation_service.rag_generate(
        question=question,
        search_results=search_results,
        max_tokens=max_tokens,
        temperature=temperature
    )
    
    return rag_result["answer"], rag_result["model_used"]


def _format_sources(search_results: list[dict], documents_info: dict) -> list[ChatSource]:
    """Format search results as chat sources."""
    sources = []
    
    for result in search_results:
        metadata = result.get("metadata", {})
        doc_id = metadata.get("document_id", "unknown")
        doc_info = documents_info.get(doc_id, {})
        
        # Extract page number from metadata
        page_numbers = metadata.get("page_numbers", [])
        page_number = int(page_numbers[0]) if page_numbers else None
        
        sources.append(ChatSource(
            document_name=doc_info.get("name", metadata.get("filename", "Unknown")),
            document_id=doc_id,
            page_number=page_number,
            chunk_text=result.get("chunk_text", ""),
            score=result.get("score", 0.0),
            metadata={
                "content_types": metadata.get("content_types", []),
                "namespace": doc_info.get("namespace", metadata.get("namespace")),
                "has_tables": metadata.get("has_tables", False),
                "has_images": metadata.get("has_images", False),
            }
        ))
    
    return sources
