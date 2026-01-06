"use client";

import React from "react";
import { Document, ChatMode } from "@/lib/types";
import { FileTextIcon, CheckIcon } from "./Icons";
import { formatDate } from "@/lib/api";
import { Skeleton, EmptyState } from "./Components";

interface DocumentListProps {
  documents: Document[];
  mode: ChatMode;
  selectedDocuments: string[];
  onSelect: (documentId: string) => void;
  onDeselect: (documentId: string) => void;
  isLoading?: boolean;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  mode,
  selectedDocuments,
  onSelect,
  onDeselect,
  isLoading = false,
}) => {
  const handleClick = (documentId: string) => {
    if (mode === "namespace") return;

    if (selectedDocuments.includes(documentId)) {
      onDeselect(documentId);
    } else {
      onSelect(documentId);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 bg-white border-4 border-black">
            <div className="flex items-start gap-4">
              <Skeleton variant="rectangular" width={48} height={48} />
              <div className="flex-1">
                <Skeleton width="70%" height={20} className="mb-2" />
                <Skeleton width="40%" height={16} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <EmptyState
        icon={<FileTextIcon size={48} />}
        title="NO DOCUMENTS"
        description="Upload a document to get started"
      />
    );
  }

  return (
    <div className="space-y-3">
      {mode !== "namespace" && (
        <p className="text-sm font-bold text-black uppercase tracking-wider mb-4 px-1">
          {mode === "single" ? "→ SELECT A DOCUMENT" : "→ SELECT DOCUMENTS"}
        </p>
      )}

      {documents.map((doc) => {
        const isSelected = selectedDocuments.includes(doc.id);
        const isInteractive = mode !== "namespace";

        return (
          <div
            key={doc.id}
            onClick={() => handleClick(doc.id)}
            className={`
              p-4 border-4 border-black transition-all duration-100
              ${isInteractive ? "cursor-pointer" : ""}
              ${
                isSelected
                  ? mode === "single"
                    ? "bg-[#CCFF00] shadow-[6px_6px_0px_#000] translate-x-[-3px] translate-y-[-3px]"
                    : "bg-[#FF006E] text-white shadow-[6px_6px_0px_#000] translate-x-[-3px] translate-y-[-3px]"
                  : "bg-white shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px]"
              }
            `}
          >
            <div className="flex items-start gap-4">
              {/* Selection indicator */}
              {mode !== "namespace" && (
                <div className="flex-shrink-0 mt-1">
                  {mode === "single" ? (
                    <div
                      className={`
                        w-6 h-6 border-3 border-black flex items-center justify-center
                        ${isSelected ? "bg-black" : "bg-white"}
                      `}
                    >
                      {isSelected && <div className="w-3 h-3 bg-[#CCFF00]" />}
                    </div>
                  ) : (
                    <div
                      className={`
                        w-6 h-6 border-3 border-black flex items-center justify-center
                        ${isSelected ? "bg-white" : "bg-white"}
                      `}
                    >
                      {isSelected && (
                        <CheckIcon size={14} className="text-black" />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Document icon */}
              <div
                className={`
                flex-shrink-0 w-12 h-12 border-3 border-black flex items-center justify-center
                ${isSelected && mode === "multi" ? "bg-white" : "bg-[#FFFF00]"}
              `}
              >
                <FileTextIcon size={24} className="text-black" />
              </div>

              {/* Document info */}
              <div className="flex-1 min-w-0">
                <h4
                  className={`text-sm font-black uppercase truncate ${
                    isSelected && mode === "multi" ? "text-white" : "text-black"
                  }`}
                >
                  {doc.name}
                </h4>
                <p
                  className={`text-xs font-semibold mt-1 ${
                    isSelected && mode === "multi"
                      ? "text-white/80"
                      : "text-black/60"
                  }`}
                >
                  {doc.page_count} PAGES • {formatDate(doc.uploaded_at)}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Compact version for sidebar - NEO-BRUTALIST
interface DocumentListCompactProps {
  documents: Document[];
  mode: ChatMode;
  selectedDocuments: string[];
  onToggle: (documentId: string) => void;
  onClearSelection?: () => void;
}

export const DocumentListCompact: React.FC<DocumentListCompactProps> = ({
  documents,
  mode,
  selectedDocuments,
  onToggle,
  onClearSelection,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1 mb-3">
        <span className="text-xs font-black text-[#FFFF00] uppercase tracking-wider">
          {mode === "namespace"
            ? `DOCS (${documents.length})`
            : mode === "single"
            ? "SELECT DOC"
            : `SELECTED (${selectedDocuments.length})`}
        </span>
        {mode === "multi" &&
          selectedDocuments.length > 0 &&
          onClearSelection && (
            <button
              onClick={onClearSelection}
              className="text-xs font-bold text-[#FF006E] hover:text-[#FFFF00] uppercase"
            >
              CLEAR
            </button>
          )}
      </div>

      {documents.map((doc) => {
        const isSelected = selectedDocuments.includes(doc.id);
        const isInteractive = mode !== "namespace";

        return (
          <button
            key={doc.id}
            onClick={() => isInteractive && onToggle(doc.id)}
            disabled={!isInteractive}
            className={`
              w-full flex items-center gap-3 px-3 py-2 text-left transition-all duration-100
              border-3 border-transparent
              ${
                isSelected
                  ? "bg-[#FF006E] text-white border-[#FF006E]"
                  : isInteractive
                  ? "text-white/70 hover:bg-[#FFFF00] hover:text-black hover:border-black"
                  : "text-white/50"
              }
            `}
          >
            {mode !== "namespace" && (
              <span className="flex-shrink-0 text-sm">
                {mode === "single"
                  ? isSelected
                    ? "●"
                    : "○"
                  : isSelected
                  ? "☑"
                  : "☐"}
              </span>
            )}
            <span className="text-xs font-bold uppercase truncate">
              {doc.name}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default DocumentList;
