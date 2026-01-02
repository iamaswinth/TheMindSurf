"""
RAG Generation Service

This module provides the generation component for the RAG pipeline,
using OpenAI's GPT-4o model to generate answers based on retrieved context.
"""

import logging
from typing import Optional

from openai import OpenAI

from app.core.config import settings

# Configure logging
logger = logging.getLogger(__name__)


class GenerationServiceError(Exception):
    """Base exception for generation service errors."""
    pass


class GenerationService:
    """
    Service for generating answers using OpenAI models.
    
    Integrates with the RAG pipeline to generate contextual answers
    based on retrieved document chunks.
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None
    ):
        """
        Initialize the generation service.
        
        Args:
            api_key: OpenAI API key (defaults to settings)
            model: Model to use for generation (defaults to settings)
        """
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.model = model or settings.OPENAI_VISION_MODEL
        
        if not self.api_key:
            raise GenerationServiceError(
                "OpenAI API key not configured. Set OPENAI_API_KEY environment variable."
            )
        
        self.client = OpenAI(api_key=self.api_key)
        logger.info(f"Generation service initialized with model: {self.model}")
    
    def generate_answer(
        self,
        prompt: str,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        system_message: Optional[str] = None
    ) -> str:
        """
        Generate an answer using the configured model.
        
        Args:
            prompt: The augmented prompt with search results
            max_tokens: Maximum tokens in response (defaults to settings)
            temperature: Sampling temperature (defaults to settings)
            system_message: Optional system message for the model
        
        Returns:
            Generated answer text
        
        Raises:
            GenerationServiceError: If generation fails
        """
        max_tokens = max_tokens or settings.OPENAI_MAX_TOKENS
        temperature = temperature if temperature is not None else settings.OPENAI_TEMPERATURE
        
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
        
        try:
            logger.debug(f"Generating answer with {self.model}...")
            
            response = self.client.chat.completions.create(
                model=self.model,
                max_tokens=max_tokens,
                temperature=temperature,
                messages=messages
            )
            
            answer = response.choices[0].message.content
            
            logger.info(
                f"Answer generated. "
                f"Tokens used: {response.usage.total_tokens if response.usage else 'N/A'}"
            )
            
            return answer or "No response generated"
            
        except Exception as e:
            error_msg = f"Failed to generate answer: {str(e)}"
            logger.error(error_msg, exc_info=True)
            raise GenerationServiceError(error_msg) from e
    
    def rag_generate(
        self,
        question: str,
        search_results: list[dict],
        system_message: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None
    ) -> dict:
        """
        Full RAG generation: format results, create prompt, generate answer.
        
        Args:
            question: User's question
            search_results: Results from hybrid search
            system_message: Optional system context
            max_tokens: Maximum response tokens
            temperature: Sampling temperature
        
        Returns:
            Dictionary with question, answer, and sources
        """
        from app.services.pinecone_service import PineconeService
        
        # Format search results
        pinecone_service = PineconeService.__new__(PineconeService)
        formatted_results = pinecone_service.format_search_results_for_prompt(search_results)
        
        # Create augmented prompt
        prompt = (
            f"{formatted_results}\n\n"
            f"Using the search results provided within the <search_results></search_results> tags, "
            f"please answer the following question:\n\n"
            f"<question>{question}</question>\n\n"
            f"Do not reference the search results directly in your answer. "
            f"Provide a comprehensive and accurate response based on the information available."
        )
        
        # Generate answer
        answer = self.generate_answer(
            prompt=prompt,
            max_tokens=max_tokens,
            temperature=temperature,
            system_message=system_message or "You are a helpful assistant that answers questions based on provided context."
        )
        
        # Extract source info
        sources = [
            {
                "id": r.get("id"),
                "score": r.get("score"),
                "preview": r.get("chunk_text", "")[:200] + "..."
            }
            for r in search_results
        ]
        
        return {
            "question": question,
            "answer": answer,
            "sources": sources,
            "model_used": self.model
        }


def get_generation_service() -> GenerationService:
    """Factory function to get a GenerationService instance."""
    if not settings.is_ai_available:
        raise GenerationServiceError(
            "OpenAI is not configured. Set OPENAI_API_KEY environment variable."
        )
    
    return GenerationService()
