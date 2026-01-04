# Backend Architecture Guide

## Flow of `/api/v1/documents/process-multimodal`

This document explains the complete request flow through the backend for the multimodal document processing endpoint.

### **1. Entry Point: `main.py`**

```python
app = FastAPI(...)
app.include_router(api_router, prefix="/api/v1")
```

**Request arrives:** `POST http://localhost:8000/api/v1/documents/process-multimodal`

### **2. Router: `app/api/v1/router.py`**

```python
api_router.include_router(documents.router, tags=["documents"])
```

Routes to → `app/api/v1/endpoints/documents.py`

### **3. Endpoint Handler: `documents.py`**

```python
@router.post("/process-multimodal")
async def process_multimodal(file, strategy, enable_ai_enhancement, upsert_to_pinecone):
```

**Now the 8-step pipeline begins:**

---

## Pipeline Steps

### **Step 1: File Validation** (Lines ~203-250)

```
✓ Check MIME type (must be PDF)
✓ Read file content into memory
✓ Check file size (max 50MB by default)
```

**If fails:** Returns HTTP 400/413 error

---

### **Step 2: AI Availability Check** (Lines ~253-267)

```
✓ Check if OPENAI_API_KEY is set
✓ If missing: Disable AI enhancement, add warning
✓ Store in: ai_actually_enabled variable
```

---

### **Step 3: Initialize Services** (Lines ~270-284)

Creates two service instances:

**a) MultimodalProcessor** (`app/services/multimodal_processor.py`)

```python
processor = MultimodalProcessor(default_strategy=strategy)
```

- Handles PDF parsing with Unstructured.io
- Extracts text, tables (HTML), images (base64)

**b) ChunkingService** (`app/services/chunking_service.py`)

```python
chunker = ChunkingService(max_characters=max_chunk_size)
```

- Creates semantic chunks
- Handles AI enhancement with GPT-4o

---

### **Step 4: PDF Partitioning** (Lines ~287-309)

**Calls:** `processor.partition_pdf_multimodal()`

**Inside `multimodal_processor.py` (Lines 163-196):**

```python
elements = partition_pdf(
    file=pdf_file,
    strategy=strategy,              # "hi_res" or "fast"
    infer_table_structure=True,     # Extract tables as HTML
    extract_image_block_types=["Image"],
    extract_image_block_to_payload=True,  # Images as base64
    include_metadata=True
)
```

**Returns:** List of `Element` objects from Unstructured

```
Example: 235 elements =
  - 81 NarrativeText
  - 27 Title
  - 43 ListItem
  - 7 Image
  - 4 Table
  - etc.
```

**Uses:** Poppler + Tesseract (system dependencies)

---

### **Step 5: Content Extraction** (Lines ~312-330)

**Calls:** `processor.extract_multimodal_content(elements)`

**Inside `multimodal_processor.py` (Lines 198-256):**

```python
for element in elements:
    if element.category == "Table":
        tables.append(element.metadata.text_as_html)
    elif element.category == "Image":
        images.append(element.metadata.image_base64)
    else:
        texts.append(element.text)
```

**Returns:** `ExtractedContent` object

```python
{
    "texts": [209 text strings],
    "tables": [4 HTML tables],
    "images": [7 base64 images]
}
```

---

### **Step 6: Semantic Chunking** (Lines ~333-348)

**Calls:** `chunker.chunk_by_title(elements)`

**Inside `chunking_service.py` (Lines 165-234):**

```python
# Groups elements by Title boundaries
# Respects max_chunk_size (3000 chars default)
# Merges small chunks (min 500 chars)

for element in elements:
    if element.category == "Title":
        # Start new chunk
    else:
        # Add to current chunk
```

**Returns:** List of 25 `Document` objects (LangChain)

```python
Each Document:
    - page_content: "combined text"
    - metadata: {page_numbers, element_types, etc}
```

**Why chunking?**

- RAG systems need smaller, focused pieces
- Embeddings have token limits
- Better retrieval accuracy

---

### **Step 7: AI Enhancement** (Lines ~351-386)

**Calls:** `chunker.process_chunks_with_ai(chunks, processor, enable_ai=True)`

**Inside `chunking_service.py` (Lines 473-534):**

For each chunk:

**A. Analyze content:**

```python
analysis = processor.analyze_chunk_content(chunk)
# Returns: {text, tables, images, types}
```

**B. If chunk has tables/images:**

```python
enhanced = await chunker.create_ai_enhanced_summary(
    text=analysis.text,
    tables=analysis.tables,
    images=analysis.images
)
```

