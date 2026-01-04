import {
  ChatMode,
  ChatSettings,
  ChatResponse,
  Document,
  Namespace,
  UploadSettings,
} from "./types";

// API Error Class
export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
    this.name = "ApiError";
  }

  isUnauthorized() {
    return this.status === 401;
  }
  isForbidden() {
    return this.status === 403;
  }
  isNotFound() {
    return this.status === 404;
  }
  isServerError() {
    return this.status >= 500;
  }
}

// API Client Class
class ApiClient {
  private baseURL: string;
  private token?: string;

  constructor() {
    this.baseURL =
      typeof window !== "undefined"
        ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"
        : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  }

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options?.headers,
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ detail: "Unknown error" }));
        throw new ApiError(
          error.detail || error.message || "Request failed",
          response.status,
          error.code
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError("Network error", 0);
    }
  }

  // ============================================
  // NAMESPACE ENDPOINTS
  // ============================================
  async getNamespaces(): Promise<Namespace[]> {
    const response = await this.request<{
      namespaces: Array<{
        name: string;
        document_count: number;
        total_chunks: number;
      }>;
    }>("/namespaces/list");

    // Transform backend response to frontend Namespace type
    return response.namespaces.map((ns) => ({
      id: ns.name, // Use name as ID since backend doesn't provide separate ID
      name: ns.name,
      documentCount: ns.document_count,
      createdAt: new Date().toISOString(), // Backend doesn't provide this, use current date
    }));
  }

  async getNamespace(id: string): Promise<Namespace> {
    return this.request<Namespace>(`/namespaces/${id}`);
  }

  async createNamespace(name: string): Promise<Namespace> {
    return this.request<Namespace>("/namespaces", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  async deleteNamespace(id: string): Promise<void> {
    return this.request<void>(`/namespaces/${id}`, {
      method: "DELETE",
    });
  }

  // ============================================
  // DOCUMENT ENDPOINTS
  // ============================================
  async getDocuments(namespace?: string): Promise<Document[]> {
    if (!namespace || namespace === "all") {
      // Return empty array if no specific namespace selected
      return [];
    }
    const params = new URLSearchParams({ namespace });
    const response = await this.request<any>(
      `/documents/list?${params.toString()}`
    );

    // Handle different response structures
    if (Array.isArray(response)) {
      return response;
    }
    if (response && Array.isArray(response.documents)) {
      return response.documents;
    }
    // Return empty array if structure is unexpected
    return [];
  }

  async getDocument(id: string): Promise<Document> {
    return this.request<Document>(`/documents/${id}`);
  }

  async uploadDocument(
    file: File,
    settings: UploadSettings
  ): Promise<Document> {
    const formData = new FormData();
    formData.append("file", file);

    // Build query parameters
    const params = new URLSearchParams({
      strategy: settings.strategy,
      max_chunk_size: settings.max_chunk_size.toString(),
      enable_ai_enhancement: settings.enable_ai_enhancement.toString(),
      upsert_to_pinecone: settings.upsert_to_pinecone.toString(),
      pinecone_namespace: settings.pinecone_namespace,
    });

    const response = await fetch(
      `${this.baseURL}/documents/process-multimodal?${params.toString()}`,
      {
        method: "POST",
        headers: {
          ...(this.token && { Authorization: `Bearer ${this.token}` }),
          // Note: Don't set Content-Type for multipart/form-data - browser will set it with boundary
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "Upload failed" }));
      throw new ApiError(error.detail, response.status);
    }

    // The backend returns MultimodalProcessResponse, transform it to Document
    const result = await response.json();

    // Transform the response into a Document object
    const document: Document = {
      id: `doc_${Date.now()}`, // Generate a temporary ID
      name: result.filename || file.name,
      pageCount: result.total_chunks || 0, // Using chunks as a proxy for pages
      fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      uploadedAt: result.processed_at || new Date().toISOString(),
      namespace: settings.pinecone_namespace,
      metadata: {
        total_chunks: result.total_chunks,
        processing_strategy: result.processing_strategy,
        ai_enhancement_enabled: result.ai_enhancement_enabled,
        processing_time: result.processing_time_seconds,
      },
    };

    return document;
  }

  async deleteDocument(id: string): Promise<void> {
    return this.request<void>(`/documents/${id}`, {
      method: "DELETE",
    });
  }

  // ============================================
  // CHAT ENDPOINTS
  // ============================================
  async sendMessage(
    message: string,
    settings: ChatSettings & {
      mode: ChatMode;
      namespace?: string;
      documentIds?: string[];
    }
  ): Promise<ChatResponse> {
    return this.request<ChatResponse>("/chat", {
      method: "POST",
      body: JSON.stringify({
        message,
        mode: settings.mode,
        namespace_id: settings.namespace,
        document_ids: settings.documentIds,
        temperature: settings.temperature,
        max_tokens: settings.maxTokens,
        top_k: settings.topK,
        use_hybrid_search: settings.useHybridSearch,
      }),
    });
  }

  async streamChat(
    message: string,
    settings: ChatSettings & {
      mode: ChatMode;
      namespace?: string;
      documentIds?: string[];
    }
  ): Promise<ReadableStreamDefaultReader<Uint8Array>> {
    const response = await fetch(`${this.baseURL}/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      body: JSON.stringify({
        message,
        mode: settings.mode,
        namespace_id: settings.namespace,
        document_ids: settings.documentIds,
        temperature: settings.temperature,
        max_tokens: settings.maxTokens,
        top_k: settings.topK,
        use_hybrid_search: settings.useHybridSearch,
      }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "Streaming failed" }));
      throw new ApiError(error.detail, response.status);
    }

    return response.body!.getReader();
  }

  // ============================================
  // SEARCH ENDPOINTS
  // ============================================
  async search(
    query: string,
    namespaceId?: string,
    topK: number = 5
  ): Promise<any[]> {
    const params = new URLSearchParams({
      query,
      top_k: topK.toString(),
      ...(namespaceId && { namespace_id: namespaceId }),
    });

    return this.request<any[]>(`/search?${params}`);
  }
}

// Singleton instance
export const apiClient = new ApiClient();

// Server-side fetch helper (for prefetching)
export async function serverFetch<T>(endpoint: string): Promise<T> {
  const baseURL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  const response = await fetch(`${baseURL}${endpoint}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${endpoint}`);
  }

  return response.json();
}
