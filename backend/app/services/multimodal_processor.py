"""
Multimodal Document Processor Service

This service handles the extraction of multimodal content (text, tables, images)
from PDF documents using Unstructured.io's advanced partitioning capabilities.

Key Features:
- High-resolution PDF partitioning with table structure inference
- Image extraction with base64 encoding for vision LLM processing
- Content categorization by type for targeted processing
- Memory-efficient processing without file persistence

Architecture:
    PDF Bytes → partition_pdf_multimodal() → Raw Elements
    Raw Elements → extract_multimodal_content() → Categorized Content Dict
    Chunk + Original Elements → analyze_chunk_content() → ChunkAnalysis

Usage:
    processor = MultimodalProcessor()
    elements = await processor.partition_pdf_multimodal(pdf_bytes, strategy="hi_res")
    content = processor.extract_multimodal_content(elements)
"""

import logging
from typing import Any, Optional
from io import BytesIO

from unstructured.partition.pdf import partition_pdf
from unstructured.documents.elements import (
    Element,
    Table,
    Image,
    Text,
    Title,
    NarrativeText,
    ListItem,
    Header,
    Footer,
)

from app.models.schemas import (
    ExtractedContent,
    ChunkAnalysis,
    ContentType,
    ProcessingStrategy,
)
from app.core.config import settings

# Configure logging
logger = logging.getLogger(__name__)


class MultimodalProcessorError(Exception):
    """Base exception for multimodal processing errors."""
    pass


class PDFParsingError(MultimodalProcessorError):
    """Raised when PDF parsing fails."""
    pass


class ContentExtractionError(MultimodalProcessorError):
    """Raised when content extraction fails."""
    pass