**C. Calls GPT-4o Vision** (`_create_enhanced_summary_with_llm`):

```python
message_content = [
    {"type": "text", "text": prompt},
    # For each image:
    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{img}"}}
]

response = await llm.ainvoke([HumanMessage(content=message_content)])
```

**GPT-4o prompt asks for:**

- Visual element descriptions
- Table data extraction
- Key data points
- Search terms
- Alternative phrasings

**Returns:** Enhanced searchable text (good for embeddings)

**Example:**

```
Original: "Table 1 shows results. [image of graph]"
Enhanced: "Table 1 displays quarterly revenue growth: Q1 $1.2M, Q2 $1.4M,
          Q3 $1.6M. Bar chart shows upward trend with 15% average growth..."
```

**Stats tracked:**

- `ai_enhanced_chunks`: 7
- `text_only_chunks`: 18

---

### **Step 8: Upsert to Pinecone** (Lines ~412-442) - OPTIONAL

**If `upsert_to_pinecone=true`:**

**Calls:** `pinecone_service.upsert_chunks()`

**Inside `pinecone_service.py` (Lines 238-315):**

**A. Prepare records:**

```python
for chunk in chunks:
    record = {
        "_id": f"{document_id}_{chunk_id}",
        "chunk_text": chunk.enhanced_content,  # For embedding
        "document_id": document_id,
        "filename": filename,
        "page_numbers": [1, 2],
        "has_tables": True,
        "has_images": False,
        # ... metadata
    }
```

**B. Upsert in batches (40 records each):**

```python
# Dense index (llama-text-embed-v2)
dense_index.upsert_records(namespace="documents", records=batch)

# Sparse index (pinecone-sparse-english-v0)
sparse_index.upsert_records(namespace="documents", records=batch)
```

**Pinecone's integrated inference:**

- Automatically embeds `chunk_text` field
- No manual embedding needed
- Stores vectors + metadata

**Exponential backoff:** If rate limited, retries with delays (1.5s between batches)

---

### **Step 9: Build Response** (Lines ~445-476)

**Creates:** `MultimodalProcessResponse` object

```python
{
    "filename": "attention-is-all-you-need.pdf",
    "total_chunks": 25,
    "processing_strategy": "hi_res",
    "ai_enhancement_enabled": true,

    "processing_stats": {
        "total_elements_extracted": 235,
        "text_only_chunks": 18,
        "chunks_with_tables": 4,
        "chunks_with_images": 7,
        "ai_enhanced_chunks": 7,
        "total_tables_found": 4,
        "total_images_found": 7,
        "total_pages": 16
    },

    "chunks": [
        {
            "chunk_id": 0,
            "enhanced_content": "Enhanced searchable text...",
            "content_types": ["text", "image"],
            "original_content": {
                "raw_text": "Original text...",
                "tables_html": [],
                "images_base64": ["iVBORw0KG..."]
            },
            "metadata": {
                "page_numbers": [1],
                "is_ai_enhanced": true,
                "ai_model_used": "gpt-4o"
            }
        },
        // ... 24 more chunks
    ],

    "processing_time_seconds": 153.23,
    "warnings": ["Pinecone: 25 records upserted..."]
}
```

---

## Complete Flow Diagram

```
HTTP POST request
    ↓
main.py (FastAPI app)
    ↓
api/v1/router.py
    ↓
endpoints/documents.py
    ↓
┌─────────────────────────────────────┐
│  1. Validate file (PDF, size)      │
│  2. Check AI availability           │
│  3. Initialize services             │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  4. PDF Partitioning                │
│     multimodal_processor.py         │
│     ├─ Unstructured.io              │
│     ├─ Poppler (PDF → images)       │
│     └─ Tesseract (OCR)              │
│     → 235 elements                  │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  5. Content Extraction              │
│     ├─ Categorize by type           │
│     ├─ Tables → HTML                │
│     ├─ Images → base64              │
│     └─ Texts → strings              │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  6. Semantic Chunking               │
│     chunking_service.py             │
│     ├─ Group by titles              │
│     ├─ Respect size limits          │
│     └─ Merge small chunks           │
│     → 25 chunks                     │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  7. AI Enhancement (if enabled)     │
│     chunking_service.py             │
│     ├─ Analyze each chunk           │
│     ├─ If has tables/images:        │
│     │   └─ Call GPT-4o Vision       │
│     └─ Generate searchable text     │
│     → 7 AI-enhanced chunks          │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  8. Upsert to Pinecone (optional)   │
│     pinecone_service.py             │
│     ├─ Prepare records              │
│     ├─ Batch upsert (40 each)       │
│     ├─ Dense index (semantic)       │
│     └─ Sparse index (lexical)       │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  9. Build JSON Response             │
│     └─ Return MultimodalProcessResponse
└─────────────────────────────────────┘
    ↓
HTTP 200 OK (JSON response)
```

