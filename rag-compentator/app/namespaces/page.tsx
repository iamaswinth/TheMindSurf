"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/ui/Sidebar";
import { Card, Button, Input, EmptyState } from "@/components/ui/Components";
import { Namespace } from "@/lib/types";
import {
  MenuIcon,
  PlusIcon,
  FolderIcon,
  TrashIcon,
  SearchIcon,
  XIcon,
} from "@/components/ui/Icons";
import { formatDate } from "@/lib/api";
import {
  useNamespaces,
  useCreateNamespace,
  useDeleteNamespace,
} from "@/lib/hooks/use-namespaces";
import Link from "next/link";

// Color palette for namespace cards
const cardColors = ["cyan", "lime", "pink", "yellow", "white"] as const;

export default function NamespacesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newNamespaceName, setNewNamespaceName] = useState("");
  const [newNamespaceDescription, setNewNamespaceDescription] = useState("");
  const [deletingNamespaceId, setDeletingNamespaceId] = useState<string | null>(
    null
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [namespaceToDelete, setNamespaceToDelete] = useState<Namespace | null>(
    null
  );
  const [deleteConfirmationName, setDeleteConfirmationName] = useState("");

  // Use real React Query hooks
  const { data: namespaces = [], isLoading, error } = useNamespaces();
  const createMutation = useCreateNamespace();
  const deleteMutation = useDeleteNamespace();

  const filteredNamespaces = namespaces.filter((ns) =>
    ns.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateNamespace = async () => {
    if (newNamespaceName.trim()) {
      try {
        await createMutation.mutateAsync({
          name: newNamespaceName.trim(),
          description: newNamespaceDescription.trim() || undefined,
        });
        setNewNamespaceName("");
        setNewNamespaceDescription("");
        setShowCreateModal(false);
      } catch (error) {
        console.error("Failed to create namespace:", error);
      }
    }
  };

  const handleDeleteNamespace = async (nsId: string, nsName: string) => {
    const namespace = namespaces.find((ns) => ns.id === nsId);
    if (namespace) {
      setNamespaceToDelete(namespace);
      setShowDeleteModal(true);
    }
  };

  const confirmDeleteNamespace = async () => {
    if (!namespaceToDelete) return;

    if (deleteConfirmationName !== namespaceToDelete.name) {
      alert("Namespace name does not match. Please try again.");
      return;
    }

    try {
      setDeletingNamespaceId(namespaceToDelete.id);
      await deleteMutation.mutateAsync(namespaceToDelete.id);
      setDeletingNamespaceId(null);
      setShowDeleteModal(false);
      setNamespaceToDelete(null);
      setDeleteConfirmationName("");
    } catch (error) {
      console.error("Failed to delete namespace:", error);
      setDeletingNamespaceId(null);
    }
  };

  return (
    <div className="flex h-screen bg-[#FFFEF0]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Neo-Brutalist Header */}
        <header
          className="h-16 md:h-20 bg-[#CCFF00] border-b-4 border-black flex items-center justify-between px-3 md:px-6"
          style={{ boxShadow: "0 4px 0px #000000" }}
        >
          <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden w-10 h-10 md:w-12 md:h-12 bg-black text-white flex items-center justify-center border-4 border-black hover:bg-[#FF006E] transition-colors shrink-0"
            >
              <MenuIcon size={20} />
            </button>
            <h1 className="text-lg md:text-2xl font-black text-black uppercase tracking-tight truncate">
              📁 NAMESPACES
            </h1>
          </div>
          <div className="shrink-0">
            <div className="hidden sm:block">
              <Button
                variant="primary"
                leftIcon={<PlusIcon size={16} />}
                onClick={() => setShowCreateModal(true)}
              >
                CREATE NAMESPACE
              </Button>
            </div>
            <div className="block sm:hidden">
              <Button
                variant="primary"
                leftIcon={<PlusIcon size={16} />}
                onClick={() => setShowCreateModal(true)}
                size="sm"
              >
                NEW
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-3 md:p-6">
          <div className="max-w-5xl mx-auto space-y-4 md:space-y-6">
            {/* Search */}
            <div
              className="bg-white border-4 border-black p-3 md:p-4"
              style={{ boxShadow: "6px 6px 0px #000000" }}
            >
              <Input
                placeholder="SEARCH NAMESPACES..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<SearchIcon size={18} />}
              />
            </div>

            {/* Loading State */}
            {isLoading && (
              <Card color="white" className="p-6 md:p-8 text-center">
                <div className="inline-block w-10 h-10 md:w-12 md:h-12 border-4 border-black border-t-[#FFFF00] rounded-full animate-spin mb-3 md:mb-4" />
                <p className="text-black font-bold uppercase text-sm md:text-base">
                  Loading namespaces...
                </p>
              </Card>
            )}

            {/* Error State */}
            {error && (
              <Card color="white" className="p-6 md:p-8">
                <div className="text-center">
                  <p className="text-[#FF006E] font-black text-base md:text-lg uppercase mb-2">
                    ⚠️ ERROR
                  </p>
                  <p className="text-black font-bold text-sm md:text-base">
                    {error.message || "Failed to load namespaces"}
                  </p>
                </div>
              </Card>
            )}

            {/* Namespaces Grid */}
            {!isLoading && !error && filteredNamespaces.length === 0 ? (
              <Card color="white" className="p-6 md:p-8">
                <EmptyState
                  icon={<FolderIcon size={48} />}
                  title="NO NAMESPACES FOUND"
                  description={
                    searchQuery
                      ? "TRY A DIFFERENT SEARCH TERM"
                      : "CREATE YOUR FIRST NAMESPACE TO ORGANIZE YOUR DOCUMENTS"
                  }
                  action={
                    !searchQuery && (
                      <Button
                        variant="primary"
                        leftIcon={<PlusIcon size={16} />}
                        onClick={() => setShowCreateModal(true)}
                        className="w-full sm:w-auto"
                      >
                        CREATE NAMESPACE
                      </Button>
                    )
                  }
                />
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {filteredNamespaces.map((ns, index) => (
                  <Card
                    key={ns.id}
                    color={cardColors[index % cardColors.length]}
                    className="p-0 overflow-hidden"
                  >
                    <div className="p-4 md:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                          <div
                            className="w-10 h-10 md:w-12 md:h-12 bg-black flex items-center justify-center border-2 border-black shrink-0"
                            style={{ boxShadow: "3px 3px 0px rgba(0,0,0,0.3)" }}
                          >
                            <FolderIcon
                              size={20}
                              className="md:w-6 md:h-6 text-[#FFFF00]"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-black text-black text-base md:text-lg uppercase truncate">
                              {ns.name}
                            </h3>
                            {ns.description && (
                              <p className="text-xs font-bold text-black/60 mt-1 line-clamp-2">
                                {ns.description}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-1.5 md:gap-2 mt-1.5">
                              <p className="inline-block px-2 py-0.5 bg-white border-2 border-black text-xs font-bold">
                                {ns.document_count} DOCS
                              </p>
                              {ns.total_chunks !== undefined && (
                                <span className="inline-block px-2 py-0.5 bg-[#00FFFF] border-2 border-black text-xs font-bold">
                                  {ns.total_chunks} CHUNKS
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteNamespace(ns.id, ns.name)}
                          disabled={deleteMutation.isPending}
                          className="w-9 h-9 md:w-10 md:h-10 bg-[#FF006E] text-white flex items-center justify-center border-2 border-black hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                          style={{ boxShadow: "2px 2px 0px #000000" }}
                          title={
                            deletingNamespaceId === ns.id
                              ? "Deleting..."
                              : "Delete namespace"
                          }
                        >
                          {deletingNamespaceId === ns.id ? (
                            <div className="w-3 h-3 md:w-4 md:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <TrashIcon size={14} className="md:w-4 md:h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="px-4 md:px-5 py-3 md:py-4 border-t-4 border-black bg-white/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                      <span className="text-xs font-bold text-black/60 uppercase">
                        {formatDate(ns.created_at)}
                      </span>
                      <Link
                        href={`/chat?namespace=${encodeURIComponent(
                          ns.name
                        )}&mode=namespace`}
                        className="w-full sm:w-auto"
                      >
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full sm:w-auto"
                        >
                          <span className="hidden sm:inline">💬 CHAT →</span>
                          <span className="sm:hidden">💬 CHAT</span>
                        </Button>
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Neo-Brutalist Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 md:p-4">
          <div
            className="bg-white border-4 border-black max-w-md w-full animate-slideInUp max-h-[90vh] overflow-y-auto"
            style={{ boxShadow: "8px 8px 0px #000000" }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-[#CCFF00] border-b-4 border-black">
              <h2 className="text-base md:text-xl font-black text-black uppercase tracking-tight min-w-0 flex-1">
                <span className="truncate">📁 CREATE NAMESPACE</span>
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-9 h-9 md:w-10 md:h-10 bg-black text-white flex items-center justify-center hover:bg-[#FF006E] transition-colors border-2 border-black shrink-0 ml-2"
              >
                <XIcon size={18} className="md:w-5 md:h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 md:p-6 bg-[#FFFEF0] space-y-4">
              <div>
                <label className="block text-xs md:text-sm font-black text-black uppercase tracking-wide mb-2">
                  NAMESPACE NAME *
                </label>
                <Input
                  placeholder="e.g., ml_basics, research_papers"
                  value={newNamespaceName}
                  onChange={(e) => setNewNamespaceName(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs md:text-sm font-black text-black uppercase tracking-wide mb-2">
                  DESCRIPTION (OPTIONAL)
                </label>
                <Input
                  placeholder="Brief description of this namespace"
                  value={newNamespaceDescription}
                  onChange={(e) => setNewNamespaceDescription(e.target.value)}
                />
              </div>

              <p
                className="p-2.5 md:p-3 bg-[#00FFFF] border-2 border-black text-xs md:text-sm font-bold text-black"
                style={{ boxShadow: "2px 2px 0px #000000" }}
              >
                💡 NAMESPACES HELP YOU ORGANIZE DOCUMENTS BY PROJECT OR TOPIC.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 px-4 md:px-6 py-3 md:py-4 bg-white border-t-4 border-black">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCreateModal(false);
                  setNewNamespaceName("");
                  setNewNamespaceDescription("");
                }}
                disabled={createMutation.isPending}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                CANCEL
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateNamespace}
                disabled={!newNamespaceName.trim() || createMutation.isPending}
                className="w-full sm:w-auto order-1 sm:order-2"
              >
                {createMutation.isPending ? "CREATING..." : "CREATE"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Namespace Confirmation Modal */}
      {showDeleteModal && namespaceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 md:p-4">
          <div
            className="bg-white border-4 border-black max-w-md w-full animate-slideInUp max-h-[90vh] overflow-y-auto"
            style={{ boxShadow: "8px 8px 0px #000000" }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-[#FF006E] border-b-4 border-black">
              <h2 className="text-base md:text-xl font-black text-white uppercase tracking-tight min-w-0 flex-1">
                <span className="truncate">⚠️ DELETE NAMESPACE</span>
              </h2>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setNamespaceToDelete(null);
                  setDeleteConfirmationName("");
                }}
                className="w-9 h-9 md:w-10 md:h-10 bg-black text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors border-2 border-black shrink-0 ml-2"
              >
                <XIcon size={18} className="md:w-5 md:h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 md:p-6 bg-[#FFFEF0] space-y-4">
              <div
                className="p-3 md:p-4 bg-[#FFFF00] border-4 border-black"
                style={{ boxShadow: "4px 4px 0px #000000" }}
              >
                <p className="text-xs md:text-sm font-black text-black uppercase mb-2">
                  ⚠️ WARNING: THIS ACTION CANNOT BE UNDONE
                </p>
                <p className="text-xs md:text-sm font-bold text-black">
                  This will permanently delete all documents and vectors in this
                  namespace.
                </p>
              </div>

              <div>
                <p className="text-xs md:text-sm font-bold text-black mb-3 md:mb-4">
                  To confirm deletion, please type the namespace name:
                </p>
                <div
                  className="p-2.5 md:p-3 bg-[#00FFFF] border-2 border-black mb-3 md:mb-4"
                  style={{ boxShadow: "2px 2px 0px #000000" }}
                >
                  <p className="text-base md:text-lg font-black text-black text-center break-words">
                    {namespaceToDelete.name}
                  </p>
                </div>
                <Input
                  placeholder="Type namespace name to confirm"
                  value={deleteConfirmationName}
                  onChange={(e) => setDeleteConfirmationName(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 px-4 md:px-6 py-3 md:py-4 bg-white border-t-4 border-black">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowDeleteModal(false);
                  setNamespaceToDelete(null);
                  setDeleteConfirmationName("");
                }}
                disabled={deletingNamespaceId === namespaceToDelete.id}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                CANCEL
              </Button>
              <Button
                variant="primary"
                onClick={confirmDeleteNamespace}
                disabled={
                  deleteConfirmationName !== namespaceToDelete.name ||
                  deletingNamespaceId === namespaceToDelete.id
                }
                className="bg-[#FF006E] hover:bg-black w-full sm:w-auto order-1 sm:order-2"
              >
                {deletingNamespaceId === namespaceToDelete.id
                  ? "DELETING..."
                  : "DELETE NAMESPACE"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
