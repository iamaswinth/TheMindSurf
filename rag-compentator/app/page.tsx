"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/ui/Sidebar";
import { ModeSelector, ModeBadge } from "@/components/ui/ModeSelector";
import { DocumentList } from "@/components/ui/DocumentList";
import { UploadModal } from "@/components/ui/UploadModal";
import { Button, Card, Select } from "@/components/ui/Components";
import { PlusIcon, ChevronRightIcon, MenuIcon } from "@/components/ui/Icons";
import { ChatMode, Document, Namespace, UploadSettings } from "@/lib/types";
import Link from "next/link";

// Mock data for demonstration
const mockNamespaces: Namespace[] = [
  { id: "ns1", name: "cn_unit5", documentCount: 5, createdAt: "2025-12-01" },
  { id: "ns2", name: "ml_basics", documentCount: 3, createdAt: "2025-12-15" },
  {
    id: "ns3",
    name: "research_papers",
    documentCount: 8,
    createdAt: "2025-12-20",
  },
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

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedNamespace, setSelectedNamespace] = useState<string>("ns1");
  const [chatMode, setChatMode] = useState<ChatMode>("namespace");
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const namespaces = mockNamespaces;
  const documents = mockDocuments.filter(
    (d) => d.namespace === selectedNamespace
  );

  const handleSelectDocument = (docId: string) => {
    if (chatMode === "single") {
      setSelectedDocuments([docId]);
    } else if (chatMode === "multi") {
      if (!selectedDocuments.includes(docId)) {
        setSelectedDocuments([...selectedDocuments, docId]);
      }
    }
  };

  const handleDeselectDocument = (docId: string) => {
    setSelectedDocuments(selectedDocuments.filter((id) => id !== docId));
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
  ) => {
    // Simulate upload
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log(
      "Uploading:",
      file.name,
      "to namespace:",
      settings.pinecone_namespace,
      "with settings:",
      settings
    );
  };

  const canStartChat = () => {
    if (!selectedNamespace) return false;
    if (chatMode === "namespace") return true;
    if (chatMode === "single") return selectedDocuments.length === 1;
    if (chatMode === "multi") return selectedDocuments.length > 0;
    return false;
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
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar - NEO-BRUTALIST */}
        <header className="h-20 bg-[#FFFF00] border-b-4 border-black flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-3 text-black bg-white border-4 border-black shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-100"
            >
              <MenuIcon size={20} />
            </button>
            <h1 className="text-2xl font-black text-black uppercase tracking-tight">
              DASHBOARD
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <ModeBadge
              mode={chatMode}
              documentCount={documents.length}
              selectedCount={selectedDocuments.length}
              documentName={getSelectedDocumentName()}
            />
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto space-y-8">
            {/* Namespace Selector */}
            <Card className="p-6" color="white">
              <h2 className="text-xl font-black text-black mb-4 uppercase tracking-tight flex items-center gap-2">
                <span className="inline-block w-4 h-4 bg-[#00FFFF] border-2 border-black"></span>
                SELECT NAMESPACE
              </h2>
              <Select
                options={namespaces.map((ns) => ({
                  value: ns.id,
                  label: `${ns.name} (${ns.documentCount} documents)`,
                }))}
                value={selectedNamespace}
                onChange={setSelectedNamespace}
                placeholder="Select or create namespace"
              />
            </Card>

            {/* Mode Selector */}
            <Card className="p-6" color="cyan">
              <h2 className="text-xl font-black text-black mb-6 uppercase tracking-tight flex items-center gap-2">
                <span className="inline-block w-4 h-4 bg-[#FF006E] border-2 border-black"></span>
                CHAT MODE SELECTION
              </h2>
              <ModeSelector mode={chatMode} onChange={handleModeChange} />
            </Card>

            {/* Documents List */}
            <Card className="p-6" color="lime">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-black uppercase tracking-tight flex items-center gap-2">
                  <span className="inline-block w-4 h-4 bg-[#FFFF00] border-2 border-black"></span>
                  DOCUMENTS ({documents.length})
                </h2>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<PlusIcon size={16} />}
                  onClick={() => setShowUploadModal(true)}
                >
                  Upload New
                </Button>
              </div>

              <DocumentList
                documents={documents}
                mode={chatMode}
                selectedDocuments={selectedDocuments}
                onSelect={handleSelectDocument}
                onDeselect={handleDeselectDocument}
              />
            </Card>

            {/* Start Chat Button */}
            <div className="flex justify-end">
              <Link href="/chat">
                <Button
                  variant="primary"
                  size="lg"
                  disabled={!canStartChat()}
                  rightIcon={<ChevronRightIcon size={20} />}
                >
                  START CHAT →
                </Button>
              </Link>
            </div>
          </div>
        </main>
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
