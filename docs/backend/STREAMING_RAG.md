# Streaming RAG Endpoint Documentation

## Overview

The streaming RAG endpoint (`POST /api/v1/search/rag-stream`) provides real-time, token-by-token response generation using Server-Sent Events (SSE). This reduces perceived latency by 60-80% compared to the traditional synchronous endpoint.

## Endpoint Details

### URL

```
POST /api/v1/search/rag-stream
```

### Headers

```http
Content-Type: application/json
Accept: text/event-stream
```

### Request Body

| Field            | Type     | Required | Default | Description                  |
| ---------------- | -------- | -------- | ------- | ---------------------------- |
| `question`       | string   | Yes      | -       | The question to answer       |
| `namespace`      | string   | Yes      | -       | Namespace to search in       |
| `document_id`    | string   | No       | null    | Single document filter       |
| `document_ids`   | string[] | No       | null    | Multiple documents filter    |
| `top_k`          | integer  | No       | 5       | Number of search results     |
| `temperature`    | float    | No       | 0.3     | Generation temperature (0-2) |
| `max_tokens`     | integer  | No       | 2000    | Maximum response tokens      |
| `system_message` | string   | No       | null    | Custom system prompt         |

### Example Request

```json
{
  "question": "What are the main findings in the research paper?",
  "namespace": "documents",
  "document_ids": ["doc-123", "doc-456"],
  "top_k": 5,
  "temperature": 0.3,
  "max_tokens": 2000
}
```

## SSE Event Types

The endpoint streams five distinct event types:

### 1. Status Event

Sent to indicate processing stage changes.

```
event: status
data: {"request_id": "abc123", "message": "Processing request", "stage": "started", "timestamp": "2024-01-15T10:30:00Z"}
```

Stages: `started`, `generating`

### 2. Sources Event

Sent immediately after search completes with all retrieved documents.

```
event: sources
data: {
    "request_id": "abc123",
    "sources": [
        {
            "id": "doc-123_chunk_0",
            "score": 0.95,
            "preview": "First 300 characters of the chunk text...",
            "page_numbers": ["1", "2"],
            "metadata": {...}
        }
    ],
    "count": 5,
    "search_time_ms": 150.5,
    "timestamp": "2024-01-15T10:30:00Z"
}
```

### 3. Answer Start Event

Signals that answer generation is beginning.

```
event: answer_start
data: {"request_id": "abc123", "model": "gpt-4o", "timestamp": "2024-01-15T10:30:01Z"}
```

### 4. Token Event

Sent for each token generated (creates real-time typing effect).

```
event: token
data: {"request_id": "abc123", "token": "The", "index": 0}

event: token
data: {"request_id": "abc123", "token": " main", "index": 1}

event: token
data: {"request_id": "abc123", "token": " findings", "index": 2}
```

### 5. Done Event

Final event with comprehensive metadata.

```
event: done
data: {
    "request_id": "abc123",
    "total_tokens": 150,
    "timing": {
        "search_time_ms": 150.5,
        "generation_time_ms": 3200.0,
        "total_time_ms": 3350.5
    },
    "model_used": "gpt-4o",
    "cached": false,
    "warnings": [],
    "timestamp": "2024-01-15T10:30:05Z"
}
```

### 6. Error Event (on failure)

Sent if an error occurs during processing.

```
event: error
data: {
    "request_id": "abc123",
    "error_type": "SEARCH_ERROR",
    "message": "Failed to search documents",
    "details": {},
    "recoverable": false,
    "timestamp": "2024-01-15T10:30:01Z"
}
```

---

## Testing the Endpoint

### Using curl

```bash
# Basic request
curl -X POST "http://localhost:8000/api/v1/search/rag-stream" \
     -H "Content-Type: application/json" \
     -H "Accept: text/event-stream" \
     -d '{"question": "What is machine learning?", "namespace": "documents"}' \
     --no-buffer

# With document filter
curl -X POST "http://localhost:8000/api/v1/search/rag-stream" \
     -H "Content-Type: application/json" \
     -H "Accept: text/event-stream" \
     -d '{
         "question": "Summarize the key points",
         "namespace": "documents",
         "document_id": "my-document-id",
         "top_k": 3,
         "temperature": 0.5
     }' \
     --no-buffer
```

