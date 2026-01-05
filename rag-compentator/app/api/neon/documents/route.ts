/**
 * API Route: GET /api/neon/documents
 *
 * Fast document listing from NeonDB (bypasses FastAPI).
 */

import { NextRequest, NextResponse } from "next/server";
import { getDocuments } from "@/lib/neon-db";

export async function GET(request: NextRequest) {
  try {
    // Get namespace from query params
    const searchParams = request.nextUrl.searchParams;
    const namespace = searchParams.get("namespace") || undefined;

    // Query NeonDB directly
    const documents = await getDocuments(namespace);

    // Transform to match frontend Document type
    const transformedDocs = documents.map((doc) => ({
      id: doc.id,
      name: doc.filename,
      pageCount: doc.page_count || 0,
      fileSize: formatFileSize(doc.file_size_bytes),
      uploadedAt: doc.uploaded_at.toISOString(),
      namespace: doc.pinecone_dense_namespace,
      chunkCount: doc.chunk_count,
      hasMultimodal:
        doc.total_chunks_with_tables > 0 || doc.total_chunks_with_images > 0,
    }));

    return NextResponse.json(transformedDocs);
  } catch (error) {
    console.error("Error fetching documents from NeonDB:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch documents",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Helper to format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
