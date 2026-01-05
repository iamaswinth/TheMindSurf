"""
Streaming RAG Endpoint Test Suite

This module provides comprehensive tests for the SSE streaming RAG endpoint.
Run with: pytest tests/test_streaming_rag.py -v

Or run individual test functions:
    python -m pytest tests/test_streaming_rag.py::test_sse_event_formatting -v
"""

import pytest  # type: ignore
import asyncio
import json
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from typing import AsyncGenerator

from app.services.streaming_service import (
    SSEFormatter,
    SSEEventType,
    StreamingRAGService,
)


# =============================================================================
# SSE Formatter Tests
# =============================================================================

class TestSSEFormatter:
    """Test SSE event formatting."""
    
    def test_format_event_basic(self):
        """Test basic event formatting."""
        event = SSEFormatter.format_event(
            event_type="test",
            data={"message": "hello"}
        )
        
        assert "event: test" in event
        assert 'data: {"message": "hello"}' in event
        assert event.endswith("\n\n")
    
    def test_format_event_with_id(self):
        """Test event formatting with event ID."""
        event = SSEFormatter.format_event(
            event_type="test",
            data={"message": "hello"},
            event_id="test-123"
        )
        
        assert "id: test-123" in event
        assert "event: test" in event
    
    def test_format_status(self):
        """Test status event formatting."""
        event = SSEFormatter.format_status(
            request_id="abc123",
            message="Processing",
            stage="started"
        )
        
        assert "event: status" in event
        assert '"request_id": "abc123"' in event
        assert '"message": "Processing"' in event
        assert '"stage": "started"' in event
        assert '"timestamp"' in event
    
    def test_format_sources(self):
        """Test sources event formatting."""
        sources = [
            {"id": "doc1", "score": 0.95, "preview": "text..."},
            {"id": "doc2", "score": 0.85, "preview": "more text..."}
        ]
        
        event = SSEFormatter.format_sources(
            request_id="abc123",
            sources=sources,
            search_time_ms=150.5
        )
        
        assert "event: sources" in event
        assert '"count": 2' in event
        assert '"search_time_ms": 150.5' in event
    
    def test_format_answer_start(self):
        """Test answer start event formatting."""
        event = SSEFormatter.format_answer_start(
            request_id="abc123",
            model="gpt-4o"
        )
        
        assert "event: answer_start" in event
        assert '"model": "gpt-4o"' in event
    
    def test_format_token(self):
        """Test token event formatting."""
        event = SSEFormatter.format_token(
            request_id="abc123",
            token="Hello",
            token_index=0
        )
        
        assert "event: token" in event
        assert '"token": "Hello"' in event
        assert '"index": 0' in event
    
    def test_format_done(self):
        """Test done event formatting."""
        event = SSEFormatter.format_done(
            request_id="abc123",
            total_tokens=150,
            search_time_ms=200,
            generation_time_ms=3000,
            total_time_ms=3200,
            model_used="gpt-4o",
            cached=False,
            warnings=["Low confidence scores"]
        )
        
        assert "event: done" in event
        assert '"total_tokens": 150' in event
        assert '"search_time_ms": 200' in event
        assert '"generation_time_ms": 3000' in event
        assert '"model_used": "gpt-4o"' in event
        assert '"cached": false' in event
        assert '"warnings": ["Low confidence scores"]' in event
    
    def test_format_error(self):
        """Test error event formatting."""
        event = SSEFormatter.format_error(
            request_id="abc123",
            error_type="SEARCH_ERROR",
            message="Search failed",
            details={"query": "test"},
            recoverable=False
        )
        
        assert "event: error" in event
        assert '"error_type": "SEARCH_ERROR"' in event
        assert '"recoverable": false' in event
    
    def test_format_heartbeat(self):
        """Test heartbeat event formatting."""
        event = SSEFormatter.format_heartbeat(request_id="abc123")
        
        assert "event: heartbeat" in event
        assert '"request_id": "abc123"' in event


# =============================================================================
# Integration Test with Mock OpenAI
# =============================================================================

class TestStreamingRAGService:
    """Test streaming RAG service with mocked dependencies."""
    
    @pytest.fixture
    def mock_settings(self):
        """Mock settings for tests."""
        with patch('app.services.streaming_service.settings') as mock:
            mock.OPENAI_API_KEY = "test-key"
            mock.OPENAI_VISION_MODEL = "gpt-4o"
            mock.is_ai_available = True
            yield mock
    
    @pytest.mark.asyncio
    async def test_stream_rag_response_no_results(self, mock_settings):
        """Test streaming with no search results."""
        with patch('app.services.streaming_service.AsyncOpenAI'):
            service = StreamingRAGService(api_key="test-key")
            
            events = []
            async for event in service.stream_rag_response(
                question="Test question?",
                search_results=[],
                search_time_ms=100
            ):
                events.append(event)
            
            # Should have: status, sources, token (no results message), done
            event_types = [e.split('event: ')[1].split('\n')[0] for e in events if 'event:' in e]
            
            assert 'status' in event_types
            assert 'sources' in event_types
            assert 'token' in event_types
            assert 'done' in event_types


# =============================================================================
# Run Test
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
