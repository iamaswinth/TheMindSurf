"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/ui/Sidebar";
import { ModeSelector, ModeBadge } from "@/components/ui/ModeSelector";
import { DocumentListCompact } from "@/components/ui/DocumentList";
import { UploadModal } from "@/components/ui/UploadModal";
import { ChatArea, SourcesPanel } from "@/components/chat/ChatArea";
import { Button, Divider } from "@/components/ui/Components";
import {
  MenuIcon,
  PlusIcon,
  ClipboardIcon,
  ChevronDownIcon,
  TrashIcon,
} from "@/components/ui/Icons";
import {
  ChatMode,
  Message,
  Source,
  ChatSettings,
  UploadSettings,
  MultimodalProcessResponse,
} from "@/lib/types";
import { generateId } from "@/lib/api";
import { useNamespaces } from "@/lib/hooks/use-namespaces";
import { useDocuments, useUploadDocument } from "@/lib/hooks/use-documents";
import {
  useChat,
  validateChatMode,
  createUserMessage,
  createLoadingMessage,
} from "@/lib/hooks/use-chat";

export default function ChatPage() {
  const searchParams = useSearchParams();
  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sourcesPanelOpen, setSourcesPanelOpen] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showNamespaceDropdown, setShowNamespaceDropdown] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Data State
  const [selectedNamespace, setSelectedNamespace] = useState<string>("");
  const [chatMode, setChatMode] = useState<ChatMode>("namespace");
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSource, setActiveSource] = useState<Source | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null
  );

  // Settings State
  const [chatSettings, setChatSettings] = useState<ChatSettings>({
    temperature: 0.3,
    maxTokens: 1000,
    topK: 5,
    useHybridSearch: true,
    streamResponses: false,
  });

  // Use real data from React Query hooks
  const { data: namespaces = [] } = useNamespaces();
  const { data: documents = [] } = useDocuments(
    selectedNamespace === "all" || !selectedNamespace
      ? undefined
      : selectedNamespace
  );
  const uploadMutation = useUploadDocument();
  const currentNamespace = namespaces.find(
    (ns) => ns.name === selectedNamespace
  );

  // Auto-configure from URL parameters on mount
  useEffect(() => {
    const namespace = searchParams.get("namespace");
    const mode = searchParams.get("mode") as ChatMode;
    const documentId = searchParams.get("documentId");
    const documentIds = searchParams.get("documentIds");

    if (namespace) {
      setSelectedNamespace(namespace);
    }

    if (mode && ["namespace", "single", "multi"].includes(mode)) {
      setChatMode(mode);
    }

    if (mode === "single" && documentId) {
      setSelectedDocuments([documentId]);
    } else if (mode === "multi" && documentIds) {
      setSelectedDocuments(documentIds.split(","));
    }
  }, [searchParams]);

  // Load messages from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem("chatMessages");
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        setMessages(parsed);
      } catch (error) {
        console.error("Failed to load messages from localStorage:", error);
      }
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("chatMessages", JSON.stringify(messages));
    }
  }, [messages]);

  // Get document ID for single mode or document IDs for multi mode
  const singleDocumentId =
    chatMode === "single" && selectedDocuments.length === 1
      ? selectedDocuments[0]
      : undefined;
  const multiDocumentIds =
    chatMode === "multi" && selectedDocuments.length > 0
      ? selectedDocuments
      : undefined;

  // Chat hook with callbacks
  const chatHook = useChat({
    mode: chatMode,
    namespaceId: currentNamespace?.id,
    documentId: singleDocumentId,
    documentIds: multiDocumentIds,
    onMessage: useCallback((message: Message) => {
      // Update or add the assistant message
      setMessages((prev) => {
        const existingIndex = prev.findIndex((m) => m.id === message.id);
        if (existingIndex >= 0) {
          // Update existing message (for streaming)
          return prev.map((m, i) => (i === existingIndex ? message : m));
        }
        // Replace loading message or add new
        const loadingIndex = prev.findIndex((m) => m.isLoading);
        if (loadingIndex >= 0) {
          return prev.map((m, i) => (i === loadingIndex ? message : m));
        }
        return [...prev, message];
      });

      // Auto-select the latest AI message with sources to show in panel
      if (
        message.sources &&
        message.sources.length > 0 &&
        !message.isStreaming
      ) {
        setSelectedMessageId(message.id);
      }
    }, []),
    onError: useCallback((error: Error) => {
      console.error("Chat error:", error);
      setChatError(error.message);
      setIsLoading(false);

      // Remove loading message on error
      setMessages((prev) => prev.filter((m) => !m.isLoading));
    }, []),
    onStreamEnd: useCallback(() => {
      setIsLoading(false);
    }, []),
  });

  const handleSendMessage = useCallback(
    async (content: string) => {
      // Validate mode configuration
      const validation = validateChatMode(
        chatMode,
        currentNamespace?.id,
        singleDocumentId,
        multiDocumentIds
      );

      if (!validation.valid) {
        setChatError(validation.error || "Invalid chat configuration");
        return;
      }

      setChatError(null);

      // Add user message
      const userMessage = createUserMessage(content);
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      // Add loading message
      const loadingMessage = createLoadingMessage();
      setMessages((prev) => [...prev, loadingMessage]);

      try {
        // Use streaming if enabled, otherwise regular
        if (chatSettings.streamResponses) {
          await chatHook.sendStreamingMessage(content, chatSettings);
        } else {
          await chatHook.sendMessageAsync(content, chatSettings);
        }
      } catch (error) {
        console.error("Send message failed:", error);
        // Error handling is done in onError callback
      } finally {
        setIsLoading(false);
      }
    },
    [
      chatMode,
      currentNamespace?.id,
      singleDocumentId,
      multiDocumentIds,
      chatSettings,
      chatHook,
    ]
  );

  const handleResetChat = useCallback(() => {
    setMessages([]);
    setSelectedMessageId(null);
    setActiveSource(null);
    localStorage.removeItem("chatMessages");
    setChatError(null);
  }, []);

  const handleToggleDocument = (docId: string) => {
    if (chatMode === "single") {
      setSelectedDocuments([docId]);
    } else if (chatMode === "multi") {
      if (selectedDocuments.includes(docId)) {
        setSelectedDocuments(selectedDocuments.filter((id) => id !== docId));
      } else {
        setSelectedDocuments([...selectedDocuments, docId]);
      }
    }
  };

  const handleModeChange = (mode: ChatMode) => {
    setChatMode(mode);
    if (mode === "namespace") {
      setSelectedDocuments([]);
    }
  };

  const handleUpload = async (
    file: File,
    settings: UploadSettings
  ): Promise<MultimodalProcessResponse> => {
    try {
      const response = await uploadMutation.mutateAsync({ file, settings });
      // Don't close modal here - let UploadModal show success screen
      // Modal will close when user clicks action buttons
      console.log("Upload successful:", response);
      return response;
    } catch (error) {
      console.error("Upload failed:", error);
      throw error;
    }
  };

  const getSelectedDocumentName = () => {
    if (chatMode === "single" && selectedDocuments.length === 1) {
      const doc = documents.find((d) => d.id === selectedDocuments[0]);
      return doc?.name;
    }
    return undefined;
  };

  return (
    <div className="flex h-screen bg-[#FFFEF0]">
      {/* Main Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Chat Sidebar - NEO-BRUTALIST */}
      <div className="w-72 bg-black flex flex-col border-r-4 border-[#FF006E] mobile-hidden">
        {/* Current Namespace */}
        <div className="p-4 border-b-4 border-[#FF006E]">
          <p className="text-xs font-black text-[#FFFF00] uppercase tracking-wider mb-3">
            NAMESPACE
          </p>
          <div className="relative">
            <button
              onClick={() => setShowNamespaceDropdown(!showNamespaceDropdown)}
              className="w-full flex items-center justify-between px-4 py-3 bg-[#FFFF00] border-4 border-black text-black font-bold uppercase text-sm shadow-[4px_4px_0px_#FF006E] hover:shadow-[6px_6px_0px_#FF006E] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-100"
            >
              <span>{currentNamespace?.name || "SELECT"}</span>
              <ChevronDownIcon size={16} />
            </button>

            {showNamespaceDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border-4 border-black shadow-[6px_6px_0px_#000] z-10">
                {namespaces.map((ns) => (
                  <button
                    key={ns.id}
                    onClick={() => {
                      setSelectedNamespace(ns.name);
                      setShowNamespaceDropdown(false);
                    }}
                    className={`
                      w-full text-left px-4 py-3 text-sm font-bold uppercase
                      border-b-2 border-black last:border-b-0
                      hover:bg-[#FFFF00] transition-colors duration-100
                      ${
                        ns.id === selectedNamespace
                          ? "bg-[#FF006E] text-white"
                          : "text-black"
                      }
                    `}
                  >
                    {ns.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mode Selector */}
        <div className="p-4 border-b-4 border-[#FF006E]">
          <p className="text-xs font-black text-[#00FFFF] uppercase tracking-wider mb-3">
            MODE
          </p>
          <ModeSelector mode={chatMode} onChange={handleModeChange} compact />
        </div>

        {/* Documents */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-dark">
          <DocumentListCompact
            documents={documents}
            mode={chatMode}
            selectedDocuments={selectedDocuments}
            onToggle={handleToggleDocument}
            onClearSelection={() => setSelectedDocuments([])}
          />
        </div>

        {/* Actions */}
        <div className="p-4 border-t-4 border-[#FF006E] space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-white hover:text-black"
            leftIcon={<PlusIcon size={16} />}
            onClick={() => setShowUploadModal(true)}
          >
            UPLOAD DOC
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-white hover:text-black"
            leftIcon={<ClipboardIcon size={16} />}
          >
            MANAGE DOCS
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar - NEO-BRUTALIST */}
        <header className="h-16 bg-[#FF006E] border-b-4 border-black flex items-center px-4 gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-3 bg-white text-black border-4 border-black shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-100"
          >
            <MenuIcon size={20} />
          </button>

          <div className="flex items-center gap-4 flex-1">
            {/* Namespace Badge */}
            <span className="px-4 py-2 bg-[#FFFF00] border-4 border-black text-sm font-black text-black uppercase shadow-[4px_4px_0px_#000]">
              {currentNamespace?.name}
            </span>

            <Divider vertical className="h-8 bg-white/50" />

            {/* Mode Badge */}
            <ModeBadge
              mode={chatMode}
              documentCount={documents.length}
              selectedCount={selectedDocuments.length}
              documentName={getSelectedDocumentName()}
            />
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleResetChat}
                className="bg-[#FF006E] hover:bg-[#FF006E]/90"
                leftIcon={<TrashIcon size={16} />}
              >
                CLEAR CHAT
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSourcesPanelOpen(!sourcesPanelOpen)}
              className={sourcesPanelOpen ? "bg-[#00FFFF]" : ""}
            >
              SOURCES
            </Button>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 p-4">
            <ChatArea
              messages={messages}
              isLoading={
                isLoading || chatHook.isLoading || chatHook.isStreaming
              }
              settings={chatSettings}
              onSendMessage={handleSendMessage}
              onUpdateSettings={(updates) =>
                setChatSettings((prev) => ({ ...prev, ...updates }))
              }
              onMessageClick={(message) => {
                // Toggle selection - clicking same message deselects
                if (selectedMessageId === message.id) {
                  setSelectedMessageId(null);
                  setActiveSource(null);
                } else {
                  setSelectedMessageId(message.id);
                  setActiveSource(null);
                }
              }}
              selectedMessageId={selectedMessageId ?? undefined}
              error={chatError}
              onClearError={() => setChatError(null)}
            />
          </div>

          {/* Sources Panel */}
          <SourcesPanel
            sources={
              selectedMessageId
                ? messages.find((m) => m.id === selectedMessageId)?.sources ||
                  []
                : []
            }
            activeSource={activeSource}
            onSourceSelect={setActiveSource}
            isOpen={sourcesPanelOpen}
            onToggle={() => setSourcesPanelOpen(!sourcesPanelOpen)}
          />
        </div>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUpload}
        namespaces={namespaces}
        currentNamespace={currentNamespace?.name}
        uploadProgress={uploadMutation.uploadProgress}
      />
    </div>
  );
}
