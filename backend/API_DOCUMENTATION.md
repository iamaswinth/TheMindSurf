# Backend API Documentation

Complete API reference for frontend integration with the RAG Comparator Backend.

## Base URL

```
http://localhost:8000
```

---

## 📋 API Endpoints

### **1. Root & Health**

#### `GET /`

**Description:** Get API information and available endpoints  
**Response:**

```json
{
  "name": "RAG Comparator Backend",
  "version": "0.1.0",
  "docs": "/docs",
  "health": "/api/v1/documents/health",
  "process": "/api/v1/documents/process-multimodal"
}
```

#### `GET /health`

**Description:** Root health check  
**Response:**

```json
{
  "status": "healthy",
  "version": "0.1.0",
  "ai_available": true
}
```

---

### **2. Documents Processing**

#### `GET /api/v1/documents/health`

**Description:** Check document processing service health  
**Response:**

```json
{
  "status": "healthy",
  "version": "0.1.0",
  "ai_available": true,
  "timestamp": "2026-01-05T..."
}
```

#### `POST /api/v1/documents/process-multimodal`

**Description:** Process PDF with multimodal extraction and AI enhancement  
**Request:** `multipart/form-data`

**Parameters:**

- **file** (required): PDF file to upload
- **strategy** (optional): `"hi_res"` (default, more accurate) or `"fast"` (quicker)
- **max_chunk_size** (optional): Maximum characters per chunk (500-10000, default: 3000)
- **enable_ai_enhancement** (optional): Enable AI summaries (default: true)
- **upsert_to_pinecone** (optional): Auto-upload to Pinecone (default: true)
- **pinecone_namespace** (optional): Custom Pinecone namespace

**Example using JavaScript:**

```javascript
const formData = new FormData();
formData.append("file", pdfFile);
formData.append("strategy", "hi_res");
formData.append("enable_ai_enhancement", "true");
formData.append("upsert_to_pinecone", "true");

const response = await fetch(
  "http://localhost:8000/api/v1/documents/process-multimodal",
  {
    method: "POST",
    body: formData,
  }
);

const result = await response.json();
```

**Response:**

```json
{
  "filename": "document.pdf",
  "total_chunks": 15,
  "processing_strategy": "hi_res",
  "ai_enhancement_enabled": true,
  "processing_stats": {
    "total_elements_extracted": 142,
    "text_only_chunks": 10,
    "chunks_with_tables": 3,
    "chunks_with_images": 2,
    "ai_enhanced_chunks": 5,
    "total_tables_found": 4,
    "total_images_found": 3,
    "total_pages": 25
  },
  "chunks": [
    {
      "chunk_id": 0,
      "enhanced_content": "Revenue analysis showing 15% growth...",
      "content_types": ["text", "table"],
      "original_content": {
        "raw_text": "...",
        "tables_html": ["<table>...</table>"],
        "images_base64": []
      },
      "metadata": {
        "page_numbers": [5],
        "is_ai_enhanced": true,
        "ai_model_used": "gpt-4o"
      }
    }
  ],
  "processing_time_seconds": 12.45,
  "warnings": []
}
```

---

### **3. Search Operations**

#### `GET /api/v1/search/status`

**Description:** Get Pinecone connection and index statistics  
**Response:**

```json
{
  "status": "healthy",
  "dense_index": {
    "name": "rag-dense",
    "stats": {
      "dimension": 1024,
      "index_fullness": 0.01,
      "total_vector_count": 1500
    }
  },
  "sparse_index": {
    "name": "rag-sparse",
    "stats": {
      "dimension": 512,
      "total_vector_count": 1500
    }
  },
  "namespace": "default"
}
```

#### `POST /api/v1/search/hybrid`

**Description:** Perform hybrid search using semantic + lexical matching

**Request Body:**

```json
{
  "query": "What were the Q3 2024 revenue results?",
  "top_k": 5,
  "rerank_top_n": 5,
  "namespace": "default",
  "include_metadata": true
}
```

**Parameters:**

