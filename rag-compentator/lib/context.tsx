"use client";

import React, { createContext, useContext, useReducer, ReactNode } from "react";
import {
  AppState,
  AppAction,
  ChatMode,
  ChatSettings,
  UploadSettings,
  Message,
  Source,
} from "./types";

// Default values
const defaultChatSettings: ChatSettings = {
  temperature: 0.3,
  maxTokens: 1000,
  topK: 5,
  useHybridSearch: true,
  streamResponses: false,
};

const defaultUploadSettings: UploadSettings = {
  strategy: "hi_res",
  max_chunk_size: 1000,
  enable_ai_enhancement: true,
  upsert_to_pinecone: true,
  pinecone_namespace: "",
};

const initialState: AppState = {
  currentNamespace: null,
  chatMode: "namespace",
  selectedDocuments: [],
  namespaces: [],
  documents: [],
  messages: [],
  isLoading: false,
  isSidebarOpen: true,
  isSourcesPanelOpen: true,
  activeSource: null,
  chatSettings: defaultChatSettings,
  uploadSettings: defaultUploadSettings,
  apiBaseUrl: "http://localhost:8000/api/v1",
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_NAMESPACE":
      return {
        ...state,
        currentNamespace: action.payload,
        selectedDocuments: [],
        messages: [],
      };

    case "SET_CHAT_MODE":
      return {
        ...state,
        chatMode: action.payload,
        selectedDocuments:
          action.payload === "namespace" ? [] : state.selectedDocuments,
      };

    case "SELECT_DOCUMENT":
      if (state.chatMode === "single") {
        return {
          ...state,
          selectedDocuments: [action.payload],
        };
      }
      if (state.selectedDocuments.includes(action.payload)) {
        return state;
      }
      return {
        ...state,
        selectedDocuments: [...state.selectedDocuments, action.payload],
      };

    case "DESELECT_DOCUMENT":
      return {
        ...state,
        selectedDocuments: state.selectedDocuments.filter(
          (id) => id !== action.payload
        ),
      };

    case "SET_SELECTED_DOCUMENTS":
      return {
        ...state,
        selectedDocuments: action.payload,
      };

    case "CLEAR_SELECTED_DOCUMENTS":
      return {
        ...state,
        selectedDocuments: [],
      };

    case "SET_NAMESPACES":
      return {
        ...state,
        namespaces: action.payload,
      };

    case "SET_DOCUMENTS":
      return {
        ...state,
        documents: action.payload,
      };

    case "ADD_MESSAGE":
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };

    case "UPDATE_MESSAGE":
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.id === action.payload.id
            ? { ...msg, ...action.payload.updates }
            : msg
        ),
      };

    case "CLEAR_MESSAGES":
      return {
        ...state,
        messages: [],
      };

    case "SET_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      };

    case "TOGGLE_SIDEBAR":
      return {
        ...state,
        isSidebarOpen: !state.isSidebarOpen,
      };

    case "TOGGLE_SOURCES_PANEL":
      return {
        ...state,
        isSourcesPanelOpen: !state.isSourcesPanelOpen,
      };

    case "SET_ACTIVE_SOURCE":
      return {
        ...state,
        activeSource: action.payload,
        isSourcesPanelOpen: action.payload ? true : state.isSourcesPanelOpen,
      };

    case "UPDATE_CHAT_SETTINGS":
      return {
        ...state,
        chatSettings: { ...state.chatSettings, ...action.payload },
      };

    case "UPDATE_UPLOAD_SETTINGS":
      return {
        ...state,
        uploadSettings: { ...state.uploadSettings, ...action.payload },
      };

    case "SET_API_BASE_URL":
      return {
        ...state,
        apiBaseUrl: action.payload,
      };

    default:
      return state;
  }
}

