// Chat Mode Types
export type ChatMode = "namespace" | "single" | "multi";

// Document Types
export interface Document {
  id: string;
  name: string;
  page_count: number;
  file_size: string;
  file_size_bytes?: number;
  uploaded_at: string;
  namespace: string;
  namespace_name?: string;
  metadata?: {
    processing_strategy?: string;
    chunk_count?: number;
    has_images?: boolean;
    has_tables?: boolean;
  };
}

export interface DocumentDetail extends Document {
  processing_stats?: {
    total_chunks: number;
    ai_enhanced_chunks: number;
    total_tables: number;
    total_images: number;
  };
}

export interface DocumentListResponse {
  documents: Document[];
  total: number;
  page: number;
  limit: number;
}

export interface DeleteDocumentResponse {
  status: string;
  message: string;
  document_id: string;
  vectors_deleted: number;
}

// Namespace Types
export interface Namespace {
  id: string;
  name: string;
  description?: string;
  document_count: number;
  total_chunks?: number;
  created_at: string;
  metadata?: {
    last_modified?: string;
    vector_count?: number;
  };
}

export interface NamespaceDetail extends Namespace {
  documents?: string[];
  stats?: {
    total_vectors: number;
    total_pages: number;
    total_file_size: string;
  };
}

export interface NamespaceListResponse {
  namespaces: Namespace[];
  total: number;
}

export interface CreateNamespaceRequest {
  name: string;
  description?: string;
}

export interface DeleteNamespaceResponse {
  status: string;
  message: string;
  deleted_documents: string[];
}

// Source Types
export interface Source {
  document_name: string;
  document_id: string;
  page_number: number;
  chunk_text: string;
  score: number;
  metadata?: Record<string, unknown>;
}

// Message Types
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  timestamp: string;
  isLoading?: boolean;
  isStreaming?: boolean;
  error?: string;
}

// Chat Request - matches backend API
export interface ChatRequest {
  message: string;
  mode: ChatMode;
  namespace_id?: string; // Required for namespace mode
  document_id?: string; // Required for single mode
  document_ids?: string[]; // Required for multi mode
  temperature?: number; // 0-2, default: 0.3
  max_tokens?: number; // 100-4000, default: 2000
  top_k?: number; // 1-50, default: 5
  use_hybrid_search?: boolean; // default: true
}

// Chat Response - matches backend API
export interface ChatResponse {
  response: string;
  sources: Source[];
  metadata: {
    model?: string;
    tokens_used?: number;
    response_time_seconds?: number;
    search_time_seconds?: number;
    mode?: ChatMode;
    namespace_id?: string;
    document_ids?: string[];
  };
}

// Chat Settings
export interface ChatSettings {
  temperature: number;
  maxTokens: number;
  topK: number;
  useHybridSearch: boolean;
  streamResponses: boolean;
}

// Upload Settings
export interface UploadSettings {
  strategy: "hi_res" | "fast";
  max_chunk_size: number;
  enable_ai_enhancement: boolean;
  upsert_to_pinecone: boolean;
  pinecone_namespace: string;
}

// API Request Types
export interface QueryRequest {
  question: string;
  namespace: string;
  document_id?: string; // For single doc mode
  document_ids?: string[]; // For multi-doc mode
  top_k: number;
  temperature: number;
  use_hybrid_search: boolean;
}

// API Response Types
export interface QueryResponse {
  answer: string;
  sources: Source[];
  metadata: {
    tokens_used: number;
    response_time: string;
  };
}

// Multimodal Processing Types (matching backend API response)
export type ContentType = "text" | "table" | "image";

export interface OriginalContent {
  raw_text: string;
  tables_html: string[];
  images_base64: string[];
}

export interface ChunkMetadata {
  page_numbers: number[];
  element_types?: string[];
  is_ai_enhanced: boolean;
  ai_model_used?: string;
  processing_time_ms?: number;
  token_count?: number;
}

export interface MultimodalChunk {
  chunk_id: number;
  enhanced_content: string;
  content_types: ContentType[];
  original_content: OriginalContent;
  metadata: ChunkMetadata;
}

export interface ProcessingStats {
  total_elements_extracted: number;
  text_only_chunks: number;
  chunks_with_tables: number;
  chunks_with_images: number;
  ai_enhanced_chunks: number;
  ai_enhancement_failures?: number;
  total_tables_found: number;
  total_images_found: number;
  total_pages: number;
  estimated_tokens?: number;
}

export interface MultimodalProcessResponse {
  filename: string;
  total_chunks: number;
  processing_strategy: "hi_res" | "fast";
  ai_enhancement_enabled: boolean;
  processing_stats: ProcessingStats;
  chunks: MultimodalChunk[];
  processing_time_seconds: number;
  warnings: string[];
}

// Legacy upload response (deprecated - use MultimodalProcessResponse)
export interface UploadResponse {
  success: boolean;
  document_id: string;
  document_name: string;
  page_count: number;
  file_size: string;
  message: string;
}

export interface NamespaceListResponse {
  namespaces: Namespace[];
}

export interface DocumentListResponse {
  documents: Document[];
}

// App State
export interface AppState {
  // Current selections
  currentNamespace: string | null;
  chatMode: ChatMode;
  selectedDocuments: string[];

  // Data
  namespaces: Namespace[];
  documents: Document[];
  messages: Message[];

  // UI State
  isLoading: boolean;
  isSidebarOpen: boolean;
  isSourcesPanelOpen: boolean;
  activeSource: Source | null;

  // Settings
  chatSettings: ChatSettings;
  uploadSettings: UploadSettings;

  // API
  apiBaseUrl: string;
}

// Action Types for state management
export type AppAction =
  | { type: "SET_NAMESPACE"; payload: string | null }
  | { type: "SET_CHAT_MODE"; payload: ChatMode }
  | { type: "SELECT_DOCUMENT"; payload: string }
  | { type: "DESELECT_DOCUMENT"; payload: string }
  | { type: "SET_SELECTED_DOCUMENTS"; payload: string[] }
  | { type: "CLEAR_SELECTED_DOCUMENTS" }
  | { type: "SET_NAMESPACES"; payload: Namespace[] }
  | { type: "SET_DOCUMENTS"; payload: Document[] }
  | { type: "ADD_MESSAGE"; payload: Message }
  | {
      type: "UPDATE_MESSAGE";
      payload: { id: string; updates: Partial<Message> };
    }
  | { type: "CLEAR_MESSAGES" }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "TOGGLE_SIDEBAR" }
  | { type: "TOGGLE_SOURCES_PANEL" }
  | { type: "SET_ACTIVE_SOURCE"; payload: Source | null }
  | { type: "UPDATE_CHAT_SETTINGS"; payload: Partial<ChatSettings> }
  | { type: "UPDATE_UPLOAD_SETTINGS"; payload: Partial<UploadSettings> }
  | { type: "SET_API_BASE_URL"; payload: string };

// Toast Types
export interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
}

// Public Stats Types
export interface PublicStats {
  total_documents: number;
  total_users: number;
  total_questions: number;
}

// Modal Types
export type ModalType = "upload" | "settings" | "confirm" | null;

export interface ModalState {
  type: ModalType;
  props?: Record<string, unknown>;
}