- **query** (required): Search query text
- **top_k** (optional): Number of results from each index (default: 5, max: 100)
- **rerank_top_n** (optional): Results after reranking (default: 5, max: 50)
- **namespace** (optional): Namespace to search (default: configured namespace)
- **include_metadata** (optional): Include metadata in results (default: true)

**Response:**

```json
{
  "query": "What were the Q3 2024 revenue results?",
  "results": [
    {
      "id": "doc1_chunk_5",
      "score": 0.89,
      "chunk_text": "Q3 2024 revenue reached $1.6M...",
      "metadata": {
        "filename": "financial_report.pdf",
        "page_numbers": [5],
        "content_types": ["text", "table"]
      }
    }
  ],
  "stats": {
    "dense_results": 10,
    "sparse_results": 8,
    "merged_unique": 12,
    "final_results": 5,
    "search_time_seconds": 0.45
  }
}
```

#### `POST /api/v1/search/rag`

**Description:** Full RAG pipeline - search + generate answer with GPT-4o

**Request Body:**

```json
{
  "question": "What were the main achievements in Q3 2024?",
  "top_k": 5,
  "namespace": "default",
  "max_tokens": 2000,
  "temperature": 0.3,
  "system_message": "You are a helpful financial analyst..."
}
```

**Parameters:**

- **question** (required): Question to answer
- **top_k** (optional): Number of results to retrieve (default: 5, max: 100)
- **namespace** (optional): Namespace to search (default: configured namespace)
- **max_tokens** (optional): Maximum tokens in response (default: 2000, range: 100-4000)
- **temperature** (optional): Sampling temperature (default: 0.3, range: 0-2)
- **system_message** (optional): Custom system message for the LLM

**Response:**

```json
{
  "question": "What were the main achievements in Q3 2024?",
  "answer": "In Q3 2024, the company achieved significant milestones including...",
  "sources": [
    {
      "id": "doc1_chunk_5",
      "score": 0.89,
      "preview": "Q3 2024 revenue reached $1.6M, representing a 15% growth..."
    }
  ],
  "model_used": "gpt-4o",
  "search_stats": {
    "dense_results": 10,
    "sparse_results": 8,
    "merged_unique": 12,
    "final_results": 5,
    "search_time_seconds": 0.45
  }
}
```

---

### **4. Document Management**

#### `DELETE /api/v1/search/document`

**Description:** Delete all vectors for a specific document

**Request Body:**

```json
{
  "document_id": "financial_report.pdf",
  "namespace": "default"
}
```

**Response:**

```json
{
  "status": "success",
  "document_id": "financial_report.pdf",
  "message": "Document deleted from both indexes"
}
```

#### `DELETE /api/v1/search/namespace`

**Description:** Delete an entire namespace (⚠️ destructive operation)

**Request Body:**

```json
{
  "namespace": "test-namespace",
  "confirm": true
}
```

**Parameters:**

- **namespace** (required): Namespace to delete
- **confirm** (required): Must be `true` to confirm deletion

**Response:**

```json
{
  "status": "success",
  "namespace": "test-namespace",
  "message": "Namespace deleted from both indexes"
}
```

---

## 🔧 Common Use Cases

### **1. Upload and Process a Document**

```javascript
async function processDocument(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("strategy", "hi_res");
  formData.append("enable_ai_enhancement", "true");
  formData.append("upsert_to_pinecone", "true");

  const response = await fetch(
    "http://localhost:8000/api/v1/documents/process-multimodal",
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

// Usage
const fileInput = document.getElementById("fileInput");
const file = fileInput.files[0];
const result = await processDocument(file);
console.log(
  `Processed ${result.total_chunks} chunks in ${result.processing_time_seconds}s`
);
```

### **2. Search for Information**

```javascript
async function searchDocuments(query, topK = 5) {
  const response = await fetch("http://localhost:8000/api/v1/search/hybrid", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: query,
      top_k: topK,
      include_metadata: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

// Usage
const results = await searchDocuments("Q3 revenue");
results.results.forEach((result) => {
  console.log(
    `Score: ${result.score} - ${result.chunk_text.substring(0, 100)}...`
  );
});
```

