// This is a CLIENT COMPONENT that uses the prefetched data
// Place this file at: app/dashboard-with-prefetch/dashboard-client.tsx

"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/ui/Sidebar";
import { ModeSelector, ModeBadge } from "@/components/ui/ModeSelector";
import { DocumentList } from "@/components/ui/DocumentList";
import { UploadModal } from "@/components/ui/UploadModal";
import { Button, Card, Select } from "@/components/ui/Components";
import { PlusIcon, ChevronRightIcon, MenuIcon } from "@/components/ui/Icons";
import { ChatMode, UploadSettings } from "@/lib/types";
import Link from "next/link";

// Import React Query hooks
import { useNamespaces } from "@/lib/hooks/use-namespaces";
import { useDocuments, useUploadDocument } from "@/lib/hooks/use-documents";
import { useQueryClient } from "@tanstack/react-query";
import { documentKeys } from "@/lib/hooks/use-documents";
import { apiClient } from "@/lib/api-client";

export default function DashboardClient() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedNamespace, setSelectedNamespace] = useState<string>("");
  const [chatMode, setChatMode] = useState<ChatMode>("namespace");
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const queryClient = useQueryClient();

  // Fetch data using React Query hooks
  // This will use the prefetched data instantly, no loading state!
  const { data: namespaces = [], isLoading: namespacesLoading } =
    useNamespaces();
  const { data: documents = [], isLoading: documentsLoading } =
    useDocuments(selectedNamespace);
  const uploadMutation = useUploadDocument();

  // Set first namespace as default when loaded
  React.useEffect(() => {
    if (namespaces.length > 0 && !selectedNamespace) {
      setSelectedNamespace(namespaces[0].id);
    }
  }, [namespaces, selectedNamespace]);

  // Prefetch documents when namespace changes (before user clicks)
  const prefetchDocumentsForNamespace = (namespaceId: string) => {
    queryClient.prefetchQuery({
      queryKey: documentKeys.list(namespaceId),
      queryFn: () => apiClient.getDocuments(namespaceId),
      staleTime: 60 * 1000, // Cache for 60 seconds
    });
  };

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

  const handleUpload = async (file: File, settings: UploadSettings) => {
    try {
      await uploadMutation.mutateAsync({
        file,
        settings,
      });
      setShowUploadModal(false);
    } catch (error) {
      console.error("Upload failed:", error);
    }
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
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-[#FFFF00] border-b-4 border-black flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-3 text-black bg-white border-4 border-black shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all duration-100"
            >
              <MenuIcon size={20} />
            </button>
            <h1 className="text-2xl font-black text-black uppercase tracking-tight">
              DASHBOARD {namespacesLoading && "(LOADING...)"}
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
                onChange={(value) => {
                  setSelectedNamespace(value);
                  // Optionally prefetch next namespace on hover
                  const nextIndex =
                    namespaces.findIndex((ns) => ns.id === value) + 1;
                  if (nextIndex < namespaces.length) {
                    prefetchDocumentsForNamespace(namespaces[nextIndex].id);
                  }
                }}
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
                  DOCUMENTS ({documentsLoading ? "..." : documents.length})
                </h2>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<PlusIcon size={16} />}
                  onClick={() => setShowUploadModal(true)}
                >
                  UPLOAD NEW
                </Button>
              </div>

              {documentsLoading ? (
                <div className="text-center py-8">Loading documents...</div>
              ) : (
                <DocumentList
                  documents={documents}
                  mode={chatMode}
                  selectedDocuments={selectedDocuments}
                  onSelect={handleSelectDocument}
                  onDeselect={handleDeselectDocument}
                />
              )}
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
