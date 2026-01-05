"""
Namespace Management API Endpoints

This module provides REST API endpoints for namespace CRUD operations.
Namespaces are stored in NeonDB and used to organize documents and their
vectors in Pinecone.

Endpoints:
- GET /namespaces: List all namespaces
- GET /namespaces/{id}: Get namespace details
- POST /namespaces: Create a new namespace
- DELETE /namespaces/{id}: Delete a namespace and all its documents
"""

import logging
from typing import Optional
import uuid

from fastapi import APIRouter, HTTPException, status

from app.models.schemas import (
    NamespaceCreate,
    NamespaceResponse,
    NamespaceDetailResponse,
    NamespaceListResponse,
    NamespaceDeleteResponse,
    NamespaceMetadata,
)
from app.db.repository import DocumentRepository
from app.core.config import settings

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/namespaces",
    tags=["namespaces"]
)


def _format_namespace_response(ns: dict) -> NamespaceResponse:
    """Format a namespace database record to response schema."""
    return NamespaceResponse(
        id=str(ns["id"]),
        name=ns["name"],
        description=ns.get("description"),
        document_count=ns.get("document_count", 0),
        total_chunks=ns.get("total_chunks", 0),
        created_at=ns["created_at"],
        metadata=NamespaceMetadata(
            last_modified=ns.get("updated_at"),
            vector_count=ns.get("total_chunks", 0)
        )
    )


# =============================================================================
# List Namespaces
# =============================================================================