### **3. Ask a Question (RAG)**

```javascript
async function askQuestion(question, options = {}) {
  const response = await fetch("http://localhost:8000/api/v1/search/rag", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: question,
      top_k: options.topK || 5,
      temperature: options.temperature || 0.3,
      max_tokens: options.maxTokens || 2000,
      namespace: options.namespace || null,
      system_message: options.systemMessage || null,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

// Usage
const answer = await askQuestion(
  "What were the main achievements in Q3 2024?",
  {
    temperature: 0.5,
    topK: 10,
  }
);

console.log("Answer:", answer.answer);
console.log("Sources:", answer.sources.length);
```

### **4. Check Service Status**

```javascript
async function checkStatus() {
  const [healthResponse, pineconeResponse] = await Promise.all([
    fetch("http://localhost:8000/api/v1/documents/health"),
    fetch("http://localhost:8000/api/v1/search/status"),
  ]);

  const health = await healthResponse.json();
  const pinecone = await pineconeResponse.json();

  return {
    apiHealthy: health.status === "healthy",
    aiAvailable: health.ai_available,
    pineconeHealthy: pinecone.status === "healthy",
    totalVectors: pinecone.dense_index.stats.total_vector_count,
  };
}

// Usage
const status = await checkStatus();
if (!status.apiHealthy) {
  console.error("API is not healthy!");
}
```

### **5. Delete a Document**

```javascript
async function deleteDocument(documentId, namespace = null) {
  const response = await fetch("http://localhost:8000/api/v1/search/document", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      document_id: documentId,
      namespace: namespace,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

// Usage
await deleteDocument("old_report.pdf");
```

---

## 🎨 React/TypeScript Example

### Type Definitions

```typescript
// types.ts
export interface ProcessingStats {
  total_elements_extracted: number;
  text_only_chunks: number;
  chunks_with_tables: number;
  chunks_with_images: number;
  ai_enhanced_chunks: number;
  total_tables_found: number;
  total_images_found: number;
  total_pages: number;
}

export interface MultimodalChunk {
  chunk_id: number;
  enhanced_content: string;
  content_types: string[];
  original_content: {
    raw_text: string;
    tables_html: string[];
    images_base64: string[];
  };
  metadata: {
    page_numbers: number[];
    is_ai_enhanced: boolean;
    ai_model_used?: string;
  };
}

export interface ProcessResponse {
  filename: string;
  total_chunks: number;
  processing_strategy: string;
  ai_enhancement_enabled: boolean;
  processing_stats: ProcessingStats;
  chunks: MultimodalChunk[];
  processing_time_seconds: number;
  warnings: string[];
}

export interface SearchResult {
  id: string;
  score: number;
  chunk_text: string;
  metadata?: Record<string, any>;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  stats: {
    dense_results: number;
    sparse_results: number;
    merged_unique: number;
    final_results: number;
    search_time_seconds: number;
  };
}

export interface RAGResponse {
  question: string;
  answer: string;
  sources: Array<{
    id: string;
    score: number;
    preview: string;
  }>;
  model_used: string;
  search_stats?: SearchResponse["stats"];
}
```

### API Service

