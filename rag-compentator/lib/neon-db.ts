/**
 * NeonDB Connection for Next.js
 *
 * Provides direct database access for fast document listings.
 */

import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Create SQL query function
export const sql = neon(process.env.DATABASE_URL);

// Types for database records
export interface DocumentRecord {
  id: string;
  filename: string;
  original_filename: string;
  file_size_bytes: number;
  page_count: number | null;
  pinecone_dense_namespace: string;
  chunk_count: number;
  total_chunks_with_tables: number;
  total_chunks_with_images: number;
  uploaded_at: Date;
  processed_at: Date;
}

export interface NamespaceRecord {
  id: string;
  name: string;
  description: string | null;
  document_count: number;
  total_chunks: number;
  created_at: Date;
  updated_at: Date;
}

// Database query functions
export async function getDocuments(
  namespace?: string
): Promise<DocumentRecord[]> {
  if (namespace) {
    const result = await sql`
      SELECT 
        id::text,
        filename,
        original_filename,
        file_size_bytes,
        page_count,
        pinecone_dense_namespace,
        chunk_count,
        total_chunks_with_tables,
        total_chunks_with_images,
        uploaded_at,
        processed_at
      FROM documents
      WHERE pinecone_dense_namespace = ${namespace}
        AND deleted_at IS NULL
      ORDER BY uploaded_at DESC
      LIMIT 100
    `;
    return result as DocumentRecord[];
  }

  const result = await sql`
    SELECT 
      id::text,
      filename,
      original_filename,
      file_size_bytes,
      page_count,
      pinecone_dense_namespace,
      chunk_count,
      total_chunks_with_tables,
      total_chunks_with_images,
      uploaded_at,
      processed_at
    FROM documents
    WHERE deleted_at IS NULL
    ORDER BY uploaded_at DESC
    LIMIT 100
  `;

  return result as DocumentRecord[];
}

export async function getDocument(id: string): Promise<DocumentRecord | null> {
  const result = await sql`
    SELECT 
      id::text,
      filename,
      original_filename,
      file_size_bytes,
      page_count,
      pinecone_dense_namespace,
      chunk_count,
      total_chunks_with_tables,
      total_chunks_with_images,
      uploaded_at,
      processed_at
    FROM documents
    WHERE id = ${id}::uuid
      AND deleted_at IS NULL
  `;

  return (result[0] as DocumentRecord) || null;
}

export async function getNamespaces(): Promise<NamespaceRecord[]> {
  const result = await sql`
    SELECT 
      id::text,
      name,
      description,
      document_count,
      total_chunks,
      created_at,
      updated_at
    FROM namespaces
    ORDER BY created_at DESC
  `;

  return result as NamespaceRecord[];
}

export async function getNamespace(
  name: string
): Promise<NamespaceRecord | null> {
  const result = await sql`
    SELECT 
      id::text,
      name,
      description,
      document_count,
      total_chunks,
      created_at,
      updated_at
    FROM namespaces
    WHERE name = ${name}
  `;

  return (result[0] as NamespaceRecord) || null;
}
