# Backend API Development Requirements

## 🎯 Overview

The frontend has several features that require backend API endpoints to be implemented. Below is a comprehensive list of missing APIs based on the frontend functionality analysis.

## 🗄️ Database Architecture Pattern

**IMPORTANT**: Neon DB is already implemented and configured in the backend. Use this pattern:

1. **Neon DB = Source of Truth**: All namespaces and documents metadata are stored in Neon DB
2. **Pinecone = Vector Storage**: Only embeddings/vectors are stored in Pinecone with document IDs as metadata
3. **Operation Pattern**:
   - **Listing**: Fetch from Neon DB (namespaces, documents)
   - **Details**: Query Neon DB for document/namespace info
   - **Deletion**: Get ID from Neon DB → Delete from both Neon DB AND Pinecone
   - **Creation**: Save to Neon DB → Upsert vectors to Pinecone with document_id reference

**Implementation Flow Example**:

```
DELETE Document:
1. Get document from Neon DB by ID → returns document metadata with document_id
2. Delete from Neon DB (cascades to relationships)
3. Delete vectors from Pinecone using document_id from metadata
4. Return success response

LIST Documents:
1. Query Neon DB for all documents (with namespace filtering if needed)
2. Return documents with counts, metadata, etc.
3. No Pinecone query needed for listing
```

---

## ✅ Currently Available Backend APIs (Reference)

### Document Processing

- ✅ `POST /api/v1/documents/process-multimodal` - Process PDF with AI enhancement
- ✅ `GET /api/v1/documents/health` - Health check

### Search & RAG

- ✅ `GET /api/v1/search/status` - Pinecone status and stats
- ✅ `POST /api/v1/search/hybrid` - Hybrid semantic + lexical search
- ✅ `POST /api/v1/search/rag` - RAG query with answer generation
- ✅ `DELETE /api/v1/search/document` - Delete document from indexes
- ✅ `DELETE /api/v1/search/namespace` - Delete entire namespace

---

## ❌ MISSING Backend APIs

### 1. Namespace Management APIs

The frontend has a dedicated **Namespaces page** (`/namespaces`) with full CRUD operations, but the backend is missing these endpoints:

#### Required Endpoints:

**GET /api/v1/namespaces**

- **Purpose**: List all available namespaces from Neon DB
- **Implementation**: Query Neon DB namespaces table, join with documents to get count
- **Frontend Usage**: Display namespaces in the Namespaces page, populate namespace dropdown in chat
- **Response Format**:

```json
[
  {
    "id": "ns1",
    "name": "cn_unit5",
    "documentCount": 5,
    "createdAt": "2025-12-01T10:30:00Z",
    "metadata": {
      "lastModified": "2025-12-05T14:20:00Z",
      "vectorCount": 245
    }
  }
]
```

**GET /api/v1/namespaces/{id}**

- **Purpose**: Get details of a specific namespace from Neon DB
- **Implementation**: Query Neon DB by namespace ID, include related documents and stats
- **Frontend Usage**: View namespace details, fetch documents in a namespace
- **Response Format**:

```json
{
  "id": "ns1",
  "name": "cn_unit5",
  "documentCount": 5,
  "createdAt": "2025-12-01T10:30:00Z",
  "documents": ["doc1", "doc2", "doc3"],
  "stats": {
    "totalVectors": 245,
    "totalPages": 123,
    "totalFileSize": "15.3 MB"
  }
}
```

**POST /api/v1/namespaces**
in Neon DB

- **Implementation**: Insert new namespace record into Neon DB, generate unique ID
- **Purpose**: Create a new namespace
- **Frontend Usage**: "Create Namespace" button in Namespaces page
- **Request Body**:

```json
{
  "name": "new_namespace"
}
```

- **Response**:

```json
{
  "id": "ns_generated_id",
  "name": "new_namespace",
  "documentCount": 0,
  "createdAt": "2025-01-05T12:00:00Z"
}
```

**DELETE /api/v1/namespaces/{id}**
from both Neon DB and Pinecone

