
"""
Pinecone Vector Database Service

This module provides hybrid search capabilities using Pinecone's integrated inference.
It implements:
- Dense embeddings using llama-text-embed-v2
- Sparse embeddings using pinecone-sparse-english-v0
- Hybrid search with result merging and deduplication
- Reranking using bge-reranker-v2-m3

The service handles index creation, document upserting, and retrieval for RAG pipelines.
"""

import logging
import time
import uuid
from typing import Optional
from datetime import datetime

import backoff
from pinecone import Pinecone

from app.core.config import settings
from app.models.schemas import MultimodalChunk

# Configure logging
logger = logging.getLogger(__name__)


# =============================================================================
# Custom Exceptions
# =============================================================================

class PineconeServiceError(Exception):
    """Base exception for Pinecone service errors."""
    pass


class PineconeConnectionError(PineconeServiceError):
    """Raised when connection to Pinecone fails."""
    pass


class PineconeUpsertError(PineconeServiceError):
    """Raised when upserting to Pinecone fails."""
    pass


class PineconeSearchError(PineconeServiceError):
    """Raised when searching Pinecone fails."""
    pass


# =============================================================================
# Pinecone Service Class
# =============================================================================

class PineconeService:
    """
    Service for hybrid search using Pinecone with integrated inference.
    
    This service manages both dense and sparse indexes for hybrid retrieval,
    using Pinecone's hosted embedding models for automatic vectorization.
    
    Attributes:
        pc: Pinecone client instance
        dense_index: Dense vector index for semantic search
        sparse_index: Sparse vector index for lexical search
        namespace: Default namespace for all operations
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        namespace: Optional[str] = None
    ):
        """
        Initialize Pinecone service with indexes.
        
        Args:
            api_key: Pinecone API key (defaults to settings)
            namespace: Namespace for vector operations (defaults to settings)
        
        Raises:
            PineconeConnectionError: If connection to Pinecone fails
        """
        self.api_key = api_key or settings.PINECONE_API_KEY
        self.namespace = namespace or settings.PINECONE_NAMESPACE
        
        if not self.api_key:
            raise PineconeConnectionError(
                "Pinecone API key not configured. Set PINECONE_API_KEY environment variable."
            )
        
        logger.info("Initializing Pinecone service...")
        
        try:
            # Initialize Pinecone client
            self.pc = Pinecone(
                api_key=self.api_key,
                source_tag="rag-comparator:multimodal-rag-pipeline"
            )
            
            # Initialize indexes
            self.dense_index_name = settings.PINECONE_DENSE_INDEX_NAME
            self.sparse_index_name = settings.PINECONE_SPARSE_INDEX_NAME
            
            self._initialize_indexes()
            
            logger.info(
                f"Pinecone service initialized. "
                f"Dense index: {self.dense_index_name}, "
                f"Sparse index: {self.sparse_index_name}"
            )
            
        except Exception as e:
            error_msg = f"Failed to initialize Pinecone: {str(e)}"
            logger.error(error_msg, exc_info=True)
            raise PineconeConnectionError(error_msg) from e
    
    def _initialize_indexes(self) -> None:
        """
        Initialize dense and sparse indexes with integrated inference.
        
        Creates indexes if they don't exist, using Pinecone-hosted
        embedding models for automatic vectorization.`
        """
        # Initialize dense index for semantic search
        if not self.pc.has_index(self.dense_index_name):
            logger.info(f"Creating dense index: {self.dense_index_name}")
            self.pc.create_index_for_model(
                name=self.dense_index_name,
                cloud=settings.PINECONE_CLOUD,
                region=settings.PINECONE_REGION,
                embed={  # type: ignore
                    "model": settings.PINECONE_DENSE_MODEL,
                    "field_map": {"text": "chunk_text"}
                }
            )
            logger.info(f"Dense index created with model: {settings.PINECONE_DENSE_MODEL}")
            logger.info("Waiting for dense index to be ready...")
            self._wait_for_index_ready(self.dense_index_name)
        
        self.dense_index = self.pc.Index(self.dense_index_name)
        
        # Initialize sparse index for lexical search
        if not self.pc.has_index(self.sparse_index_name):
            logger.info(f"Creating sparse index: {self.sparse_index_name}")
            self.pc.create_index_for_model(
                name=self.sparse_index_name,
                cloud=settings.PINECONE_CLOUD,
                region=settings.PINECONE_REGION,
                embed={  # type: ignore
                    "model": settings.PINECONE_SPARSE_MODEL,
                    "field_map": {"text": "chunk_text"}
                }
            )
            logger.info(f"Sparse index created with model: {settings.PINECONE_SPARSE_MODEL}")
            logger.info("Waiting for sparse index to be ready...")
            self._wait_for_index_ready(self.sparse_index_name)
        
        self.sparse_index = self.pc.Index(self.sparse_index_name)
    
    def _wait_for_index_ready(self, index_name: str, timeout: int = 120) -> None:
        """
        Wait for a Pinecone index to be ready.
        
        Args:
            index_name: Name of the index to wait for
            timeout: Maximum time to wait in seconds
        
        Raises:
            PineconeConnectionError: If index doesn't become ready in time
        """
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                index_desc = self.pc.describe_index(index_name)
                if index_desc.status and index_desc.status.ready:
                    logger.info(f"Index {index_name} is ready")
                    return
                logger.debug(f"Index {index_name} not ready yet, waiting...")
                time.sleep(5)
            except Exception as e:
                logger.warning(f"Error checking index status: {e}")
                time.sleep(5)
        
        raise PineconeConnectionError(
            f"Index {index_name} did not become ready within {timeout} seconds"
        )
    
    def get_index_stats(self) -> dict:
        """
        Get statistics for both indexes.
        
        Returns:
            Dictionary containing stats for dense and sparse indexes
        """
        return {
            "dense_index": {
                "name": self.dense_index_name,
                "stats": self.dense_index.describe_index_stats()
            },
            "sparse_index": {
                "name": self.sparse_index_name,
                "stats": self.sparse_index.describe_index_stats()
            }
        }
    
    # =========================================================================
    # Upserting Documents
    # =========================================================================
    
    def prepare_records_from_chunks(
        self,
        chunks: list[MultimodalChunk],
        document_id: str,
        filename: str
    ) -> list[dict]:
        """
        Convert MultimodalChunks to Pinecone record format.
        
        Args:
            chunks: List of processed document chunks
            document_id: Unique identifier for the source document
            filename: Original filename
        
        Returns:
            List of records ready for upserting
        """
        records = []
        
        for chunk in chunks:
            record_id = f"{document_id}_{chunk.chunk_id}"
            
            record = {
                "_id": record_id,
                "chunk_text": chunk.enhanced_content,
                "document_id": document_id,
                "filename": filename,
                "chunk_id": chunk.chunk_id,
                "content_types": [ct.value for ct in chunk.content_types],
                "page_numbers": [str(p) for p in chunk.metadata.page_numbers] if chunk.metadata.page_numbers else [],
                "is_ai_enhanced": chunk.metadata.is_ai_enhanced,
                "has_tables": "table" in [ct.value for ct in chunk.content_types],
                "has_images": "image" in [ct.value for ct in chunk.content_types],
                "char_count": len(chunk.enhanced_content),
                "created_at": datetime.utcnow().isoformat()
            }
            
            records.append(record)
        
        return records
    
    @backoff.on_exception(
        backoff.expo,
        Exception,
        max_tries=10,
        max_time=300,
        base=4,
        on_backoff=lambda details: logger.warning(
            f"Upsert backoff: attempt {details['tries']} of 10"
        )
    )
    def _upsert_batch(
        self,
        index,
        records: list[dict],
        namespace: str
    ) -> None:
        """
        Upsert a batch of records with exponential backoff.
        
        Args:
            index: Pinecone index to upsert to
            records: List of records to upsert
            namespace: Namespace for the records
        """
        index.upsert_records(namespace=namespace, records=records)
    
    def upsert_chunks(
        self,
        chunks: list[MultimodalChunk],
        document_id: Optional[str] = None,
        filename: str = "unknown",
        namespace: Optional[str] = None,
        batch_size: Optional[int] = None
    ) -> dict:
        """
        Upsert document chunks to both dense and sparse indexes.
        
        Args:
            chunks: List of MultimodalChunks to upsert
            document_id: Unique document identifier (auto-generated if not provided)
            filename: Original filename for metadata
            namespace: Namespace for vectors (defaults to configured namespace)
            batch_size: Batch size for upserting (defaults to configured batch size)
        
        Returns:
            Dictionary with upsert statistics
        
        Raises:
            PineconeUpsertError: If upserting fails
        """
        if not chunks:
            return {
                "status": "skipped",
                "message": "No chunks to upsert",
                "records_upserted": 0
            }
        
        document_id = document_id or str(uuid.uuid4())
        namespace = namespace or self.namespace
        batch_size = batch_size or settings.PINECONE_UPSERT_BATCH_SIZE
        
        logger.info(
            f"Upserting {len(chunks)} chunks for document {document_id} "
            f"to namespace '{namespace}'"
        )
        
        try:
            # Prepare records
            records = self.prepare_records_from_chunks(chunks, document_id, filename)
            
            # Upsert to both indexes in batches
            total_batches = (len(records) + batch_size - 1) // batch_size
            
            for i in range(0, len(records), batch_size):
                batch = records[i:i + batch_size]
                batch_num = (i // batch_size) + 1
                
                logger.debug(f"Upserting batch {batch_num}/{total_batches}")
                
                # Upsert to dense index
                self._upsert_batch(self.dense_index, batch, namespace)
                
                # Upsert to sparse index
                self._upsert_batch(self.sparse_index, batch, namespace)
                
                # Rate limiting delay
                if i + batch_size < len(records):
                    time.sleep(1.5)
            
            logger.info(f"Successfully upserted {len(records)} records to both indexes")
            
            return {
                "status": "success",
                "document_id": document_id,
                "records_upserted": len(records),
                "namespace": namespace,
                "dense_index": self.dense_index_name,
                "sparse_index": self.sparse_index_name
            }
            
        except Exception as e:
            error_msg = f"Failed to upsert chunks: {str(e)}"
            logger.error(error_msg, exc_info=True)
            raise PineconeUpsertError(error_msg) from e
    
    # =========================================================================
    # Hybrid Search
    # =========================================================================
    
    def _search_index(
        self,
        index,
        query: str,
        top_k: int,
        namespace: str
    ) -> list[dict]:
        """
        Search a single index using integrated inference.
        
        Args:
            index: Pinecone index to search
            query: Search query text
            top_k: Number of results to retrieve
            namespace: Namespace to search in
        
        Returns:
            List of search result hits
        """
        results = index.search(
            namespace=namespace,
            query={
                "top_k": top_k,
                "inputs": {"text": query}
            }
        )
        
        return results["result"]["hits"]
    
    def _merge_and_deduplicate(
        self,
        sparse_results: list[dict],
        dense_results: list[dict]
    ) -> list[dict]:
        """
        Merge results from sparse and dense search, removing duplicates.
        
        Args:
            sparse_results: Results from sparse index search
            dense_results: Results from dense index search
        
        Returns:
            Deduplicated and sorted list of results
        """
        # Deduplicate by _id, keeping higher score
        merged = {}
        for hit in sparse_results + dense_results:
            hit_id = hit['_id']
            if hit_id not in merged or hit['_score'] > merged[hit_id]['_score']:
                merged[hit_id] = hit
        
        # Sort by score descending
        sorted_hits = sorted(merged.values(), key=lambda x: x['_score'], reverse=True)
        
        # Transform to format for reranking
        return [
            {
                '_id': hit['_id'],
                'chunk_text': hit['fields']['chunk_text'],
                'metadata': {k: v for k, v in hit['fields'].items() if k != 'chunk_text'}
            }
            for hit in sorted_hits
        ]
    
    def _rerank_results(
        self,
        query: str,
        results: list[dict],
        top_n: int
    ) -> list[dict]:
        """
        Rerank merged results using Pinecone's hosted reranking model.
        
        Args:
            query: Original search query
            results: Merged results to rerank
            top_n: Number of results to return after reranking
        
        Returns:
            Reranked results with unified relevance scores
        """
        if not results:
            return []
        
        reranked = self.pc.inference.rerank(
            model=settings.PINECONE_RERANK_MODEL,
            query=query,
            documents=results,
            rank_fields=["chunk_text"],
            top_n=top_n,
            return_documents=True,
            parameters={"truncate": "END"}
        )
        
        return reranked.data
    
    def hybrid_search(
        self,
        query: str,
        top_k: Optional[int] = None,
        rerank_top_n: Optional[int] = None,
        namespace: Optional[str] = None,
        include_metadata: bool = True,
        document_ids: Optional[list[str]] = None,
    ) -> dict:
        """
        Perform hybrid search using both dense and sparse indexes.
        
        This method:
        1. Searches the dense index for semantic matches
        2. Searches the sparse index for lexical matches
        3. Merges and deduplicates results
        4. Filters by document_ids if provided
        5. Reranks using bge-reranker-v2-m3
        6. Returns the most relevant matches
        
        Args:
            query: Search query text
            top_k: Number of results from each index (default: configured value)
            rerank_top_n: Number of results after reranking (default: configured value)
            namespace: Namespace to search (default: configured namespace)
            include_metadata: Whether to include full metadata in results
            document_ids: Optional list of document IDs to filter results
        
        Returns:
            Dictionary containing search results and statistics
        
        Raises:
            PineconeSearchError: If search fails
        """
        top_k = top_k or settings.PINECONE_TOP_K
        rerank_top_n = rerank_top_n or settings.PINECONE_RERANK_TOP_N
        namespace = namespace or self.namespace
        
        logger.info(f"Hybrid search: '{query[:50]}...' in namespace '{namespace}'")
        
        try:
            start_time = time.time()
            
            # Increase search count if filtering by document_ids
            search_top_k = top_k * 3 if document_ids else top_k
            
            # 1. Search dense index (semantic search)
            logger.debug("Searching dense index...")
            dense_results = self._search_index(
                self.dense_index, query, search_top_k, namespace
            )
            
            # 2. Search sparse index (lexical search)
            logger.debug("Searching sparse index...")
            sparse_results = self._search_index(
                self.sparse_index, query, search_top_k, namespace
            )
            
            # 3. Merge and deduplicate
            logger.debug("Merging results...")
            merged_results = self._merge_and_deduplicate(sparse_results, dense_results)
            
            # 3.5. Filter by document_ids if provided
            if document_ids:
                document_ids_set = set(document_ids)
                logger.info(f"Filtering by document_ids: {document_ids_set}")
                
                # DEBUG: Log what document_ids are in the search results
                found_doc_ids = set()
                for result in merged_results[:5]:  # Log first 5
                    doc_id = result.get('metadata', {}).get('document_id', 'NO_DOC_ID')
                    found_doc_ids.add(doc_id)
                logger.info(f"Sample document_ids in Pinecone results: {found_doc_ids}")
                
                filtered_merged = []
                for result in merged_results:
                    doc_id = result.get('metadata', {}).get('document_id', '')
                    if doc_id in document_ids_set:
                        filtered_merged.append(result)
                merged_results = filtered_merged
                logger.info(f"Filtered to {len(merged_results)} results for {len(document_ids)} documents")
            
            # 4. Rerank
            logger.debug("Reranking results...")
            reranked_results = self._rerank_results(query, merged_results, rerank_top_n)
            
            search_time = time.time() - start_time
            
            # Format response
            formatted_results = []
            for item in reranked_results:
                result = {
                    "id": item['document']['_id'],
                    "score": round(item['score'], 4),
                    "chunk_text": item['document']['chunk_text']
                }
                
                if include_metadata and 'metadata' in item['document']:
                    result["metadata"] = item['document']['metadata']
                
                formatted_results.append(result)
            
            logger.info(
                f"Hybrid search completed in {search_time:.2f}s. "
                f"Dense: {len(dense_results)}, Sparse: {len(sparse_results)}, "
                f"Merged: {len(merged_results)}, Final: {len(formatted_results)}"
            )
            
            return {
                "query": query,
                "results": formatted_results,
                "stats": {
                    "dense_results": len(dense_results),
                    "sparse_results": len(sparse_results),
                    "merged_unique": len(merged_results),
                    "final_results": len(formatted_results),
                    "search_time_seconds": round(search_time, 3)
                }
            }
            
        except Exception as e:
            error_msg = f"Hybrid search failed: {str(e)}"
            logger.error(error_msg, exc_info=True)
            raise PineconeSearchError(error_msg) from e
    
    # =========================================================================
    # RAG Augmentation
    # =========================================================================
    
    def format_search_results_for_prompt(
        self,
        results: list[dict]
    ) -> str:
        """
        Format search results as XML for LLM augmentation.
        
        Args:
            results: List of search results
        
        Returns:
            Formatted string with search results in XML format
        """
        items = []
        for i, result in enumerate(results):
            chunk_text = result.get('chunk_text', result.get('document', {}).get('chunk_text', ''))
            items.append(
                f'<item index="{i+1}">\n'
                f'<page_content>\n{chunk_text}\n</page_content>\n'
                f'</item>'
            )
        
        return f"\n<search_results>\n{''.join(items)}\n</search_results>"
    
    def create_augmented_prompt(
        self,
        search_results: list[dict],
        question: str,
        system_context: Optional[str] = None
    ) -> str:
        """
        Create an augmented prompt with search results for RAG generation.
        
        Args:
            search_results: List of search results from hybrid_search
            question: User's question
            system_context: Optional additional context
        
        Returns:
            Augmented prompt string ready for LLM
        """
        formatted_results = self.format_search_results_for_prompt(search_results)
        
        prompt = (
            f"{formatted_results}\n\n"
            f"Using the search results provided within the <search_results></search_results> tags, "
            f"please answer the following question:\n\n"
            f"<question>{question}</question>\n\n"
            f"Do not reference the search results directly in your answer. "
            f"Provide a comprehensive and accurate response based on the information available."
        )
        
        if system_context:
            prompt = f"{system_context}\n\n{prompt}"
        
        return prompt
    
    # =========================================================================
    # Document Management
    # =========================================================================
    
    def delete_document(
        self,
        document_id: str,
        namespace: Optional[str] = None
    ) -> dict:
        """
        Delete all vectors associated with a document from both indexes.
        
        Args:
            document_id: Document ID to delete
            namespace: Namespace containing the document
        
        Returns:
            Deletion status
        """
        namespace = namespace or self.namespace
        
        logger.info(f"Deleting document {document_id} from namespace '{namespace}'")
        
        try:
            # Delete from dense index
            self.dense_index.delete(
                filter={"document_id": {"$eq": document_id}},  # type: ignore
                namespace=namespace
            )
            
            # Delete from sparse index
            self.sparse_index.delete(
                filter={"document_id": {"$eq": document_id}},  # type: ignore
                namespace=namespace
            )
            
            logger.info(f"Document {document_id} deleted from both indexes")
            
            return {
                "status": "success",
                "document_id": document_id,
                "namespace": namespace
            }
            
        except Exception as e:
            error_msg = f"Failed to delete document: {str(e)}"
            logger.error(error_msg, exc_info=True)
            raise PineconeServiceError(error_msg) from e
    
    def delete_namespace(self, namespace: str) -> dict:
        """
        Delete all vectors in a namespace from both indexes.
        
        Args:
            namespace: Namespace to delete
        
        Returns:
            Deletion status
        """
        logger.warning(f"Deleting entire namespace '{namespace}' from both indexes")
        
        try:
            self.dense_index.delete(namespace=namespace, delete_all=True)
            self.sparse_index.delete(namespace=namespace, delete_all=True)
            
            return {
                "status": "success",
                "namespace": namespace,
                "message": "Namespace deleted from both indexes"
            }
            
        except Exception as e:
            error_msg = f"Failed to delete namespace: {str(e)}"
            logger.error(error_msg, exc_info=True)
            raise PineconeServiceError(error_msg) from e


# =============================================================================
# Factory Function
# =============================================================================

def get_pinecone_service() -> PineconeService:
    """
    Factory function to get a PineconeService instance.
    
    Returns:
        PineconeService instance
    
    Raises:
        PineconeConnectionError: If Pinecone is not configured
    """
    if not settings.is_pinecone_available:
        raise PineconeConnectionError(
            "Pinecone is not configured. Set PINECONE_API_KEY environment variable."
        )
    
    return PineconeService()
