"""
Simple Test Client for Streaming RAG Endpoint

This script tests the streaming RAG endpoint using httpx.
Run with: python test_streaming_client.py

Requirements: pip install httpx
"""

import asyncio
import json
import sys

# Try to import httpx, provide helpful message if not installed
try:
    import httpx
except ImportError:
    print("httpx is required. Install with: pip install httpx")
    sys.exit(1)


async def test_streaming_rag(
    base_url: str = "http://localhost:8000",
    question: str = "What is the main topic discussed in the documents?",
    namespace: str = "documents",
    document_ids: list[str] | None = None
):
    """
    Test the streaming RAG endpoint.
    
    Args:
        base_url: Base URL of the API server
        question: Question to ask
        namespace: Namespace to search
        document_ids: Optional list of document IDs to filter
    """
    url = f"{base_url}/api/v1/search/rag-stream"
    
    payload = {
        "question": question,
        "namespace": namespace,
        "top_k": 5,
        "temperature": 0.3,
        "max_tokens": 2000
    }
    
    if document_ids:
        payload["document_ids"] = document_ids
    
    print("=" * 60)
    print("STREAMING RAG TEST CLIENT")
    print("=" * 60)
    print(f"\nEndpoint: {url}")
    print(f"Question: {question}")
    print(f"Namespace: {namespace}")
    print("-" * 60)
    
    answer = ""
    sources = []
    request_id = ""
    current_event = ""
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream(
                "POST",
                url,
                json=payload,
                headers={"Accept": "text/event-stream"}
            ) as response:
                
                if response.status_code != 200:
                    error_text = await response.aread()
                    print(f"\n❌ Error: HTTP {response.status_code}")
                    print(error_text.decode())
                    return
                
                print("\n📡 Connected to SSE stream\n")
                
                async for line in response.aiter_lines():
                    line = line.strip()
                    
                    if not line:
                        continue
                    
                    if line.startswith("event: "):
                        current_event = line[7:]
                        continue
                    
                    if line.startswith("data: "):
                        try:
                            data = json.loads(line[6:])
                        except json.JSONDecodeError:
                            continue
                        
                        if current_event == "status":
                            request_id = data.get("request_id", "")
                            print(f"📋 [{data['stage'].upper()}] {data['message']}")
                        
                        elif current_event == "sources":
                            sources = data.get("sources", [])
                            print(f"\n📚 SOURCES ({data['count']} found, {data['search_time_ms']:.0f}ms)")
                            print("-" * 40)
                            for i, source in enumerate(sources[:3], 1):
                                score = source.get("score", 0)
                                preview = source.get("preview", "")[:100]
                                print(f"  {i}. [{score:.2%}] {preview}...")
                            if len(sources) > 3:
                                print(f"  ... and {len(sources) - 3} more")
                            print()
                        
                        elif current_event == "answer_start":
                            print(f"🤖 GENERATING with {data['model']}")
                            print("-" * 40)
                        
                        elif current_event == "token":
                            token = data.get("token", "")
                            print(token, end="", flush=True)
                            answer += token
                        
                        elif current_event == "done":
                            print("\n" + "-" * 40)
                            print(f"\n✅ COMPLETE")
                            timing = data.get("timing", {})
                            print(f"   Tokens: {data['total_tokens']}")
                            print(f"   Search time: {timing.get('search_time_ms', 0):.0f}ms")
                            print(f"   Generation time: {timing.get('generation_time_ms', 0):.0f}ms")
                            print(f"   Total time: {timing.get('total_time_ms', 0):.0f}ms")
                            print(f"   Model: {data['model_used']}")
                            if data.get("warnings"):
                                print(f"   ⚠️  Warnings: {data['warnings']}")
                        
                        elif current_event == "error":
                            print(f"\n❌ ERROR: {data['error_type']}")
                            print(f"   Message: {data['message']}")
                            if data.get("details"):
                                print(f"   Details: {data['details']}")
                        
                        elif current_event == "heartbeat":
                            print("💓", end="", flush=True)
                
                print("\n" + "=" * 60)
                print("TEST COMPLETE")
                print("=" * 60)
                
    except httpx.ConnectError:
        print(f"\n❌ Connection Error: Could not connect to {base_url}")
        print("   Make sure the server is running: uvicorn main:app --reload")
    except httpx.TimeoutException:
        print("\n❌ Timeout: Request took too long")
    except KeyboardInterrupt:
        print("\n\n⏹️  Cancelled by user")
    except Exception as e:
        print(f"\n❌ Unexpected Error: {e}")


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Test the streaming RAG endpoint")
    parser.add_argument(
        "--url",
        default="http://localhost:8000",
        help="Base URL of the API server"
    )
    parser.add_argument(
        "--question", "-q",
        default="What is the main topic discussed in the documents?",
        help="Question to ask"
    )
    parser.add_argument(
        "--namespace", "-n",
        default="documents",
        help="Namespace to search"
    )
    parser.add_argument(
        "--document-ids", "-d",
        nargs="+",
        help="Document IDs to filter (space-separated)"
    )
    
    args = parser.parse_args()
    
    asyncio.run(test_streaming_rag(
        base_url=args.url,
        question=args.question,
        namespace=args.namespace,
        document_ids=args.document_ids
    ))


if __name__ == "__main__":
    main()
