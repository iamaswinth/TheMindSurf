# 🎯 Quick Reference: Document Upload API

## **POST /api/v1/documents/process-multimodal**

---

## 📋 **TL;DR - Copy & Paste**

### Minimal Working Example

```typescript
import { useUploadDocument } from "@/lib/hooks/use-documents";

function MyComponent() {
  const uploadMutation = useUploadDocument();

  const handleUpload = async (file: File) => {
    const response = await uploadMutation.mutateAsync({
      file,
      settings: {
        strategy: "hi_res",
        max_chunk_size: 3000,
        enable_ai_enhancement: true,
        upsert_to_pinecone: true,
        pinecone_namespace: "my-namespace",
      },
    });

    console.log("Success:", response);
  };

  return (
    <div>
      <input
        type="file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
      />

      {uploadMutation.isPending && (
        <p>Upload progress: {uploadMutation.uploadProgress}%</p>
      )}
    </div>
  );
}
```

---

## 🔑 **Key Parameters**

| Parameter               | Type                 | Required | Default    | Description            |
| ----------------------- | -------------------- | -------- | ---------- | ---------------------- |
| `file`                  | File                 | ✅ Yes   | -          | PDF file to upload     |
| `strategy`              | `'hi_res' \| 'fast'` | No       | `'hi_res'` | Processing accuracy    |
| `max_chunk_size`        | number               | No       | 3000       | Chunk size (500-10000) |
| `enable_ai_enhancement` | boolean              | No       | true       | AI-powered summaries   |
| `upsert_to_pinecone`    | boolean              | No       | true       | Auto-save to vector DB |
| `pinecone_namespace`    | string               | No       | default    | Namespace for vectors  |

---

## 📊 **Response Structure**

```typescript
{
  filename: "document.pdf",
  total_chunks: 15,
  processing_strategy: "hi_res",
  ai_enhancement_enabled: true,

  processing_stats: {
    total_elements_extracted: 142,
    text_only_chunks: 10,
    chunks_with_tables: 3,
    chunks_with_images: 2,
    ai_enhanced_chunks: 5,
    total_tables_found: 4,
    total_images_found: 3,
    total_pages: 25
  },

  chunks: [/* ... */],
  processing_time_seconds: 12.45,
  warnings: []
}
```

---

## ⚡ **Common Patterns**

### 1. With Progress Bar

```typescript
const uploadMutation = useUploadDocument();

<div>
  {uploadMutation.isPending && (
    <div className="w-full h-2 bg-gray-200">
      <div
        className="h-full bg-blue-500"
        style={{ width: `${uploadMutation.uploadProgress}%` }}
      />
    </div>
  )}
</div>;
```

### 2. With Error Handling

```typescript
try {
  await uploadMutation.mutateAsync({ file, settings });
} catch (error) {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "FILE_TOO_LARGE":
        alert("File exceeds 50MB limit");
        break;
      case "INVALID_FILE_TYPE":
        alert("Only PDF files supported");
        break;
      default:
        alert(error.message);
    }
  }
}
```

### 3. With Success Callback

```typescript
const uploadMutation = useUploadDocument();

uploadMutation.mutate(
  { file, settings },
  {
    onSuccess: (response) => {
      console.log("Uploaded:", response.filename);
      console.log("Chunks:", response.total_chunks);
      console.log("AI enhanced:", response.processing_stats.ai_enhanced_chunks);
    },
    onError: (error) => {
      console.error("Failed:", error);
    },
  }
);
```

---

## 🎨 **UI States**

### State 1: Ready

```tsx
<Button onClick={() => fileInput.click()}>📄 UPLOAD PDF</Button>
```

### State 2: Uploading (0-100%)

```tsx
<div>
  <p>Uploading: {uploadProgress}%</p>
  <ProgressBar value={uploadProgress} />
</div>
```

### State 3: Processing

```tsx
<div>
  <Spinner />
  <p>Processing document...</p>
  <p className="text-sm">Extracting text, tables, and images</p>
</div>
```

### State 4: Success

```tsx
<div>
  <CheckIcon />
  <p>{response.filename}</p>
  <p>{response.total_chunks} chunks created</p>
  <p>{response.processing_stats.ai_enhanced_chunks} AI enhanced</p>
</div>
```

### State 5: Error

```tsx
<div>
  <ErrorIcon />
  <p>Upload failed: {error.message}</p>
  <Button onClick={retry}>Try Again</Button>
</div>
```

---

## ⚙️ **Configuration Examples**

### Fast Processing (Quick)