- **Implementation**:
  1. Get namespace from Neon DB by ID
  2. Get all document IDs associated with this namespace
  3. Delete all document vectors from Pinecone using these document IDs
  4. Delete namespace from Neon DB (cascades to documents due to foreign key)
- **Frontend Usage**: Delete button on namespace cards
- **Note**: Should cascade delete all documents in the namespace
- **Response**:

```json
{
  "status": "success",
  "message": "Namespace and 5 documents deleted",
  "deletedDocuments": ["doc1", "doc2", "doc3", "doc4", "doc5"]
}
```

---

### 2. Document Management APIs

The frontend has a **Documents page** (`/documents`) with document listing, filtering, and deletion, but the backend is missing these endpoints:

#### Required Endpoints: from Neon DB, optionally filtered by namespace

- **Implementation**: Query Neon DB documents table with optional namespace_id filter, include namespace name via join

**GET /api/v1/documents**

- **Purpose**: List all documents, optionally filtered by namespace
- **Frontend Usage**: Display documents in Documents page, show documents in chat sidebar
- **Query Parameters**:
  - `namespace_id` (optional): Filter by namespace
  - `page` (optional): Pagination
  - `limit` (optional): Results per page
- **Response Format**:

```json
{
  "documents": [
    {
      "id": "doc1",
      "name": "Computer_Networks_Unit5.pdf",
      "pageCount": 23,
      "fileSize": "1.2 MB",
      "uploadedAt": "2025-01-01T10:30:00Z",
      "namespace": "ns1",
      "namespaceName": "cn_unit5",
      "metadata": {
        "processingStrategy": "hi_res",
        "chunkCount": 45,
        "hasImages": true,
        "hasTables": true
      }
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 10
} from Neon DB
- **Implementation**: Query Neon DB by document ID, return all stored metadata including processing stats
```

**GET /api/v1/documents/{id}**

- **Purpose**: Get details of a specific document
- **Frontend Usage**: View document details, show metadata in UI
- **Response Format**:

```json
{
  "id": "doc1",
  "name": "Computer_Networks_Unit5.pdf",
  "pageCount": 23,
  "fileSize": "1.2 MB",
  "uploadedAt": "2025-01-01T10:30:00Z",
  "namespace": "ns1",
  "namespaceName": "cn_unit5",
  "processingStats": {
    "total_chunks": 45,
    "ai_enhanced_chunks": 12,
    "total_tables": 8,
    "total_images": 3,
    "processing_time_seconds": 23.5
  },
  "metadata": {
    "author": "extracted from PDF",
    "createdDate": "2024-12-01"
  }
}
```

**DELETE /api/v1/documents/{id}** from both Neon DB and Pinecone

- **Implementation**:
  1. Get document from Neon DB by ID (to retrieve document_id and chunk count)
  2. Delete all vectors from Pinecone using filter: `document_id == {id}`
  3. Delete document record from Neon DB
  4. Return success with deletion stats
- **Frontend Usage**: Delete button on document cards
- **Frontend Usage**: Delete button on document cards
- **Note**: Should remove all vectors associated with the document from Pinecone
- **Response**:

```json
{
  "status": "success",
  "message": "Document deleted successfully",
  "documentId": "doc1",
  "vectorsDeleted": 45
}
```

---

### 3. Chat APIs (MOST CRITICAL)

The frontend has a **Chat page** (`/chat`) with **3 distinct chat modes**, but the backend chat endpoint is completely missing:

#### Chat Modes in Frontend:

1. **Namespace Mode** (`"namespace"`) - Chat with ALL documents in a namespace
2. **Single Doc Mode** (`"single"`) - Chat with ONE specific document
3. **Multi-Doc Mode** (`"multi"`) - Chat with MULTIPLE selected documents

####Implementation\*\*:

- Validate mode and required IDs
- For single/multi mode: Verify document IDs exist in Neon DB
- For namespace mode: Verify namespace exists in Neon DB
- Build Pinecone filter using document_id(s) from request
- Search Pinecone with filter
- Generate response using retrieved context
- \*\* Required Endpoints:

**POST /api/v1/chat**