---

## Key Technologies Used

| Component           | Technology      | Purpose                     |
| ------------------- | --------------- | --------------------------- |
| **Web Framework**   | FastAPI         | HTTP routing, validation    |
| **PDF Parsing**     | Unstructured.io | Extract text/tables/images  |
| **PDF Rendering**   | Poppler         | Convert PDF pages to images |
| **OCR**             | Tesseract       | Text from scanned PDFs      |
| **AI Enhancement**  | OpenAI GPT-4o   | Vision-based summarization  |
| **LLM Integration** | LangChain       | Chat model wrapper          |
| **Vector DB**       | Pinecone        | Hybrid search storage       |
| **Chunking**        | LangChain       | Semantic text splitting     |
| **Validation**      | Pydantic        | Request/response schemas    |

---

## Timing Breakdown (Example)

```
Total: 153 seconds for "Attention Is All You Need" paper (16 pages)

- PDF Partitioning: ~95s (hi_res strategy with OCR)
- Content Extraction: ~1s
- Chunking: ~1s
- AI Enhancement: ~49s (7 chunks × ~7s each)
- Pinecone Upsert: ~7s (25 records with rate limiting)
```

---

## File Structure & Responsibilities

### Core Files

**`main.py`**

- FastAPI application setup
- CORS middleware
- Router registration
- Startup/shutdown events

**`app/core/config.py`**

- Environment variable loading
- Application settings (Pydantic)
- OpenAI, Pinecone, chunking configuration

**`app/models/schemas.py`**

- Request/response Pydantic models
- `MultimodalChunk`, `ProcessingStats`, etc.
- Search and RAG schemas

### API Layer

**`app/api/v1/router.py`**

- Aggregates all endpoint routers
- Version prefix (`/api/v1`)

**`app/api/v1/endpoints/documents.py`**

- Document processing endpoint
- File validation
- Orchestrates the 9-step pipeline
- Error handling

**`app/api/v1/endpoints/search.py`**

- Hybrid search endpoint
- RAG generation endpoint
- Pinecone status/management

### Service Layer

**`app/services/multimodal_processor.py`**

- PDF partitioning with Unstructured.io
- Content extraction (text/tables/images)
- Chunk content analysis

**`app/services/chunking_service.py`**

- Semantic chunking by title
- AI enhancement with GPT-4o Vision
- Chunk processing orchestration

**`app/services/pinecone_service.py`**

- Index initialization (dense + sparse)
- Document upserting
- Hybrid search (dense + sparse + reranking)
- Document/namespace management

**`app/services/generation_service.py`**

- Answer generation with GPT-4o
- Full RAG pipeline (search + generate)

---

## Purpose of `__init__.py` Files

The project has 7 `__init__.py` files:

```
backend/
├── app/__init__.py                          ← Makes 'app' importable
│   ├── api/__init__.py                      ← Makes 'app.api' importable
│   │   ├── v1/__init__.py                   ← Makes 'app.api.v1' importable
│   │   │   └── endpoints/__init__.py        ← Makes 'app.api.v1.endpoints' importable
│   ├── core/__init__.py                     ← Makes 'app.core' importable
│   ├── models/__init__.py                   ← Makes 'app.models' importable
│   └── services/__init__.py                 ← Makes 'app.services' importable
```

**Purpose:**

- Tell Python: "This directory is a package"
- Enable imports: `from app.core.config import settings`
- Package initialization (can contain code, usually empty)

**Without them:**

```python
# ❌ This would fail
from app.core.config import settings
```

**With them:**

```python
# ✅ This works
from app.core.config import settings
from app.services.pinecone_service import PineconeService
```

---

## Data Flow Example

### Input

```
PDF: "attention-is-all-you-need.pdf" (2.2 MB, 16 pages)
Strategy: "hi_res"
AI Enhancement: true
Upsert to Pinecone: true
```

### Processing

```
235 Unstructured Elements
    ↓
Extraction: 209 texts, 4 tables, 7 images
    ↓
Chunking: 25 semantic chunks
    ↓
AI Enhancement: 7 multimodal chunks enhanced
    ↓
Pinecone: 25 records upserted to both indexes
```

### Output

