"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/ui/Sidebar";
import { ModeSelector, ModeBadge } from "@/components/ui/ModeSelector";
import { DocumentList } from "@/components/ui/DocumentList";
import { UploadModal } from "@/components/ui/UploadModal";
import { Button, Card, Select, Input } from "@/components/ui/Components";
import {
  PlusIcon,
  ChevronRightIcon,
  MenuIcon,
  XIcon,
  FolderIcon,
} from "@/components/ui/Icons";
import {
  ChatMode,
  Document,
  Namespace,
  UploadSettings,
  MultimodalProcessResponse,
} from "@/lib/types";
import Link from "next/link";
import { useNamespaces, useCreateNamespace } from "@/lib/hooks/use-namespaces";
import { useDocuments, useUploadDocument } from "@/lib/hooks/use-documents";

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedNamespace, setSelectedNamespace] = useState<string>("");
  const [chatMode, setChatMode] = useState<ChatMode>("namespace");
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateNamespaceModal, setShowCreateNamespaceModal] =
    useState(false);
  const [newNamespaceName, setNewNamespaceName] = useState("");
  const [newNamespaceDescription, setNewNamespaceDescription] = useState("");

  // Use real data from React Query hooks
  const { data: namespaces = [] } = useNamespaces();
  const { data: documents = [] } = useDocuments(
    selectedNamespace === "all" || !selectedNamespace
      ? undefined
      : selectedNamespace
  );
  const uploadMutation = useUploadDocument();
  const createNamespaceMutation = useCreateNamespace();
  const currentNamespace = namespaces.find(
    (ns) => ns.name === selectedNamespace
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

  const handleCreateNamespace = async () => {
    if (newNamespaceName.trim()) {
      try {
        const newNamespace = await createNamespaceMutation.mutateAsync({
          name: newNamespaceName.trim(),
          description: newNamespaceDescription.trim() || undefined,
        });
        setNewNamespaceName("");
        setNewNamespaceDescription("");
        setShowCreateNamespaceModal(false);
        setSelectedNamespace(newNamespace.name);
      } catch (error) {
        console.error("Failed to create namespace:", error);
      }
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-black uppercase tracking-tight flex items-center gap-2">
                  <span className="inline-block w-4 h-4 bg-[#00FFFF] border-2 border-black"></span>
                  SELECT NAMESPACE
                </h2>
                <Button
                  variant="primary"
                  leftIcon={<PlusIcon size={16} />}
                  onClick={() => setShowCreateNamespaceModal(true)}
                >
                  NEW
                </Button>
              </div>
              <Select
                options={namespaces.map((ns) => ({
                  value: ns.name,
                  label: `${ns.name} (${ns.document_count} documents)`,
                }))}
                value={selectedNamespace}
                onChange={setSelectedNamespace}
                placeholder="Select a namespace"
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
              <Link
                href={`/chat?namespace=${encodeURIComponent(
                  selectedNamespace
                )}&mode=${chatMode}${
                  chatMode === "single" && selectedDocuments.length === 1
                    ? `&documentId=${encodeURIComponent(selectedDocuments[0])}`
                    : ""
                }${
                  chatMode === "multi" && selectedDocuments.length > 0
                    ? `&documentIds=${encodeURIComponent(
                        selectedDocuments.join(",")
                      )}`
                    : ""
                }`}
              >
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
        currentNamespace={currentNamespace?.name}
        uploadProgress={uploadMutation.uploadProgress}
      />

      {/* Create Namespace Modal */}
      {showCreateNamespaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="bg-white border-4 border-black max-w-md w-full animate-slideInUp"
            style={{ boxShadow: "8px 8px 0px #000000" }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-[#00FFFF] border-b-4 border-black">
              <h2 className="text-xl font-black text-black uppercase tracking-tight flex items-center gap-2">
                <FolderIcon size={24} />
                CREATE NAMESPACE
              </h2>
              <button
                onClick={() => {
                  setShowCreateNamespaceModal(false);
                  setNewNamespaceName("");
                  setNewNamespaceDescription("");
                }}
                className="w-10 h-10 bg-black text-white flex items-center justify-center hover:bg-[#FF006E] transition-colors border-2 border-black"
              >
                <XIcon size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 bg-[#FFFEF0] space-y-4">
              <Input
                label="Namespace Name"
                placeholder="e.g., medical-docs, research-papers"
                value={newNamespaceName}
                onChange={(e) => setNewNamespaceName(e.target.value)}
                required
              />
              <Input
                label="Description (Optional)"
                placeholder="Brief description of this namespace"
                value={newNamespaceDescription}
                onChange={(e) => setNewNamespaceDescription(e.target.value)}
              />
              <p className="text-xs font-bold text-black/60">
                Namespaces help organize your documents into collections.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 bg-white border-t-4 border-black">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCreateNamespaceModal(false);
                  setNewNamespaceName("");
                  setNewNamespaceDescription("");
                }}
              >
                CANCEL
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateNamespace}
                disabled={
                  !newNamespaceName.trim() || createNamespaceMutation.isPending
                }
                leftIcon={<PlusIcon size={16} />}
              >
                {createNamespaceMutation.isPending ? "CREATING..." : "CREATE"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
