"use client";

import React from "react";
import {
  FileTextIcon,
  TrashIcon,
  SettingsIcon,
  PlusIcon,
  XIcon,
} from "@/components/ui/Icons";

// Custom icons for the menu
const SourcesIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 20,
  className = "",
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const SwitchIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 20,
  className = "",
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);

interface MenuItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: "default" | "destructive";
  disabled?: boolean;
}

interface OverflowMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onViewSources: () => void;
  onSwitchContext: () => void;
  onUploadDocument: () => void;
  onManageDocuments: () => void;
  onChatSettings: () => void;
  onClearChat: () => void;
  hasMessages?: boolean;
  hasSources?: boolean;
}

export const OverflowMenu: React.FC<OverflowMenuProps> = ({
  isOpen,
  onClose,
  onViewSources,
  onSwitchContext,
  onUploadDocument,
  onManageDocuments,
  onChatSettings,
  onClearChat,
  hasMessages = false,
  hasSources = false,
}) => {
  const menuItems: (MenuItem | "divider")[] = [
    {
      id: "sources",
      icon: <SourcesIcon size={22} />,
      label: "View Sources",
      onClick: () => {
        onViewSources();
        onClose();
      },
      disabled: !hasSources,
    },
    {
      id: "switch",
      icon: <SwitchIcon size={22} />,
      label: "Switch Context",
      onClick: () => {
        onSwitchContext();
        onClose();
      },
    },
    "divider",
    {
      id: "upload",
      icon: <PlusIcon size={22} />,
      label: "Upload Document",
      onClick: () => {
        onUploadDocument();
        onClose();
      },
    },
    {
      id: "manage",
      icon: <FileTextIcon size={22} />,
      label: "Manage Documents",
      onClick: () => {
        onManageDocuments();
        onClose();
      },
    },
    "divider",
    {
      id: "settings",
      icon: <SettingsIcon size={22} />,
      label: "Chat Settings",
      onClick: () => {
        onChatSettings();
        onClose();
      },
    },
    {
      id: "clear",
      icon: <TrashIcon size={22} />,
      label: "Clear Chat",
      onClick: () => {
        onClearChat();
        onClose();
      },
      variant: "destructive",
      disabled: !hasMessages,
    },
  ];

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end bg-black/30 backdrop-blur-sm transition-opacity duration-250"
      onClick={handleBackdropClick}
    >
      <div
        className="w-full bg-white rounded-t-2xl border-t-4 border-x-4 border-black shadow-[0_-2px_16px_rgba(0,0,0,0.2)] animate-slideInUp overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Menu Items */}
        <div className="py-2">
          {menuItems.map((item, index) => {
            if (item === "divider") {
              return (
                <div
                  key={`divider-${index}`}
                  className="h-px bg-gray-200 my-2 mx-4"
                />
              );
            }

            const isDestructive = item.variant === "destructive";
            const isDisabled = item.disabled;

            return (
              <button
                key={item.id}
                onClick={item.onClick}
                disabled={isDisabled}
                className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors ${
                  isDisabled
                    ? "opacity-40 cursor-not-allowed"
                    : "active:bg-gray-100"
                } ${isDestructive ? "text-red-600" : "text-black"}`}
              >
                <span className={isDestructive ? "text-red-600" : "text-black"}>
                  {item.icon}
                </span>
                <span className="font-semibold text-base">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Cancel Button */}
        <div className="px-4 pb-4 pt-2 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 py-4 bg-gray-100 text-black font-bold text-base rounded-lg active:bg-gray-200 transition-colors"
          >
            <XIcon size={18} />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default OverflowMenu;
