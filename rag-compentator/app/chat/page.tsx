"use client";

import React, { useState, useCallback } from "react";
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
} from "@/components/ui/Icons";
import {
  ChatMode,
  Document,
  Namespace,
  Message,
  Source,
  ChatSettings,
  UploadSettings,
} from "@/lib/types";
import { generateId } from "@/lib/api";
import { useUploadDocument } from "@/lib/hooks/use-documents";
import { useNamespaces } from "@/lib/hooks/use-namespaces";

// Mock data
const mockNamespaces: Namespace[] = [
  { id: "ns1", name: "cn_unit5", documentCount: 5, createdAt: "2025-12-01" },
  { id: "ns2", name: "ml_basics", documentCount: 3, createdAt: "2025-12-15" },
];

const mockDocuments: Document[] = [
  {
    id: "doc1",
    name: "Computer_Networks_Unit5.pdf",
    pageCount: 23,
    fileSize: "1.2 MB",
    uploadedAt: "2025-01-01",
    namespace: "ns1",
  },
  {
    id: "doc2",
    name: "Networking_Basics.pdf",
    pageCount: 45,
    fileSize: "2.5 MB",
    uploadedAt: "2024-12-29",
    namespace: "ns1",
  },
  {
    id: "doc3",
    name: "TCP_IP_Protocol.pdf",
    pageCount: 32,
    fileSize: "1.8 MB",
    uploadedAt: "2024-12-25",
    namespace: "ns1",
  },
  {
    id: "doc4",
    name: "Network_Security.pdf",
    pageCount: 56,
    fileSize: "3.1 MB",
    uploadedAt: "2024-12-20",
    namespace: "ns1",
  },
  {
    id: "doc5",
    name: "Wireless_Networks.pdf",
    pageCount: 28,
    fileSize: "1.5 MB",
    uploadedAt: "2024-12-15",
    namespace: "ns1",
  },
];

// Mock response function
const getMockResponse = (
  question: string
): { answer: string; sources: Source[] } => {
  return {
    answer: `Based on the documents in your namespace, I found relevant information about "${question}".

DHCP (Dynamic Host Configuration Protocol) is a network management protocol used to automate the process of configuring devices on IP networks. It enables devices to use network services such as DNS, NTP, and any communication protocol based on UDP or TCP.

The protocol operates based on a client-server model where:
1. The DHCP client sends a broadcast message to discover available servers
2. DHCP servers respond with an offer containing configuration parameters
3. The client requests the configuration from one server
4. The server acknowledges and provides the IP address lease

This information was found across multiple sources in your documents.`,
    sources: [
      {
        document_name: "Computer_Networks_Unit5.pdf",
        document_id: "doc1",
        page_number: 23,
        chunk_text:
          "DHCP (Dynamic Host Configuration Protocol) is a client/server protocol that automatically provides an Internet Protocol (IP) host with its IP address and other related configuration information such as the subnet mask and default gateway.",
        score: 0.89,
      },
      {
        document_name: "Networking_Basics.pdf",
        document_id: "doc2",
        page_number: 45,
        chunk_text:
          "The DHCP process consists of four steps: Discovery, Offer, Request, and Acknowledge (DORA). This process ensures that IP addresses are assigned dynamically and efficiently across the network.",
        score: 0.76,
      },
      {
        document_name: "TCP_IP_Protocol.pdf",
        document_id: "doc3",
        page_number: 12,
        chunk_text:
          "DHCP uses UDP as its transport protocol. DHCP messages from a client to a server are sent to the DHCP server port 67, and messages from a server to a client are sent to the DHCP client port 68.",
        score: 0.65,
      },
    ],
  };
};

export default function ChatPage() {
  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sourcesPanelOpen, setSourcesPanelOpen] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showNamespaceDropdown, setShowNamespaceDropdown] = useState(false);

  // Data State
  const [selectedNamespace, setSelectedNamespace] = useState<string>("ns1");
  const [chatMode, setChatMode] = useState<ChatMode>("namespace");
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSource, setActiveSource] = useState<Source | null>(null);

  // React Query hooks
  const uploadMutation = useUploadDocument();
  const { data: namespaces = mockNamespaces, isLoading: namespacesLoading } =
    useNamespaces();
  const [allSources, setAllSources] = useState<Source[]>([]);

  // Settings State
  const [chatSettings, setChatSettings] = useState<ChatSettings>({
    temperature: 0.3,
    maxTokens: 1000,
    topK: 5,
    useHybridSearch: true,
    streamResponses: false,
  });

  const documents = mockDocuments.filter(
    (d) => d.namespace === selectedNamespace
  );
  const currentNamespace = namespaces.find((ns) => ns.id === selectedNamespace);

  const handleSendMessage = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Add loading message
    const loadingMessage: Message = {
      id: generateId(),
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
      isLoading: true,
    };
    setMessages((prev) => [...prev, loadingMessage]);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const response = getMockResponse(content);

    // Update with actual response
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === loadingMessage.id
          ? {
              ...msg,
              content: response.answer,
              sources: response.sources,
              isLoading: false,
            }
          : msg
      )
    );

    setAllSources((prev) => [...response.sources, ...prev]);
    setIsLoading(false);
  }, []);

  const handleSourceClick = (source: Source) => {
    setActiveSource(source);
    if (!sourcesPanelOpen) {
      setSourcesPanelOpen(true);
    }
  };

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

  const handleUpload = async (file: File, settings: UploadSettings) => {
    try {
      await uploadMutation.mutateAsync({
        file,
        settings,
      });
      setShowUploadModal(false);
    } catch (error) {
      console.error("Upload failed:", error);
      throw error; // Re-throw to let the modal handle the error
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
                      setSelectedNamespace(ns.id);
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
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSourcesPanelOpen(!sourcesPanelOpen)}
            className={sourcesPanelOpen ? "bg-[#00FFFF]" : ""}
          >
            SOURCES
          </Button>
        </header>

        {/* Chat Area */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 p-4">
            <ChatArea
              messages={messages}
              isLoading={isLoading}
              settings={chatSettings}
              onSendMessage={handleSendMessage}
              onSourceClick={handleSourceClick}
              onUpdateSettings={(updates) =>
                setChatSettings((prev) => ({ ...prev, ...updates }))
              }
            />
          </div>

          {/* Sources Panel */}
          <SourcesPanel
            sources={allSources}
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
        currentNamespace={selectedNamespace}
      />
    </div>
  );
}