```typescript
// api.ts
import type { ProcessResponse, SearchResponse, RAGResponse } from "./types";

const API_BASE_URL = "http://localhost:8000/api/v1";

export class APIClient {
  async processDocument(
    file: File,
    options: {
      strategy?: "hi_res" | "fast";
      enableAI?: boolean;
      upsertToPinecone?: boolean;
      maxChunkSize?: number;
    } = {}
  ): Promise<ProcessResponse> {
    const formData = new FormData();
    formData.append("file", file);

    if (options.strategy) {
      formData.append("strategy", options.strategy);
    }
    if (options.enableAI !== undefined) {
      formData.append("enable_ai_enhancement", String(options.enableAI));
    }
    if (options.upsertToPinecone !== undefined) {
      formData.append("upsert_to_pinecone", String(options.upsertToPinecone));
    }
    if (options.maxChunkSize) {
      formData.append("max_chunk_size", String(options.maxChunkSize));
    }

    const response = await fetch(
      `${API_BASE_URL}/documents/process-multimodal`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail?.message || "Processing failed");
    }

    return response.json();
  }

  async hybridSearch(
    query: string,
    options: {
      topK?: number;
      rerankTopN?: number;
      namespace?: string;
      includeMetadata?: boolean;
    } = {}
  ): Promise<SearchResponse> {
    const response = await fetch(`${API_BASE_URL}/search/hybrid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        top_k: options.topK,
        rerank_top_n: options.rerankTopN,
        namespace: options.namespace,
        include_metadata: options.includeMetadata ?? true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail?.message || "Search failed");
    }

    return response.json();
  }

  async ragQuery(
    question: string,
    options: {
      topK?: number;
      maxTokens?: number;
      temperature?: number;
      namespace?: string;
      systemMessage?: string;
    } = {}
  ): Promise<RAGResponse> {
    const response = await fetch(`${API_BASE_URL}/search/rag`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        top_k: options.topK,
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        namespace: options.namespace,
        system_message: options.systemMessage,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail?.message || "RAG query failed");
    }

    return response.json();
  }

  async deleteDocument(documentId: string, namespace?: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/search/document`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        document_id: documentId,
        namespace,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail?.message || "Delete failed");
    }
  }
}

export const apiClient = new APIClient();
```

### React Component Example

```tsx
// DocumentUpload.tsx
import React, { useState } from "react";
import { apiClient } from "./api";
import type { ProcessResponse } from "./types";

export const DocumentUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProcessResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.processDocument(file, {
        strategy: "hi_res",
        enableAI: true,
        upsertToPinecone: true,
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept=".pdf"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button onClick={handleUpload} disabled={!file || loading}>
        {loading ? "Processing..." : "Upload Document"}
      </button>

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="result">
          <h3>Processing Complete!</h3>
          <p>Filename: {result.filename}</p>
          <p>Total Chunks: {result.total_chunks}</p>
          <p>AI Enhanced: {result.processing_stats.ai_enhanced_chunks}</p>
          <p>Processing Time: {result.processing_time_seconds}s</p>
        </div>
      )}
    </div>
  );
};
```

---

## ⚠️ Error Responses

All endpoints return errors in this format:

```json
{
  "detail": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "additional": "context"
    }
  }
}
```

### Common Error Codes

#### Documents Processing

- **INVALID_FILE_TYPE** (400): Only PDF files are supported
- **FILE_TOO_LARGE** (413): File exceeds maximum size limit
- **FILE_READ_ERROR** (400): Failed to read uploaded file
- **PDF_PARSING_ERROR** (400): Failed to parse PDF document
- **PROCESSING_ERROR** (500): Document processing failed
- **SERVICE_INIT_ERROR** (500): Failed to initialize services

#### Search Operations

- **PINECONE_NOT_CONFIGURED** (503): Pinecone API key not set
- **AI_NOT_CONFIGURED** (503): OpenAI API key not set (for RAG)
- **PINECONE_CONNECTION_ERROR** (503): Cannot connect to Pinecone
- **SEARCH_ERROR** (500): Search operation failed
- **GENERATION_ERROR** (500): Answer generation failed

#### Document Management

- **DELETE_ERROR** (500): Document deletion failed
- **CONFIRMATION_REQUIRED** (400): Must confirm namespace deletion

---

## 🔐 Environment Configuration

Required environment variables (set in `.env`):

```bash
# OpenAI Configuration (for AI enhancement and RAG)
OPENAI_API_KEY=sk-your-key-here
OPENAI_VISION_MODEL=gpt-4o

# Pinecone Configuration (for vector storage and search)
PINECONE_API_KEY=your-pinecone-key
PINECONE_ENVIRONMENT=your-environment
PINECONE_DENSE_INDEX=rag-dense
PINECONE_SPARSE_INDEX=rag-sparse
PINECONE_NAMESPACE=default

# Application Configuration
MAX_FILE_SIZE_MB=50
MAX_CHUNK_CHARACTERS=3000
LOG_LEVEL=INFO
```

---

## 📊 Rate Limits & Performance

### Processing Times (Approximate)

- **Fast strategy**: ~0.5-1 second per page
- **Hi-res strategy**: ~1-3 seconds per page
- **AI enhancement**: +0.5-2 seconds per multimodal chunk
- **Pinecone upsert**: ~0.1-0.5 seconds for batch

### File Limits

- **Max file size**: 50MB (configurable via `MAX_FILE_SIZE_MB`)
- **Supported formats**: PDF only
- **Max chunk size**: 10,000 characters

### Search Performance

- **Hybrid search**: ~200-500ms
- **RAG generation**: ~1-5 seconds (depends on LLM)
- **Index stats**: ~100-200ms

---

## 📚 Interactive Documentation

The API provides interactive documentation at:

- **Swagger UI**: http://localhost:8000/docs

  - Interactive API testing
  - Request/response examples
  - Schema documentation

- **ReDoc**: http://localhost:8000/redoc

  - Clean, organized documentation
  - Detailed schemas
  - Download OpenAPI spec

- **OpenAPI JSON**: http://localhost:8000/openapi.json
  - Raw OpenAPI specification
  - Can be imported into Postman, Insomnia, etc.

---

## 🚀 Quick Start Checklist

1. **Environment Setup**

   - [ ] Set `OPENAI_API_KEY` in `.env`
   - [ ] Set `PINECONE_API_KEY` in `.env`
   - [ ] Configure Pinecone indexes

2. **Test Health Endpoints**

   - [ ] GET `/health` returns healthy
   - [ ] GET `/api/v1/documents/health` shows AI available
   - [ ] GET `/api/v1/search/status` shows Pinecone connected

3. **Upload First Document**

   - [ ] POST PDF to `/api/v1/documents/process-multimodal`
   - [ ] Verify chunks are returned
   - [ ] Check Pinecone upsert succeeded

4. **Test Search**

   - [ ] POST query to `/api/v1/search/hybrid`
   - [ ] Verify results are returned
   - [ ] Check search scores

5. **Test RAG**
   - [ ] POST question to `/api/v1/search/rag`
   - [ ] Verify answer is generated
   - [ ] Check sources are included

---

## 🐛 Troubleshooting

### "AI_NOT_CONFIGURED" Error

- Ensure `OPENAI_API_KEY` is set in `.env`
- Restart the backend server after adding the key
- Check the key is valid and has credits

### "PINECONE_NOT_CONFIGURED" Error

- Ensure `PINECONE_API_KEY` is set in `.env`
- Verify `PINECONE_DENSE_INDEX` and `PINECONE_SPARSE_INDEX` exist
- Check Pinecone dashboard for index status

### File Upload Fails

- Check file is a valid PDF
- Verify file size is under `MAX_FILE_SIZE_MB`
- Ensure PDF is not password-protected or corrupted

### Search Returns No Results

- Verify documents have been uploaded and upserted
- Check namespace matches between upload and search
- Try with `include_metadata: true` for debugging

### CORS Issues

- Backend has CORS enabled for all origins in development
- For production, configure `CORS_ORIGINS` appropriately
- Ensure requests include proper headers

---

## 🆕 New API Endpoints (January 2026)

### **Namespace Management**

#### `GET /api/v1/namespaces`

**Description:** List all namespaces  
**Response:**

```json
{
  "namespaces": [
    {
      "id": "uuid-here",
      "name": "cn_unit5",
      "description": "Computer Networks Unit 5",
      "document_count": 5,
      "total_chunks": 245,
      "created_at": "2025-12-01T10:30:00Z",
      "metadata": {
        "last_modified": "2025-12-05T14:20:00Z",
        "vector_count": 245
      }
    }
  ],
  "total": 1
}
```

#### `GET /api/v1/namespaces/{id}`

**Description:** Get namespace details  
**Response:**

```json
{
  "id": "uuid-here",
  "name": "cn_unit5",
  "description": "Computer Networks Unit 5",
  "document_count": 5,
  "total_chunks": 245,
  "created_at": "2025-12-01T10:30:00Z",
  "documents": ["doc-uuid-1", "doc-uuid-2"],
  "stats": {
    "total_vectors": 245,
    "total_pages": 123,
    "total_file_size": "15.3 MB"
  }
}
```

#### `POST /api/v1/namespaces`

**Description:** Create a new namespace  
**Request Body:**

```json
{
  "name": "new_namespace",
  "description": "Optional description"
}
```

**Response:**

```json
{
  "id": "uuid-generated",
  "name": "new_namespace",
  "document_count": 0,
  "created_at": "2026-01-05T12:00:00Z"
}
```

#### `DELETE /api/v1/namespaces/{id}`

**Description:** Delete namespace and all documents  
**Response:**

```json
{
  "status": "success",
  "message": "Namespace and 5 documents deleted",
  "deleted_documents": ["doc1", "doc2", "doc3"]
}
```

---

### **Document Management**

#### `GET /api/v1/documents`

**Description:** List all documents  
**Query Parameters:**

- `namespace_id` (optional): Filter by namespace UUID
- `namespace` (optional): Filter by Pinecone namespace name
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 10, max: 100)

