# 🎯 Document Upload Flow - Visual Guide

## Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER INTERACTION                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 1. User selects PDF file
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         UPLOADMODAL.TSX                                  │
│  • File drag & drop / file picker                                       │
│  • Namespace selection                                                   │
│  • Advanced settings (strategy, chunk size, AI toggle)                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 2. handleUpload(file, settings)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     REACT QUERY HOOK                                     │
│  useUploadDocument() from use-documents.ts                              │
│  • Sets uploadProgress to 0                                             │
│  • Calls apiClient.uploadDocument()                                     │
│  • Tracks progress via callback                                         │
│  • Updates uploadProgress state (0-100%)                                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 3. uploadMutation.mutateAsync()
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      API CLIENT                                          │
│  apiClient.uploadDocument() from api-client.ts                          │
│                                                                          │
│  Step 1: Create FormData                                                │
│  ┌────────────────────────────────────────────────────┐                │
│  │  formData.append("file", file)                     │                │
│  │  formData.append("strategy", "hi_res")            │                │
│  │  formData.append("max_chunk_size", "3000")        │                │
│  │  formData.append("enable_ai_enhancement", "true") │                │
│  │  formData.append("upsert_to_pinecone", "true")    │                │
│  │  formData.append("pinecone_namespace", "ns-id")   │                │
│  └────────────────────────────────────────────────────┘                │
│                                                                          │
│  Step 2: XMLHttpRequest with progress tracking                         │
│  ┌────────────────────────────────────────────────────┐                │
│  │  xhr.upload.addEventListener("progress", ...)      │                │
│  │  xhr.open("POST", "/documents/process-multimodal") │                │
│  │  xhr.send(formData)                                │                │
│  └────────────────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 4. HTTP POST multipart/form-data
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      FASTAPI BACKEND                                     │
│  POST /api/v1/documents/process-multimodal                              │
│                                                                          │
│  Phase 1: Upload & Parse (0-100% of upload)                            │
│  ┌────────────────────────────────────────────────────┐                │
│  │  • Receive multipart/form-data                     │                │
│  │  • Validate PDF file                               │                │
│  │  • Save temporary file                             │                │
│  │  • Parse PDF with Unstructured.io                  │                │
│  └────────────────────────────────────────────────────┘                │
│                                                                          │
│  Phase 2: Extraction (1-3s per page)                                   │
│  ┌────────────────────────────────────────────────────┐                │
│  │  • Extract text elements                           │                │
│  │  • Extract tables (convert to HTML)                │                │
│  │  • Extract images (convert to base64)              │                │
│  │  • Identify element types and page numbers         │                │
│  └────────────────────────────────────────────────────┘                │
│                                                                          │
│  Phase 3: Chunking (< 1s)                                              │
│  ┌────────────────────────────────────────────────────┐                │
│  │  • Group elements into semantic chunks             │                │
│  │  • Respect max_chunk_size parameter                │                │
│  │  • Preserve context and structure                  │                │
│  └────────────────────────────────────────────────────┘                │
│                                                                          │
│  Phase 4: AI Enhancement (0.5-2s per chunk)                            │
│  ┌────────────────────────────────────────────────────┐                │
│  │  IF enable_ai_enhancement == true:                 │                │
│  │    • Call GPT-4o for multimodal chunks             │                │
│  │    • Generate rich text descriptions               │                │
│  │    • Extract key data points                       │                │
│  │    • Add alternative search terms                  │                │
│  └────────────────────────────────────────────────────┘                │
│                                                                          │
│  Phase 5: Vectorization & Storage (0.1-0.5s)                           │
│  ┌────────────────────────────────────────────────────┐                │
│  │  IF upsert_to_pinecone == true:                    │                │
│  │    • Generate embeddings for each chunk            │                │
│  │    • Upsert to Pinecone dense index                │                │
│  │    • Upsert to Pinecone sparse index               │                │
│  │    • Store metadata in NeonDB                      │                │
│  └────────────────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 5. Return MultimodalProcessResponse
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      API RESPONSE                                        │
│  {                                                                       │
│    filename: "document.pdf",                                            │
│    total_chunks: 15,                                                    │
│    processing_strategy: "hi_res",                                       │
│    ai_enhancement_enabled: true,                                        │
│    processing_stats: {                                                  │
│      total_elements_extracted: 142,                                     │
│      text_only_chunks: 10,                                              │
│      chunks_with_tables: 3,                                             │
│      chunks_with_images: 2,                                             │
│      ai_enhanced_chunks: 5,                                             │
│      total_tables_found: 4,                                             │
│      total_images_found: 3,                                             │
│      total_pages: 25                                                    │
│    },                                                                   │
│    chunks: [...],                                                       │
│    processing_time_seconds: 12.45,                                      │
│    warnings: []                                                         │
│  }                                                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 6. onSuccess callback
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   REACT QUERY - CACHE INVALIDATION                      │
│  • queryClient.invalidateQueries(documentKeys.list(namespace))          │
│  • queryClient.invalidateQueries(documentKeys.lists())                  │
│  • queryClient.invalidateQueries(namespaceKeys.lists())                 │
│  • Reset uploadProgress to 0                                            │
│  • Trigger refetch of affected queries                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 7. UI Update
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      SUCCESS SCREEN                                      │
│  • Display filename                                                     │
│  • Show processing stats (pages, chunks, AI enhanced)                  │
│  • Show detailed statistics grid                                        │
│  • Display any warnings                                                 │
│  • Offer action buttons (Chat, View All, Upload Another)               │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## State Machine Diagram

