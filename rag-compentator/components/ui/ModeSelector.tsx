"use client";

import React from "react";
import { ChatMode } from "@/lib/types";
import { GlobeIcon, FileIcon, FilesIcon } from "./Icons";

interface ModeSelectorProps {
  mode: ChatMode;
  onChange: (mode: ChatMode) => void;
  compact?: boolean;
}

interface ModeOption {
  id: ChatMode;
  icon: React.ReactNode;
  label: string;
  description: string;
  color: string;
}

const modeOptions: ModeOption[] = [
  {
    id: "namespace",
    icon: <GlobeIcon size={24} />,
    label: "ALL DOCS",
    description: "Search across all documents",
    color: "#00FFFF",
  },
  {
    id: "single",
    icon: <FileIcon size={24} />,
    label: "SINGLE DOC",
    description: "Focus on one document",
    color: "#CCFF00",
  },
  {
    id: "multi",
    icon: <FilesIcon size={24} />,
    label: "MULTI-DOC",
    description: "Select multiple documents",
    color: "#FF006E",
  },
];

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  mode,
  onChange,
  compact = false,
}) => {
  if (compact) {
    return (
      <div className="flex flex-col gap-2">
        {modeOptions.map((option) => {
          const isSelected = mode === option.id;
          return (
            <button
              key={option.id}
              onClick={() => onChange(option.id)}
              className={`
                flex items-center gap-3 px-4 py-3 
                border-4 border-black font-bold uppercase text-sm
                transition-all duration-100
                ${
                  isSelected
                    ? "shadow-[4px_4px_0px_#000] text-black"
                    : "bg-transparent border-transparent text-white hover:border-black hover:bg-[#FFFF00] hover:text-black hover:shadow-[4px_4px_0px_#000]"
                }
              `}
              style={{ backgroundColor: isSelected ? option.color : undefined }}
            >
              <div
                className={`w-8 h-8 flex items-center justify-center border-3 ${
                  isSelected ? "border-black bg-white" : "border-white/50"
                }`}
              >
                {option.icon}
              </div>
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
      {modeOptions.map((option) => {
        const isSelected = mode === option.id;
        return (
          <button
            key={option.id}
            onClick={() => onChange(option.id)}
            className={`
              flex flex-row sm:flex-col items-center gap-3 sm:gap-4 p-4 sm:p-6 
              border-3 sm:border-4 border-black transition-all duration-100
              ${
                isSelected
                  ? "shadow-[6px_6px_0px_#000] sm:shadow-[8px_8px_0px_#000] translate-x-[-3px] translate-y-[-3px] sm:translate-x-[-4px] sm:translate-y-[-4px]"
                  : "bg-white shadow-[4px_4px_0px_#000] sm:shadow-[6px_6px_0px_#000] hover:shadow-[6px_6px_0px_#000] sm:hover:shadow-[8px_8px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px]"
              }
            `}
            style={{ backgroundColor: isSelected ? option.color : undefined }}
          >
            <div
              className={`
                w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center shrink-0
                border-3 sm:border-4 border-black
                ${isSelected ? "bg-white" : "bg-[#FFFF00]"}
              `}
            >
              {option.icon}
            </div>
            <div className="text-left sm:text-center flex-1 sm:flex-none min-w-0">
              <h3 className="font-black text-sm sm:text-base uppercase tracking-tight text-black truncate sm:whitespace-normal">
                {option.label}
              </h3>
              <p className="text-xs font-semibold text-black/70 mt-0.5 sm:mt-1 uppercase leading-tight">
                {option.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
};

// Mode Badge - NEO-BRUTALIST
interface ModeBadgeProps {
  mode: ChatMode;
  documentCount?: number;
  selectedCount?: number;
  documentName?: string;
}

export const ModeBadge: React.FC<ModeBadgeProps> = ({
  mode,
  documentCount,
  selectedCount,
  documentName,
}) => {
  const option = modeOptions.find((o) => o.id === mode)!;

  const getLabel = () => {
    switch (mode) {
      case "namespace":
        return documentCount !== undefined
          ? `ALL DOCS (${documentCount})`
          : "ALL DOCS";
      case "single":
        return documentName || "SELECT DOC";
      case "multi":
        return selectedCount !== undefined
          ? `${selectedCount} DOCS SELECTED`
          : "SELECT DOCS";
    }
  };

  return (
    <div
      className="inline-flex items-center gap-2 px-4 py-2 border-4 border-black font-black text-sm uppercase shadow-[4px_4px_0px_#000]"
      style={{
        backgroundColor: option.color,
        color: mode === "multi" ? "white" : "black",
      }}
    >
      {option.icon}
      <span>{getLabel()}</span>
    </div>
  );
};

export default ModeSelector;