// Context
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;

  // Helper functions
  setNamespace: (namespace: string | null) => void;
  setChatMode: (mode: ChatMode) => void;
  selectDocument: (documentId: string) => void;
  deselectDocument: (documentId: string) => void;
  toggleDocumentSelection: (documentId: string) => void;
  clearDocumentSelection: () => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  clearMessages: () => void;
  setActiveSource: (source: Source | null) => void;
  updateChatSettings: (settings: Partial<ChatSettings>) => void;
  updateUploadSettings: (settings: Partial<UploadSettings>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const setNamespace = (namespace: string | null) => {
    dispatch({ type: "SET_NAMESPACE", payload: namespace });
  };

  const setChatMode = (mode: ChatMode) => {
    dispatch({ type: "SET_CHAT_MODE", payload: mode });
  };

  const selectDocument = (documentId: string) => {
    dispatch({ type: "SELECT_DOCUMENT", payload: documentId });
  };

  const deselectDocument = (documentId: string) => {
    dispatch({ type: "DESELECT_DOCUMENT", payload: documentId });
  };

  const toggleDocumentSelection = (documentId: string) => {
    if (state.selectedDocuments.includes(documentId)) {
      deselectDocument(documentId);
    } else {
      selectDocument(documentId);
    }
  };

  const clearDocumentSelection = () => {
    dispatch({ type: "CLEAR_SELECTED_DOCUMENTS" });
  };

  const addMessage = (message: Message) => {
    dispatch({ type: "ADD_MESSAGE", payload: message });
  };

  const updateMessage = (id: string, updates: Partial<Message>) => {
    dispatch({ type: "UPDATE_MESSAGE", payload: { id, updates } });
  };

  const clearMessages = () => {
    dispatch({ type: "CLEAR_MESSAGES" });
  };

  const setActiveSource = (source: Source | null) => {
    dispatch({ type: "SET_ACTIVE_SOURCE", payload: source });
  };

  const updateChatSettings = (settings: Partial<ChatSettings>) => {
    dispatch({ type: "UPDATE_CHAT_SETTINGS", payload: settings });
  };

  const updateUploadSettings = (settings: Partial<UploadSettings>) => {
    dispatch({ type: "UPDATE_UPLOAD_SETTINGS", payload: settings });
  };

  const value: AppContextType = {
    state,
    dispatch,
    setNamespace,
    setChatMode,
    selectDocument,
    deselectDocument,
    toggleDocumentSelection,
    clearDocumentSelection,
    addMessage,
    updateMessage,
    clearMessages,
    setActiveSource,
    updateChatSettings,
    updateUploadSettings,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Hook
export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}

// Selector hooks for performance
export function useNamespace() {
  const { state, setNamespace } = useApp();
  return {
    currentNamespace: state.currentNamespace,
    namespaces: state.namespaces,
    setNamespace,
  };
}

export function useChatMode() {
  const { state, setChatMode } = useApp();
  return {
    chatMode: state.chatMode,
    setChatMode,
  };
}

export function useDocuments() {
  const {
    state,
    selectDocument,
    deselectDocument,
    toggleDocumentSelection,
    clearDocumentSelection,
  } = useApp();
  return {
    documents: state.documents,
    selectedDocuments: state.selectedDocuments,
    selectDocument,
    deselectDocument,
    toggleDocumentSelection,
    clearDocumentSelection,
  };
}

export function useMessages() {
  const { state, addMessage, updateMessage, clearMessages } = useApp();
  return {
    messages: state.messages,
    isLoading: state.isLoading,
    addMessage,
    updateMessage,
    clearMessages,
  };
}

export function useSources() {
  const { state, setActiveSource, dispatch } = useApp();
  return {
    activeSource: state.activeSource,
    isSourcesPanelOpen: state.isSourcesPanelOpen,
    setActiveSource,
    toggleSourcesPanel: () => dispatch({ type: "TOGGLE_SOURCES_PANEL" }),
  };
}

export function useSettings() {
  const { state, updateChatSettings, updateUploadSettings } = useApp();
  return {
    chatSettings: state.chatSettings,
    uploadSettings: state.uploadSettings,
    updateChatSettings,
    updateUploadSettings,
  };
}
