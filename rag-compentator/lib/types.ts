// Chat Mode Types
export type ChatMode = "namespace" | "single" | "multi";

// Document Types
export interface Document {
  id: string;
  name: string;
  pageCount: number;
  fileSize: string;
  uploadedAt: string;
  namespace: string;
  metadata?: Record<string, unknown>;
}

// Namespace Types
export interface Namespace {
  id: string;
  name: string;
  documentCount: number;
  createdAt: string;
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

// Chat Response
export interface ChatResponse {
  response: string;
  sources?: Source[];
  metadata?: {
    tokens_used?: number;
    response_time?: string;
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
  strategy: 'hi_res' | 'fast';
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

// Modal Types
export type ModalType = "upload" | "settings" | "confirm" | null;

export interface ModalState {
  type: ModalType;
  props?: Record<string, unknown>;
}