```json
{
  "filename": "attention-is-all-you-need.pdf",
  "total_chunks": 25,
  "processing_time_seconds": 153.23,
  "chunks": [
    {
      "chunk_id": 0,
      "enhanced_content": "The paper introduces the Transformer architecture...",
      "content_types": ["text", "image"],
      "metadata": {
        "page_numbers": [1],
        "is_ai_enhanced": true
      }
    }
    // ... 24 more
  ]
}
```

---

## Error Handling

### Common Errors

**1. Poppler/Tesseract Not Found**

```
Error: "Unable to get page count. Is poppler installed and in PATH?"
Solution: Add to PATH or restart server with correct PATH
```

**2. OpenAI API Key Missing**

```
Behavior: AI enhancement disabled automatically
Warning added to response
Processing continues without AI
```

**3. Pinecone API Key Missing**

```
If upsert_to_pinecone=true:
  Warning added
  Upsert skipped
  Document still processed
```

**4. File Too Large**

```
HTTP 413: File exceeds 50MB limit
Configurable via MAX_FILE_SIZE_MB
```

**5. Invalid File Type**

```
HTTP 400: Only PDF files supported
Checked via MIME type
```

---

## Performance Optimization Tips

### 1. Processing Strategy

```python
strategy="fast"   # 3-5x faster, less accurate
strategy="hi_res" # Slower, more accurate (default)
```

### 2. AI Enhancement

```python
enable_ai_enhancement=false  # Skip GPT-4o calls (much faster, cheaper)
enable_ai_enhancement=true   # Better searchability (slower, ~$0.01-0.05 per page)
```

### 3. Chunk Size

```python
max_chunk_size=2000  # More chunks, faster processing
max_chunk_size=4000  # Fewer chunks, slower processing
```

### 4. Batch Upserting

```python
PINECONE_UPSERT_BATCH_SIZE=40  # Default, good balance
# Larger = faster but may hit rate limits
```

---

## Testing the Endpoint

### Basic Test (No AI, No Pinecone)

```powershell
curl.exe -X POST "http://localhost:8000/api/v1/documents/process-multimodal" `
  -F "file=@document.pdf" `
  -F "strategy=fast" `
  -F "enable_ai_enhancement=false"
```

### Full Pipeline Test (AI + Pinecone)

```powershell
curl.exe -X POST "http://localhost:8000/api/v1/documents/process-multimodal" `
  -F "file=@document.pdf" `
  -F "strategy=hi_res" `
  -F "enable_ai_enhancement=true" `
  -F "upsert_to_pinecone=true" `
  -F "pinecone_namespace=my-docs"
```

### Via Swagger UI

```
Navigate to: http://localhost:8000/docs
Find: POST /api/v1/documents/process-multimodal
Click: "Try it out"
Upload file and set parameters
Click: "Execute"
```

---

## Monitoring & Logging

The application logs detail at each step:

```
2026-01-02 12:14:55 - documents - INFO - Processing request: file=doc.pdf, strategy=hi_res
2026-01-02 12:14:55 - documents - INFO - File validated: doc.pdf (2215244 bytes)
2026-01-02 12:14:57 - chunking_service - INFO - ChunkingService initialized
2026-01-02 12:14:57 - documents - INFO - Step 4: Partitioning PDF...
2026-01-02 12:16:40 - multimodal_processor - INFO - Partitioning complete. 235 elements
2026-01-02 12:16:40 - documents - INFO - Step 5: Chunking content...
2026-01-02 12:16:40 - chunking_service - INFO - Created 25 chunks from 235 elements
2026-01-02 12:16:49 - chunking_service - INFO - AI enhancement completed in 9.33s
2026-01-02 12:17:28 - documents - INFO - Processing complete: 25 chunks, 7 AI-enhanced
```

**Log Levels:**

- `INFO`: Normal operation
- `WARNING`: Non-fatal issues (AI disabled, Pinecone skipped)
- `ERROR`: Processing failures

---

## Next Steps

After processing a document, you can:

1. **Search the embedded chunks:**

   ```
   POST /api/v1/search/hybrid
   Body: {"query": "What is attention mechanism?"}
   ```

2. **Get an answer (RAG):**

   ```
   POST /api/v1/search/rag
   Body: {"question": "Explain transformers"}
   ```

3. **Check Pinecone status:**

   ```
   GET /api/v1/search/status
   ```

4. **Delete a document:**
   ```
   DELETE /api/v1/search/document
   Body: {"document_id": "abc-123"}
   ```

See [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment guidance.
