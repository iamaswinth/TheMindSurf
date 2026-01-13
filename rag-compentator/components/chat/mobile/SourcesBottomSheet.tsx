"use client";

import React, { useState, useRef, useEffect } from "react";
import { Source } from "@/lib/types";
import {
  XIcon,
  FileTextIcon,
  ExternalLinkIcon,
  RefreshCwIcon,
} from "@/components/ui/Icons";

interface SourcesBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  sources: Source[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onViewFull?: (source: Source) => void;
}

export const SourcesBottomSheet: React.FC<SourcesBottomSheetProps> = ({
  isOpen,
  onClose,
  sources,
  isLoading = false,
  error = null,
  onRetry,
  onViewFull,
}) => {
  const [sheetHeight, setSheetHeight] = useState(50); // percentage
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(50);
  const sheetRef = useRef<HTMLDivElement>(null);
  const prevIsOpen = useRef(isOpen);

  // Reset height when opened (using ref to track previous value)
  useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      // Sheet just opened
      setSheetHeight(50);
    }
    prevIsOpen.current = isOpen;
  }, [isOpen]);

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
      Math.max(30, dragStartHeight.current + deltaPercent)
    );
    setSheetHeight(newHeight);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    // Snap to positions
    if (sheetHeight < 40) {
      onClose();
    } else if (sheetHeight < 65) {
      setSheetHeight(50);
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
      className="fixed inset-0 z-[60] flex items-end bg-black/40 transition-opacity duration-300"
      onClick={handleBackdropClick}
      onMouseMove={handleDrag}
      onMouseUp={handleDragEnd}
      onTouchMove={handleDrag}
      onTouchEnd={handleDragEnd}
    >
      <div
        ref={sheetRef}
        className="w-full bg-white rounded-t-2xl border-t-4 border-x-4 border-black shadow-[0_-4px_20px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col"
        style={{
          height: `${sheetHeight}vh`,
          transition: isDragging
            ? "none"
            : "height 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle */}
        <div
          className="flex justify-center py-3 cursor-grab active:cursor-grabbing bg-[#FFFF00] border-b-3 border-black"
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        >
          <div className="w-10 h-1 bg-black/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#FFFF00] border-b-4 border-black">
          <h2 className="text-lg font-black text-black uppercase tracking-tight">
            SOURCES ({sources.length})
          </h2>
          <button
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center bg-black text-white active:bg-[#FF006E] transition-colors"
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#FFFEF0]">
          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-black border-t-[#00BCD4] rounded-full animate-spin mb-4" />
              <p className="text-black/60 font-bold text-sm uppercase">
                Loading sources...
              </p>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-[#FF006E] border-3 border-black shadow-[3px_3px_0px_#000] flex items-center justify-center mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <p className="text-black font-bold text-sm uppercase mb-4">
                {error}
              </p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="flex items-center gap-2 px-4 py-2 bg-[#00BCD4] text-white font-bold uppercase text-sm border-3 border-black shadow-[3px_3px_0px_#000] active:shadow-[1px_1px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] transition-all"
                >
                  <RefreshCwIcon size={16} />
                  Retry
                </button>
              )}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && sources.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-gray-100 border-3 border-black shadow-[3px_3px_0px_#000] flex items-center justify-center mb-4">
                <FileTextIcon size={28} className="text-black/40" />
              </div>
              <p className="text-black/60 font-bold text-sm uppercase text-center">
                No sources available
                <br />
                for this conversation
              </p>
            </div>
          )}

          {/* Sources List */}
          {!isLoading && !error && sources.length > 0 && (
            <div className="space-y-4">
              {sources.map((source, index) => (
                <SourceCard
                  key={`${source.document_id}-${index}`}
                  source={source}
                  onViewFull={onViewFull}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Source Card Component
interface SourceCardProps {
  source: Source;
  onViewFull?: (source: Source) => void;
}

const SourceCard: React.FC<SourceCardProps> = ({ source, onViewFull }) => {
  const scorePercent = Math.round(source.score * 100);

  return (
    <div className="bg-white border-3 border-black shadow-[4px_4px_0px_#000] rounded-lg overflow-hidden">
      {/* Card Header */}
      <div className="flex items-start gap-3 p-4">
        {/* Thumbnail placeholder */}
        <div className="flex-shrink-0 w-20 h-24 bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
          <FileTextIcon size={28} className="text-gray-400" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3
              className="font-black text-sm text-black uppercase line-clamp-2"
              title={source.document_name}
            >
              {source.document_name}
            </h3>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase">
              PAGE {source.page_number}
            </span>
            <span className="px-2 py-0.5 bg-black text-white text-xs font-bold rounded">
              {scorePercent}%
            </span>
          </div>
        </div>
      </div>

      {/* Preview Text */}
      <div className="px-4 pb-3">
        <p
          className="text-sm font-semibold text-black/80 line-clamp-3 leading-relaxed"
          title={source.chunk_text}
        >
          {source.chunk_text}
        </p>
      </div>

      {/* View Full Button */}
      <div className="px-4 pb-4">
        <button
          onClick={() => onViewFull?.(source)}
          className="w-full flex items-center justify-center gap-2 py-3 bg-[#00BCD4] text-white font-bold uppercase text-sm border-3 border-black shadow-[3px_3px_0px_#000] active:shadow-[1px_1px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] transition-all"
        >
          VIEW FULL
          <ExternalLinkIcon size={16} />
        </button>
      </div>
    </div>
  );
};

export default SourcesBottomSheet;
