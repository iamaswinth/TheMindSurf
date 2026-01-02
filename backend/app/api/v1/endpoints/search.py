"""
Search and RAG API Endpoints

This module provides REST API endpoints for hybrid search and RAG generation
using Pinecone vector database with integrated inference.

Endpoints:
- POST /search/hybrid: Hybrid search using dense + sparse indexes
- POST /search/rag: Full RAG pipeline (search + generate)
- GET /search/status: Pinecone connection and index status
- POST /search/upsert: Upsert chunks to Pinecone
- DELETE /search/document: Delete a document from indexes
- DELETE /search/namespace: Delete an entire namespace
"""

import logging
import time
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status, Body
from fastapi.responses import JSONResponse

from app.models.schemas import (
    SearchRequest,
    SearchResponse,
    SearchResult,
    SearchStats,
    RAGRequest,
    RAGResponse,
    RAGSource,
    UpsertResponse,
    PineconeStatusResponse,
    IndexStats,
    DeleteDocumentRequest,
    DeleteNamespaceRequest,
    ErrorDetail,
)
from app.services.pinecone_service import (
    PineconeService,
    PineconeServiceError,
    PineconeConnectionError,
    PineconeSearchError,
    PineconeUpsertError,
    get_pinecone_service,
)
from app.services.generation_service import (
    GenerationService,
    GenerationServiceError,
    get_generation_service,
)
from app.core.config import settings

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/search",
    tags=["search"]
)


# =============================================================================
# Health / Status Endpoints
# =============================================================================

@router.get(
    "/status",
    response_model=PineconeStatusResponse,
    summary="Get Pinecone connection and index status"
)
async def get_pinecone_status():
    """
    Check Pinecone connection and get index statistics.
    
    Returns information about:
    - Connection status
    - Dense index statistics
    - Sparse index statistics
    - Default namespace
    """
    if not settings.is_pinecone_available:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "PINECONE_NOT_CONFIGURED",
                "message": "Pinecone is not configured",
                "details": {"suggestion": "Set PINECONE_API_KEY environment variable"}
            }
        )
    
    try:
        service = get_pinecone_service()
        stats = service.get_index_stats()
        
        return PineconeStatusResponse(
            status="healthy",
            dense_index=IndexStats(
                name=stats["dense_index"]["name"],
                stats=stats["dense_index"]["stats"]
            ),
            sparse_index=IndexStats(
                name=stats["sparse_index"]["name"],
                stats=stats["sparse_index"]["stats"]
            ),
            namespace=service.namespace
        )
        
    except PineconeConnectionError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "PINECONE_CONNECTION_ERROR",
                "message": str(e),
                "details": {"suggestion": "Check your Pinecone API key and network connection"}
            }
        )
    except Exception as e:
        logger.error(f"Pinecone status check failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "PINECONE_STATUS_ERROR",
                "message": f"Failed to get Pinecone status: {str(e)}"
            }
        )


# =============================================================================
# Hybrid Search Endpoint
# =============================================================================

@router.post(
    "/hybrid",
    response_model=SearchResponse,
    summary="Perform hybrid search using dense and sparse indexes"
)
async def hybrid_search(request: SearchRequest):
    """
    Perform hybrid search combining semantic and lexical search.
    
    This endpoint:
    1. Searches the dense index for semantic matches (llama-text-embed-v2)
    2. Searches the sparse index for lexical matches (pinecone-sparse-english-v0)
    3. Merges and deduplicates results
    4. Reranks using bge-reranker-v2-m3
    5. Returns the most relevant matches
    
    **Request Body:**
    - query: Search query text (required)
    - top_k: Number of results from each index (default: 5)
    - rerank_top_n: Results after reranking (default: 5)
    - namespace: Namespace to search (default: configured namespace)
    - include_metadata: Include metadata in results (default: true)
    
    **Response:**
    - query: Original query
    - results: List of search results with scores
    - stats: Search statistics (timing, result counts)
    """
    if not settings.is_pinecone_available:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "PINECONE_NOT_CONFIGURED",
                "message": "Pinecone is not configured",
                "details": {"suggestion": "Set PINECONE_API_KEY environment variable"}
            }
        )
    
    logger.info(f"Hybrid search request: query='{request.query[:50]}...'")
    
    try:
        service = get_pinecone_service()
        
        result = service.hybrid_search(
            query=request.query,
            top_k=request.top_k,
            rerank_top_n=request.rerank_top_n,
            namespace=request.namespace,
            include_metadata=request.include_metadata
        )
        
        return SearchResponse(
            query=result["query"],
            results=[
                SearchResult(
                    id=r["id"],
                    score=r["score"],
                    chunk_text=r["chunk_text"],
                    metadata=r.get("metadata")
                )
                for r in result["results"]
            ],
            stats=SearchStats(**result["stats"])
        )
        
    except PineconeSearchError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "SEARCH_ERROR",
                "message": str(e),
                "details": {"query": request.query[:100]}
            }
        )
    except Exception as e:
        logger.error(f"Hybrid search failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "SEARCH_ERROR",
                "message": f"Search failed: {str(e)}"
            }
        )


