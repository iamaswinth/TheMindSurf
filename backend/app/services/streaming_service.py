"""
Server-Sent Events (SSE) Streaming Service

This module provides SSE streaming capabilities for the RAG pipeline,
enabling real-time token-by-token response generation.

Features:
- SSE event formatting and streaming
- OpenAI streaming integration
- Connection management with heartbeats
- Graceful error handling through the stream
"""

import json
import asyncio
import logging
import time
import uuid
from typing import AsyncGenerator, Optional
from datetime import datetime

from openai import AsyncOpenAI

from app.core.config import settings

# Configure logging
logger = logging.getLogger(__name__)


# =============================================================================
# SSE Event Types
# =============================================================================

class SSEEventType:
    """Constants for SSE event types."""
    STATUS = "status"
    SOURCES = "sources"
    ANSWER_START = "answer_start"
    TOKEN = "token"
    DONE = "done"
    ERROR = "error"
    HEARTBEAT = "heartbeat"


# =============================================================================
# SSE Event Formatter
# =============================================================================

class SSEFormatter:
    """Formats data as Server-Sent Events."""
    
    @staticmethod
    def format_event(
        event_type: str,
        data: dict,
        event_id: Optional[str] = None
    ) -> str:
        """
        Format data as an SSE event.
        
        Args:
            event_type: Type of the event (status, sources, token, etc.)
            data: Dictionary of data to include in the event
            event_id: Optional event ID for client tracking
        
        Returns:
            SSE-formatted string ready to send
        """
        lines = []
        
        if event_id:
            lines.append(f"id: {event_id}")
        
        lines.append(f"event: {event_type}")
        lines.append(f"data: {json.dumps(data)}")
        lines.append("")  # Empty line to end the event
        lines.append("")  # Double newline for SSE spec
        
        return "\n".join(lines)
    
    @staticmethod
    def format_status(
        request_id: str,
        message: str = "Processing request",
        stage: str = "started"
    ) -> str:
        """Format a status event."""
        return SSEFormatter.format_event(
            SSEEventType.STATUS,
            {
                "request_id": request_id,
                "message": message,
                "stage": stage,
                "timestamp": datetime.utcnow().isoformat()
            },
            event_id=f"{request_id}-status"
        )
    
    @staticmethod
    def format_sources(
        request_id: str,
        sources: list[dict],
        search_time_ms: float
    ) -> str:
        """Format a sources event with retrieved documents."""
        return SSEFormatter.format_event(
            SSEEventType.SOURCES,
            {
                "request_id": request_id,
                "sources": sources,
                "count": len(sources),
                "search_time_ms": round(search_time_ms, 2),
                "timestamp": datetime.utcnow().isoformat()
            },
            event_id=f"{request_id}-sources"
        )
    
    @staticmethod
    def format_answer_start(
        request_id: str,
        model: str,
        estimated_time_ms: Optional[float] = None
    ) -> str:
        """Format an answer start event."""
        data: dict = {
            "request_id": request_id,
            "model": model,
            "timestamp": datetime.utcnow().isoformat()
        }
        if estimated_time_ms:
            data["estimated_time_ms"] = estimated_time_ms
        
        return SSEFormatter.format_event(
            SSEEventType.ANSWER_START,
            data,
            event_id=f"{request_id}-answer-start"
        )
    
    @staticmethod
    def format_token(
        request_id: str,
        token: str,
        token_index: int
    ) -> str:
        """Format a token event."""
        return SSEFormatter.format_event(
            SSEEventType.TOKEN,
            {
                "request_id": request_id,
                "token": token,
                "index": token_index
            }
        )
    
    @staticmethod
    def format_done(
        request_id: str,
        total_tokens: int,
        search_time_ms: float,
        generation_time_ms: float,
        total_time_ms: float,
        model_used: str,
        cached: bool = False,
        warnings: Optional[list[str]] = None
    ) -> str:
        """Format a done event with comprehensive metadata."""
        return SSEFormatter.format_event(
            SSEEventType.DONE,
            {
                "request_id": request_id,
                "total_tokens": total_tokens,
                "timing": {
                    "search_time_ms": round(search_time_ms, 2),
                    "generation_time_ms": round(generation_time_ms, 2),
                    "total_time_ms": round(total_time_ms, 2)
                },
                "model_used": model_used,
                "cached": cached,
                "warnings": warnings or [],
                "timestamp": datetime.utcnow().isoformat()
            },
            event_id=f"{request_id}-done"
        )
    
    @staticmethod
    def format_error(
        request_id: str,
        error_type: str,
        message: str,
        details: Optional[dict] = None,
        recoverable: bool = True
    ) -> str:
        """Format an error event."""
        return SSEFormatter.format_event(
            SSEEventType.ERROR,
            {
                "request_id": request_id,
                "error_type": error_type,
                "message": message,
                "details": details or {},
                "recoverable": recoverable,
                "timestamp": datetime.utcnow().isoformat()
            },
            event_id=f"{request_id}-error"
        )
    
    @staticmethod
    def format_heartbeat(request_id: str) -> str:
        """Format a heartbeat event to keep connection alive."""
        return SSEFormatter.format_event(
            SSEEventType.HEARTBEAT,
            {
                "request_id": request_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        )


# =============================================================================
# Streaming RAG Service
# =============================================================================

class StreamingRAGService:
    """
    Service for streaming RAG responses using Server-Sent Events.
    
    This service orchestrates the streaming RAG pipeline:
    1. Send status event on request receipt
    2. Perform hybrid search and send sources event
    3. Stream answer generation token by token
    4. Send done event with comprehensive metadata
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        heartbeat_interval: int = 15
    ):
        """
        Initialize the streaming service.
        
        Args:
            api_key: OpenAI API key (defaults to settings)
            model: Model to use for generation (defaults to settings)
            heartbeat_interval: Seconds between heartbeat events
        """
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.model = model or settings.OPENAI_VISION_MODEL
        self.heartbeat_interval = heartbeat_interval
        
        if not self.api_key:
            raise ValueError(
                "OpenAI API key not configured. Set OPENAI_API_KEY environment variable."
            )
        
        # Use AsyncOpenAI for non-blocking streaming
        self.client = AsyncOpenAI(api_key=self.api_key)
        
        logger.info(f"Streaming RAG service initialized with model: {self.model}")
    
    async def _create_augmented_prompt(
        self,
        question: str,
        search_results: list[dict],
        system_context: Optional[str] = None
    ) -> str:
        """
        Create an augmented prompt with search results for RAG generation.
        
        Args:
            question: User's question
            search_results: List of search results
            system_context: Optional additional context
        
        Returns:
            Augmented prompt string
        """
        # Format search results as XML
        items = []
        for i, result in enumerate(search_results):
            chunk_text = result.get('chunk_text', '')
            items.append(
                f'<item index="{i+1}">\n'
                f'<page_content>\n{chunk_text}\n</page_content>\n'
                f'</item>'
            )
        
        formatted_results = f"\n<search_results>\n{''.join(items)}\n</search_results>"
        
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
    
    async def stream_openai_response(
        self,
        prompt: str,
        request_id: str,
        max_tokens: int = 2000,
        temperature: float = 0.3,
        system_message: Optional[str] = None
    ) -> AsyncGenerator[tuple[str, int], None]:
        """
        Stream response from OpenAI's API token by token.
        
        Args:
            prompt: The augmented prompt
            request_id: Request ID for tracking
            max_tokens: Maximum tokens in response
            temperature: Sampling temperature
            system_message: Optional system message
        
        Yields:
            Tuple of (token_text, token_index)
        """
        messages = []
        
        if system_message:
            messages.append({
                "role": "system",
                "content": system_message
            })
        
        messages.append({
            "role": "user",
            "content": prompt
        })
        
        token_index = 0
        
        try:
            stream = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                stream=True
            )
            
            async for chunk in stream:
                if chunk.choices and len(chunk.choices) > 0:
                    delta = chunk.choices[0].delta
                    
                    # Check if this is a content chunk
                    if delta.content:
                        yield delta.content, token_index
                        token_index += 1
                    
                    # Check for finish reason
                    if chunk.choices[0].finish_reason:
                        logger.debug(
                            f"Stream finished. Reason: {chunk.choices[0].finish_reason}, "
                            f"Tokens: {token_index}"
                        )
                        break
                        
        except Exception as e:
            logger.error(f"OpenAI streaming error: {e}", exc_info=True)
            raise
    
    async def stream_rag_response(
        self,
        question: str,
        search_results: list[dict],
        search_time_ms: float,
        max_tokens: int = 2000,
        temperature: float = 0.3,
        system_message: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Main streaming RAG pipeline that yields SSE-formatted events.
        
        This is the primary entry point for streaming responses. It:
        1. Yields status event immediately
        2. Yields sources event with search results
        3. Yields answer_start event before generation
        4. Yields token events for each generated token
        5. Yields done event with metadata
        
        Args:
            question: User's question
            search_results: Results from hybrid search
            search_time_ms: Time taken for search in milliseconds
            max_tokens: Maximum tokens for generation
            temperature: Sampling temperature
            system_message: Optional system message
        
        Yields:
            SSE-formatted event strings
        """
        request_id = str(uuid.uuid4())[:8]
        start_time = time.time()
        warnings = []
        token_count = 0
        
        logger.info(f"Starting streaming RAG response. Request ID: {request_id}")
        
        try:
            # 1. Status Event - Processing started
            yield SSEFormatter.format_status(
                request_id=request_id,
                message="Request received, processing query",
                stage="started"
            )
            
            # 2. Sources Event - Send retrieved documents
            formatted_sources = []
            for result in search_results:
                source = {
                    "id": result.get("id", ""),
                    "score": round(result.get("score", 0), 4),
                    "preview": result.get("chunk_text", "")[:300] + "..." if len(result.get("chunk_text", "")) > 300 else result.get("chunk_text", ""),
                    "metadata": result.get("metadata", {})
                }
                # Extract page numbers if available
                if "metadata" in result and result["metadata"]:
                    page_numbers = result["metadata"].get("page_numbers", [])
                    if page_numbers:
                        source["page_numbers"] = page_numbers
                
                formatted_sources.append(source)
            
            yield SSEFormatter.format_sources(
                request_id=request_id,
                sources=formatted_sources,
                search_time_ms=search_time_ms
            )
            
            # Check if we have results to generate from
            if not search_results:
                warnings.append("No search results found")
                yield SSEFormatter.format_token(
                    request_id=request_id,
                    token="I couldn't find any relevant information to answer your question. Please try rephrasing or ask about a different topic.",
                    token_index=0
                )
                token_count = 1
            else:
                # 3. Status Event - Starting generation
                yield SSEFormatter.format_status(
                    request_id=request_id,
                    message="Search complete, starting answer generation",
                    stage="generating"
                )
                
                # 4. Answer Start Event
                yield SSEFormatter.format_answer_start(
                    request_id=request_id,
                    model=self.model
                )
                
                # Create augmented prompt
                prompt = await self._create_augmented_prompt(
                    question=question,
                    search_results=search_results
                )
                
                generation_start = time.time()
                
                # 5. Token Events - Stream tokens
                default_system = "You are a helpful assistant that answers questions based on provided context."
                
                try:
                    async for token, index in self.stream_openai_response(
                        prompt=prompt,
                        request_id=request_id,
                        max_tokens=max_tokens,
                        temperature=temperature,
                        system_message=system_message or default_system
                    ):
                        yield SSEFormatter.format_token(
                            request_id=request_id,
                            token=token,
                            token_index=index
                        )
                        token_count = index + 1
                        
                except Exception as e:
                    logger.error(f"Generation error: {e}", exc_info=True)
                    yield SSEFormatter.format_error(
                        request_id=request_id,
                        error_type="GENERATION_ERROR",
                        message=f"Error during answer generation: {str(e)}",
                        details={"partial_tokens": token_count},
                        recoverable=False
                    )
                    return
            
            # Calculate timings
            total_time_ms = (time.time() - start_time) * 1000
            generation_time_ms = total_time_ms - search_time_ms
            
            # 6. Done Event
            yield SSEFormatter.format_done(
                request_id=request_id,
                total_tokens=token_count,
                search_time_ms=search_time_ms,
                generation_time_ms=generation_time_ms,
                total_time_ms=total_time_ms,
                model_used=self.model,
                cached=False,
                warnings=warnings if warnings else None
            )
            
            logger.info(
                f"Streaming complete. Request: {request_id}, "
                f"Tokens: {token_count}, Time: {total_time_ms:.0f}ms"
            )
            
        except Exception as e:
            logger.error(f"Streaming error: {e}", exc_info=True)
            yield SSEFormatter.format_error(
                request_id=request_id,
                error_type="STREAM_ERROR",
                message=f"Unexpected error during streaming: {str(e)}",
                recoverable=False
            )


# =============================================================================
# Heartbeat Generator
# =============================================================================

async def heartbeat_generator(
    request_id: str,
    interval: int = 15
) -> AsyncGenerator[str, None]:
    """
    Generate heartbeat events to keep SSE connection alive.
    
    Args:
        request_id: Request ID for the heartbeat
        interval: Seconds between heartbeats
    
    Yields:
        SSE-formatted heartbeat events
    """
    while True:
        await asyncio.sleep(interval)
        yield SSEFormatter.format_heartbeat(request_id)


# =============================================================================
# Factory Function
# =============================================================================

def get_streaming_service() -> StreamingRAGService:
    """
    Factory function to get a StreamingRAGService instance.
    
    Returns:
        StreamingRAGService instance
    
    Raises:
        ValueError: If OpenAI is not configured
    """
    if not settings.is_ai_available:
        raise ValueError(
            "OpenAI is not configured. Set OPENAI_API_KEY environment variable."
        )
    
    return StreamingRAGService()
