"""
Pydantic Schemas for Multimodal Document Processing

This module defines all request/response schemas for the multimodal RAG pipeline.
Schemas are organized into categories:

1. Content Schemas: Represent extracted content types (text, tables, images)
2. Chunk Schemas: Represent processed document chunks with metadata
3. Response Schemas: API response structures with processing statistics
4. Request Schemas: Input validation for API endpoints

All schemas use Pydantic v2 with comprehensive validation and documentation.
"""

from typing import Optional
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, ConfigDict


# =============================================================================
# Enums
# =============================================================================

class ContentType(str, Enum):
    """Types of content that can be extracted from documents."""
    TEXT = "text"
    TABLE = "table"
    IMAGE = "image"


class ProcessingStrategy(str, Enum):
    """PDF processing strategies for Unstructured.io."""
    HI_RES = "hi_res"  # High resolution - accurate but slower
    FAST = "fast"       # Fast processing - less accurate but quick


class ProcessingStatus(str, Enum):
    """Status of document processing."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# =============================================================================
# Content Schemas
# =============================================================================

class OriginalContent(BaseModel):
    """
    Original extracted content before AI enhancement.
    
    Preserves raw content for downstream processing and debugging.
    Tables are stored as HTML to maintain structure.
    Images are stored as base64 for API transport and vision LLM processing.
    """
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "raw_text": "Table 1 shows quarterly revenue growth...",
                "tables_html": ["<table><tr><td>Q1</td><td>$1.2M</td></tr></table>"],
                "images_base64": ["iVBORw0KGgoAAAANSUhEUgAA..."]
            }
        }
    )
    
    raw_text: str = Field(
        default="",
        description="Raw text content extracted from the document"
    )
    tables_html: list[str] = Field(
        default_factory=list,
        description="List of tables in HTML format preserving structure"
    )
    images_base64: list[str] = Field(
        default_factory=list,
        description="List of images encoded as base64 strings"
    )


class ExtractedContent(BaseModel):
    """
    Categorized content extracted from PDF partitioning.
    
    Separates content by type for targeted processing:
    - Text elements for standard NLP processing
    - Tables for structured data extraction
    - Images for vision LLM analysis
    """
    
    texts: list[str] = Field(
        default_factory=list,
        description="List of text content strings"
    )
    tables: list[str] = Field(
        default_factory=list,
        description="List of tables as HTML strings"
    )
    images: list[str] = Field(
        default_factory=list,
        description="List of images as base64 strings"
    )
    
    @property
    def has_multimodal_content(self) -> bool:
        """Check if content includes tables or images."""
        return bool(self.tables) or bool(self.images)


# =============================================================================
# Chunk Schemas
# =============================================================================

class ChunkMetadata(BaseModel):
    """
    Metadata associated with a processed chunk.
    
    Includes:
    - Source information (page numbers, element types)
    - Processing flags (AI enhanced, content types present)
    - Timing information for performance analysis
    """
    
    page_numbers: list[int] = Field(
        default_factory=list,
        description="Page numbers this chunk spans"
    )
    element_types: list[str] = Field(
        default_factory=list,
        description="Types of Unstructured elements in chunk"
    )
    is_ai_enhanced: bool = Field(
        default=False,
        description="Whether chunk was enhanced with AI summary"
    )
    ai_model_used: Optional[str] = Field(
        default=None,
        description="AI model used for enhancement if applicable"
    )
    processing_time_ms: Optional[float] = Field(
        default=None,
        description="Time taken to process this chunk in milliseconds"
    )
    token_count: Optional[int] = Field(
        default=None,
        description="Estimated token count for embedding"
    )


class MultimodalChunk(BaseModel):
    """
    A processed document chunk with AI enhancement.
    
    This is the primary output unit of the multimodal pipeline.
    Each chunk contains:
    - Enhanced searchable content (AI-generated for multimodal, raw for text-only)
    - Original content preserved for reference and alternative processing
    - Comprehensive metadata for filtering and analysis
    
    The enhanced_content is optimized for semantic search and retrieval,
    containing descriptions of visual elements, extracted data points,
    and alternative search terms generated by the vision LLM.
    """
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "chunk_id": 1,
                "enhanced_content": "Q3 2024 financial results showing 15% revenue growth. "
                                    "Table displays quarterly breakdown: Q1 $1.2M, Q2 $1.4M, Q3 $1.6M. "
                                    "Bar chart illustrates upward trend in monthly active users.",
                "content_types": ["text", "table", "image"],
                "original_content": {
                    "raw_text": "Q3 2024 Financial Results...",
                    "tables_html": ["<table>...</table>"],
                    "images_base64": ["base64string..."]
                },
                "metadata": {
                    "page_numbers": [5, 6],
                    "is_ai_enhanced": True,
                    "ai_model_used": "gpt-4o"
                }
            }
        }
    )
    
    chunk_id: int = Field(
        ...,
        ge=0,
        description="Unique identifier for this chunk within the document"
    )
    enhanced_content: str = Field(
        ...,
        description="AI-enhanced searchable content or raw text for text-only chunks"
    )
    content_types: list[ContentType] = Field(
        default_factory=list,
        description="Types of content present in this chunk"
    )
    original_content: OriginalContent = Field(
        default_factory=OriginalContent,
        description="Original extracted content before enhancement"
    )
    metadata: ChunkMetadata = Field(
        default_factory=ChunkMetadata,
        description="Processing metadata and source information"
    )
    
    @property
    def is_multimodal(self) -> bool:
        """Check if chunk contains tables or images."""
        return ContentType.TABLE in self.content_types or ContentType.IMAGE in self.content_types
    
    @property
    def char_count(self) -> int:
        """Get character count of enhanced content."""
        return len(self.enhanced_content)


# =============================================================================
# Statistics Schemas
# =============================================================================

class ProcessingStats(BaseModel):
    """
    Statistics about document processing.
    
    Provides insights into:
    - Content distribution (text vs multimodal chunks)
    - Processing decisions (AI enhancement usage)
    - Performance metrics (timing, token usage)
    """
    
    total_elements_extracted: int = Field(
        default=0,
        description="Total raw elements extracted by Unstructured"
    )
    text_only_chunks: int = Field(
        default=0,
        description="Chunks containing only text content"
    )
    chunks_with_tables: int = Field(
        default=0,
        description="Chunks containing table content"
    )
    chunks_with_images: int = Field(
        default=0,
        description="Chunks containing image content"
    )
    ai_enhanced_chunks: int = Field(
        default=0,
        description="Chunks that received AI enhancement"
    )
    ai_enhancement_failures: int = Field(
        default=0,
        description="AI enhancement calls that failed (fallback used)"
    )
    total_tables_found: int = Field(
        default=0,
        description="Total number of tables extracted from document"
    )
    total_images_found: int = Field(
        default=0,
        description="Total number of images extracted from document"
    )
    total_pages: int = Field(
        default=0,
        description="Total pages in the document"
    )
    estimated_tokens: Optional[int] = Field(
        default=None,
        description="Estimated total tokens across all chunks"
    )


# =============================================================================
# Response Schemas
# =============================================================================

class MultimodalProcessResponse(BaseModel):
    """
    Complete response from multimodal document processing.
    
    Contains:
    - File identification info
    - Processing configuration used
    - Detailed statistics about extraction and enhancement
    - All processed chunks ready for embedding/storage
    - Timing information for performance monitoring
    
    This response provides everything needed for downstream RAG pipeline:
    - Use chunks[].enhanced_content for embedding
    - Use chunks[].original_content for reference display
    - Use processing_stats for monitoring and debugging
    """
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "filename": "annual_report_2024.pdf",
                "total_chunks": 15,
                "processing_strategy": "hi_res",
                "ai_enhancement_enabled": True,
                "processing_stats": {
                    "text_only_chunks": 10,
                    "chunks_with_tables": 3,
                    "chunks_with_images": 2,
                    "ai_enhanced_chunks": 5
                },
                "chunks": [],
                "processing_time_seconds": 45.2,
                "processed_at": "2024-01-15T10:30:00Z"
            }
        }
    )
    
    filename: str = Field(
        ...,
        description="Original filename of the processed document"
    )
    total_chunks: int = Field(
        ...,
        ge=0,
        description="Total number of chunks generated"
    )
    processing_strategy: ProcessingStrategy = Field(
        ...,
        description="Strategy used for PDF processing"
    )
    ai_enhancement_enabled: bool = Field(
        ...,
        description="Whether AI enhancement was enabled for this request"
    )
    processing_stats: ProcessingStats = Field(
        default_factory=ProcessingStats,
        description="Detailed processing statistics"
    )
    chunks: list[MultimodalChunk] = Field(
        default_factory=list,
        description="List of all processed chunks"
    )
    processing_time_seconds: float = Field(
        ...,
        ge=0,
        description="Total processing time in seconds"
    )
    processed_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Timestamp when processing completed"
    )
    warnings: list[str] = Field(
        default_factory=list,
        description="Non-fatal warnings encountered during processing"
    )


class HealthCheckResponse(BaseModel):
    """Health check endpoint response."""
    
    status: str = Field(default="healthy")
    version: str
    ai_available: bool
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# =============================================================================
# Error Schemas
# =============================================================================

class ErrorDetail(BaseModel):
    """Detailed error information."""
    
    code: str = Field(..., description="Error code for programmatic handling")
    message: str = Field(..., description="Human-readable error message")
    details: Optional[dict] = Field(default=None, description="Additional error context")


class ErrorResponse(BaseModel):
    """Standard error response format."""
    
    error: ErrorDetail
    request_id: Optional[str] = Field(default=None)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# =============================================================================
# Chunk Analysis Schema (Internal Use)
# =============================================================================

class ChunkAnalysis(BaseModel):
    """
    Analysis result for a single chunk's content.
    
    Used internally by the chunking service to determine
    what processing each chunk requires.
    """
    
    text: str = Field(default="", description="Combined text content")
    tables: list[str] = Field(default_factory=list, description="HTML table strings")
    images: list[str] = Field(default_factory=list, description="Base64 image strings")
    types: list[ContentType] = Field(default_factory=list, description="Content types present")
    
    @property
    def needs_ai_enhancement(self) -> bool:
        """Check if this chunk should be AI-enhanced."""
        return bool(self.tables) or bool(self.images)


# =============================================================================
# Pinecone / Vector Search Schemas
# =============================================================================

class UpsertRequest(BaseModel):
    """Request schema for upserting chunks to Pinecone."""
    
    document_id: Optional[str] = Field(
        default=None,
        description="Unique document identifier (auto-generated if not provided)"
    )
    namespace: Optional[str] = Field(
        default=None,
        description="Pinecone namespace (defaults to configured namespace)"
    )


class UpsertResponse(BaseModel):
    """Response schema for upsert operations."""
    
    status: str = Field(..., description="Operation status")
    document_id: str = Field(..., description="Document identifier")
    records_upserted: int = Field(..., description="Number of records upserted")
    namespace: str = Field(..., description="Namespace used")
    dense_index: str = Field(..., description="Dense index name")
    sparse_index: str = Field(..., description="Sparse index name")
    message: Optional[str] = Field(default=None, description="Additional message")


class SearchRequest(BaseModel):
    """Request schema for hybrid search."""
    
    query: str = Field(..., min_length=1, description="Search query text")
    top_k: Optional[int] = Field(
        default=None,
        ge=1,
        le=100,
        description="Number of results from each index"
    )
    rerank_top_n: Optional[int] = Field(
        default=None,
        ge=1,
        le=50,
        description="Number of results after reranking"
    )
    namespace: Optional[str] = Field(
        default=None,
        description="Namespace to search"
    )
    include_metadata: bool = Field(
        default=True,
        description="Include metadata in results"
    )


class SearchResult(BaseModel):
    """Single search result."""
    
    id: str = Field(..., description="Record ID")
    score: float = Field(..., description="Relevance score")
    chunk_text: str = Field(..., description="Retrieved chunk text")
    metadata: Optional[dict] = Field(default=None, description="Additional metadata")


class SearchStats(BaseModel):
    """Statistics about the search operation."""
    
    dense_results: int = Field(..., description="Results from dense index")
    sparse_results: int = Field(..., description="Results from sparse index")
    merged_unique: int = Field(..., description="Unique results after merging")
    final_results: int = Field(..., description="Results after reranking")
    search_time_seconds: float = Field(..., description="Total search time")


class SearchResponse(BaseModel):
    """Response schema for hybrid search."""
    
    query: str = Field(..., description="Original query")
    results: list[SearchResult] = Field(default_factory=list, description="Search results")
    stats: SearchStats = Field(..., description="Search statistics")


class RAGRequest(BaseModel):
    """Request schema for full RAG pipeline (search + generate)."""
    
    question: str = Field(..., min_length=1, description="Question to answer")
    top_k: Optional[int] = Field(
        default=None,
        ge=1,
        le=100,
        description="Number of results to retrieve"
    )
    namespace: Optional[str] = Field(
        default=None,
        description="Namespace to search"
    )
    max_tokens: Optional[int] = Field(
        default=None,
        ge=100,
        le=4000,
        description="Maximum tokens in response"
    )
    temperature: Optional[float] = Field(
        default=None,
        ge=0,
        le=2,
        description="Sampling temperature"
    )
    system_message: Optional[str] = Field(
        default=None,
        description="Custom system message for the LLM"
    )


class RAGSource(BaseModel):
    """Source information for RAG response."""
    
    id: str = Field(..., description="Source record ID")
    score: float = Field(..., description="Relevance score")
    preview: str = Field(..., description="Text preview")


class RAGResponse(BaseModel):
    """Response schema for full RAG pipeline."""
    
    question: str = Field(..., description="Original question")
    answer: str = Field(..., description="Generated answer")
    sources: list[RAGSource] = Field(default_factory=list, description="Source documents")
    model_used: str = Field(..., description="Model used for generation")
    search_stats: Optional[SearchStats] = Field(default=None, description="Search statistics")


class IndexStats(BaseModel):
    """Statistics for a Pinecone index."""
    
    name: str = Field(..., description="Index name")
    stats: dict = Field(..., description="Index statistics")


class PineconeStatusResponse(BaseModel):
    """Response schema for Pinecone status check."""
    
    status: str = Field(default="healthy")
    dense_index: IndexStats
    sparse_index: IndexStats
    namespace: str = Field(..., description="Default namespace")


class DeleteDocumentRequest(BaseModel):
    """Request schema for deleting a document."""
    
    document_id: str = Field(..., description="Document ID to delete")
    namespace: Optional[str] = Field(default=None, description="Namespace")


class DeleteNamespaceRequest(BaseModel):
    """Request schema for deleting a namespace."""
    
    namespace: str = Field(..., description="Namespace to delete")
    confirm: bool = Field(
        default=False,
        description="Must be true to confirm deletion"
    )


# =============================================================================
# Namespace Management Schemas
# =============================================================================

class NamespaceMetadata(BaseModel):
    """Metadata for a namespace."""
    
    last_modified: Optional[datetime] = Field(default=None, description="Last modification timestamp")
    vector_count: Optional[int] = Field(default=None, description="Total vectors in namespace")


class NamespaceBase(BaseModel):
    """Base namespace schema."""
    
    name: str = Field(..., min_length=1, max_length=255, description="Namespace name")
    description: Optional[str] = Field(default=None, description="Namespace description")


class NamespaceCreate(NamespaceBase):
    """Request schema for creating a namespace."""
    pass


class NamespaceResponse(BaseModel):
    """Response schema for a namespace."""
    
    id: str = Field(..., description="Unique namespace identifier")
    name: str = Field(..., description="Namespace name")
    description: Optional[str] = Field(default=None, description="Namespace description")
    document_count: int = Field(default=0, description="Number of documents in namespace")
    total_chunks: int = Field(default=0, description="Total chunks in namespace")
    created_at: datetime = Field(..., description="Creation timestamp")
    metadata: Optional[NamespaceMetadata] = Field(default=None, description="Additional metadata")


class NamespaceDetailResponse(NamespaceResponse):
    """Detailed namespace response with documents list."""
    
    documents: list[str] = Field(default_factory=list, description="List of document IDs")
    stats: Optional[dict] = Field(default=None, description="Namespace statistics")


class NamespaceListResponse(BaseModel):
    """Response schema for listing namespaces."""
    
    namespaces: list[NamespaceResponse] = Field(default_factory=list)
    total: int = Field(default=0)


class NamespaceDeleteResponse(BaseModel):
    """Response schema for namespace deletion."""
    
    status: str = Field(default="success")
    message: str = Field(..., description="Deletion result message")
    deleted_documents: list[str] = Field(default_factory=list, description="IDs of deleted documents")


# =============================================================================
# Document Management Schemas
# =============================================================================

class DocumentMetadata(BaseModel):
    """Metadata for a document."""
    
    processing_strategy: Optional[str] = Field(default=None, description="Processing strategy used")
    chunk_count: Optional[int] = Field(default=None, description="Number of chunks")
    has_images: bool = Field(default=False, description="Document contains images")
    has_tables: bool = Field(default=False, description="Document contains tables")


class DocumentBase(BaseModel):
    """Base document schema."""
    
    name: str = Field(..., description="Document filename")
    namespace_id: Optional[str] = Field(default=None, description="Namespace ID")


class DocumentResponse(BaseModel):
    """Response schema for a document."""
    
    id: str = Field(..., description="Unique document identifier")
    name: str = Field(..., description="Document filename")
    page_count: Optional[int] = Field(default=None, description="Number of pages")
    file_size: str = Field(default="0 B", description="Formatted file size")
    file_size_bytes: int = Field(default=0, description="File size in bytes")
    uploaded_at: datetime = Field(..., description="Upload timestamp")
    namespace: Optional[str] = Field(default=None, description="Namespace ID")
    namespace_name: Optional[str] = Field(default=None, description="Namespace name")
    metadata: Optional[DocumentMetadata] = Field(default=None, description="Document metadata")


class DocumentDetailResponse(DocumentResponse):
    """Detailed document response with processing stats."""
    
    processing_stats: Optional[dict] = Field(default=None, description="Processing statistics")


class DocumentListResponse(BaseModel):
    """Response schema for listing documents."""
    
    documents: list[DocumentResponse] = Field(default_factory=list)
    total: int = Field(default=0)
    page: int = Field(default=1)
    limit: int = Field(default=10)


class DocumentDeleteResponse(BaseModel):
    """Response schema for document deletion."""
    
    status: str = Field(default="success")
    message: str = Field(default="Document deleted successfully")
    document_id: str = Field(..., description="Deleted document ID")
    vectors_deleted: int = Field(default=0, description="Number of vectors deleted from Pinecone")


# =============================================================================
# Chat Schemas
# =============================================================================

class ChatMode(str, Enum):
    """Chat modes for different query scopes."""
    NAMESPACE = "namespace"  # Chat with all documents in a namespace
    SINGLE = "single"        # Chat with a single document
    MULTI = "multi"          # Chat with multiple selected documents


class ChatRequest(BaseModel):
    """Request schema for chat endpoint."""
    
    message: str = Field(..., min_length=1, description="User message/question")
    mode: ChatMode = Field(..., description="Chat mode: namespace, single, or multi")
    namespace_id: Optional[str] = Field(
        default=None,
        description="Namespace ID (required for namespace mode)"
    )
    document_id: Optional[str] = Field(
        default=None,
        description="Single document ID (required for single mode)"
    )
    document_ids: Optional[list[str]] = Field(
        default=None,
        description="Multiple document IDs (required for multi mode)"
    )
    temperature: Optional[float] = Field(
        default=0.3,
        ge=0,
        le=2,
        description="Sampling temperature"
    )
    max_tokens: Optional[int] = Field(
        default=2000,
        ge=100,
        le=4000,
        description="Maximum tokens in response"
    )
    top_k: Optional[int] = Field(
        default=5,
        ge=1,
        le=50,
        description="Number of search results to retrieve"
    )
    use_hybrid_search: bool = Field(
        default=True,
        description="Use hybrid search (dense + sparse)"
    )


class ChatSource(BaseModel):
    """Source information for chat response."""
    
    document_name: str = Field(..., description="Source document name")
    document_id: str = Field(..., description="Source document ID")
    page_number: Optional[int] = Field(default=None, description="Page number")
    chunk_text: str = Field(..., description="Retrieved chunk text")
    score: float = Field(..., description="Relevance score")
    metadata: Optional[dict] = Field(default=None, description="Additional metadata")


class ChatMetadata(BaseModel):
    """Metadata for chat response."""
    
    model_used: str = Field(..., description="LLM model used")
    search_time_ms: float = Field(..., description="Search time in milliseconds")
    generation_time_ms: float = Field(..., description="Generation time in milliseconds")
    total_tokens: Optional[int] = Field(default=None, description="Total tokens used")
    mode: ChatMode = Field(..., description="Chat mode used")
    documents_searched: int = Field(default=0, description="Number of documents searched")


class ChatResponse(BaseModel):
    """Response schema for chat endpoint."""
    
    response: str = Field(..., description="Generated answer")
    sources: list[ChatSource] = Field(default_factory=list, description="Source documents")
    metadata: ChatMetadata = Field(..., description="Response metadata")