# =============================================================================
# RAG Generation Endpoint
# =============================================================================

@router.post(
    "/rag",
    response_model=RAGResponse,
    summary="Full RAG pipeline: search and generate answer"
)
async def rag_query(request: RAGRequest):
    """
    Execute full RAG pipeline: hybrid search + answer generation.
    
    This endpoint:
    1. Performs hybrid search to retrieve relevant chunks
    2. Formats results for LLM augmentation
    3. Generates an answer using GPT-4o
    4. Returns answer with source citations
    
    **Request Body:**
    - question: Question to answer (required)
    - top_k: Number of results to retrieve (default: 5)
    - namespace: Namespace to search (default: configured namespace)
    - max_tokens: Maximum response tokens (default: 2000)
    - temperature: Sampling temperature (default: 0.3)
    - system_message: Custom system message for LLM
    
    **Response:**
    - question: Original question
    - answer: Generated answer
    - sources: Source documents with relevance scores
    - model_used: Model used for generation
    - search_stats: Search statistics
    """
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
    
    logger.info(f"RAG request: question='{request.question[:50]}...'")
    
    try:
        # 1. Hybrid Search
        pinecone_service = get_pinecone_service()
        search_result = pinecone_service.hybrid_search(
            query=request.question,
            top_k=request.top_k,
            namespace=request.namespace,
            include_metadata=True
        )
        
        if not search_result["results"]:
            return RAGResponse(
                question=request.question,
                answer="I couldn't find any relevant information to answer your question. Please try rephrasing or ask about a different topic.",
                sources=[],
                model_used=settings.OPENAI_VISION_MODEL,
                search_stats=SearchStats(**search_result["stats"])
            )
        
        # 2. Generate Answer
        generation_service = get_generation_service()
        rag_result = generation_service.rag_generate(
            question=request.question,
            search_results=search_result["results"],
            system_message=request.system_message,
            max_tokens=request.max_tokens,
            temperature=request.temperature
        )
        
        return RAGResponse(
            question=request.question,
            answer=rag_result["answer"],
            sources=[
                RAGSource(
                    id=s["id"],
                    score=s["score"],
                    preview=s["preview"]
                )
                for s in rag_result["sources"]
            ],
            model_used=rag_result["model_used"],
            search_stats=SearchStats(**search_result["stats"])
        )
        
    except PineconeSearchError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "SEARCH_ERROR", "message": str(e)}
        )
    except GenerationServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "GENERATION_ERROR", "message": str(e)}
        )
    except Exception as e:
        logger.error(f"RAG query failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "RAG_ERROR", "message": f"RAG query failed: {str(e)}"}
        )


# =============================================================================
# Document Management Endpoints
# =============================================================================

@router.delete(
    "/document",
    summary="Delete a document from both indexes"
)
async def delete_document(request: DeleteDocumentRequest):
    """
    Delete all vectors associated with a document from both indexes.
    
    **Request Body:**
    - document_id: Document ID to delete (required)
    - namespace: Namespace containing the document (optional)
    """
    if not settings.is_pinecone_available:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "PINECONE_NOT_CONFIGURED", "message": "Pinecone is not configured"}
        )
    
    try:
        service = get_pinecone_service()
        result = service.delete_document(
            document_id=request.document_id,
            namespace=request.namespace
        )
        
        return result
        
    except PineconeServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "DELETE_ERROR", "message": str(e)}
        )


@router.delete(
    "/namespace",
    summary="Delete an entire namespace from both indexes"
)
async def delete_namespace(request: DeleteNamespaceRequest):
    """
    Delete all vectors in a namespace from both indexes.
    
    ⚠️ **Warning**: This is a destructive operation that cannot be undone.
    
    **Request Body:**
    - namespace: Namespace to delete (required)
    - confirm: Must be true to confirm deletion (required)
    """
    if not settings.is_pinecone_available:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "PINECONE_NOT_CONFIGURED", "message": "Pinecone is not configured"}
        )
    
    if not request.confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "CONFIRMATION_REQUIRED",
                "message": "Set 'confirm' to true to delete the namespace"
            }
        )
    
    try:
        service = get_pinecone_service()
        result = service.delete_namespace(namespace=request.namespace)
        
        return result
        
    except PineconeServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "DELETE_ERROR", "message": str(e)}
        )