- **Purpose**: Send a message and get an AI response based on the selected mode
- **Frontend Usage**: Main chat functionality across all 3 modes
- **Request Body**:

```json
{
  "message": "What is DHCP?",
  "mode": "namespace", // or "single" or "multi"
  "namespace_id": "ns1", // Required for namespace mode
  "document_id": "doc1", // Required for single mode (ONE document)
  "document_ids": ["doc1", "doc2", "doc3"], // Required for multi mode (MULTIPLE documents)
  "temperature": 0.3,
  "max_tokens": 1000,
  "top_k": 5,
  "use_hybrid_search": true
}
```

- **Response Format**:

```json
{
  "response": "DHCP (Dynamic Host Configuration Protocol) is...",
  "sources": [
    {
      "document_name": "Computer_Networks_Unit5.pdf",
      "document_id": "doc1",
      "page_number": 23,
      "chunk_text": "DHCP is a client/server protocol...",
      "score": 0.89,
      "metadata": {
        "content_types": ["text", "table"],
        "namespace": "ns1"
      }
    }
  ],
  "metadata": {
   - Get all document IDs for the namespace from Neon DB: `SELECT id FROM documents WHERE namespace_id = {namespace_id}`
   - Build Pinecone filter: `{"document_id": {"$in": [list_of_doc_ids]}}`
   - Search Pinecone with this filter

2. **Single Doc Mode** (`mode: "single"`):
   - Verify document exists in Neon DB: `SELECT id FROM documents WHERE id = {document_id}`
   - Build Pinecone filter: `{"document_id": document_id}`
   - Search Pinecone with this filter
   - Return sources only from that one document

3. **Multi-Doc Mode** (`mode: "multi"`):
   - Verify all document IDs exist in Neon DB: `SELECT id FROM documents WHERE id IN ({document_ids})`
   - Build Pinecone filter: `{"document_id": {"$in": document_ids}}`
   - Search Pinecone with this filtere_id`
   - Use the existing `/search/hybrid` endpoint to search the namespace
   - Filter results to only documents in that namespace

2. **Single Doc Mode** (`mode: "single"`):

   - Search ONLY the specified `document_id`
   - Filter Pinecone search by document ID
   - Return sources only from that one document

3. **Multi-Doc Mode** (`mode: "multi"`):
   - Search ONLY the documents in `document_ids` array
   - Filter Pinecone search by multiple document IDs
   - Return sources only from the selected documents

**POST /api/v1/chat/stream** (Optional but Recommended)

- **Purpose**: Stream chat responses for better UX
- **Frontend Usage**: Real-time streaming of AI responses
- **Implementation**: Server-Sent Events (SSE) or WebSocket
- **Response**: Stream of text chunks

---

### 4. Search Enhancement APIs

The frontend has search functionality in the Documents page, but needs:

**GET /api/v1/search** (General Search)
Neon DB

**Current Issue**: The `POST /api/v1/documents/process-multimodal` endpoint exists but doesn't save document metadata to Neon DB.

**Required Changes to Existing Endpoint**:

1. **After PDF processing completes**:
   - Generate unique document ID
   - Save document record to Neon DB with all metadata (page count, file size, processing stats, etc.)

2. **When upserting to Pinecone**:
   - Include `document_id` from Neon DB in vector metadata
   - Include `namespace_id` in vector metadata

3. **Response Update**:
   ATE TABLE documents (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    namespace_id VARCHAR(50) REFERENCES namespaces(id) ON DELETE CASCADE,
    page_count INTEGER NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    file_size_formatted VARCHAR(20),  -- e.g., "1.2 MB"
    uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
    processing_strategy VARCHAR(20),  -- 'hi_res' or 'fast'
    chunk_count INTEGER,
    processing_time_seconds FLOAT,
    metadata JSONB,  -- Store processing stats, AI enhancement info, etc.
    UNIQUE(name, namespace_id)
);
```

### Indexes

```sql
CREATE INDEX idx_documents_namespace ON documents(namespace_id);
CREATE INDEX idx_documents_uploaded ON documents(uploaded_at DESC);
```

---

### For Each New Endpoint:

#### 1. **Namespace/Document Listing Endpoints**
```

