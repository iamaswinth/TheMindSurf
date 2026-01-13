"use client";

import React from "react";
import { ChatMode, Namespace } from "@/lib/types";
import { MenuIcon, ChevronDownIcon } from "@/components/ui/Icons";

// More Options Icon (vertical ellipsis)
const MoreVerticalIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 20,
  className = "",
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <circle cx="12" cy="5" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="12" cy="19" r="2" />
  </svg>
);

interface MobileHeaderProps {
  onMenuOpen: () => void;
  onContextOpen: () => void;
  onOverflowOpen: () => void;
  namespace?: Namespace | null;
  mode: ChatMode;
  documentCount: number;
  selectedDocumentName?: string;
  selectedCount?: number;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  onMenuOpen,
  onContextOpen,
  onOverflowOpen,
  namespace,
  mode,
  documentCount,
  selectedDocumentName,
  selectedCount = 0,
}) => {
  // Generate context display text
  const getContextDisplay = () => {
    if (mode === "namespace") {
      return `ALL DOCS (${documentCount})`;
    }
    if (mode === "single" && selectedDocumentName) {
      // Truncate long names
      const maxLen = 18;
      return selectedDocumentName.length > maxLen
        ? selectedDocumentName.substring(0, maxLen) + "..."
        : selectedDocumentName;
    }
    if (mode === "multi" && selectedCount > 0) {
      return `${selectedCount} DOCS SELECTED`;
    }
    return namespace?.name || "SELECT CONTEXT";
  };

  return (
    <header className="sticky top-0 z-40 h-14 md:h-16 bg-gradient-to-r from-[#FF006E] to-[#FF1A7A] border-b-4 border-black flex items-center px-3 md:px-4 gap-2 shadow-[0_4px_0_#000] desktop-hidden">
      {/* Left Section - Hamburger Menu */}
      <button
        onClick={onMenuOpen}
        className="flex-shrink-0 w-11 h-11 flex items-center justify-center bg-white text-black border-3 border-black shadow-[3px_3px_0px_#000] active:shadow-[1px_1px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] transition-all duration-100"
        aria-label="Open navigation menu"
      >
        <MenuIcon size={22} />
      </button>

      {/* Center Section - Context Badge */}
      <button
        onClick={onContextOpen}
        className="flex-1 min-w-0 h-10 flex items-center justify-center gap-2 bg-[#FFFF00] text-black border-3 border-black shadow-[3px_3px_0px_#000] px-3 active:shadow-[1px_1px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] transition-all duration-100"
        aria-label="Switch context"
      >
        <span className="font-black text-sm uppercase truncate">
          {getContextDisplay()}
        </span>
        <ChevronDownIcon size={16} className="flex-shrink-0" />
      </button>

      {/* Right Section - Overflow Menu */}
      <button
        onClick={onOverflowOpen}
        className="flex-shrink-0 w-11 h-11 flex items-center justify-center bg-white text-black border-3 border-black shadow-[3px_3px_0px_#000] active:shadow-[1px_1px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] transition-all duration-100"
        aria-label="More options"
      >
        <MoreVerticalIcon size={20} />
      </button>
    </header>
  );
};

export default MobileHeader;
