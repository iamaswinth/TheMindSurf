"""
Intelligent Chunking Service with AI Enhancement

This service handles semantic chunking of document elements and AI-powered
enhancement of multimodal content (tables and images) using GPT-4o vision.

Key Features:
- Title-based semantic chunking that preserves document structure
- AI-enhanced summaries for chunks containing tables or images
- Vision LLM integration for describing visual content
- Graceful fallback when AI is unavailable or fails
- LangChain Document creation for downstream RAG processing

Architecture:
    Raw Elements → chunk_by_title() → Semantic Chunks
    Chunk + Analysis → create_ai_enhanced_summary() → Searchable Summary
    All Chunks → process_chunks_with_ai() → List[Document]

AI Enhancement Strategy:
    - Text-only chunks: Use raw text (no AI processing needed)
    - Multimodal chunks: Generate searchable descriptions using vision LLM
    - Failed AI calls: Gracefully fallback to concatenated raw content

Usage:
    chunker = ChunkingService()
    chunks = chunker.chunk_by_title(elements)
    documents = await chunker.process_chunks_with_ai(chunks, processor)
"""

import json
import logging
import time
from typing import Optional

from langchain_core.documents import Document
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from unstructured.documents.elements import Element
from unstructured.chunking.title import chunk_by_title

from app.models.schemas import (
    MultimodalChunk,
    ChunkAnalysis,
    ChunkMetadata,
    OriginalContent,
    ContentType,
    ProcessingStats,
)
from app.services.multimodal_processor import MultimodalProcessor
from app.core.config import settings

# Configure logging
logger = logging.getLogger(__name__)


class ChunkingServiceError(Exception):
    """Base exception for chunking service errors."""
    pass


class AIEnhancementError(ChunkingServiceError):
    """Raised when AI enhancement fails."""
    pass