**Response:**

```json
{
  "documents": [
    {
      "id": "doc-uuid",
      "name": "Computer_Networks_Unit5.pdf",
      "page_count": 23,
      "file_size": "1.2 MB",
      "file_size_bytes": 1258291,
      "uploaded_at": "2025-01-01T10:30:00Z",
      "namespace": "cn_unit5",
      "namespace_name": "Computer Networks",
      "metadata": {
        "processing_strategy": "hi_res",
        "chunk_count": 45,
        "has_images": true,
        "has_tables": true
      }
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 10
}
```

#### `GET /api/v1/documents/{id}`

**Description:** Get document details  
**Response:**

```json
{
  "id": "doc-uuid",
  "name": "Computer_Networks_Unit5.pdf",
  "page_count": 23,
  "file_size": "1.2 MB",
  "uploaded_at": "2025-01-01T10:30:00Z",
  "namespace": "cn_unit5",
  "processing_stats": {
    "total_chunks": 45,
    "ai_enhanced_chunks": 12,
    "total_tables": 8,
    "total_images": 3
  }
}
```

#### `DELETE /api/v1/documents/{id}`

**Description:** Delete document from NeonDB and Pinecone  
**Response:**

```json
{
  "status": "success",
  "message": "Document deleted successfully",
  "document_id": "doc-uuid",
  "vectors_deleted": 45
}
```