Query Neon DB → Format response → Return to frontend
(No Pinecone interaction needed)

```

#### 2. **Chat Endpoint**
```

1. Validate mode and IDs
2. Query Neon DB to verify namespace/document(s) exist
3. For namespace mode: Get all document IDs from Neon DB for that namespace
4. Build Pinecone filter: {"document_id": {document_id(s)}}
5. Search Pinecone with filter
6. Generate response with LLM
7. Return answer + sources

```

#### 3. **Delete Endpoints**
```

1. Get record from Neon DB by ID (to get document_id/namespace details)
2. For namespace delete: Get all document IDs in that namespace
3. Delete from Pinecone using document_id filter(s)
4. Delete from Neon DB (triggers cascade if namespace)
5. Return success response

```

#### 4. **Upload Enhancement (Existing Endpoint)**
```

Current: Process PDF → Upsert to Pinecone → Return processing stats

Add:

1. Process PDF → Generate document_id (UUID)
2. Save to Neon DB (id, name, namespace_id, page_count, file_size, processing_stats, ...)
3. Upsert to Pinecone with metadata: {"document_id": "{neon_db_id}", ...}
4. Return Document object (with Neon DB ID, not just processing stats)/endpoints/namespaces.py` - NEW FILE
5. `backend/app/api/v1/endpoints/chat.py` - NEW FILE
6. `backend/app/api/v1/endpoints/documents.py` - UPDATE (add list/get/delete)
7. `backend/app/api/v1/router.py` - UPDATE (include new routers)
8. `backend/app/models/schemas.py` - ADD (Namespace, Document, Chat schemas)
9. `backend/app/services/pinecone_service.py` - UPDATE (add filter support)

### Database Migration:

1. Create migration script for namespaces and documents tables
2. Populate default namespace if needed

---

## 🎯 Success Criteria

The backend will be complete when:

1. ✅ All 3 chat modes work correctly (namespace, single, multi)
2. ✅ Documents are stored in database and tracked properly
3. ✅ Namespaces can be created, listed, and deleted
4. ✅ Document upload returns a proper Document object
5. ✅ Pinecone vectors include document/namespace metadata
6. ✅ Sources in chat responses correctly show document names and pages
7. ✅ Deleting a namespace cascades to documents and vectors
8. ✅ Deleting a document removes its vectors from Pinecone

---

## 💡 Additional Recommendations

### Error Handling

- Return proper HTTP status codes (400, 404, 500)
- Include detailed error messages for debugging
- Validate all inputs (mode, IDs, parameters)

### Performance

- Add pagination to document/namespace lists
- Cache frequently accessed data (namespace list)
- Optimize Pinecone queries with proper filters

### Security

- Add authentication/authorization if needed
- Validate file types and sizes
- Sanitize user inputs

### Monitoring

- Add logging for all API calls
- Track processing times and token usage
- Monitor Pinecone query performance

---

**Last Updated**: January 5, 2026  
**Status**: Ready for Implementation  
**Priority**: HIGH - Core functionality blocking frontend integration
api/v1/endpoints/namespaces.py`- **NEW FILE** (namespace CRUD using Neon DB)
2.`backend/app/api/v1/endpoints/chat.py`- **NEW FILE** (chat with 3 modes)
3.`backend/app/api/v1/endpoints/documents.py`- **UPDATE** (add list/get/delete using Neon DB)
4.`backend/app/api/v1/router.py`- **UPDATE** (include new routers)
5.`backend/app/models/schemas.py`- **ADD** (Namespace, Document, Chat request/response schemas)
6.`backend/app/services/pinecone_service.py`- **UPDATE** (add filter parameter to search methods)
7.`backend/app/db/repository.py` - **UPDATE** (if needed, add helper methods for Neon DB queries)

### Key Integration Points:

1. **Document Upload**: Modify existing `process-multimodal` to save to Neon DB after processing
2. **Pinecone Metadata**: Ensure all upserts include `document_id` and `namespace_id` from Neon DB
3. **Chat Filtering**: Use Neon DB document IDs to build Pinecone filters