```
┌─────────┐
│  IDLE   │ ◄─┐
└────┬────┘   │
     │        │
     │ User selects file
     │        │
     ▼        │
┌─────────┐  │
│  READY  │  │
└────┬────┘  │
     │        │
     │ Click upload
     │        │
     ▼        │
┌──────────────┐
│  UPLOADING   │ ◄─┐ Progress: 0% → 100%
└──────┬───────┘   │ (XMLHttpRequest.upload.progress)
       │           │
       │ Upload complete (100%)
       │           │
       ▼           │
┌──────────────┐   │
│ PROCESSING   │   │ Processing on server
└──────┬───────┘   │ (Parsing → Extracting → AI → Vectorizing)
       │           │
       │ Success   │
       │           │
       ▼           │
┌──────────────┐   │
│   SUCCESS    │   │ Display stats & actions
└──────┬───────┘   │
       │           │
       │ Close/Upload Another
       │           │
       └───────────┘

Error at any stage ──────► ┌─────────┐
                            │  ERROR  │
                            └────┬────┘
                                 │
                                 │ Retry/Close
                                 │
                                 ▼
                            Back to IDLE or READY
```

---

## Timeline Visualization

```
TIME →

User Action:    │ Select File │ Click Upload │              Processing...              │ View Results │
                │             │              │                                         │              │
Upload Progress: 0%          10%           50%          100%                          100%
                │─────────────│──────────────│─────────────│──────────────────────────│              │
                │             │              │             │                          │              │
                │             │              │             │                          │              │
UI State:      IDLE ──────► READY ──────► UPLOADING ──► PROCESSING ──────────────► SUCCESS ──────► IDLE

UI Elements:

  [ File Input ]  [ Settings ]  [===========50%==========>        ]  [ Spinner ]  [ Stats Display ]


Backend Phase:                  │ Receive │ Parse │ Extract │ Chunk │ AI │ Vector │ Return │

Expected Time:                  │   ~1s   │  ~5s  │  ~10s   │  ~1s  │~5s │  ~1s   │        │
(for 25-page PDF
 with hi_res + AI)              ├─────────┴───────┴─────────┴───────┴────┴────────┤
                                │           Total: ~23 seconds                     │
```

---

## Component Hierarchy

