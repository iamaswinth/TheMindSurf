import {
  QueryRequest,
  QueryResponse,
  UploadResponse,
  NamespaceListResponse,
  DocumentListResponse,
  Namespace,
  Document,
} from "./types";

// API Client
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = "http://localhost:8000/api/v1") {
    this.baseUrl = baseUrl;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "An error occurred" }));
      throw new Error(
        error.message || `HTTP error! status: ${response.status}`
      );
    }

    return response.json();
  }

  // Namespace endpoints
  async getNamespaces(): Promise<Namespace[]> {
    const response = await this.request<NamespaceListResponse>(
      "/namespaces/list"
    );
    return response.namespaces;
  }

  async createNamespace(name: string): Promise<Namespace> {
    return this.request<Namespace>("/namespaces/create", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  async deleteNamespace(namespaceId: string): Promise<void> {
    await this.request(`/namespaces/${namespaceId}`, {
      method: "DELETE",
    });
  }

  // Document endpoints
  async getDocuments(namespace: string): Promise<Document[]> {
    const response = await this.request<DocumentListResponse>(
      `/documents/list?namespace=${encodeURIComponent(namespace)}`
    );
    return response.documents;
  }

  async uploadDocument(
    file: File,
    namespace: string,
    settings: {
      chunkSize?: number;
      chunkOverlap?: number;
      extractTables?: boolean;
    } = {}
  ): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("namespace", namespace);

    if (settings.chunkSize) {
      formData.append("chunk_size", settings.chunkSize.toString());
    }
    if (settings.chunkOverlap) {
      formData.append("chunk_overlap", settings.chunkOverlap.toString());
    }
    if (settings.extractTables !== undefined) {
      formData.append("extract_tables", settings.extractTables.toString());
    }

    const response = await fetch(`${this.baseUrl}/documents/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Upload failed" }));
      throw new Error(error.message || "Upload failed");
    }

    return response.json();
  }

  async deleteDocument(documentId: string): Promise<void> {
    await this.request(`/documents/${documentId}`, {
      method: "DELETE",
    });
  }

  // Query endpoint
  async query(request: QueryRequest): Promise<QueryResponse> {
    return this.request<QueryResponse>("/search/query", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }
}

// Singleton instance
export const apiClient = new ApiClient();

// React hooks for API calls
export function useApi() {
  return apiClient;
}

// Helper function for generating unique IDs
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Format date
export function formatDate(dateString: string): string {
  if (!dateString) return "";

  try {
    const date = new Date(dateString);
    // Use ISO date string parts to avoid locale differences
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    return `${month}/${day}/${year}`;
  } catch (error) {
    return dateString;
  }
}

// Truncate text
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}