```typescript
{
  strategy: 'fast',
  max_chunk_size: 5000,
  enable_ai_enhancement: false,
  upsert_to_pinecone: true,
  pinecone_namespace: 'quick-docs',
}
```

### High Accuracy (Slow)

```typescript
{
  strategy: 'hi_res',
  max_chunk_size: 2000,
  enable_ai_enhancement: true,
  upsert_to_pinecone: true,
  pinecone_namespace: 'important-docs',
}
```

### Preview Only (No Save)

```typescript
{
  strategy: 'fast',
  max_chunk_size: 3000,
  enable_ai_enhancement: false,
  upsert_to_pinecone: false, // Don't save to Pinecone
  pinecone_namespace: 'preview',
}
```

---

## 🧪 **Testing Scenarios**

```typescript
// 1. Small file (< 5 pages)
test("uploads small PDF", async () => {
  const file = createMockPDF({ pages: 3, sizeMB: 0.5 });
  const response = await uploadMutation.mutateAsync({ file, settings });
  expect(response.total_chunks).toBeGreaterThan(0);
});

// 2. Large file (> 50 pages)
test("uploads large PDF with progress", async () => {
  const file = createMockPDF({ pages: 100, sizeMB: 10 });
  let lastProgress = 0;

  apiClient.uploadDocument(file, settings, (progress) => {
    expect(progress).toBeGreaterThanOrEqual(lastProgress);
    lastProgress = progress;
  });
});

// 3. Error handling
test("handles invalid file type", async () => {
  const file = new File(["test"], "test.txt", { type: "text/plain" });
  await expect(uploadMutation.mutateAsync({ file, settings })).rejects.toThrow(
    "INVALID_FILE_TYPE"
  );
});
```

---

## 📈 **Performance Benchmarks**

| File Size | Pages | Strategy | AI Enhancement | Time |
| --------- | ----- | -------- | -------------- | ---- |
| 1 MB      | 5     | fast     | No             | ~3s  |
| 1 MB      | 5     | hi_res   | No             | ~8s  |
| 5 MB      | 25    | fast     | Yes            | ~12s |
| 5 MB      | 25    | hi_res   | Yes            | ~35s |
| 10 MB     | 50    | fast     | Yes            | ~25s |
| 10 MB     | 50    | hi_res   | Yes            | ~60s |

---

## 🚨 **Common Errors**

| Code                      | Message              | Solution                            |
| ------------------------- | -------------------- | ----------------------------------- |
| `FILE_TOO_LARGE`          | File exceeds 50MB    | Compress PDF or split into parts    |
| `INVALID_FILE_TYPE`       | Only PDF supported   | Convert to PDF first                |
| `PDF_PARSING_ERROR`       | Failed to parse PDF  | Check PDF isn't corrupted/encrypted |
| `PROCESSING_ERROR`        | Processing failed    | Retry with `fast` strategy          |
| `AI_NOT_CONFIGURED`       | OpenAI key missing   | Set `OPENAI_API_KEY` in backend     |
| `PINECONE_NOT_CONFIGURED` | Pinecone key missing | Set `PINECONE_API_KEY` in backend   |

---

## 💡 **Pro Tips**

1. **Use `hi_res` for important documents** (financial reports, contracts)
2. **Use `fast` for quick previews** or large batch uploads
3. **Disable AI enhancement** for faster processing if summaries not needed
4. **Set smaller chunk sizes** (1000-2000) for more precise retrieval
5. **Set larger chunk sizes** (5000-8000) for more context in answers
6. **Monitor `uploadProgress`** to show users upload status
7. **Display `processing_stats`** to show value delivered
8. **Handle `warnings`** array for non-fatal issues

---

## 🔗 **Related Hooks**

```typescript
// List documents
const { data: documents } = useDocuments(namespaceId);

// Delete document
const deleteMutation = useDeleteDocument();
await deleteMutation.mutateAsync(documentId);

// Get single document
const { data: document } = useDocument(documentId);

// List namespaces
const { data: namespaces } = useNamespaces();
```

---

## 📚 **Full Documentation**

- **Complete Integration Guide:** [DOCUMENT_UPLOAD_INTEGRATION.md](./DOCUMENT_UPLOAD_INTEGRATION.md)
- **API Summary:** [API_INTEGRATION_SUMMARY.md](./API_INTEGRATION_SUMMARY.md)
- **Backend Docs:** `backend/API_DOCUMENTATION.md`

---

**Last Updated:** January 6, 2026  
**Status:** ✅ Production Ready