```
DocumentsPage
├── Sidebar
│   └── Navigation links
│
├── Header
│   └── "UPLOAD DOCUMENT" Button
│       └── onClick: setShowUploadModal(true)
│
├── Document List
│   ├── Namespace Filter
│   ├── Search Bar
│   └── Document Cards (from useDocuments hook)
│
└── UploadModal (isOpen={showUploadModal})
    ├── Props:
    │   ├── onUpload: handleUpload function
    │   ├── namespaces: from useNamespaces()
    │   └── uploadProgress: from useUploadDocument()
    │
    ├── State: step ("upload" | "processing" | "success")
    │
    ├── Upload Step:
    │   ├── Namespace Selector
    │   ├── File Drop Zone
    │   ├── Advanced Settings
    │   │   ├── Strategy Toggle (hi_res/fast)
    │   │   ├── Chunk Size Slider
    │   │   ├── AI Enhancement Switch
    │   │   └── Auto-save Switch
    │   └── Upload Button
    │
    ├── Processing Step:
    │   ├── Progress Bar (if uploadProgress < 100)
    │   ├── Animated Spinner
    │   ├── "Processing..." Message
    │   └── Stage Indicators
    │
    └── Success Step:
        ├── Success Icon
        ├── Filename Display
        ├── Stats Grid
        │   ├── AI Enhanced Count
        │   ├── Tables Found
        │   ├── Images Found
        │   └── Processing Time
        ├── Warnings (if any)
        └── Action Buttons
            ├── "Chat with Document"
            ├── "View All Documents"
            └── "Upload Another"
```

---

## Data Flow Summary

```
┌──────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js)                       │
│                                                               │
│  ┌────────────┐      ┌───────────────┐      ┌─────────────┐ │
│  │ UploadModal│ ───► │ useUploadDoc  │ ───► │ apiClient   │ │
│  │ Component  │      │ (React Query) │      │ (fetch/XHR) │ │
│  └────────────┘      └───────────────┘      └─────────────┘ │
│         ▲                    │                      │         │
│         │                    │                      │         │
│         │                    ▼                      ▼         │
│         │            ┌───────────────┐      ┌─────────────┐ │
│         └────────────│ Query Cache   │      │ HTTP POST   │ │
│                      │ Invalidation  │      │ FormData    │ │
│                      └───────────────┘      └─────────────┘ │
└────────────────────────────────────────────────┬─────────────┘
                                                 │
                                                 │ Network
                                                 │
┌────────────────────────────────────────────────▼─────────────┐
│                     BACKEND (FastAPI)                         │
│                                                               │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────────┐ │
│  │ Multipart   │──►│ Unstructured │──►│ Chunking Service │ │
│  │ File Upload │   │ PDF Parser   │   │                  │ │
│  └─────────────┘   └──────────────┘   └──────────────────┘ │
│                                              │               │
│                                              ▼               │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────────┐ │
│  │ Response    │◄──│ Pinecone     │◄──│ AI Enhancement   │ │
│  │ JSON        │   │ Upsert       │   │ (GPT-4o)         │ │
│  └─────────────┘   └──────────────┘   └──────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

---

## Error Handling Flow

```
Try:
  ┌────────────────────────────────────┐
  │ uploadMutation.mutateAsync()       │
  │                                    │
  │  ├─► Upload Success (100%)        │
  │  │                                 │
  │  └─► Processing Success           │
  │                                    │
  │       └─► Return response          │
  └────────────────────────────────────┘
                  │
                  ▼
         ┌─────────────────┐
         │ onSuccess()     │
         │ • Store response│
         │ • Show stats    │
         │ • Invalidate    │
         └─────────────────┘

Catch:
  ┌────────────────────────────────────┐
  │ error: ApiError                    │
  │                                    │
  │  if (error.code === ...)           │
  │    ├─► FILE_TOO_LARGE             │
  │    ├─► INVALID_FILE_TYPE           │
  │    ├─► PDF_PARSING_ERROR           │
  │    ├─► PROCESSING_ERROR            │
  │    ├─► AI_NOT_CONFIGURED           │
  │    └─► PINECONE_NOT_CONFIGURED     │
  └────────────────────────────────────┘
                  │
                  ▼
         ┌─────────────────┐
         │ onError()       │
         │ • Reset progress│
         │ • Show error    │
         │ • Stay on step  │
         └─────────────────┘
```

---

**This visual guide complements:**

- [DOCUMENT_UPLOAD_INTEGRATION.md](./DOCUMENT_UPLOAD_INTEGRATION.md) - Full implementation details
- [API_INTEGRATION_SUMMARY.md](./API_INTEGRATION_SUMMARY.md) - Changes summary
- [UPLOAD_QUICK_REFERENCE.md](./UPLOAD_QUICK_REFERENCE.md) - Quick copy-paste guide
