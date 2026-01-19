import {
  ChatMode,
  ChatSettings,
  ChatResponse,
  Document,
  DocumentDetail,
  DocumentListResponse,
  DeleteDocumentResponse,
  Namespace,
  NamespaceDetail,
  NamespaceListResponse,
  CreateNamespaceRequest,
  DeleteNamespaceResponse,
  UploadSettings,
  MultimodalProcessResponse,
  PublicStats,
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

    // Load token from localStorage on initialization
    // Use same key as auth-api.ts: rag_access_token
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("rag_access_token");
      if (stored) {
        this.token = stored;
      }
    }
  }

  setToken(token: string | undefined) {
    this.token = token;
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("rag_access_token", token);
      } else {
        localStorage.removeItem("rag_access_token");
      }
    }
  }

  getToken(): string | undefined {
    return this.token;
  }

  // Sync token from localStorage (call after login in auth-api)
  syncTokenFromStorage() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("rag_access_token");
      if (stored) {
        this.token = stored;
      }
    }
  }

  clearToken() {
    this.token = undefined;
    if (typeof window !== "undefined") {
      localStorage.removeItem("rag_access_token");
      localStorage.removeItem("rag_refresh_token");
    }
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit,
    skipAuth = false
  ): Promise<T> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(this.token && !skipAuth && { Authorization: `Bearer ${this.token}` }),
      ...options?.headers,
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers,
      });

      // Handle 401 Unauthorized - try to refresh token
      if (
        response.status === 401 &&
        !skipAuth &&
        !endpoint.includes("/auth/")
      ) {
        const refreshed = await this.tryRefreshToken();
        if (refreshed) {
          // Retry the request with new token
          return this.request<T>(endpoint, options, skipAuth);
        }
      }

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

  private async tryRefreshToken(): Promise<boolean> {
    if (typeof window === "undefined") return false;

    const refreshToken = localStorage.getItem("rag_refresh_token");
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        // Refresh failed, clear all tokens
        this.clearToken();
        return false;
      }

      const data = await response.json();
      this.setToken(data.access_token);
      if (data.refresh_token) {
        localStorage.setItem("rag_refresh_token", data.refresh_token);
      }
      return true;
    } catch {
      return false;
    }
  }

  // ============================================
  // NAMESPACE ENDPOINTS
  // ============================================
  async getNamespaces(): Promise<NamespaceListResponse> {
    return this.request<NamespaceListResponse>("/namespaces");
  }

  async getNamespace(id: string): Promise<NamespaceDetail> {
    return this.request<NamespaceDetail>(`/namespaces/${id}`);
  }

  async createNamespace(data: CreateNamespaceRequest): Promise<Namespace> {
    return this.request<Namespace>("/namespaces", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deleteNamespace(id: string): Promise<DeleteNamespaceResponse> {
    return this.request<DeleteNamespaceResponse>(`/namespaces/${id}`, {
      method: "DELETE",
    });
  }

  // ============================================
  // DOCUMENT ENDPOINTS
  // ============================================
  async getDocuments(params?: {
    namespace_id?: string;
    namespace?: string;
    page?: number;
    limit?: number;
  }): Promise<DocumentListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.namespace_id)
      queryParams.append("namespace_id", params.namespace_id);
    if (params?.namespace) queryParams.append("namespace", params.namespace);
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());

    const endpoint = queryParams.toString()
      ? `/documents?${queryParams.toString()}`
      : "/documents";

    return this.request<DocumentListResponse>(endpoint);
  }

  async getDocument(id: string): Promise<DocumentDetail> {
    return this.request<DocumentDetail>(`/documents/${id}`);
  }

  async deleteDocument(id: string): Promise<DeleteDocumentResponse> {
    return this.request<DeleteDocumentResponse>(`/documents/${id}`, {
      method: "DELETE",
    });
  }

  async uploadDocument(
    file: File,
    settings: UploadSettings,
    onProgress?: (progress: number) => void
  ): Promise<MultimodalProcessResponse> {
    // Build query parameters for settings (backend expects query params, not FormData)
    const queryParams = new URLSearchParams({
      strategy: settings.strategy,
      max_chunk_size: settings.max_chunk_size.toString(),
      enable_ai_enhancement: settings.enable_ai_enhancement.toString(),
      upsert_to_pinecone: settings.upsert_to_pinecone.toString(),
      pinecone_namespace: settings.pinecone_namespace,
    });

    const uploadUrl = `${
      this.baseURL
    }/documents/process-multimodal?${queryParams.toString()}`;

    // Log the settings being sent
    console.log("🔧 API Client - Settings received:", settings);
    console.log("🌐 Upload URL:", uploadUrl);
    console.log("📦 Query Parameters:");
    queryParams.forEach((value, key) => {
      console.log(`  ${key}:`, value);
    });

    // FormData only contains the file
    const formData = new FormData();
    formData.append("file", file);

    // Use XMLHttpRequest for progress tracking
    if (onProgress) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            onProgress(Math.round(percentComplete));
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              reject(new ApiError("Invalid response format", xhr.status));
            }
          } else {
            try {
              const error = JSON.parse(xhr.responseText);
              reject(
                new ApiError(
                  error.detail || "Upload failed",
                  xhr.status,
                  error.code
                )
              );
            } catch (e) {
              reject(new ApiError("Upload failed", xhr.status));
            }
          }
        });

        xhr.addEventListener("error", () => {
          reject(new ApiError("Network error during upload", 0));
        });

        xhr.addEventListener("abort", () => {
          reject(new ApiError("Upload cancelled", 0));
        });

        xhr.open("POST", uploadUrl);
        if (this.token) {
          xhr.setRequestHeader("Authorization", `Bearer ${this.token}`);
        }
        xhr.send(formData);
      });
    }

    // Fallback to fetch without progress
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        // Note: Don't set Content-Type for multipart/form-data - browser will set it with boundary
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "Upload failed" }));
      throw new ApiError(
        error.detail || error.message || "Upload failed",
        response.status,
        error.code
      );
    }

    return response.json();
  }

  // ============================================
  // CHAT ENDPOINTS
  // ============================================
  async sendMessage(
    message: string,
    options: {
      mode: ChatMode;
      namespaceId?: string; // Required for namespace mode
      documentId?: string; // Required for single mode
      documentIds?: string[]; // Required for multi mode
      temperature?: number;
      maxTokens?: number;
      topK?: number;
      useHybridSearch?: boolean;
    }
  ): Promise<ChatResponse> {
    // Build request body based on mode
    const requestBody: Record<string, unknown> = {
      message,
      mode: options.mode,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 2000,
      top_k: options.topK ?? 5,
      use_hybrid_search: options.useHybridSearch ?? true,
    };

    // Add mode-specific parameters
    switch (options.mode) {
      case "namespace":
        if (!options.namespaceId) {
          throw new ApiError(
            "namespace_id is required for namespace mode",
            400
          );
        }
        requestBody.namespace_id = options.namespaceId;
        break;
      case "single":
        if (!options.documentId) {
          throw new ApiError("document_id is required for single mode", 400);
        }
        requestBody.document_id = options.documentId;
        break;
      case "multi":
        if (!options.documentIds || options.documentIds.length === 0) {
          throw new ApiError("document_ids is required for multi mode", 400);
        }
        requestBody.document_ids = options.documentIds;
        break;
    }

    console.log("📤 Chat request:", requestBody);

    return this.request<ChatResponse>("/chat", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });
  }

  async streamChat(
    message: string,
    options: {
      mode: ChatMode;
      namespaceId?: string;
      documentId?: string;
      documentIds?: string[];
      temperature?: number;
      maxTokens?: number;
      topK?: number;
      useHybridSearch?: boolean;
    }
  ): Promise<ReadableStreamDefaultReader<Uint8Array>> {
    // Build request body based on mode
    const requestBody: Record<string, unknown> = {
      message,
      mode: options.mode,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 2000,
      top_k: options.topK ?? 5,
      use_hybrid_search: options.useHybridSearch ?? true,
    };

    // Add mode-specific parameters
    switch (options.mode) {
      case "namespace":
        requestBody.namespace_id = options.namespaceId;
        break;
      case "single":
        requestBody.document_id = options.documentId;
        break;
      case "multi":
        requestBody.document_ids = options.documentIds;
        break;
    }

    const response = await fetch(`${this.baseURL}/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      body: JSON.stringify(requestBody),
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

  // ===========================================================================
  // Public Endpoints (No Auth Required)
  // ===========================================================================

  async getPublicStats(): Promise<PublicStats> {
    return this.request<PublicStats>("/public/stats", {}, true);
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
