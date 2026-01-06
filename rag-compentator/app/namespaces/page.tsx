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
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
          className="h-20 bg-[#CCFF00] border-b-4 border-black flex items-center justify-between px-6"
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
              📁 NAMESPACES
            </h1>
          </div>
          <Button
            variant="primary"
            leftIcon={<PlusIcon size={16} />}
            onClick={() => setShowCreateModal(true)}
          >
            CREATE NAMESPACE
          </Button>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Search */}
            <div
              className="bg-white border-4 border-black p-4"
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
              <Card variant="white" className="p-8 text-center">
                <div className="inline-block w-12 h-12 border-4 border-black border-t-[#FFFF00] rounded-full animate-spin mb-4" />
                <p className="text-black font-bold uppercase">
                  Loading namespaces...
                </p>
              </Card>
            )}

            {/* Error State */}
            {error && (
              <Card variant="white" className="p-8">
                <div className="text-center">
                  <p className="text-[#FF006E] font-black text-lg uppercase mb-2">
                    ⚠️ ERROR
                  </p>
                  <p className="text-black font-bold">
                    {error.message || "Failed to load namespaces"}
                  </p>
                </div>
              </Card>
            )}

            {/* Namespaces Grid */}
            {!isLoading && !error && filteredNamespaces.length === 0 ? (
              <Card variant="white" className="p-8">
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
                      >
                        CREATE NAMESPACE
                      </Button>
                    )
                  }
                />
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredNamespaces.map((ns, index) => (
                  <Card
                    key={ns.id}
                    variant={cardColors[index % cardColors.length]}
                    className="p-0 overflow-hidden"
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-12 h-12 bg-black flex items-center justify-center border-2 border-black"
                            style={{ boxShadow: "3px 3px 0px rgba(0,0,0,0.3)" }}
                          >
                            <FolderIcon size={24} className="text-[#FFFF00]" />
                          </div>
                          <div>
                            <h3 className="font-black text-black text-lg uppercase">
                              {ns.name}
                            </h3>
                            {ns.description && (
                              <p className="text-xs font-bold text-black/60 mt-1">
                                {ns.description}
                              </p>
                            )}
                            <p className="inline-block mt-1 px-2 py-0.5 bg-white border-2 border-black text-xs font-bold">
                              {ns.document_count} DOCS
                            </p>
                            {ns.total_chunks !== undefined && (
                              <span className="ml-2 inline-block px-2 py-0.5 bg-[#00FFFF] border-2 border-black text-xs font-bold">
                                {ns.total_chunks} CHUNKS
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteNamespace(ns.id, ns.name)}
                          disabled={deleteMutation.isPending}
                          className="w-10 h-10 bg-[#FF006E] text-white flex items-center justify-center border-2 border-black hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ boxShadow: "2px 2px 0px #000000" }}
                          title={
                            deletingNamespaceId === ns.id
                              ? "Deleting..."
                              : "Delete namespace"
                          }
                        >
                          {deletingNamespaceId === ns.id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <TrashIcon size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="px-5 py-4 border-t-4 border-black bg-white/50 flex items-center justify-between">
                      <span className="text-xs font-bold text-black/60 uppercase">
                        {formatDate(ns.created_at)}
                      </span>
                      <Link
                        href={`/chat?namespace=${encodeURIComponent(
                          ns.name
                        )}&mode=namespace`}
                      >
                        <Button variant="secondary" size="sm">
                          💬 CHAT →
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div
            className="bg-white border-4 border-black max-w-md w-full mx-4 animate-slideInUp"
            style={{ boxShadow: "8px 8px 0px #000000" }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-[#CCFF00] border-b-4 border-black">
              <h2 className="text-xl font-black text-black uppercase tracking-tight">
                📁 CREATE NAMESPACE
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-10 h-10 bg-black text-white flex items-center justify-center hover:bg-[#FF006E] transition-colors border-2 border-black"
              >
                <XIcon size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 bg-[#FFFEF0] space-y-4">
              <div>
                <label className="block text-sm font-black text-black uppercase tracking-wide mb-2">
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
                <label className="block text-sm font-black text-black uppercase tracking-wide mb-2">
                  DESCRIPTION (OPTIONAL)
                </label>
                <Input
                  placeholder="Brief description of this namespace"
                  value={newNamespaceDescription}
                  onChange={(e) => setNewNamespaceDescription(e.target.value)}
                />
              </div>

              <p
                className="p-3 bg-[#00FFFF] border-2 border-black text-sm font-bold text-black"
                style={{ boxShadow: "2px 2px 0px #000000" }}
              >
                💡 NAMESPACES HELP YOU ORGANIZE DOCUMENTS BY PROJECT OR TOPIC.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 bg-white border-t-4 border-black">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCreateModal(false);
                  setNewNamespaceName("");
                  setNewNamespaceDescription("");
                }}
                disabled={createMutation.isPending}
              >
                CANCEL
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateNamespace}
                disabled={!newNamespaceName.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? "CREATING..." : "CREATE"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Namespace Confirmation Modal */}
      {showDeleteModal && namespaceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div
            className="bg-white border-4 border-black max-w-md w-full mx-4 animate-slideInUp"
            style={{ boxShadow: "8px 8px 0px #000000" }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-[#FF006E] border-b-4 border-black">
              <h2 className="text-xl font-black text-white uppercase tracking-tight">
                ⚠️ DELETE NAMESPACE
              </h2>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setNamespaceToDelete(null);
                  setDeleteConfirmationName("");
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
                  This will permanently delete all documents and vectors in this
                  namespace.
                </p>
              </div>

              <div>
                <p className="text-sm font-bold text-black mb-4">
                  To confirm deletion, please type the namespace name:
                </p>
                <div
                  className="p-3 bg-[#00FFFF] border-2 border-black mb-4"
                  style={{ boxShadow: "2px 2px 0px #000000" }}
                >
                  <p className="text-lg font-black text-black text-center">
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
            <div className="flex justify-end gap-3 px-6 py-4 bg-white border-t-4 border-black">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowDeleteModal(false);
                  setNamespaceToDelete(null);
                  setDeleteConfirmationName("");
                }}
                disabled={deletingNamespaceId === namespaceToDelete.id}
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
                className="bg-[#FF006E] hover:bg-black"
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
