# MVP Testing Guide - NeonDB + Pinecone Integration

## Prerequisites

### 1. NeonDB Setup

1. Go to https://neon.tech and create a free account
2. Create a new project (e.g., "rag-comparator")
3. Copy the connection string from the dashboard
4. The connection string format: `postgresql://username:password@host/database?sslmode=require`

### 2. Environment Variables

#### Backend (.env in `backend/` folder):

```env
# OpenAI (for AI enhancement)
OPENAI_API_KEY=sk-your-key-here

# Pinecone (for vector storage)
PINECONE_API_KEY=your-pinecone-key-here

# NeonDB (NEW - for metadata storage)
DATABASE_URL=postgresql://username:password@host/database?sslmode=require

# Application Settings
APP_VERSION=1.0.0
DEBUG=True
MAX_FILE_SIZE_MB=50
```

#### Frontend (.env.local in `rag-compentator/` folder):

```env
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

# NeonDB (same as backend)
DATABASE_URL=postgresql://username:password@host/database?sslmode=require
```

## Installation Steps

### Backend Setup

```powershell
cd backend

# Install new dependencies
pip install asyncpg sqlalchemy[asyncio] alembic

# Or reinstall all requirements
pip install -r requirements.txt

# Start the backend
python main.py
```

**Expected output:**

```
2026-01-05 - INFO - Starting RAG Comparator Backend v1.0.0
2026-01-05 - INFO - Database available: True
2026-01-05 - INFO - Connecting to NeonDB...
2026-01-05 - INFO - Database connection pool created successfully
2026-01-05 - INFO - Initializing database schema...
2026-01-05 - INFO - Database schema initialized successfully
2026-01-05 - INFO - Application startup complete
```

### Frontend Setup

```powershell
cd rag-compentator

# Install new dependencies
npm install

# Start the frontend
npm run dev
```

**Expected output:**

```
- ready started server on 0.0.0.0:3000
- Local:        http://localhost:3000
```

## Testing the MVP

### Test 1: Verify Database Tables

Open a new terminal and connect to your NeonDB:

```sql
-- Check if tables were created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';

-- Expected output:
-- namespaces
-- documents
-- document_namespaces
-- chunks
```

### Test 2: Upload a Document

1. Open frontend: http://localhost:3000/documents
2. Click "Upload Document" button
3. Select a PDF file (< 50MB)
4. Configure settings:
   - Strategy: hi_res (for accuracy)
   - Chunk size: 3000
   - Enable AI enhancement: Yes
   - Upload to Pinecone: Yes
   - Namespace: "test-namespace"
5. Click "Upload"

**Expected backend logs:**

```
INFO - Step 4: Partitioning PDF with multimodal extraction...
INFO - Extracted 25 elements from PDF
INFO - Step 5: Chunking content by title boundaries...
INFO - Created 8 chunks
INFO - Step 8: Upserting chunks to Pinecone...
INFO - Pinecone upsert complete: 16 records to namespace 'test-namespace'
INFO - Step 9: Saving document metadata to NeonDB...
INFO - Created new namespace: test-namespace
INFO - Created document record: myfile.pdf (ID: uuid-here)
INFO - NeonDB save complete: Document ID uuid, 8 chunks saved
INFO - Processing complete: 8 chunks, 3 AI-enhanced, 12.45s total
```

### Test 3: Verify Data in NeonDB

```sql
-- Check namespace was created
SELECT * FROM namespaces;

-- Expected: 1 row with name 'test-namespace', document_count = 1

-- Check document was saved
SELECT
  id,
  filename,
  chunk_count,
  pinecone_dense_namespace,
  uploaded_at
FROM documents;

-- Expected: 1 row with your PDF details

-- Check chunks were saved
SELECT
  COUNT(*) as total_chunks,
  COUNT(CASE WHEN has_table THEN 1 END) as chunks_with_tables,
  COUNT(CASE WHEN has_image THEN 1 END) as chunks_with_images
FROM chunks;

-- Expected: total_chunks matching your document
```

### Test 4: Verify Frontend Lists Documents

1. Refresh the documents page: http://localhost:3000/documents
2. You should see your uploaded document appear immediately (< 100ms)
3. Check browser Network tab:
   - Request: `GET /api/neon/documents`
   - Status: 200 OK
   - Response time: < 100ms (much faster than Pinecone!)

### Test 5: Verify Pinecone Has Vectors

```python
# In a Python console:
from pinecone import Pinecone

pc = Pinecone(api_key="your-key")
dense_index = pc.Index("rag-comparator-dense")

# Query the namespace
stats = dense_index.describe_index_stats()
print(stats.namespaces.get('test-namespace'))

# Expected: vector count matching chunk_count * 1 (dense vectors)
```

## Success Criteria

✅ **Backend starts without errors** with "Database schema initialized successfully"

✅ **Document upload completes** with logs showing both:

- "Pinecone upsert complete"
- "NeonDB save complete"

✅ **NeonDB contains data:**

- namespaces table: 1 row
- documents table: 1 row
- chunks table: N rows (matching chunk count)

✅ **Frontend displays document** immediately after refresh (< 100ms)

✅ **Pinecone contains vectors** in the specified namespace

## Troubleshooting

### Backend won't start - "Database pool not initialized"

- Check DATABASE_URL is set correctly in backend/.env
- Verify NeonDB connection string is valid
- Test connection: `psql <DATABASE_URL>`

### "No module named 'asyncpg'"

```powershell
cd backend
pip install asyncpg sqlalchemy[asyncio]
```

### Frontend shows "Failed to fetch documents"

- Check DATABASE_URL is set in rag-compentator/.env.local
- Verify Next.js server is running (port 3000)
- Check browser console for errors

### Document uploads but doesn't appear in NeonDB

- Check backend logs for "NeonDB save failed" warnings
- Verify DATABASE_URL has ?sslmode=require
- Check NeonDB dashboard for connection activity

### Document appears in NeonDB but not in Pinecone

- Check backend logs for "Pinecone upsert failed"
- Verify PINECONE_API_KEY is set
- Check Pinecone dashboard for index status

## Next Steps After MVP Success

Once all tests pass:

1. ✅ Implement full CRUD operations (update, delete)
2. ✅ Add document filtering and search in frontend
3. ✅ Implement namespace management UI
4. ✅ Add real-time sync monitoring
5. ✅ Optimize queries with indexes and caching

## Common SQL Queries for Debugging

```sql
-- Count documents by namespace
SELECT
  pinecone_dense_namespace,
  COUNT(*) as doc_count,
  SUM(chunk_count) as total_chunks
FROM documents
WHERE deleted_at IS NULL
GROUP BY pinecone_dense_namespace;

-- Find documents with multimodal content
SELECT
  filename,
  total_chunks_with_tables,
  total_chunks_with_images
FROM documents
WHERE (total_chunks_with_tables > 0 OR total_chunks_with_images > 0)
  AND deleted_at IS NULL;

-- Check recent uploads
SELECT
  filename,
  chunk_count,
  uploaded_at
FROM documents
WHERE deleted_at IS NULL
ORDER BY uploaded_at DESC
LIMIT 10;

-- Verify chunk vector IDs
SELECT
  d.filename,
  c.chunk_index,
  c.dense_vector_id,
  c.content_type
FROM chunks c
JOIN documents d ON c.document_id = d.id
ORDER BY d.filename, c.chunk_index;
```
