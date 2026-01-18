# FastAPI Backend Setup for React Query Integration

## Required Backend Endpoints

Your FastAPI backend should have these endpoints for the frontend to work:

### 1. **Namespaces Endpoints**

```python
# GET /api/v1/namespaces - List all namespaces
@app.get("/api/v1/namespaces")
async def get_namespaces():
    return [
        {
            "id": "ns1",
            "name": "cn_unit5",
            "documentCount": 5,
            "createdAt": "2025-12-01T00:00:00Z"
        },
        # ...
    ]

# GET /api/v1/namespaces/{id} - Get single namespace
@app.get("/api/v1/namespaces/{namespace_id}")
async def get_namespace(namespace_id: str):
    return {
        "id": namespace_id,
        "name": "cn_unit5",
        "documentCount": 5,
        "createdAt": "2025-12-01T00:00:00Z"
    }

# POST /api/v1/namespaces - Create namespace
@app.post("/api/v1/namespaces")
async def create_namespace(request: NamespaceCreate):
    return {
        "id": "new_id",
        "name": request.name,
        "documentCount": 0,
        "createdAt": datetime.now().isoformat()
    }

# DELETE /api/v1/namespaces/{id} - Delete namespace
@app.delete("/api/v1/namespaces/{namespace_id}")
async def delete_namespace(namespace_id: str):
    return {"message": "Deleted successfully"}
```

### 2. **Documents Endpoints**

```python
# GET /api/v1/documents - List documents (optionally filtered by namespace)
@app.get("/api/v1/documents")
async def get_documents(namespace_id: Optional[str] = None):
    return [
        {
            "id": "doc1",
            "name": "Computer_Networks_Unit5.pdf",
            "pageCount": 23,
            "fileSize": "1.2 MB",
            "uploadedAt": "2025-01-01T00:00:00Z",
            "namespace": "ns1"
        },
        # ...
    ]

# GET /api/v1/documents/{id} - Get single document
@app.get("/api/v1/documents/{document_id}")
async def get_document(document_id: str):
    return {
        "id": document_id,
        "name": "document.pdf",
        "pageCount": 23,
        "fileSize": "1.2 MB",
        "uploadedAt": "2025-01-01T00:00:00Z",
        "namespace": "ns1"
    }

# POST /api/v1/documents/upload - Upload document
@app.post("/api/v1/documents/upload")
async def upload_document(
    file: UploadFile,
    namespace_id: str = Form(...),
    chunk_size: int = Form(500),
    chunk_overlap: int = Form(50),
    extract_tables: bool = Form(True)
):
    # Process the file
    return {
        "id": "new_doc_id",
        "name": file.filename,
        "pageCount": 25,
        "fileSize": "1.5 MB",
        "uploadedAt": datetime.now().isoformat(),
        "namespace": namespace_id
    }

# DELETE /api/v1/documents/{id} - Delete document
@app.delete("/api/v1/documents/{document_id}")
async def delete_document(document_id: str):
    return {"message": "Deleted successfully"}
```

### 3. **Chat Endpoints**

```python
# POST /api/v1/chat - Non-streaming chat
@app.post("/api/v1/chat")
async def chat(request: ChatRequest):
    return {
        "response": "This is the answer...",
        "sources": [
            {
                "document_name": "doc.pdf",
                "document_id": "doc1",
                "page_number": 5,
                "chunk_text": "Relevant text...",
                "score": 0.95,
                "metadata": {}
            }
        ],
        "metadata": {
            "tokens_used": 150,
            "response_time": "2.5s"
        }
    }

# POST /api/v1/chat/stream - Streaming chat
@app.post("/api/v1/chat/stream")
async def chat_stream(request: ChatRequest):
    async def generate():
        # Stream response
        for chunk in response_chunks:
            yield f"data: {json.dumps({'content': chunk})}\n\n"

        # Send final message with sources
        yield f"data: {json.dumps({'done': True, 'sources': sources})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
```

### 4. **Pydantic Models**

```python
from pydantic import BaseModel
from typing import List, Optional

class NamespaceCreate(BaseModel):
    name: str

class ChatRequest(BaseModel):
    message: str
    mode: str  # 'namespace' | 'single' | 'multi'
    namespace_id: Optional[str] = None
    document_ids: Optional[List[str]] = None
    temperature: float = 0.3
    max_tokens: int = 1000
    top_k: int = 5
    use_hybrid_search: bool = True
```

### 5. **CORS Configuration**

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://your-domain.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 6. **Error Handling**

```python
from fastapi import HTTPException

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)}
    )

# Usage in endpoints
if not document:
    raise HTTPException(
        status_code=404,
        detail="Document not found"
    )
```

### 7. **Testing with FastAPI**

```bash
# Start your FastAPI server
uvicorn main:app --reload --port 8000

# Test endpoints
curl http://localhost:8000/api/v1/namespaces
curl http://localhost:8000/api/v1/documents?namespace_id=ns1
```

### 8. **Example Complete Backend Structure**

```
backend/
├── main.py                 # FastAPI app initialization
├── requirements.txt        # Dependencies
├── app/
│   ├── __init__.py
│   ├── api/
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── router.py
│   │       └── endpoints/
│   │           ├── __init__.py
│   │           ├── namespaces.py
│   │           ├── documents.py
│   │           └── chat.py
│   ├── core/
│   │   ├── __init__.py
│   │   └── config.py
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py
│   └── services/
│       ├── __init__.py
│       ├── pinecone_service.py
│       ├── chunking_service.py
│       └── generation_service.py
```

## Environment Variables (Backend)

```bash
# .env
PINECONE_API_KEY=your_key_here
PINECONE_ENVIRONMENT=your_env
OPENAI_API_KEY=your_key_here

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.com

# Database
DATABASE_URL=postgresql://user:pass@localhost/dbname
```

## Response Format Standards

All endpoints should return consistent error formats:

```json
{
  "detail": "Error message here",
  "code": "ERROR_CODE",
  "status": 400
}
```

Success responses for mutations:

```json
{
  "success": true,
  "message": "Operation completed",
  "data": { ... }
}
```
