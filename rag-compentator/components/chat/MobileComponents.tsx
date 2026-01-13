"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Message,
  Source,
  ChatSettings,
  Namespace,
  Document,
  ChatMode,
} from "@/lib/types";
import {
  MenuIcon,
  XIcon,
  FileTextIcon,
  ExternalLinkIcon,
  MoreVerticalIcon,
  TrashIcon,
  UploadIcon,
  FolderIcon,
  SettingsIcon,
  ChevronRightIcon,
  TargetIcon,
  ArrowUpDownIcon,
  SearchIcon,
} from "@/components/ui/Icons";

// ============================================
// MOBILE HEADER COMPONENT
// ============================================
interface MobileHeaderProps {
  currentNamespace?: Namespace | null;
  currentMode: ChatMode;
  currentDocument?: Document | null;
  onMenuOpen: () => void;
  onSourcesOpen: () => void;
  onContextSwitcherOpen: () => void;
  onOverflowMenuOpen: () => void;
  sourcesCount: number;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  currentNamespace,
  currentMode,
  currentDocument,
  onMenuOpen,
  onSourcesOpen,
  onContextSwitcherOpen,
  onOverflowMenuOpen,
  sourcesCount,
}) => {
  const getModeLabel = () => {
    switch (currentMode) {
      case "namespace":
        return "ALL DOCS";
      case "single":
        return "SINGLE DOC";
      case "multi":
        return "MULTI-DOC";
      default:
        return "ALL DOCS";
    }
  };

  return (
    <header className="flex items-center justify-between h-14 md:h-16 px-3 bg-gradient-to-r from-[#FF006E] to-[#FF4D94] border-b-4 border-black sticky top-0 z-30">
      {/* Left - Menu Button */}
      <button
        onClick={onMenuOpen}
        className="w-10 h-10 md:w-11 md:h-11 flex items-center justify-center bg-white border-3 border-black shadow-[3px_3px_0px_#000] active:shadow-[1px_1px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] transition-all"
        aria-label="Open menu"
      >
        <MenuIcon size={20} className="text-black" />
      </button>

      {/* Center - Context Display */}
      <button
        onClick={onContextSwitcherOpen}
        className="flex-1 mx-3 flex flex-col items-center justify-center min-w-0 py-1 active:opacity-80 transition-opacity"
        aria-label="Switch context"
      >
        {currentNamespace ? (
          <>
            <span className="px-2 py-0.5 bg-[#FFFF00] border-2 border-black text-xs font-black text-black uppercase truncate max-w-[150px]">
              {currentNamespace.name}
            </span>
            <span className="text-[10px] md:text-xs font-bold text-white/90 mt-0.5 flex items-center gap-1">
              <ChevronRightIcon size={10} />
              {getModeLabel()}
              {currentMode === "single" && currentDocument && (
                <span className="truncate max-w-[80px]">
                  : {currentDocument.name}
                </span>
              )}
            </span>
          </>
        ) : (
          <span className="text-xs font-bold text-white/80 uppercase">
            Select Namespace
          </span>
        )}
      </button>

      {/* Right - Actions */}
      <div className="flex items-center gap-2">
        {/* Overflow Menu */}
        <button
          onClick={onOverflowMenuOpen}
          className="w-10 h-10 md:w-11 md:h-11 flex items-center justify-center bg-white/20 border-2 border-white/40 active:bg-white/30 transition-colors"
          aria-label="More options"
        >
          <MoreVerticalIcon size={20} className="text-white" />
        </button>

        {/* Sources Button */}
        <button
          onClick={onSourcesOpen}
          className="relative w-10 h-10 md:w-11 md:h-11 flex items-center justify-center bg-white border-3 border-black shadow-[3px_3px_0px_#000] active:shadow-[1px_1px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] transition-all"
          aria-label="View sources"
        >
          <FileTextIcon size={20} className="text-black" />
          {sourcesCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF006E] border-2 border-black text-white text-[10px] font-black flex items-center justify-center">
              {sourcesCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};

// ============================================
// CONTEXT SWITCHER MODAL (Bottom Sheet)
// ============================================
interface ContextSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  namespaces: Namespace[];
  documents: Document[];
  currentNamespace?: Namespace | null;
  currentMode: ChatMode;
  currentDocumentId?: string;
  selectedDocumentIds?: string[];
  onApply: (
    namespaceId: string,
    mode: ChatMode,
    documentId?: string,
    documentIds?: string[]
  ) => void;
  isLoadingNamespaces?: boolean;
  isLoadingDocuments?: boolean;
}

export const ContextSwitcherModal: React.FC<ContextSwitcherModalProps> = ({
  isOpen,
  onClose,
  namespaces,
  documents,
  currentNamespace,
  currentMode,
  currentDocumentId,
  selectedDocumentIds = [],
  onApply,
  isLoadingNamespaces,
  isLoadingDocuments,
}) => {
  const [selectedNamespaceId, setSelectedNamespaceId] = useState(
    currentNamespace?.id || ""
  );
  const [selectedMode, setSelectedMode] = useState<ChatMode>(currentMode);
  const [selectedDocId, setSelectedDocId] = useState(currentDocumentId || "");
  const [selectedDocIds, setSelectedDocIds] =
    useState<string[]>(selectedDocumentIds);
  const [searchQuery, setSearchQuery] = useState("");
  const sheetRef = useRef<HTMLDivElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedNamespaceId(currentNamespace?.id || "");
      setSelectedMode(currentMode);
      setSelectedDocId(currentDocumentId || "");
      setSelectedDocIds(selectedDocumentIds);
      setSearchQuery("");
    }
  }, [
    isOpen,
    currentNamespace,
    currentMode,
    currentDocumentId,
    selectedDocumentIds,
  ]);

  const handleApply = () => {
    onApply(
      selectedNamespaceId,
      selectedMode,
      selectedMode === "single" ? selectedDocId : undefined,
      selectedMode === "multi" ? selectedDocIds : undefined
    );
    onClose();
  };

  const filteredDocuments = documents.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDocumentToggle = (docId: string) => {
    if (selectedMode === "single") {
      setSelectedDocId(docId);
    } else if (selectedMode === "multi") {
      setSelectedDocIds((prev) =>
        prev.includes(docId)
          ? prev.filter((id) => id !== docId)
          : [...prev, docId]
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-fadeIn"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 bg-white border-t-4 border-black rounded-t-2xl max-h-[80vh] flex flex-col animate-slideUp"
      >
        {/* Drag Handle */}
        <div className="flex justify-center py-3">
          <div className="w-10 h-1 bg-black/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b-4 border-black">
          <h2 className="text-lg font-black uppercase">Switch Context</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center bg-black text-white hover:bg-[#FF006E] transition-colors"
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Namespace Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-black uppercase mb-2">
              <FolderIcon size={16} />
              Namespace
            </label>
            <div className="relative">
              <select
                value={selectedNamespaceId}
                onChange={(e) => setSelectedNamespaceId(e.target.value)}
                className="w-full px-4 py-3 border-4 border-black font-bold text-sm bg-white shadow-[3px_3px_0px_#000] appearance-none cursor-pointer"
                disabled={isLoadingNamespaces}
              >
                <option value="">Select Namespace...</option>
                {namespaces.map((ns) => (
                  <option key={ns.id} value={ns.id}>
                    {ns.name} ({ns.document_count} docs)
                  </option>
                ))}
              </select>
              <ChevronRightIcon
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none"
              />
            </div>
          </div>

          {/* Mode Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-black uppercase mb-2">
              <TargetIcon size={16} />
              Mode
            </label>
            <div className="space-y-2">
              {[
                {
                  value: "namespace",
                  label: "ALL DOCS",
                  desc: "Search all documents",
                },
                {
                  value: "single",
                  label: "SINGLE DOC",
                  desc: "Focus on one document",
                },
                {
                  value: "multi",
                  label: "MULTI-DOC",
                  desc: "Select multiple documents",
                },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center gap-3 p-3 border-4 border-black cursor-pointer transition-all ${
                    selectedMode === option.value
                      ? "bg-[#FFFF00] shadow-[3px_3px_0px_#000]"
                      : "bg-white hover:bg-[#FFFEF0]"
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    value={option.value}
                    checked={selectedMode === option.value}
                    onChange={() => setSelectedMode(option.value as ChatMode)}
                    className="w-5 h-5 accent-[#FF006E]"
                  />
                  <div>
                    <span className="font-black text-sm">{option.label}</span>
                    <p className="text-xs font-semibold text-black/60">
                      {option.desc}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Document Selection (for single/multi mode) */}
          {(selectedMode === "single" || selectedMode === "multi") &&
            selectedNamespaceId && (
              <div>
                <label className="flex items-center justify-between text-sm font-black uppercase mb-2">
                  <span className="flex items-center gap-2">
                    <FileTextIcon size={16} />
                    Select Doc{selectedMode === "multi" ? "s" : ""}
                  </span>
                  <span className="text-xs font-bold text-black/60">
                    ({filteredDocuments.length} documents)
                  </span>
                </label>

                {/* Search */}
                {documents.length > 5 && (
                  <div className="relative mb-2">
                    <SearchIcon
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40"
                    />
                    <input
                      type="text"
                      placeholder="Search documents..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border-3 border-black font-semibold text-sm placeholder:text-black/40"
                    />
                  </div>
                )}

                {/* Document List */}
                <div className="max-h-48 overflow-y-auto space-y-2 border-4 border-black p-2 bg-[#FFFEF0]">
                  {isLoadingDocuments ? (
                    <div className="p-4 text-center">
                      <div className="animate-pulse font-bold text-sm">
                        Loading documents...
                      </div>
                    </div>
                  ) : filteredDocuments.length === 0 ? (
                    <div className="p-4 text-center text-sm font-bold text-black/60">
                      No documents found
                    </div>
                  ) : (
                    filteredDocuments.map((doc) => {
                      const isSelected =
                        selectedMode === "single"
                          ? selectedDocId === doc.id
                          : selectedDocIds.includes(doc.id);
                      return (
                        <label
                          key={doc.id}
                          className={`flex items-center gap-3 p-3 border-3 border-black cursor-pointer transition-all ${
                            isSelected
                              ? "bg-[#00FFFF] shadow-[2px_2px_0px_#000]"
                              : "bg-white hover:bg-[#FFFEF0]"
                          }`}
                        >
                          <input
                            type={
                              selectedMode === "single" ? "radio" : "checkbox"
                            }
                            name="document"
                            checked={isSelected}
                            onChange={() => handleDocumentToggle(doc.id)}
                            className="w-5 h-5 accent-[#FF006E]"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-sm truncate block">
                              {doc.name}
                            </span>
                            <span className="text-xs font-semibold text-black/60">
                              {doc.page_count} pages
                            </span>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t-4 border-black bg-[#FFFEF0]">
          <button
            onClick={handleApply}
            disabled={
              !selectedNamespaceId ||
              (selectedMode === "single" && !selectedDocId) ||
              (selectedMode === "multi" && selectedDocIds.length === 0)
            }
            className="w-full py-3 bg-[#FF006E] text-white font-black uppercase border-4 border-black shadow-[4px_4px_0px_#000] disabled:opacity-50 disabled:cursor-not-allowed active:shadow-[2px_2px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] transition-all"
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// SOURCES BOTTOM SHEET
// ============================================
interface SourcesBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  sources: Source[];
  onViewFull: (source: Source) => void;
}

export const SourcesBottomSheet: React.FC<SourcesBottomSheetProps> = ({
  isOpen,
  onClose,
  sources,
  onViewFull,
}) => {
  const [sheetHeight, setSheetHeight] = useState<"half" | "expanded">("half");
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number>(0);
  const currentTranslateY = useRef<number>(0);

  const handleDragStart = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      dragStartY.current = clientY;
      currentTranslateY.current = 0;
    },
    []
  );

  const handleDrag = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (dragStartY.current === 0) return;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const deltaY = clientY - dragStartY.current;
    currentTranslateY.current = deltaY;

    if (sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${Math.max(0, deltaY)}px)`;
    }
  }, []);

  const handleDragEnd = useCallback(() => {
    if (!sheetRef.current) return;

    const deltaY = currentTranslateY.current;

    // Reset transform
    sheetRef.current.style.transform = "";

    if (deltaY > 100) {
      // Dragged down significantly
      if (sheetHeight === "expanded") {
        setSheetHeight("half");
      } else {
        onClose();
      }
    } else if (deltaY < -50) {
      // Dragged up
      setSheetHeight("expanded");
    }

    dragStartY.current = 0;
    currentTranslateY.current = 0;
  }, [sheetHeight, onClose]);

  useEffect(() => {
    if (isOpen) {
      setSheetHeight("half");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 animate-fadeIn"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className={`absolute bottom-0 left-0 right-0 bg-white border-t-4 border-black rounded-t-2xl flex flex-col transition-all duration-300 ease-out ${
          sheetHeight === "expanded" ? "h-[85vh]" : "h-[50vh]"
        } animate-slideUp`}
        style={{ boxShadow: "0px -4px 20px rgba(0,0,0,0.15)" }}
      >
        {/* Drag Handle */}
        <div
          className="flex justify-center py-3 cursor-grab active:cursor-grabbing touch-none"
          onTouchStart={handleDragStart}
          onTouchMove={handleDrag}
          onTouchEnd={handleDragEnd}
          onMouseDown={handleDragStart}
          onMouseMove={handleDrag}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
        >
          <div className="w-10 h-1 bg-black/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 bg-[#FFFF00] border-b-4 border-black">
          <h2 className="text-lg font-black uppercase">
            Sources {sources.length > 0 && `(${sources.length})`}
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center bg-black text-white hover:bg-[#FF006E] transition-colors"
            aria-label="Close sources"
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FFFEF0]">
          {sources.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <div className="w-16 h-16 bg-[#FFFF00] border-4 border-black shadow-[4px_4px_0px_#000] flex items-center justify-center mb-4">
                <FileTextIcon size={28} className="text-black" />
              </div>
              <p className="text-sm font-bold text-black/60 uppercase">
                No sources available
              </p>
              <p className="text-xs font-semibold text-black/40 mt-1">
                Sources appear when you ask questions
              </p>
            </div>
          ) : (
            sources.map((source, idx) => (
              <div
                key={idx}
                className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_#000]"
                style={{ borderRadius: "8px" }}
              >
                {/* Document Header */}
                <div className="flex items-start gap-3 mb-3">
                  {/* Thumbnail Placeholder */}
                  <div className="w-16 h-20 bg-[#FFFEF0] border-2 border-black flex items-center justify-center flex-shrink-0">
                    <FileTextIcon size={24} className="text-black/40" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3
                      className="font-black text-sm uppercase truncate"
                      title={source.document_name}
                    >
                      {source.document_name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-bold text-black/60">
                        PAGE {source.page_number}
                      </span>
                      <span className="px-2 py-0.5 bg-black text-white text-[10px] font-black">
                        {(source.score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Preview Text */}
                <p className="text-sm font-semibold text-black/80 line-clamp-3 mb-3 leading-relaxed">
                  {source.chunk_text}
                </p>

                {/* View Full Button */}
                <button
                  onClick={() => onViewFull(source)}
                  className="w-full py-3 bg-[#00FFFF] text-black font-black uppercase border-3 border-black shadow-[3px_3px_0px_#000] flex items-center justify-center gap-2 active:shadow-[1px_1px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] transition-all"
                >
                  VIEW FULL
                  <ExternalLinkIcon size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// OVERFLOW MENU (Action Sheet)
// ============================================
interface OverflowMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onClearChat: () => void;
  onSwitchContext: () => void;
  onUploadDocument: () => void;
  onManageDocuments: () => void;
  onViewSources: () => void;
  onChatSettings: () => void;
}

export const OverflowMenu: React.FC<OverflowMenuProps> = ({
  isOpen,
  onClose,
  onClearChat,
  onSwitchContext,
  onUploadDocument,
  onManageDocuments,
  onViewSources,
  onChatSettings,
}) => {
  if (!isOpen) return null;

  const menuItems = [
    {
      icon: TrashIcon,
      label: "Clear Chat",
      onClick: onClearChat,
      destructive: true,
    },
    {
      icon: ArrowUpDownIcon,
      label: "Switch Context",
      onClick: onSwitchContext,
    },
    { icon: UploadIcon, label: "Upload Document", onClick: onUploadDocument },
    { icon: FolderIcon, label: "Manage Documents", onClick: onManageDocuments },
    { icon: FileTextIcon, label: "View Sources", onClick: onViewSources },
    { icon: SettingsIcon, label: "Chat Settings", onClick: onChatSettings },
  ];

  const handleItemClick = (onClick: () => void) => {
    onClick();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-fadeIn"
        onClick={onClose}
      />

      {/* Action Sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t-4 border-black animate-slideUp">
        <div className="py-2">
          {menuItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleItemClick(item.onClick)}
              className={`w-full flex items-center gap-4 px-5 py-4 font-bold text-left transition-colors ${
                item.destructive
                  ? "text-[#FF0000] hover:bg-[#FF0000]/10"
                  : "text-black hover:bg-[#FFFEF0]"
              }`}
            >
              <item.icon size={20} />
              <span className="uppercase">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Cancel Button */}
        <div className="border-t-4 border-black">
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 px-5 py-4 font-black text-black bg-[#FFFEF0] uppercase hover:bg-[#FFFF00] transition-colors"
          >
            <XIcon size={18} />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MOBILE SIDEBAR (Navigation Drawer)
// ============================================
interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath?: string;
}

export const MobileSidebar: React.FC<MobileSidebarProps> = ({
  isOpen,
  onClose,
  currentPath = "/chat",
}) => {
  const navItems = [
    { href: "/", label: "Dashboard", icon: "🏠" },
    { href: "/namespaces", label: "Namespaces", icon: "📁" },
    { href: "/documents", label: "Documents", icon: "📄" },
    { href: "/chat", label: "Chat", icon: "💬" },
    { href: "/settings", label: "Settings", icon: "⚙️" },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-fadeIn"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute top-0 left-0 bottom-0 w-72 bg-white border-r-4 border-black animate-slideInRight flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 bg-[#FFFF00] border-b-4 border-black">
          <h2 className="text-xl font-black uppercase">RAG Chat</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center bg-black text-white hover:bg-[#FF006E] transition-colors"
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2">
          {navItems.map((item) => {
            const isActive = currentPath === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 px-5 py-4 font-bold uppercase transition-all ${
                  isActive
                    ? "bg-[#00FFFF] border-l-4 border-black text-black"
                    : "text-black/80 hover:bg-[#FFFEF0] hover:text-black"
                }`}
                onClick={onClose}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t-4 border-black bg-[#FFFEF0]">
          <p className="text-xs font-bold text-black/50 uppercase text-center">
            RAG Compentator v1.0
          </p>
        </div>
      </div>
    </div>
  );
};

// ============================================
// SOURCE DETAIL MODAL (Full Screen on Mobile)
// ============================================
interface MobileSourceDetailModalProps {
  source: Source | null;
  isOpen: boolean;
  onClose: () => void;
}

export const MobileSourceDetailModal: React.FC<
  MobileSourceDetailModalProps
> = ({ source, isOpen, onClose }) => {
  if (!isOpen || !source) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col animate-slideUp lg:hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#00FFFF] border-b-4 border-black sticky top-0">
        <h2 className="text-lg font-black uppercase flex items-center gap-2">
          <FileTextIcon size={20} />
          Source Details
        </h2>
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center bg-black text-white"
        >
          <XIcon size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FFFEF0]">
        {/* Document Info */}
        <div className="p-4 bg-[#FFFF00] border-4 border-black shadow-[4px_4px_0px_#000]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-black uppercase text-sm truncate flex-1 mr-2">
              {source.document_name}
            </h3>
            <span className="px-2 py-1 bg-white border-2 border-black text-xs font-black shrink-0">
              {(source.score * 100).toFixed(1)}%
            </span>
          </div>
          <p className="text-sm font-bold text-black/70">
            PAGE {source.page_number}
          </p>
          <p className="text-xs font-bold text-black/50 mt-1">
            ID: {source.document_id}
          </p>
        </div>

        {/* Full Content */}
        <div className="p-4 bg-white border-4 border-black shadow-[4px_4px_0px_#000]">
          <h4 className="text-sm font-black uppercase mb-3 flex items-center gap-2">
            <span className="w-3 h-3 bg-[#FF006E] border-2 border-black"></span>
            Full Content
          </h4>
          <p className="text-sm font-semibold text-black leading-relaxed whitespace-pre-wrap">
            {source.chunk_text}
          </p>
        </div>

        {/* Metadata */}
        {source.metadata && Object.keys(source.metadata).length > 0 && (
          <div className="p-4 bg-[#CCFF00] border-4 border-black shadow-[4px_4px_0px_#000]">
            <h4 className="text-sm font-black uppercase mb-3 flex items-center gap-2">
              <span className="w-3 h-3 bg-[#00FFFF] border-2 border-black"></span>
              Metadata
            </h4>
            <div className="space-y-2">
              {Object.entries(source.metadata).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <span className="text-xs font-black text-black/60 uppercase min-w-[80px]">
                    {key}:
                  </span>
                  <span className="text-xs font-bold text-black">
                    {String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t-4 border-black bg-white">
        <button
          onClick={onClose}
          className="w-full py-3 bg-black text-white font-black uppercase border-4 border-black shadow-[4px_4px_0px_#000] active:shadow-[2px_2px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] transition-all"
        >
          Close
        </button>
      </div>
    </div>
  );
};

// ============================================
// MOBILE CHAT SETTINGS MODAL
// ============================================
interface MobileChatSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ChatSettings;
  onUpdate: (settings: Partial<ChatSettings>) => void;
}

export const MobileChatSettings: React.FC<MobileChatSettingsProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-fadeIn"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t-4 border-black rounded-t-2xl max-h-[80vh] flex flex-col animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#FFFF00] border-b-4 border-black">
          <h2 className="text-lg font-black uppercase">Chat Settings</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center bg-black text-white"
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Temperature */}
          <div>
            <label className="block text-sm font-black uppercase mb-2">
              Temperature: {settings.temperature.toFixed(1)}
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={settings.temperature}
              onChange={(e) =>
                onUpdate({ temperature: parseFloat(e.target.value) })
              }
              className="w-full h-3 bg-black/10 appearance-none cursor-pointer accent-[#FF006E]"
            />
            <div className="flex justify-between text-xs font-bold text-black/50 mt-1">
              <span>Precise</span>
              <span>Creative</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div>
            <label className="block text-sm font-black uppercase mb-2">
              Max Tokens
            </label>
            <input
              type="number"
              value={settings.maxTokens}
              onChange={(e) =>
                onUpdate({ maxTokens: parseInt(e.target.value) })
              }
              className="w-full px-4 py-3 border-4 border-black font-bold shadow-[3px_3px_0px_#000]"
            />
          </div>

          {/* Top K */}
          <div>
            <label className="block text-sm font-black uppercase mb-2">
              Top K Results: {settings.topK}
            </label>
            <input
              type="range"
              min={1}
              max={20}
              step={1}
              value={settings.topK}
              onChange={(e) => onUpdate({ topK: parseInt(e.target.value) })}
              className="w-full h-3 bg-black/10 appearance-none cursor-pointer accent-[#FF006E]"
            />
          </div>

          {/* Hybrid Search Toggle */}
          <label className="flex items-center justify-between p-4 border-4 border-black bg-white cursor-pointer">
            <span className="font-black uppercase text-sm">Hybrid Search</span>
            <div
              className={`w-14 h-8 rounded-none border-3 border-black relative cursor-pointer transition-colors ${
                settings.useHybridSearch ? "bg-[#00FFFF]" : "bg-white"
              }`}
              onClick={() =>
                onUpdate({ useHybridSearch: !settings.useHybridSearch })
              }
            >
              <div
                className={`absolute top-0.5 w-6 h-6 bg-black transition-transform ${
                  settings.useHybridSearch ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </div>
          </label>

          {/* Stream Responses Toggle */}
          <label className="flex items-center justify-between p-4 border-4 border-black bg-white cursor-pointer">
            <span className="font-black uppercase text-sm">
              Stream Responses
            </span>
            <div
              className={`w-14 h-8 rounded-none border-3 border-black relative cursor-pointer transition-colors ${
                settings.streamResponses ? "bg-[#00FFFF]" : "bg-white"
              }`}
              onClick={() =>
                onUpdate({ streamResponses: !settings.streamResponses })
              }
            >
              <div
                className={`absolute top-0.5 w-6 h-6 bg-black transition-transform ${
                  settings.streamResponses ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </div>
          </label>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t-4 border-black bg-[#FFFEF0]">
          <button
            onClick={() =>
              onUpdate({
                temperature: 0.3,
                maxTokens: 1000,
                topK: 5,
                useHybridSearch: true,
                streamResponses: false,
              })
            }
            className="flex-1 py-3 bg-white text-black font-black uppercase border-4 border-black shadow-[3px_3px_0px_#000] active:shadow-[1px_1px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] transition-all"
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-[#FF006E] text-white font-black uppercase border-4 border-black shadow-[3px_3px_0px_#000] active:shadow-[1px_1px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] transition-all"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// RESPONSIVE HOOK
// ============================================
export const useResponsive = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const checkBreakpoint = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      setIsDesktop(width >= 1024);
    };

    checkBreakpoint();
    window.addEventListener("resize", checkBreakpoint);
    return () => window.removeEventListener("resize", checkBreakpoint);
  }, []);

  return {
    isMobile,
    isTablet,
    isDesktop,
    isMobileOrTablet: isMobile || isTablet,
  };
};