class MultimodalProcessor:
    """
    Handles multimodal content extraction from PDF documents.
    
    This processor uses Unstructured.io to extract:
    - Text content (paragraphs, titles, lists)
    - Tables with HTML structure preserved
    - Images encoded as base64 for vision processing
    
    The processor is stateless and can be reused across multiple documents.
    All processing happens in-memory without file persistence.
    
    Attributes:
        default_strategy: Default processing strategy (hi_res or fast)
    
    Example:
        ```python
        processor = MultimodalProcessor()
        
        # Extract elements from PDF
        elements = await processor.partition_pdf_multimodal(
            pdf_bytes=file_content,
            strategy="hi_res"
        )
        
        # Categorize by content type
        content = processor.extract_multimodal_content(elements)
        print(f"Found {len(content.tables)} tables")
        ```
    """
    
    def __init__(self, default_strategy: Optional[str] = None):
        """
        Initialize the multimodal processor.
        
        Args:
            default_strategy: Default processing strategy. 
                            Uses config setting if not provided.
        """
        self.default_strategy = default_strategy or settings.DEFAULT_PROCESSING_STRATEGY
        logger.info(
            f"MultimodalProcessor initialized with strategy: {self.default_strategy}"
        )
    
    async def partition_pdf_multimodal(
        self,
        pdf_bytes: bytes,
        strategy: Optional[str] = None,
        include_page_breaks: bool = True,
    ) -> list[Element]:
        """
        Partition PDF into multimodal elements using Unstructured.io.
        
        This method extracts all content types from the PDF:
        - Text elements (Title, NarrativeText, ListItem, etc.)
        - Tables with HTML structure (infer_table_structure=True)
        - Images as base64 payloads (extract_image_block_to_payload=True)
        
        Processing happens in-memory using BytesIO to avoid disk I/O.
        
        Args:
            pdf_bytes: Raw PDF file content as bytes
            strategy: Processing strategy - "hi_res" for accuracy or "fast" for speed
                     Defaults to configured default_strategy
            include_page_breaks: Whether to include page break elements for 
                               page number tracking
        
        Returns:
            List of Unstructured Element objects with metadata
        
        Raises:
            PDFParsingError: If PDF cannot be parsed (corrupted, encrypted, etc.)
            ValueError: If strategy is invalid
        
        Note:
            - "hi_res" strategy uses OCR and is significantly slower but more accurate
            - "fast" strategy is quicker but may miss some content in complex PDFs
            - Large PDFs with many images can consume significant memory
        """
        strategy = strategy or self.default_strategy
        
        # Validate strategy
        valid_strategies = [s.value for s in ProcessingStrategy]
        if strategy not in valid_strategies:
            raise ValueError(
                f"Invalid strategy '{strategy}'. Must be one of: {valid_strategies}"
            )
        
        logger.info(f"Starting PDF partitioning with strategy: {strategy}")
        logger.debug(f"PDF size: {len(pdf_bytes)} bytes")
        
        try:
            # Create in-memory file object
            pdf_file = BytesIO(pdf_bytes)
            
            # Configure partitioning for multimodal extraction
            # This is the core Unstructured call with all multimodal settings
            elements = partition_pdf(
                file=pdf_file,
                
                # Processing strategy
                strategy=strategy,
                
                # Table extraction - preserves HTML structure
                infer_table_structure=True,
                
                # Image extraction - captures images as base64
                extract_image_block_types=["Image"],
                extract_image_block_to_payload=True,
                
                # Page tracking
                include_page_breaks=include_page_breaks,
                
                # Additional options for better extraction
                include_metadata=True,
            )
            
            # Log extraction results
            element_counts = self._count_elements_by_type(elements)
            logger.info(
                f"Partitioning complete. Extracted {len(elements)} elements: "
                f"{element_counts}"
            )
            
            return elements
            
        except Exception as e:
            error_msg = f"Failed to partition PDF: {str(e)}"
            logger.error(error_msg, exc_info=True)
            raise PDFParsingError(error_msg) from e
    
    def extract_multimodal_content(
        self,
        elements: list[Element]
    ) -> ExtractedContent:
        """
        Categorize extracted elements by content type.
        
        Separates elements into three categories:
        - texts: All text-based elements (paragraphs, titles, lists)
        - tables: Table elements with HTML representation
        - images: Image elements with base64 encoding
        
        For tables, extracts the HTML representation from metadata.text_as_html
        For images, extracts base64 data from metadata.image_base64
        
        Args:
            elements: List of elements from partition_pdf_multimodal()
        
        Returns:
            ExtractedContent with categorized content lists
        
        Example:
            ```python
            content = processor.extract_multimodal_content(elements)
            
            # Access categorized content
            for table_html in content.tables:
                print(f"Table: {table_html[:100]}...")
            
            for image_b64 in content.images:
                print(f"Image size: {len(image_b64)} chars")
            ```
        """
        logger.debug(f"Categorizing {len(elements)} elements by content type")
        
        texts: list[str] = []
        tables: list[str] = []
        images: list[str] = []
        
        for element in elements:
            try:
                if isinstance(element, Table):
                    # Extract HTML table structure from metadata
                    table_html = self._extract_table_html(element)
                    if table_html:
                        tables.append(table_html)
                    else:
                        # Fallback to text representation if no HTML
                        texts.append(str(element))
                        
                elif isinstance(element, Image):
                    # Extract base64 image data from metadata
                    image_b64 = self._extract_image_base64(element)
                    if image_b64:
                        images.append(image_b64)
                        
                elif self._is_text_element(element):
                    # All text-type elements
                    text_content = str(element).strip()
                    if text_content:
                        texts.append(text_content)
                        
            except Exception as e:
                logger.warning(f"Error processing element {type(element)}: {e}")
                continue
        
        result = ExtractedContent(
            texts=texts,
            tables=tables,
            images=images
        )
        
        logger.info(
            f"Content extraction complete: "
            f"{len(texts)} texts, {len(tables)} tables, {len(images)} images"
        )
        
        return result
    
    def analyze_chunk_content(
        self,
        chunk: Element,
    ) -> ChunkAnalysis:
        """
        Analyze content types present in a chunk element.
        
        This method examines a chunk (which may contain multiple original elements
        in its metadata.orig_elements) to determine what content types it contains.
        
        Used to decide whether a chunk needs AI enhancement:
        - Text-only chunks can use raw content
        - Chunks with tables/images benefit from AI summarization
        
        Args:
            chunk: A chunk element (typically from chunk_by_title())
        
        Returns:
            ChunkAnalysis with:
                - text: Combined text content
                - tables: List of HTML table strings
                - images: List of base64 image strings
                - types: List of ContentType enums present
        
        Example:
            ```python
            analysis = processor.analyze_chunk_content(chunk)
            
            if analysis.needs_ai_enhancement:
                # Chunk has tables or images - use AI summary
                summary = await chunker.create_ai_enhanced_summary(
                    analysis.text,
                    analysis.tables,
                    analysis.images
                )
            else:
                # Text only - use raw content
                content = analysis.text
            ```
        """
        text_parts: list[str] = []
        tables: list[str] = []
        images: list[str] = []
        content_types: set[ContentType] = set()
        
        # Get the original elements that make up this chunk
        # Unstructured stores these in metadata.orig_elements after chunking
        orig_elements = self._get_original_elements(chunk)
        
        if orig_elements:
            # Process each original element within the chunk
            for orig_elem in orig_elements:
                self._categorize_element(
                    orig_elem,
                    text_parts,
                    tables,
                    images,
                    content_types
                )
        else:
            # No orig_elements - analyze the chunk directly
            self._categorize_element(
                chunk,
                text_parts,
                tables,
                images,
                content_types
            )
        
        # Always add text type if we have text content
        if text_parts:
            content_types.add(ContentType.TEXT)
        
        return ChunkAnalysis(
            text=" ".join(text_parts),
            tables=tables,
            images=images,
            types=list(content_types)
        )
    
    # =========================================================================
    # Private Helper Methods
    # =========================================================================
    
    def _extract_table_html(self, element: Table) -> str | None:
        """
        Extract HTML representation from a Table element.
        
        Unstructured stores the HTML table in metadata.text_as_html
        when infer_table_structure=True is used.
        """
        try:
            if hasattr(element, 'metadata') and element.metadata:
                # Primary location for HTML table
                if hasattr(element.metadata, 'text_as_html'):
                    return element.metadata.text_as_html
                    
                # Alternative: check in metadata dict
                if hasattr(element.metadata, '__dict__'):
                    return element.metadata.__dict__.get('text_as_html')
                    
        except Exception as e:
            logger.debug(f"Could not extract table HTML: {e}")
        
        return None
    
    def _extract_image_base64(self, element: Image) -> str | None:
        """
        Extract base64-encoded image data from an Image element.
        
        Unstructured stores base64 data in metadata.image_base64
        when extract_image_block_to_payload=True is used.
        """
        try:
            if hasattr(element, 'metadata') and element.metadata:
                # Primary location for base64 image
                if hasattr(element.metadata, 'image_base64'):
                    return element.metadata.image_base64
                    
                # Alternative: check in metadata dict
                if hasattr(element.metadata, '__dict__'):
                    return element.metadata.__dict__.get('image_base64')
                    
        except Exception as e:
            logger.debug(f"Could not extract image base64: {e}")
        
        return None
    
    def _is_text_element(self, element: Element) -> bool:
        """Check if element is a text-type element."""
        text_types = (
            Text,
            Title,
            NarrativeText,
            ListItem,
            Header,
            Footer,
        )
        return isinstance(element, text_types)
    
    def _get_original_elements(self, chunk: Element) -> list[Any] | None:
        """
        Get original elements from a chunked element's metadata.
        
        After chunk_by_title(), the original elements are stored
        in metadata.orig_elements.
        """
        try:
            if hasattr(chunk, 'metadata') and chunk.metadata:
                if hasattr(chunk.metadata, 'orig_elements'):
                    return chunk.metadata.orig_elements
        except Exception as e:
            logger.debug(f"Could not get orig_elements: {e}")
        
        return None
    
    def _categorize_element(
        self,
        element: Any,
        text_parts: list[str],
        tables: list[str],
        images: list[str],
        content_types: set[ContentType],
    ) -> None:
        """
        Categorize a single element into the appropriate lists.
        
        Modifies the provided lists in-place based on element type.
        """
        try:
            if isinstance(element, Table):
                table_html = self._extract_table_html(element)
                if table_html:
                    tables.append(table_html)
                    content_types.add(ContentType.TABLE)
                else:
                    # Fallback: use text representation
                    text_content = str(element).strip()
                    if text_content:
                        text_parts.append(text_content)
                        content_types.add(ContentType.TEXT)
                        
            elif isinstance(element, Image):
                image_b64 = self._extract_image_base64(element)
                if image_b64:
                    images.append(image_b64)
                    content_types.add(ContentType.IMAGE)
                    
            else:
                # All other elements treated as text
                text_content = str(element).strip()
                if text_content:
                    text_parts.append(text_content)
                    content_types.add(ContentType.TEXT)
                    
        except Exception as e:
            logger.warning(f"Error categorizing element: {e}")
    
    def _count_elements_by_type(self, elements: list[Element]) -> dict[str, int]:
        """Count elements by their type for logging."""
        counts: dict[str, int] = {}
        for element in elements:
            type_name = type(element).__name__
            counts[type_name] = counts.get(type_name, 0) + 1
        return counts
    
    def get_page_numbers(self, elements: list[Element]) -> list[int]:
        """
        Extract all unique page numbers from elements.
        
        Useful for determining document length and tracking
        which pages contribute to each chunk.
        """
        page_numbers: set[int] = set()
        
        for element in elements:
            if hasattr(element, 'metadata') and element.metadata:
                if hasattr(element.metadata, 'page_number'):
                    page_num = element.metadata.page_number
                    if page_num is not None:
                        page_numbers.add(page_num)
        
        return sorted(page_numbers)
    
    def get_element_page_number(self, element: Element) -> int | None:
        """Get the page number for a single element."""
        try:
            if hasattr(element, 'metadata') and element.metadata:
                return getattr(element.metadata, 'page_number', None)
        except Exception:
            pass
        return None