@router.get(
    "",
    response_model=NamespaceListResponse,
    summary="List all namespaces"
)
async def list_namespaces():
    """
    List all available namespaces from NeonDB.
    
    Returns namespaces with document counts and metadata.
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
        namespaces = await DocumentRepository.list_namespaces()
        
        formatted_namespaces = [
            _format_namespace_response(ns) for ns in namespaces
        ]
        
        return NamespaceListResponse(
            namespaces=formatted_namespaces,
            total=len(formatted_namespaces)
        )
        
    except Exception as e:
        logger.error(f"Failed to list namespaces: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "LIST_NAMESPACES_ERROR",
                "message": f"Failed to list namespaces: {str(e)}"
            }
        )


# =============================================================================
# Get Namespace Details
# =============================================================================

@router.get(
    "/{namespace_id}",
    response_model=NamespaceDetailResponse,
    summary="Get namespace details"
)
async def get_namespace(namespace_id: str):
    """
    Get detailed information about a specific namespace.
    
    Includes list of documents and statistics.
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
        # Validate UUID
        try:
            ns_uuid = uuid.UUID(namespace_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "INVALID_NAMESPACE_ID",
                    "message": "Invalid namespace ID format"
                }
            )
        
        # Get namespace by ID
        namespace = await DocumentRepository.get_namespace_by_id(ns_uuid)
        
        if not namespace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "NAMESPACE_NOT_FOUND",
                    "message": f"Namespace {namespace_id} not found"
                }
            )
        
        # Get documents in this namespace
        documents = await DocumentRepository.get_documents_by_namespace_id(ns_uuid)
        document_ids = [str(doc["id"]) for doc in documents]
        
        # Calculate stats
        total_pages = sum(doc.get("page_count", 0) or 0 for doc in documents)
        total_file_size = sum(doc.get("file_size_bytes", 0) for doc in documents)
        
        return NamespaceDetailResponse(
            id=str(namespace["id"]),
            name=namespace["name"],
            description=namespace.get("description"),
            document_count=len(documents),
            total_chunks=namespace.get("total_chunks", 0),
            created_at=namespace["created_at"],
            metadata=NamespaceMetadata(
                last_modified=namespace.get("updated_at"),
                vector_count=namespace.get("total_chunks", 0)
            ),
            documents=document_ids,
            stats={
                "total_vectors": namespace.get("total_chunks", 0),
                "total_pages": total_pages,
                "total_file_size": _format_file_size(total_file_size)
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get namespace {namespace_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "GET_NAMESPACE_ERROR",
                "message": f"Failed to get namespace: {str(e)}"
            }
        )


# =============================================================================
# Create Namespace
# =============================================================================

@router.post(
    "",
    response_model=NamespaceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new namespace"
)
async def create_namespace(request: NamespaceCreate):
    """
    Create a new namespace in NeonDB.
    
    The namespace will be available for organizing documents.
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
        # Check if namespace already exists
        existing = await DocumentRepository.get_namespace_by_name(request.name)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "NAMESPACE_EXISTS",
                    "message": f"Namespace '{request.name}' already exists"
                }
            )
        
        # Create namespace
        namespace = await DocumentRepository.create_namespace(
            name=request.name,
            description=request.description,
            default_dense_namespace=request.name,
            default_sparse_namespace=request.name,
        )
        
        logger.info(f"Created namespace: {request.name} (ID: {namespace['id']})")
        
        return _format_namespace_response(namespace)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create namespace: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "CREATE_NAMESPACE_ERROR",
                "message": f"Failed to create namespace: {str(e)}"
            }
        )


# =============================================================================
# Delete Namespace
# =============================================================================

@router.delete(
    "/{namespace_id}",
    response_model=NamespaceDeleteResponse,
    summary="Delete a namespace and all its documents"
)
async def delete_namespace(namespace_id: str):
    """
    Delete a namespace and cascade delete all associated documents.
    
    This operation:
    1. Gets all document IDs in the namespace from NeonDB
    2. Deletes all vectors from Pinecone for each document
    3. Deletes the namespace from NeonDB (cascades to documents)
    
    ⚠️ Warning: This is a destructive operation that cannot be undone.
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
        # Validate UUID
        try:
            ns_uuid = uuid.UUID(namespace_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "INVALID_NAMESPACE_ID",
                    "message": "Invalid namespace ID format"
                }
            )
        
        # Get namespace
        namespace = await DocumentRepository.get_namespace_by_id(ns_uuid)
        if not namespace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "NAMESPACE_NOT_FOUND",
                    "message": f"Namespace {namespace_id} not found"
                }
            )
        
        # Get all documents in this namespace
        documents = await DocumentRepository.get_documents_by_namespace_id(ns_uuid)
        document_ids = [str(doc["id"]) for doc in documents]
        
        # Delete vectors from Pinecone for each document
        if settings.is_pinecone_available and documents:
            try:
                from app.services.pinecone_service import get_pinecone_service
                pinecone_service = get_pinecone_service()
                
                # Delete namespace from Pinecone (this deletes all vectors in the namespace)
                pinecone_namespace = namespace.get("default_dense_namespace", namespace["name"])
                pinecone_service.delete_namespace(namespace=pinecone_namespace)
                
                logger.info(f"Deleted Pinecone namespace: {pinecone_namespace}")
                
            except Exception as e:
                logger.warning(f"Failed to delete from Pinecone: {e}")
        
        # Delete all documents in this namespace from NeonDB
        # (The junction table uses CASCADE, but documents table doesn't)
        for doc_id in document_ids:
            try:
                await DocumentRepository.hard_delete_document(uuid.UUID(doc_id))
                logger.info(f"Deleted document {doc_id} from NeonDB")
            except Exception as e:
                logger.warning(f"Failed to delete document {doc_id}: {e}")
        
        # Delete namespace from NeonDB
        await DocumentRepository.delete_namespace(ns_uuid)
        
        logger.info(
            f"Deleted namespace {namespace_id} with {len(document_ids)} documents"
        )
        
        return NamespaceDeleteResponse(
            status="success",
            message=f"Namespace and {len(document_ids)} documents deleted",
            deleted_documents=document_ids
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete namespace {namespace_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "DELETE_NAMESPACE_ERROR",
                "message": f"Failed to delete namespace: {str(e)}"
            }
        )


# =============================================================================
# Utility Functions
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
