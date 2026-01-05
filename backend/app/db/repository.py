"""
Document Repository

Data access layer for documents and namespaces in NeonDB.
"""

import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

from app.db.connection import db

logger = logging.getLogger(__name__)


class DocumentRepository:
    """Repository for document database operations."""
    
    @staticmethod
    async def create_namespace(
        name: str,
        description: Optional[str] = None,
        default_dense_namespace: Optional[str] = None,
        default_sparse_namespace: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create a new namespace."""
        query = """
        INSERT INTO namespaces (name, description, default_dense_namespace, default_sparse_namespace)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, description, document_count, total_chunks, created_at, updated_at
        """
        
        result = await db.execute_one(
            query, 
            name, 
            description, 
            default_dense_namespace, 
            default_sparse_namespace
        )
        
        return dict(result) if result else None
    
    @staticmethod
    async def get_namespace_by_name(name: str) -> Optional[Dict[str, Any]]:
        """Get namespace by name."""
        query = """
        SELECT id, name, description, document_count, total_chunks, 
               default_dense_namespace, default_sparse_namespace,
               created_at, updated_at
        FROM namespaces
        WHERE name = $1
        """
        
        result = await db.execute_one(query, name)
        return dict(result) if result else None
    
    @staticmethod
    async def list_namespaces() -> List[Dict[str, Any]]:
        """List all namespaces."""
        query = """
        SELECT id, name, description, document_count, total_chunks, created_at
        FROM namespaces
        ORDER BY created_at DESC
        """
        
        results = await db.execute_query(query)
        return [dict(row) for row in results]
    
    @staticmethod
    async def create_document(
        filename: str,
        original_filename: str,
        file_size_bytes: int,
        pinecone_dense_namespace: str,
        pinecone_sparse_namespace: str,
        page_count: Optional[int] = None,
        processing_strategy: Optional[str] = None,
        chunk_count: int = 0,
        total_chunks_with_tables: int = 0,
        total_chunks_with_images: int = 0,
        ai_enhancement_enabled: bool = True,
        dense_index_name: str = "rag-comparator-dense",
        sparse_index_name: str = "rag-comparator-sparse",
    ) -> Dict[str, Any]:
        """Create a new document record."""
        query = """
        INSERT INTO documents (
            filename, original_filename, file_size_bytes, page_count,
            pinecone_dense_namespace, pinecone_sparse_namespace,
            dense_index_name, sparse_index_name,
            processing_strategy, chunk_count, 
            total_chunks_with_tables, total_chunks_with_images,
            ai_enhancement_enabled, processed_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
        RETURNING id, filename, original_filename, file_size_bytes, page_count,
                  pinecone_dense_namespace, chunk_count, 
                  uploaded_at, processed_at
        """
        
        result = await db.execute_one(
            query,
            filename,
            original_filename,
            file_size_bytes,
            page_count,
            pinecone_dense_namespace,
            pinecone_sparse_namespace,
            dense_index_name,
            sparse_index_name,
            processing_strategy,
            chunk_count,
            total_chunks_with_tables,
            total_chunks_with_images,
            ai_enhancement_enabled,
        )
        
        logger.info(f"Created document record: {filename} (ID: {result['id']})")
        return dict(result) if result else None
    
    @staticmethod
    async def link_document_to_namespace(
        document_id: uuid.UUID,
        namespace_id: uuid.UUID,
    ) -> None:
        """Link a document to a namespace."""
        query = """
        INSERT INTO document_namespaces (document_id, namespace_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
        """
        
        await db.execute(query, document_id, namespace_id)
        logger.info(f"Linked document {document_id} to namespace {namespace_id}")
    
    @staticmethod
    async def create_chunk(
        document_id: uuid.UUID,
        dense_vector_id: str,
        sparse_vector_id: Optional[str],
        chunk_index: int,
        text_preview: Optional[str] = None,
        has_table: bool = False,
        has_image: bool = False,
        content_type: str = "text",
        page_numbers: Optional[List[int]] = None,
    ) -> Dict[str, Any]:
        """Create a chunk record."""
        query = """
        INSERT INTO chunks (
            document_id, dense_vector_id, sparse_vector_id,
            chunk_index, text_preview, has_table, has_image,
            content_type, page_numbers
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, chunk_index, created_at
        """
        
        result = await db.execute_one(
            query,
            document_id,
            dense_vector_id,
            sparse_vector_id,
            chunk_index,
            text_preview,
            has_table,
            has_image,
            content_type,
            page_numbers or [],
        )
        
        return dict(result) if result else None
    
    @staticmethod
    async def list_documents(
        namespace: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """List documents with optional namespace filter."""
        if namespace:
            query = """
            SELECT id, filename, original_filename, file_size_bytes, page_count,
                   pinecone_dense_namespace, chunk_count,
                   total_chunks_with_tables, total_chunks_with_images,
                   uploaded_at, processed_at
            FROM documents
            WHERE pinecone_dense_namespace = $1 
              AND deleted_at IS NULL
            ORDER BY uploaded_at DESC
            LIMIT $2 OFFSET $3
            """
            results = await db.execute_query(query, namespace, limit, offset)
        else:
            query = """
            SELECT id, filename, original_filename, file_size_bytes, page_count,
                   pinecone_dense_namespace, chunk_count,
                   total_chunks_with_tables, total_chunks_with_images,
                   uploaded_at, processed_at
            FROM documents
            WHERE deleted_at IS NULL
            ORDER BY uploaded_at DESC
            LIMIT $1 OFFSET $2
            """
            results = await db.execute_query(query, limit, offset)
        
        return [dict(row) for row in results]
    
    @staticmethod
    async def get_document_by_id(document_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        """Get a document by ID."""
        query = """
        SELECT id, filename, original_filename, file_size_bytes, page_count,
               pinecone_dense_namespace, pinecone_sparse_namespace,
               chunk_count, total_chunks_with_tables, total_chunks_with_images,
               processing_strategy, ai_enhancement_enabled,
               uploaded_at, processed_at
        FROM documents
        WHERE id = $1 AND deleted_at IS NULL
        """
        
        result = await db.execute_one(query, document_id)
        return dict(result) if result else None
    
    @staticmethod
    async def delete_document(document_id: uuid.UUID) -> None:
        """Soft delete a document."""
        query = """
        UPDATE documents
        SET deleted_at = NOW()
        WHERE id = $1
        """
        
        await db.execute(query, document_id)
        logger.info(f"Soft deleted document: {document_id}")

    @staticmethod
    async def get_namespace_by_id(namespace_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        """Get namespace by ID."""
        query = """
        SELECT id, name, description, document_count, total_chunks, 
               default_dense_namespace, default_sparse_namespace,
               created_at, updated_at
        FROM namespaces
        WHERE id = $1
        """
        
        result = await db.execute_one(query, namespace_id)
        return dict(result) if result else None

    @staticmethod
    async def get_documents_by_namespace_id(
        namespace_id: uuid.UUID,
        limit: int = 1000,
    ) -> List[Dict[str, Any]]:
        """Get all documents linked to a namespace."""
        query = """
        SELECT d.id, d.filename, d.original_filename, d.file_size_bytes, d.page_count,
               d.pinecone_dense_namespace, d.chunk_count,
               d.total_chunks_with_tables, d.total_chunks_with_images,
               d.processing_strategy, d.uploaded_at, d.processed_at
        FROM documents d
        JOIN document_namespaces dn ON d.id = dn.document_id
        WHERE dn.namespace_id = $1 
          AND d.deleted_at IS NULL
        ORDER BY d.uploaded_at DESC
        LIMIT $2
        """
        
        results = await db.execute_query(query, namespace_id, limit)
        return [dict(row) for row in results]

    @staticmethod
    async def delete_namespace(namespace_id: uuid.UUID) -> None:
        """Delete a namespace (cascades to document_namespaces)."""
        query = """
        DELETE FROM namespaces
        WHERE id = $1
        """
        
        await db.execute(query, namespace_id)
        logger.info(f"Deleted namespace: {namespace_id}")

    @staticmethod
    async def get_document_count() -> int:
        """Get total count of non-deleted documents."""
        query = """
        SELECT COUNT(*) as count
        FROM documents
        WHERE deleted_at IS NULL
        """
        
        result = await db.execute_one(query)
        return result["count"] if result else 0

    @staticmethod
    async def hard_delete_document(document_id: uuid.UUID) -> None:
        """Permanently delete a document and its chunks."""
        query = """
        DELETE FROM documents
        WHERE id = $1
        """
        
        await db.execute(query, document_id)
        logger.info(f"Hard deleted document: {document_id}")

    @staticmethod
    async def update_namespace_counts(namespace_id: uuid.UUID) -> None:
        """Update document and chunk counts for a namespace."""
        query = """
        UPDATE namespaces n
        SET 
            document_count = (
                SELECT COUNT(DISTINCT d.id)
                FROM documents d
                JOIN document_namespaces dn ON d.id = dn.document_id
                WHERE dn.namespace_id = $1 AND d.deleted_at IS NULL
            ),
            total_chunks = (
                SELECT COALESCE(SUM(d.chunk_count), 0)
                FROM documents d
                JOIN document_namespaces dn ON d.id = dn.document_id
                WHERE dn.namespace_id = $1 AND d.deleted_at IS NULL
            ),
            updated_at = NOW()
        WHERE n.id = $1
        """
        
        await db.execute(query, namespace_id)
        logger.info(f"Updated namespace counts: {namespace_id}")

    @staticmethod
    async def get_namespace_for_document(document_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        """Get the namespace associated with a document."""
        query = """
        SELECT n.id, n.name, n.description, n.default_dense_namespace
        FROM namespaces n
        JOIN document_namespaces dn ON n.id = dn.namespace_id
        WHERE dn.document_id = $1
        LIMIT 1
        """
        
        result = await db.execute_one(query, document_id)
        return dict(result) if result else None