---

### **Chat API**

#### `POST /api/v1/chat`

**Description:** Chat with documents using RAG  
**Request Body:**

```json
{
  "message": "What is DHCP?",
  "mode": "namespace",
  "namespace_id": "ns-uuid",
  "temperature": 0.3,
  "max_tokens": 2000,
  "top_k": 5,
  "use_hybrid_search": true
}
```

**Chat Modes:**

- `"namespace"` - Chat with all documents in a namespace (requires `namespace_id`)
- `"single"` - Chat with one document (requires `document_id`)
- `"multi"` - Chat with multiple documents (requires `document_ids` array)

**Response:**

```json
{
  "response": "DHCP (Dynamic Host Configuration Protocol) is...",
  "sources": [
    {
      "document_name": "Computer_Networks_Unit5.pdf",
      "document_id": "doc-uuid",
      "page_number": 23,
      "chunk_text": "DHCP is a client/server protocol...",
      "score": 0.89,
      "metadata": {
        "content_types": ["text", "table"],
        "namespace": "cn_unit5"
      }
    }
  ],
  "metadata": {
    "model_used": "gpt-4o",
    "search_time_ms": 234.5,
    "generation_time_ms": 1523.2,
    "mode": "namespace",
    "documents_searched": 5
  }
}
```

---

## 📞 Support

- **Interactive Docs**: http://localhost:8000/docs
- **Architecture**: See `ARCHITECTURE.md` in backend folder
- **Deployment**: See `DEPLOYMENT.md` in backend folder

---

**Last Updated**: January 5, 2026  
**API Version**: 0.2.0
