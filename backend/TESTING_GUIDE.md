# Testing the Streaming RAG Endpoint

## Method 1: Interactive Web Interface (EASIEST) ⭐

**Just open your browser:**

```
http://localhost:8000/test-streaming
```

This provides a beautiful, real-time interface where you can:

- Enter your question
- Set namespace and parameters
- See sources appear immediately after search
- Watch the answer stream token-by-token
- View performance metrics

![Screenshot](https://via.placeholder.com/800x400/667eea/ffffff?text=Interactive+Streaming+Test+Interface)

---

## Method 2: Using the Python Test Client

Run the included test client:

```bash
# Basic test
python test_streaming_client.py

# Custom question
python test_streaming_client.py -q "What are the main findings?" -n "documents"

# With document filter
python test_streaming_client.py -q "Summarize" -n "documents" -d "doc-123"
```

---

## Method 3: Using curl

```bash
curl -X POST "http://localhost:8000/api/v1/search/rag-stream" ^
     -H "Content-Type: application/json" ^
     -H "Accept: text/event-stream" ^
     -d "{\"question\": \"What is machine learning?\", \"namespace\": \"documents\"}" ^
     --no-buffer
```

---

## Method 4: FastAPI Docs (Limited)

Go to: `http://localhost:8000/docs`

Find the `/api/v1/search/rag-stream` endpoint and try it out.

**Note:** The FastAPI docs (Swagger UI) don't display SSE streams well - you'll see the raw event data instead of the formatted output. Use Method 1 (web interface) for the best experience.

---

## Quick Start Guide

### 1. Start the server:

```bash
uvicorn main:app --reload
```

### 2. Open the test interface:

```
http://localhost:8000/test-streaming
```

### 3. Enter your test data:

- **Question**: "What is the main topic discussed?"
- **Namespace**: "documents" (or your namespace)
- **Top K**: 5
- **Temperature**: 0.3

### 4. Click "Ask Question"

You'll see:

1. ⏳ Status updates (searching → generating)
2. 📚 Sources appear first (with relevance scores)
3. 💡 Answer streams token by token
4. 📊 Performance metrics at the end

---

## Example Response Flow

```
📋 [STARTED] Request received, processing query
📚 SOURCES (5 found, 150ms)
  1. [95.2%] This document discusses machine learning...
  2. [89.3%] Key concepts include supervised learning...
  ...
🤖 GENERATING with gpt-4o
----------------------------------------
Machine learning is a subset of artificial
intelligence that focuses on...
[streaming continues...]
----------------------------------------
✅ COMPLETE
   Tokens: 150
   Search time: 150ms
   Generation time: 3200ms
   Total time: 3350ms
```

---

## Testing from Frontend Applications

### React/Next.js Example

```javascript
const response = await fetch("/api/v1/search/rag-stream", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  },
  body: JSON.stringify({
    question: "What is machine learning?",
    namespace: "documents",
    top_k: 5,
  }),
});

const reader = response.body.getReader();
// ... handle streaming
```

See `STREAMING_RAG.md` for complete code examples.

---

## Troubleshooting

### "Connection refused"

- Make sure the server is running: `uvicorn main:app --reload`
- Check the URL: `http://localhost:8000`

### "Namespace not found"

- Make sure you've uploaded documents to the namespace
- Check available namespaces: `GET /api/v1/namespaces`

### "No search results"

- Your Pinecone indexes may be empty
- Upload documents first using: `POST /api/v1/documents/process-multimodal`

### Page not loading

- The `static/` directory should exist in your backend folder
- Make sure `test_streaming.html` is in the `static/` folder

---

## API Endpoints

| Endpoint                    | Method | Description                |
| --------------------------- | ------ | -------------------------- |
| `/`                         | GET    | API info                   |
| `/docs`                     | GET    | OpenAPI/Swagger UI         |
| `/test-streaming`           | GET    | Interactive test interface |
| `/api/v1/search/rag-stream` | POST   | Streaming RAG endpoint     |
| `/api/v1/search/rag`        | POST   | Non-streaming RAG          |
| `/api/v1/search/status`     | GET    | Pinecone status            |

---

## Performance Tips

1. **Use document filters** to narrow search scope
2. **Adjust top_k** based on your needs (lower = faster)
3. **Lower temperature** for more focused responses
4. **Monitor the metrics** to identify bottlenecks

---

## Next Steps

- See `STREAMING_RAG.md` for detailed API documentation
- Check `test_streaming_client.py` for Python client examples
- View `/docs` for complete API reference