class ChunkingService:
    """
    Service for intelligent document chunking with AI enhancement.
    
    This service provides two main capabilities:
    
    1. Semantic Chunking: Uses Unstructured's chunk_by_title() to create
       semantically meaningful chunks that preserve document structure.
       Chunks are split at section boundaries (titles) rather than
       arbitrary character positions.
    
    2. AI Enhancement: For chunks containing tables or images, uses
       GPT-4o (vision-capable) to generate searchable summaries that
       describe visual content, extract key data points, and create
       alternative search terms.
    
    The combination creates chunks optimized for semantic search:
    - Text-only chunks preserve original language for keyword matching
    - Multimodal chunks gain searchable descriptions of visual content
    
    Attributes:
        max_characters: Hard limit for chunk size
        new_after_n_chars: Soft limit - prefer to split after this
        combine_under_n_chars: Merge chunks smaller than this
        llm: OpenAI chat model for AI enhancement (None if unavailable)
    
    Example:
        ```python
        chunker = ChunkingService()
        processor = MultimodalProcessor()
        
        # Extract and chunk document
        elements = await processor.partition_pdf_multimodal(pdf_bytes)
        chunks = chunker.chunk_by_title(elements)
        
        # Process with AI enhancement
        documents, stats = await chunker.process_chunks_with_ai(
            chunks, processor
        )
        
        # Use documents for embedding
        for doc in documents:
            embedding = embedder.embed(doc.page_content)
        ```
    """
    
    def __init__(
        self,
        max_characters: Optional[int] = None,
        new_after_n_chars: Optional[int] = None,
        combine_under_n_chars: Optional[int] = None,
    ):
        """
        Initialize the chunking service.
        
        Args:
            max_characters: Hard maximum characters per chunk
            new_after_n_chars: Soft limit - start new chunk after this
            combine_under_n_chars: Merge chunks smaller than this
        """
        # Chunking parameters from config or explicit values
        self.max_characters = max_characters or settings.MAX_CHUNK_CHARACTERS
        self.new_after_n_chars = new_after_n_chars or settings.NEW_CHUNK_AFTER_N_CHARS
        self.combine_under_n_chars = combine_under_n_chars or settings.MIN_CHUNK_CHARACTERS
        
        # Initialize LLM for AI enhancement if available
        self.llm: Optional[ChatOpenAI] = None
        self._initialize_llm()
        
        logger.info(
            f"ChunkingService initialized: "
            f"max={self.max_characters}, "
            f"soft_limit={self.new_after_n_chars}, "
            f"min={self.combine_under_n_chars}, "
            f"ai_available={self.llm is not None}"
        )
    
    def _initialize_llm(self) -> None:
        """Initialize the OpenAI LLM for AI enhancement."""
        is_valid, message = settings.validate_ai_config()
        
        if not is_valid:
            logger.warning(f"AI enhancement unavailable: {message}")
            return
        
        try:
            self.llm = ChatOpenAI(
                model=settings.OPENAI_VISION_MODEL,
                api_key=settings.OPENAI_API_KEY,  # type: ignore
                temperature=settings.OPENAI_TEMPERATURE,
                timeout=settings.AI_ENHANCEMENT_TIMEOUT,
            )
            logger.info(f"AI enhancement enabled with model: {settings.OPENAI_VISION_MODEL}")
        except Exception as e:
            logger.error(f"Failed to initialize LLM: {e}")
            self.llm = None
    
    def chunk_by_title(
        self,
        elements: list[Element],
        max_characters: Optional[int] = None,
        new_after_n_chars: Optional[int] = None,
        combine_under_n_chars: Optional[int] = None,
    ) -> list[Element]:
        """
        Chunk elements semantically by title boundaries.
        
        Uses Unstructured's chunk_by_title() strategy which:
        - Keeps sections together under their titles
        - Respects document structure and hierarchy
        - Preserves original elements in metadata.orig_elements
        
        This creates more semantically meaningful chunks than arbitrary
        character-based splitting, improving retrieval quality.
        
        Args:
            elements: Raw elements from partition_pdf_multimodal()
            max_characters: Override max chunk size
            new_after_n_chars: Override soft limit
            combine_under_n_chars: Override minimum chunk size
        
        Returns:
            List of chunked elements with metadata.orig_elements preserved
        
        Note:
            The orig_elements metadata is critical for downstream processing
            as it allows us to analyze what content types are in each chunk.
        """
        max_chars = max_characters or self.max_characters
        soft_limit = new_after_n_chars or self.new_after_n_chars
        min_chars = combine_under_n_chars or self.combine_under_n_chars
        
        logger.info(
            f"Chunking {len(elements)} elements "
            f"(max={max_chars}, soft={soft_limit}, min={min_chars})"
        )
        
        try:
            chunks = chunk_by_title(
                elements,
                max_characters=max_chars,
                new_after_n_chars=soft_limit,
                combine_text_under_n_chars=min_chars,
                # Preserve original elements for content analysis
                include_orig_elements=True,
            )
            
            logger.info(f"Created {len(chunks)} chunks from {len(elements)} elements")
            return chunks
            
        except Exception as e:
            logger.error(f"Chunking failed: {e}", exc_info=True)
            raise ChunkingServiceError(f"Failed to chunk elements: {e}") from e
    
    async def create_ai_enhanced_summary(
        self,
        text: str,
        tables: list[str],
        images: list[str],
    ) -> str:
        """
        Generate an AI-enhanced searchable summary for multimodal content.
        
        Uses GPT-4o (vision model) to create comprehensive descriptions that
        include:
        - Key facts, numbers, and data points
        - Main topics and concepts
        - Questions the content could answer
        - Visual element descriptions (charts, diagrams, patterns)
        - Alternative search terms
        
        The goal is to create text that will match diverse user queries,
        making the visual content searchable.
        
        Args:
            text: Text content from the chunk
            tables: List of HTML table strings
            images: List of base64-encoded image strings
        
        Returns:
            AI-generated searchable summary string
        
        Raises:
            AIEnhancementError: If AI call fails (caller should use fallback)
        
        Note:
            This is an expensive operation (API cost + latency).
            Only call for chunks that actually contain tables or images.
        """
        if not self.llm:
            raise AIEnhancementError("LLM not available for AI enhancement")
        
        if settings.LOG_AI_USAGE:
            logger.info(
                f"AI enhancement requested: "
                f"text_len={len(text)}, "
                f"tables={len(tables)}, "
                f"images={len(images)}"
            )
        
        # Build the multimodal prompt
        message_content = self._build_enhancement_prompt(text, tables, images)
        
        try:
            start_time = time.time()
            
            # Create message with mixed content types
            message = HumanMessage(content=message_content)  # type: ignore
            
            # Call the vision LLM
            response = await self.llm.ainvoke([message])
            
            elapsed = time.time() - start_time
            
            if settings.LOG_AI_USAGE:
                logger.info(f"AI enhancement completed in {elapsed:.2f}s")
            
            # Handle response content which can be str or list
            result = response.content
            return result if isinstance(result, str) else str(result)
            
        except Exception as e:
            logger.error(f"AI enhancement failed: {e}", exc_info=True)
            raise AIEnhancementError(f"AI enhancement failed: {e}") from e
    
    def _build_enhancement_prompt(
        self,
        text: str,
        tables: list[str],
        images: list[str],
    ) -> list[dict]:
        """
        Build multimodal prompt for GPT-4o vision model.
        
        Creates a prompt that instructs the model to:
        1. Analyze all content types together
        2. Extract searchable information
        3. Generate retrieval-optimized descriptions
        
        Returns:
            List of content blocks for HumanMessage
        """
        # System instruction for the enhancement task
        prompt_text = """Analyze this document section and create a comprehensive, searchable summary.

Your task is to generate text that will help users find this content through semantic search.

**Instructions:**
1. **Extract key facts**: Numbers, statistics, dates, names, and specific values
2. **Identify main topics**: Core concepts, themes, and subject matter
3. **Describe visuals**: For any tables or images, describe what they show
4. **List potential queries**: What questions could this content answer?
5. **Add search terms**: Include synonyms and related terms

**Content to analyze:**

"""
        
        # Add text content if present
        if text:
            prompt_text += f"**Text Content:**\n{text}\n\n"
        
        # Add table descriptions
        if tables:
            prompt_text += f"**Tables ({len(tables)} found):**\n"
            for i, table_html in enumerate(tables, 1):
                # Truncate very large tables to avoid token limits
                table_preview = table_html[:2000] if len(table_html) > 2000 else table_html
                prompt_text += f"\nTable {i}:\n{table_preview}\n"
            prompt_text += "\n"
        
        # Build message content list
        content: list[dict] = [{"type": "text", "text": prompt_text}]
        
        # Add images for vision analysis
        if images:
            prompt_text_for_images = f"\n**Images ({len(images)} found):**\nDescribe what each image shows, including any text, charts, diagrams, or visual patterns.\n"
            content.append({"type": "text", "text": prompt_text_for_images})
            
            for img_b64 in images:
                # Detect image type (default to JPEG if unknown)
                media_type = self._detect_image_type(img_b64)
                
                content.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{media_type};base64,{img_b64}",
                        "detail": "auto"  # Let model decide detail level
                    }
                })
        
        # Final instruction
        content.append({
            "type": "text",
            "text": "\n**Generate a comprehensive searchable summary (200-400 words):**"
        })
        
        return content
    
    def _detect_image_type(self, base64_data: str) -> str:
        """Detect image MIME type from base64 header."""
        # Check for common image signatures
        if base64_data.startswith('/9j/'):
            return 'image/jpeg'
        elif base64_data.startswith('iVBORw'):
            return 'image/png'
        elif base64_data.startswith('R0lGOD'):
            return 'image/gif'
        elif base64_data.startswith('UklGR'):
            return 'image/webp'
        else:
            return 'image/jpeg'  # Default fallback
    
    def _create_fallback_content(
        self,
        text: str,
        tables: list[str],
        images: list[str],
    ) -> str:
        """
        Create fallback content when AI enhancement fails or is disabled.
        
        Combines available content into a simple text representation.
        """
        parts = []
        
        if text:
            parts.append(text)
        
        if tables:
            parts.append(f"[Document contains {len(tables)} table(s)]")
            # Include first table preview
            if tables[0]:
                # Simple text extraction from HTML table
                preview = tables[0][:500].replace('<', ' <').replace('>', '> ')
                parts.append(f"Table preview: {preview}")
        
        if images:
            parts.append(f"[Document contains {len(images)} image(s)]")
        
        return "\n\n".join(parts)
    
    async def process_chunks_with_ai(
        self,
        chunks: list[Element],
        processor: MultimodalProcessor,
        enable_ai: bool = True,
    ) -> tuple[list[Document], ProcessingStats]:
        """
        Process all chunks with AI enhancement for multimodal content.
        
        For each chunk:
        1. Analyze what content types it contains
        2. If multimodal (tables/images): Generate AI summary
        3. If text-only: Use raw text content
        4. Create LangChain Document with metadata
        
        The resulting Documents are ready for embedding and storage in
        a vector database for RAG retrieval.
        
        Args:
            chunks: Chunked elements from chunk_by_title()
            processor: MultimodalProcessor for content analysis
            enable_ai: Whether to use AI enhancement (can disable for testing)
        
        Returns:
            Tuple of:
                - List of LangChain Document objects
                - ProcessingStats with detailed metrics
        
        Example:
            ```python
            documents, stats = await chunker.process_chunks_with_ai(
                chunks, processor, enable_ai=True
            )
            
            print(f"Processed {len(documents)} documents")
            print(f"AI enhanced: {stats.ai_enhanced_chunks}")
            
            # Documents ready for embedding
            for doc in documents:
                vector = embed(doc.page_content)
                store(vector, doc.metadata)
            ```
        """
        documents: list[Document] = []
        multimodal_chunks: list[MultimodalChunk] = []
        
        # Initialize statistics
        stats = ProcessingStats()
        stats.total_elements_extracted = len(chunks)
        
        # Check AI availability
        ai_available = enable_ai and self.llm is not None
        if not ai_available and enable_ai:
            logger.warning("AI enhancement requested but LLM not available")
        
        logger.info(f"Processing {len(chunks)} chunks (AI enabled: {ai_available})")
        
        for chunk_id, chunk in enumerate(chunks):
            chunk_start_time = time.time()
            
            try:
                # Analyze chunk content
                analysis = processor.analyze_chunk_content(chunk)
                
                # Update statistics based on content types
                self._update_stats_for_chunk(stats, analysis)
                
                # Determine content to use
                if analysis.needs_ai_enhancement and ai_available:
                    # Multimodal chunk - try AI enhancement
                    try:
                        enhanced_content = await self.create_ai_enhanced_summary(
                            analysis.text,
                            analysis.tables,
                            analysis.images
                        )
                        stats.ai_enhanced_chunks += 1
                        is_enhanced = True
                        model_used = settings.OPENAI_VISION_MODEL
                        
                    except AIEnhancementError as e:
                        # AI failed - use fallback
                        logger.warning(f"AI enhancement failed for chunk {chunk_id}: {e}")
                        enhanced_content = self._create_fallback_content(
                            analysis.text, analysis.tables, analysis.images
                        )
                        stats.ai_enhancement_failures += 1
                        is_enhanced = False
                        model_used = None
                else:
                    # Text-only or AI disabled - use raw content
                    enhanced_content = analysis.text or str(chunk)
                    is_enhanced = False
                    model_used = None
                
                # Calculate processing time
                processing_time_ms = (time.time() - chunk_start_time) * 1000
                
                # Get page numbers for this chunk
                page_numbers = self._get_chunk_page_numbers(chunk, processor)
                
                # Create MultimodalChunk schema
                multimodal_chunk = MultimodalChunk(
                    chunk_id=chunk_id,
                    enhanced_content=enhanced_content,
                    content_types=analysis.types,
                    original_content=OriginalContent(
                        raw_text=analysis.text,
                        tables_html=analysis.tables,
                        images_base64=analysis.images,
                    ),
                    metadata=ChunkMetadata(
                        page_numbers=page_numbers,
                        element_types=[type(chunk).__name__],
                        is_ai_enhanced=is_enhanced,
                        ai_model_used=model_used,
                        processing_time_ms=processing_time_ms,
                        token_count=self._estimate_tokens(enhanced_content),
                    )
                )
                multimodal_chunks.append(multimodal_chunk)
                
                # Create LangChain Document
                document = Document(
                    page_content=enhanced_content,
                    metadata={
                        "chunk_id": chunk_id,
                        "content_types": [ct.value for ct in analysis.types],
                        "is_ai_enhanced": is_enhanced,
                        "page_numbers": page_numbers,
                        "original_content": {
                            "raw_text": analysis.text,
                            "tables_html": analysis.tables,
                            "images_base64": analysis.images,
                        },
                    }
                )
                documents.append(document)
                
                logger.debug(
                    f"Processed chunk {chunk_id}: "
                    f"types={[t.value for t in analysis.types]}, "
                    f"enhanced={is_enhanced}, "
                    f"time={processing_time_ms:.1f}ms"
                )
                
            except Exception as e:
                logger.error(f"Error processing chunk {chunk_id}: {e}", exc_info=True)
                # Create minimal document for failed chunk
                documents.append(Document(
                    page_content=str(chunk),
                    metadata={"chunk_id": chunk_id, "error": str(e)}
                ))
        
        # Calculate estimated tokens
        stats.estimated_tokens = sum(
            self._estimate_tokens(doc.page_content) for doc in documents
        )
        
        logger.info(
            f"Chunk processing complete: "
            f"{len(documents)} documents, "
            f"{stats.ai_enhanced_chunks} AI-enhanced, "
            f"{stats.ai_enhancement_failures} failures"
        )
        
        return documents, stats
    
    def _update_stats_for_chunk(
        self,
        stats: ProcessingStats,
        analysis: ChunkAnalysis,
    ) -> None:
        """Update processing statistics based on chunk analysis."""
        has_table = ContentType.TABLE in analysis.types
        has_image = ContentType.IMAGE in analysis.types
        
        if has_table:
            stats.chunks_with_tables += 1
            stats.total_tables_found += len(analysis.tables)
        
        if has_image:
            stats.chunks_with_images += 1
            stats.total_images_found += len(analysis.images)
        
        if not has_table and not has_image:
            stats.text_only_chunks += 1
    
    def _get_chunk_page_numbers(
        self,
        chunk: Element,
        processor: MultimodalProcessor,
    ) -> list[int]:
        """Get page numbers associated with a chunk."""
        page_numbers: set[int] = set()
        
        # Try to get from chunk directly
        page_num = processor.get_element_page_number(chunk)
        if page_num is not None:
            page_numbers.add(page_num)
        
        # Try to get from original elements
        try:
            if hasattr(chunk, 'metadata') and chunk.metadata:
                orig_elements = getattr(chunk.metadata, 'orig_elements', None)
                if orig_elements:
                    for elem in orig_elements:
                        pn = processor.get_element_page_number(elem)
                        if pn is not None:
                            page_numbers.add(pn)
        except Exception:
            pass
        
        return sorted(page_numbers)
    
    def _estimate_tokens(self, text: str) -> int:
        """
        Estimate token count for text.
        
        Uses rough approximation of 4 characters per token.
        For accurate counts, use tiktoken.
        """
        return len(text) // 4
    
    def create_multimodal_chunks_response(
        self,
        chunks: list[Element],
        processor: MultimodalProcessor,
        documents: list[Document],
        stats: ProcessingStats,
    ) -> list[MultimodalChunk]:
        """
        Create MultimodalChunk objects from processed documents.
        
        This is a synchronous method for creating response objects
        after processing is complete.
        """
        multimodal_chunks = []
        
        for doc in documents:
            metadata = doc.metadata
            
            multimodal_chunks.append(MultimodalChunk(
                chunk_id=metadata.get("chunk_id", 0),
                enhanced_content=doc.page_content,
                content_types=[
                    ContentType(ct) 
                    for ct in metadata.get("content_types", ["text"])
                ],
                original_content=OriginalContent(
                    raw_text=metadata.get("original_content", {}).get("raw_text", ""),
                    tables_html=metadata.get("original_content", {}).get("tables_html", []),
                    images_base64=metadata.get("original_content", {}).get("images_base64", []),
                ),
                metadata=ChunkMetadata(
                    page_numbers=metadata.get("page_numbers", []),
                    is_ai_enhanced=metadata.get("is_ai_enhanced", False),
                )
            ))
        
        return multimodal_chunks
