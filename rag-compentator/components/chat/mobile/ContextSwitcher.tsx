"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChatMode, Namespace, Document } from "@/lib/types";
import {
  XIcon,
  ChevronDownIcon,
  SearchIcon,
  PlusIcon,
} from "@/components/ui/Icons";

interface ContextSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (config: {
    namespace: string;
    mode: ChatMode;
    selectedDocuments: string[];
  }) => void;
  namespaces: Namespace[];
  documents: Document[];
  currentNamespace: string;
  currentMode: ChatMode;
  currentSelectedDocuments: string[];
  onUploadClick?: () => void;
}

export const ContextSwitcher: React.FC<ContextSwitcherProps> = ({
  isOpen,
  onClose,
  onApply,
  namespaces,
  documents,
  currentNamespace,
  currentMode,
  currentSelectedDocuments,
  onUploadClick,
}) => {
  // Local state initialized from props - reset when modal opens
  const [selectedNamespace, setSelectedNamespace] = useState(currentNamespace);
  const [selectedMode, setSelectedMode] = useState<ChatMode>(currentMode);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>(
    currentSelectedDocuments
  );
  const [showNamespaceDropdown, setShowNamespaceDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [sheetHeight, setSheetHeight] = useState(75); // percentage
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(75);
  const sheetRef = useRef<HTMLDivElement>(null);
  const prevIsOpen = useRef(isOpen);

  // Reset state when modal opens (using ref to track previous value)
  useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      // Modal just opened
      setSelectedNamespace(currentNamespace);
      setSelectedMode(currentMode);
      setSelectedDocuments(currentSelectedDocuments);
      setSearchQuery("");
      setSheetHeight(75);
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, currentNamespace, currentMode, currentSelectedDocuments]);

  // Filter documents based on selected namespace and search
  const filteredDocuments = documents.filter(
    (doc) =>
      doc.namespace === selectedNamespace &&
      doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle document selection
  const handleDocumentToggle = (docId: string) => {
    if (selectedMode === "single") {
      setSelectedDocuments([docId]);
    } else if (selectedMode === "multi") {
      if (selectedDocuments.includes(docId)) {
        setSelectedDocuments(selectedDocuments.filter((id) => id !== docId));
      } else if (selectedDocuments.length < 5) {
        setSelectedDocuments([...selectedDocuments, docId]);
      }
    }
  };

  // Handle mode change
  const handleModeChange = (mode: ChatMode) => {
    setSelectedMode(mode);
    if (mode === "namespace") {
      setSelectedDocuments([]);
    } else if (mode === "single" && selectedDocuments.length > 1) {
      setSelectedDocuments([selectedDocuments[0]]);
    }
  };

  // Handle apply
  const handleApply = () => {
    onApply({
      namespace: selectedNamespace,
      mode: selectedMode,
      selectedDocuments,
    });
    onClose();
  };

  // Drag handle for bottom sheet
  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    setIsDragging(true);
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY;
    dragStartHeight.current = sheetHeight;
  };

  const handleDrag = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const deltaY = dragStartY.current - clientY;
    const deltaPercent = (deltaY / window.innerHeight) * 100;
    const newHeight = Math.min(
      90,
      Math.max(40, dragStartHeight.current + deltaPercent)
    );
    setSheetHeight(newHeight);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    // Snap to positions
    if (sheetHeight < 50) {
      onClose();
    } else if (sheetHeight < 70) {
      setSheetHeight(75);
    } else {
      setSheetHeight(85);
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end bg-black/50 transition-opacity duration-300"
      onClick={handleBackdropClick}
      onMouseMove={handleDrag}
      onMouseUp={handleDragEnd}
      onTouchMove={handleDrag}
      onTouchEnd={handleDragEnd}
    >
      <div
        ref={sheetRef}
        className="w-full bg-[#2C2C2C] rounded-t-2xl border-t-4 border-x-4 border-black shadow-[0_-4px_20px_rgba(0,0,0,0.3)] animate-slideInUp overflow-hidden flex flex-col"
        style={{ height: `${sheetHeight}vh` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle */}
        <div
          className="flex justify-center py-3 cursor-grab active:cursor-grabbing"
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        >
          <div className="w-10 h-1 bg-gray-500 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b-3 border-black/30">
          <h2 className="text-lg font-black text-white uppercase tracking-tight">
            Switch Context
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center bg-black/30 text-white rounded-lg active:bg-black/50 transition-colors"
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Namespace Selector */}
          <div>
            <label className="flex items-center gap-2 text-[#FFFF00] text-sm font-bold uppercase mb-3">
              📁 NAMESPACE
            </label>
            <div className="relative">
              <button
                onClick={() => setShowNamespaceDropdown(!showNamespaceDropdown)}
                className="w-full flex items-center justify-between px-4 py-3 bg-[#FFFF00] text-black font-bold uppercase text-sm border-3 border-black shadow-[3px_3px_0px_#000] active:shadow-[1px_1px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] transition-all"
              >
                <span>
                  {namespaces.find((ns) => ns.name === selectedNamespace)
                    ?.name || "SELECT NAMESPACE"}
                </span>
                <ChevronDownIcon
                  size={18}
                  className={`transition-transform ${
                    showNamespaceDropdown ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showNamespaceDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border-3 border-black shadow-[4px_4px_0px_#000] z-10 max-h-48 overflow-y-auto">
                  {namespaces.map((ns) => (
                    <button
                      key={ns.id}
                      onClick={() => {
                        setSelectedNamespace(ns.name);
                        setShowNamespaceDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-3 text-sm font-bold uppercase border-b-2 border-black last:border-b-0 transition-colors ${
                        ns.name === selectedNamespace
                          ? "bg-[#FF006E] text-white"
                          : "text-black hover:bg-[#FFFF00]"
                      }`}
                    >
                      {ns.name}
                      <span className="ml-2 text-xs opacity-70">
                        ({ns.document_count} docs)
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mode Selector */}
          <div>
            <label className="flex items-center gap-2 text-[#FFFF00] text-sm font-bold uppercase mb-3">
              🎯 MODE
            </label>
            <div className="space-y-2">
              {[
                {
                  id: "namespace" as ChatMode,
                  label: `ALL DOCS (${documents.length})`,
                  color: "#00FFFF",
                },
                {
                  id: "single" as ChatMode,
                  label: "SINGLE DOC",
                  color: "#CCFF00",
                },
                {
                  id: "multi" as ChatMode,
                  label: "MULTI-DOC",
                  color: "#FF006E",
                },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleModeChange(option.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 border-3 border-black font-bold uppercase text-sm transition-all ${
                    selectedMode === option.id
                      ? "shadow-[3px_3px_0px_#000] text-black"
                      : "bg-white/10 text-white border-white/30 hover:border-black hover:bg-white/20"
                  }`}
                  style={{
                    backgroundColor:
                      selectedMode === option.id ? option.color : undefined,
                  }}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedMode === option.id
                        ? "border-black bg-black"
                        : "border-white"
                    }`}
                  >
                    {selectedMode === option.id && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Document Selector/List */}
          <div>
            <label className="flex items-center gap-2 text-[#FFFF00] text-sm font-bold uppercase mb-3">
              📄{" "}
              {selectedMode === "namespace"
                ? `DOCUMENTS (${filteredDocuments.length})`
                : `SELECT DOC${selectedMode === "multi" ? "S" : ""}`}
              {selectedMode === "multi" && (
                <span className="text-xs text-white/60 normal-case">
                  (max 5)
                </span>
              )}
            </label>

            {/* Search Bar (show if more than 5 docs) */}
            {documents.length > 5 && (
              <div className="relative mb-3">
                <SearchIcon
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-black/50"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search documents..."
                  className="w-full pl-10 pr-10 py-3 bg-white border-3 border-black text-black font-semibold placeholder:text-black/40 placeholder:font-bold shadow-[2px_2px_0px_#000] focus:outline-none focus:shadow-[4px_4px_0px_#000]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-black/50 hover:text-black"
                  >
                    <XIcon size={16} />
                  </button>
                )}
              </div>
            )}

            {/* Document List */}
            <div className="max-h-48 overflow-y-auto bg-white/5 border-3 border-white/20 rounded-lg">
              {filteredDocuments.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="text-3xl mb-2">📄</div>
                  <p className="text-white/60 font-bold text-sm uppercase">
                    {searchQuery
                      ? "No documents found"
                      : "No documents in this namespace"}
                  </p>
                </div>
              ) : (
                filteredDocuments.map((doc) => {
                  const isSelected = selectedDocuments.includes(doc.id);

                  // For namespace mode, show as read-only list
                  if (selectedMode === "namespace") {
                    return (
                      <div
                        key={doc.id}
                        className="flex items-center gap-3 px-4 py-3 text-left border-b border-white/10 last:border-b-0 text-white/80"
                      >
                        <span className="text-lg">📄</span>
                        <span className="flex-1 font-semibold text-sm truncate">
                          {doc.name}
                        </span>
                      </div>
                    );
                  }

                  // For single/multi mode, show as selectable
                  return (
                    <button
                      key={doc.id}
                      onClick={() => handleDocumentToggle(doc.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-white/10 last:border-b-0 transition-colors ${
                        isSelected
                          ? "bg-[#FF006E]/20 text-white"
                          : "text-white/80 hover:bg-white/10"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
                          selectedMode === "single"
                            ? "rounded-full"
                            : "rounded-sm"
                        } ${
                          isSelected
                            ? "border-[#FF006E] bg-[#FF006E]"
                            : "border-white/50"
                        }`}
                      >
                        {isSelected &&
                          (selectedMode === "single" ? (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          ) : (
                            <span className="text-white text-xs font-bold">
                              ✓
                            </span>
                          ))}
                      </div>
                      <span className="flex-1 font-semibold text-sm truncate">
                        {doc.name}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Upload Button */}
          {onUploadClick && (
            <button
              onClick={() => {
                onClose();
                onUploadClick();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#FFFF00] text-black font-black uppercase text-sm border-3 border-black shadow-[3px_3px_0px_#000] active:shadow-[1px_1px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] transition-all"
            >
              <PlusIcon size={18} />
              Upload New Document
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t-3 border-black/30 bg-[#1A1A1A]">
          <button
            onClick={handleApply}
            disabled={
              (selectedMode !== "namespace" &&
                selectedDocuments.length === 0) ||
              (selectedMode === "namespace" && filteredDocuments.length === 0)
            }
            className="w-full py-4 bg-[#00BCD4] text-white font-black uppercase text-base border-3 border-black shadow-[4px_4px_0px_#000] active:shadow-[2px_2px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:active:shadow-[4px_4px_0px_#000]"
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContextSwitcher;
