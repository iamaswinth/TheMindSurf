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
} from "@/components/ui/Icons";
import { Document, Namespace, UploadSettings } from "@/lib/types";
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
    name: "Machine_Learning_Intro.pdf",
    pageCount: 56,
    fileSize: "3.1 MB",
    uploadedAt: "2024-12-20",
    namespace: "ns2",
  },
  {
    id: "doc5",
    name: "Neural_Networks.pdf",
    pageCount: 28,
    fileSize: "1.5 MB",
    uploadedAt: "2024-12-15",
    namespace: "ns2",
  },
];

export default function DocumentsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNamespace, setSelectedNamespace] = useState<string>("all");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [documents, setDocuments] = useState(mockDocuments);

  const namespaces = mockNamespaces;

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesNamespace =
      selectedNamespace === "all" || doc.namespace === selectedNamespace;
    return matchesSearch && matchesNamespace;
  });

  const handleDeleteDocument = (docId: string) => {
    if (confirm("Are you sure you want to delete this document?")) {
      setDocuments(documents.filter((doc) => doc.id !== docId));
    }
  };

  const handleUpload = async (
    file: File,
    settings: UploadSettings
  ) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const newDoc: Document = {
      id: `doc${Date.now()}`,
      name: file.name,
      pageCount: Math.floor(Math.random() * 50) + 10,
      fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      uploadedAt: new Date().toISOString(),
      namespace: settings.pinecone_namespace,
    };
    setDocuments([newDoc, ...documents]);
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
              <Card variant="white" className="p-8">
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
                            {doc.pageCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-black">
                            {doc.fileSize}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-black/70">
                            {formatDate(doc.uploadedAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link href={`/chat?document=${doc.id}`}>
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
      />
    </div>
  );
}