### Using Python (httpx)

```python
import httpx
import json

async def stream_rag_response():
    """Stream RAG response using httpx."""
    url = "http://localhost:8000/api/v1/search/rag-stream"

    payload = {
        "question": "What are the main conclusions?",
        "namespace": "documents",
        "top_k": 5
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        async with client.stream(
            "POST",
            url,
            json=payload,
            headers={"Accept": "text/event-stream"}
        ) as response:
            answer = ""
            sources = []

            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = json.loads(line[6:])

                    # Check previous line for event type
                    # (In practice, parse event type from 'event:' line)

                    if "token" in data:
                        # Token event
                        print(data["token"], end="", flush=True)
                        answer += data["token"]

                    elif "sources" in data:
                        # Sources event
                        sources = data["sources"]
                        print(f"\n[Found {len(sources)} sources]")

                    elif "total_tokens" in data:
                        # Done event
                        print(f"\n\n[Generation complete: {data['total_tokens']} tokens]")
                        print(f"[Total time: {data['timing']['total_time_ms']:.0f}ms]")

            return answer, sources

# Run with: asyncio.run(stream_rag_response())
```

### Using Python (aiohttp)

```python
import aiohttp
import asyncio
import json

async def stream_rag_with_aiohttp():
    """Stream RAG response using aiohttp."""
    url = "http://localhost:8000/api/v1/search/rag-stream"

    payload = {
        "question": "What are the main conclusions?",
        "namespace": "documents"
    }

    async with aiohttp.ClientSession() as session:
        async with session.post(
            url,
            json=payload,
            headers={"Accept": "text/event-stream"}
        ) as response:
            answer = ""

            async for line in response.content:
                line = line.decode('utf-8').strip()

                if line.startswith("event: "):
                    event_type = line[7:]

                elif line.startswith("data: "):
                    data = json.loads(line[6:])

                    if event_type == "token":
                        print(data["token"], end="", flush=True)
                        answer += data["token"]

                    elif event_type == "sources":
                        print(f"\n[Found {data['count']} sources]")

                    elif event_type == "done":
                        print(f"\n[Done in {data['timing']['total_time_ms']:.0f}ms]")

                    elif event_type == "error":
                        print(f"\n[Error: {data['message']}]")
                        break

            return answer

# Run with: asyncio.run(stream_rag_with_aiohttp())
```

### Using JavaScript (Browser/Node.js)

```javascript
async function streamRAGResponse() {
  const response = await fetch(
    "http://localhost:8000/api/v1/search/rag-stream",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        question: "What are the main conclusions?",
        namespace: "documents",
      }),
    }
  );

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let answer = "";
  let sources = [];
  let currentEventType = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEventType = line.slice(7);
      } else if (line.startsWith("data: ")) {
        const data = JSON.parse(line.slice(6));

        switch (currentEventType) {
          case "status":
            console.log(`[Status: ${data.stage}]`);
            break;

          case "sources":
            sources = data.sources;
            console.log(`[Found ${sources.length} sources]`);
            break;

          case "answer_start":
            console.log(`[Generating with ${data.model}...]`);
            break;

          case "token":
            process.stdout.write(data.token); // Node.js
            // document.getElementById('answer').textContent += data.token; // Browser
            answer += data.token;
            break;

          case "done":
            console.log(
              `\n[Complete: ${data.total_tokens} tokens in ${data.timing.total_time_ms}ms]`
            );
            break;

          case "error":
            console.error(`[Error: ${data.message}]`);
            break;
        }
      }
    }
  }

  return { answer, sources };
}

// Usage
streamRAGResponse().then(({ answer, sources }) => {
  console.log("\n\nFinal Answer:", answer);
  console.log("Sources:", sources);
});
```

### Using EventSource (Browser)

