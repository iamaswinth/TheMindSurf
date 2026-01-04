"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/ui/Sidebar";
import { Card, Button, Input, EmptyState } from "@/components/ui/Components";
import {
  MenuIcon,
  PlusIcon,
  FolderIcon,
  TrashIcon,
  SearchIcon,
  XIcon,
} from "@/components/ui/Icons";
import { Namespace } from "@/lib/types";
import { formatDate } from "@/lib/api";
import Link from "next/link";

// Mock data
const mockNamespaces: Namespace[] = [
  { id: "ns1", name: "cn_unit5", documentCount: 5, createdAt: "2025-12-01" },
  { id: "ns2", name: "ml_basics", documentCount: 3, createdAt: "2025-12-15" },
  {
    id: "ns3",
    name: "research_papers",
    documentCount: 8,
    createdAt: "2025-12-20",
  },
  {
    id: "ns4",
    name: "project_docs",
    documentCount: 12,
    createdAt: "2025-01-01",
  },
];

// Color palette for namespace cards
const cardColors = ["cyan", "lime", "pink", "yellow", "white"] as const;

export default function NamespacesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newNamespaceName, setNewNamespaceName] = useState("");
  const [namespaces, setNamespaces] = useState(mockNamespaces);

  const filteredNamespaces = namespaces.filter((ns) =>
    ns.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateNamespace = () => {
    if (newNamespaceName.trim()) {
      const newNs: Namespace = {
        id: `ns${Date.now()}`,
        name: newNamespaceName.trim(),
        documentCount: 0,
        createdAt: new Date().toISOString(),
      };
      setNamespaces([newNs, ...namespaces]);
      setNewNamespaceName("");
      setShowCreateModal(false);
    }
  };

  const handleDeleteNamespace = (nsId: string) => {
    if (
      confirm(
        "Are you sure you want to delete this namespace? All documents will be removed."
      )
    ) {
      setNamespaces(namespaces.filter((ns) => ns.id !== nsId));
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

            {/* Namespaces Grid */}
            {filteredNamespaces.length === 0 ? (
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
                            <p className="inline-block mt-1 px-2 py-0.5 bg-white border-2 border-black text-xs font-bold">
                              {ns.documentCount} DOCS
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteNamespace(ns.id)}
                          className="w-10 h-10 bg-[#FF006E] text-white flex items-center justify-center border-2 border-black hover:bg-black transition-colors"
                          style={{ boxShadow: "2px 2px 0px #000000" }}
                        >
                          <TrashIcon size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="px-5 py-4 border-t-4 border-black bg-white/50 flex items-center justify-between">
                      <span className="text-xs font-bold text-black/60 uppercase">
                        {formatDate(ns.createdAt)}
                      </span>
                      <Link href={`/chat?namespace=${ns.id}`}>
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
            <div className="p-6 bg-[#FFFEF0]">
              <label className="block text-sm font-black text-black uppercase tracking-wide mb-2">
                NAMESPACE NAME
              </label>
              <Input
                placeholder="Enter a name for your namespace"
                value={newNamespaceName}
                onChange={(e) => setNewNamespaceName(e.target.value)}
                autoFocus
              />
              <p
                className="mt-4 p-3 bg-[#00FFFF] border-2 border-black text-sm font-bold text-black"
                style={{ boxShadow: "2px 2px 0px #000000" }}
              >
                💡 NAMESPACES HELP YOU ORGANIZE DOCUMENTS BY PROJECT OR TOPIC.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 bg-white border-t-4 border-black">
              <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
                CANCEL
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateNamespace}
                disabled={!newNamespaceName.trim()}
              >
                CREATE →
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
