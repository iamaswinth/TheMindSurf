"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/ui/Sidebar";
import { UploadModal } from "@/components/ui/UploadModal";
import {
  Card,
  Button,
  Input,
  EmptyState,
  Badge,
} from "@/components/ui/Components";
import {
  MenuIcon,
  PlusIcon,
  FileTextIcon,
  TrashIcon,
  SearchIcon,
  XIcon,
} from "@/components/ui/Icons";
import { Document, Namespace, UploadSettings } from "@/lib/types";
import { formatDate } from "@/lib/api";
import { useNamespaces } from "@/lib/hooks/use-namespaces";
import {
  useDocuments,
  useUploadDocument,
  useDeleteDocument,
} from "@/lib/hooks/use-documents";
import Link from "next/link";

export default function DocumentsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNamespace, setSelectedNamespace] = useState<string>("all");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(
    null
  );

  // Use real data from React Query hooks
  const { data: namespaces = [], isLoading: namespacesLoading } =
    useNamespaces();
  const { data: documents = [], isLoading: documentsLoading } = useDocuments(
    selectedNamespace === "all" ? undefined : selectedNamespace
  );
  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesNamespace =
      selectedNamespace === "all" || doc.namespace === selectedNamespace;
    return matchesSearch && matchesNamespace;
  });

  const handleUpload = async (file: File, settings: UploadSettings) => {
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

  const handleDeleteDocument = async (docId: string) => {
    const document = documents.find((doc) => doc.id === docId);
    if (!document) return;

    setDocumentToDelete(document);
    setShowDeleteModal(true);
  };

  const confirmDeleteDocument = async () => {
    if (!documentToDelete) return;

    try {
      await deleteMutation.mutateAsync(documentToDelete.id);
      setShowDeleteModal(false);
      setDocumentToDelete(null);
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete document. Please try again.");
    }
  };

  const getNamespaceName = (nsId: string) => {
    return namespaces.find((ns) => ns.id === nsId)?.name || nsId;
  };

  return (
    <div className="flex h-screen bg-[#FFFEF0]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Neo-Brutalist Header */}
        <header
          className="h-20 bg-[#00FFFF] border-b-4 border-black flex items-center justify-between px-6"
          style={{ boxShadow: "0 4px 0px #000000" }}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden w-12 h-12 bg-black text-white flex items-center justify-center border-4 border-black hover:bg-[#FF006E] transition-colors"
            >
              <MenuIcon size={20} />
            </button>
            <h1 className="text-2xl font-black text-black uppercase tracking-tight">
              📄 DOCUMENTS
            </h1>
          </div>
          <Button
            variant="primary"
            leftIcon={<PlusIcon size={16} />}
            onClick={() => setShowUploadModal(true)}
          >
            UPLOAD DOCUMENT
          </Button>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Neo-Brutalist Filters */}
            <div
              className="flex flex-col sm:flex-row gap-4 p-4 bg-white border-4 border-black"
              style={{ boxShadow: "6px 6px 0px #000000" }}
            >
              <div className="flex-1">
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<SearchIcon size={18} />}
                />
              </div>
              <select
                value={selectedNamespace}
                onChange={(e) => setSelectedNamespace(e.target.value)}
                className="px-4 py-3 border-4 border-black bg-[#FFFF00] text-black font-bold focus:outline-none appearance-none cursor-pointer"
                style={{
                  boxShadow: "4px 4px 0px #000000",
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='black' stroke-width='3'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 12px center",
                  backgroundSize: "20px",
                  paddingRight: "48px",
                }}
              >
                <option value="all">ALL NAMESPACES</option>
                {namespaces.map((ns) => (
                  <option key={ns.id} value={ns.id}>
                    {ns.name.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Documents Table */}
            {filteredDocuments.length === 0 ? (
              <Card color="white" className="p-8">
                <EmptyState
                  icon={<FileTextIcon size={48} />}
                  title="NO DOCUMENTS FOUND"
                  description={
                    searchQuery || selectedNamespace !== "all"
                      ? "TRY ADJUSTING YOUR FILTERS"
                      : "UPLOAD YOUR FIRST DOCUMENT TO GET STARTED"
                  }
                  action={
                    !searchQuery &&
                    selectedNamespace === "all" && (
                      <Button
                        variant="primary"
                        leftIcon={<PlusIcon size={16} />}
                        onClick={() => setShowUploadModal(true)}
                      >
                        UPLOAD DOCUMENT
                      </Button>
                    )
                  }
                />
              </Card>
            ) : (
              <div
                className="bg-white border-4 border-black overflow-hidden"
                style={{ boxShadow: "8px 8px 0px #000000" }}
              >
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#FFFF00] border-b-4 border-black">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-black text-black uppercase tracking-wider">
                          DOCUMENT
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-black text-black uppercase tracking-wider">
                          NAMESPACE
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-black text-black uppercase tracking-wider">
                          PAGES
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-black text-black uppercase tracking-wider">
                          SIZE
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-black text-black uppercase tracking-wider">
                          UPLOADED
                        </th>
                        <th className="px-6 py-4 text-right text-sm font-black text-black uppercase tracking-wider">
                          ACTIONS
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-black">
                      {filteredDocuments.map((doc) => (
                        <tr
                          key={doc.id}
                          className="hover:bg-[#FFFEF0] transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-10 h-10 bg-[#00FFFF] border-2 border-black flex items-center justify-center"
                                style={{ boxShadow: "2px 2px 0px #000000" }}
                              >
                                <FileTextIcon
                                  size={18}
                                  className="text-black"
                                />
                              </div>
                              <span className="text-sm font-bold text-black">
                                {doc.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant="info">
                              {getNamespaceName(doc.namespace).toUpperCase()}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-black">
                            {doc.page_count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-black">
                            {doc.file_size}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-black/70">
                            {formatDate(doc.uploaded_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/chat?namespace=${encodeURIComponent(
                                  doc.namespace
                                )}&mode=single&documentId=${encodeURIComponent(
                                  doc.id
                                )}`}
                              >
                                <Button variant="secondary" size="sm">
                                  💬 CHAT
                                </Button>
                              </Link>
                              <button
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="w-10 h-10 bg-[#FF006E] text-white flex items-center justify-center border-2 border-black hover:bg-black transition-colors"
                                style={{ boxShadow: "2px 2px 0px #000000" }}
                              >
                                <TrashIcon size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUpload}
        namespaces={namespaces}
        currentNamespace={
          selectedNamespace !== "all" ? selectedNamespace : undefined
        }
        uploadProgress={uploadMutation.uploadProgress}
      />

      {/* Delete Document Confirmation Modal */}
      {showDeleteModal && documentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div
            className="bg-white border-4 border-black max-w-md w-full mx-4 animate-slideInUp"
            style={{ boxShadow: "8px 8px 0px #000000" }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-[#FF006E] border-b-4 border-black">
              <h2 className="text-xl font-black text-white uppercase tracking-tight">
                ⚠️ DELETE DOCUMENT
              </h2>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDocumentToDelete(null);
                }}
                className="w-10 h-10 bg-black text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors border-2 border-black"
              >
                <XIcon size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 bg-[#FFFEF0] space-y-4">
              <div
                className="p-4 bg-[#FFFF00] border-4 border-black"
                style={{ boxShadow: "4px 4px 0px #000000" }}
              >
                <p className="text-sm font-black text-black uppercase mb-2">
                  ⚠️ WARNING: THIS ACTION CANNOT BE UNDONE
                </p>
                <p className="text-sm font-bold text-black">
                  This will permanently delete the document and all associated
                  vectors from Pinecone.
                </p>
              </div>

              <div
                className="p-4 bg-white border-2 border-black"
                style={{ boxShadow: "2px 2px 0px #000000" }}
              >
                <p className="text-xs font-black text-black uppercase mb-1">
                  DOCUMENT:
                </p>
                <p className="text-lg font-black text-black">
                  {documentToDelete.name}
                </p>
                <div className="mt-3 flex gap-2">
                  <Badge variant="info">
                    {getNamespaceName(documentToDelete.namespace).toUpperCase()}
                  </Badge>
                  <Badge variant="default">
                    {documentToDelete.page_count} PAGES
                  </Badge>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 bg-white border-t-4 border-black">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDocumentToDelete(null);
                }}
                disabled={deleteMutation.isPending}
              >
                CANCEL
              </Button>
              <Button
                variant="primary"
                onClick={confirmDeleteDocument}
                disabled={deleteMutation.isPending}
                className="bg-[#FF006E] hover:bg-black"
              >
                {deleteMutation.isPending ? "DELETING..." : "DELETE DOCUMENT"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