```javascript
// Note: EventSource only supports GET requests, so you'll need a proxy
// or use the fetch API above for POST requests

// If you create a GET endpoint variant:
const eventSource = new EventSource(
  "/api/v1/search/rag-stream-get?question=..."
);

eventSource.addEventListener("status", (e) => {
  const data = JSON.parse(e.data);
  console.log("Status:", data.stage);
});

eventSource.addEventListener("sources", (e) => {
  const data = JSON.parse(e.data);
  displaySources(data.sources);
});

eventSource.addEventListener("token", (e) => {
  const data = JSON.parse(e.data);
  appendToken(data.token);
});

eventSource.addEventListener("done", (e) => {
  const data = JSON.parse(e.data);
  console.log("Complete:", data.timing);
  eventSource.close();
});

eventSource.addEventListener("error", (e) => {
  console.error("Stream error");
  eventSource.close();
});
```

---

## React Component Example

```tsx
import React, { useState, useCallback } from "react";

interface Source {
  id: string;
  score: number;
  preview: string;
  page_numbers?: string[];
}

interface StreamingRAGProps {
  namespace: string;
  documentIds?: string[];
}

export function StreamingRAGChat({
  namespace,
  documentIds,
}: StreamingRAGProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("");

  const handleSubmit = useCallback(async () => {
    setIsLoading(true);
    setAnswer("");
    setSources([]);
    setStatus("Starting...");

    try {
      const response = await fetch("/api/v1/search/rag-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          question,
          namespace,
          document_ids: documentIds,
          top_k: 5,
        }),
      });

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let currentEventType = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value).split("\n");

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEventType = line.slice(7);
          } else if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));

            switch (currentEventType) {
              case "status":
                setStatus(data.message);
                break;
              case "sources":
                setSources(data.sources);
                setStatus("Generating answer...");
                break;
              case "token":
                setAnswer((prev) => prev + data.token);
                break;
              case "done":
                setStatus(
                  `Complete (${data.timing.total_time_ms.toFixed(0)}ms)`
                );
                break;
              case "error":
                setStatus(`Error: ${data.message}`);
                break;
            }
          }
        }
      }
    } catch (error) {
      setStatus(`Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  }, [question, namespace, documentIds]);

  return (
    <div className="streaming-rag-chat">
      <div className="input-section">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question..."
          disabled={isLoading}
        />
        <button onClick={handleSubmit} disabled={isLoading || !question}>
          {isLoading ? "Processing..." : "Ask"}
        </button>
      </div>

      {status && <div className="status">{status}</div>}

      {sources.length > 0 && (
        <div className="sources">
          <h4>Sources ({sources.length})</h4>
          {sources.map((source, i) => (
            <div key={source.id} className="source">
              <span className="score">{(source.score * 100).toFixed(1)}%</span>
              <span className="preview">{source.preview}</span>
            </div>
          ))}
        </div>
      )}

      {answer && (
        <div className="answer">
          <h4>Answer</h4>
          <div className="answer-text">{answer}</div>
        </div>
      )}
    </div>
  );
}
```

---

## Error Handling

The streaming endpoint handles errors gracefully:

1. **Search Errors**: If Pinecone search fails, an error event is sent and the stream closes.
2. **Generation Errors**: If OpenAI generation fails mid-stream, an error event includes partial token count.
3. **Connection Errors**: The server detects client disconnection and cancels ongoing operations.
4. **Timeouts**: Built-in timeouts prevent hung connections.

### Client-Side Error Handling

```javascript
try {
  // ... streaming code ...
} catch (error) {
  if (error.name === "AbortError") {
    console.log("Request was cancelled");
  } else {
    console.error("Stream error:", error);
  }
}
```

---

## Performance Characteristics

| Metric               | Synchronous `/rag` | Streaming `/rag-stream` |
| -------------------- | ------------------ | ----------------------- |
| Time to first result | 3-8 seconds        | 200-500ms (sources)     |
| Perceived latency    | Full wait time     | Progressive display     |
| Memory usage         | Buffered response  | Streamed chunks         |
| Connection type      | Standard HTTP      | Keep-alive SSE          |

---

## Best Practices

1. **Always set `--no-buffer` with curl** to see tokens in real-time
2. **Handle all event types** in your client for robust error handling
3. **Use the request_id** from events for logging and debugging
4. **Implement reconnection logic** for long-running applications
5. **Set appropriate timeouts** (60s recommended for generation)

---

## Related Endpoints

- `POST /api/v1/search/rag` - Non-streaming RAG (returns complete response)
- `POST /api/v1/search/hybrid` - Hybrid search without generation
- `GET /api/v1/search/status` - Check Pinecone connection status
