"use client";

import React from "react";
import { ChatSettings } from "@/lib/types";
import { XIcon, SettingsIcon } from "@/components/ui/Icons";
import { Button, Slider, Switch } from "@/components/ui/Components";

interface SettingsBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ChatSettings;
  onUpdate: (settings: Partial<ChatSettings>) => void;
}

export const SettingsBottomSheet: React.FC<SettingsBottomSheetProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdate,
}) => {
  const handleReset = () => {
    onUpdate({
      temperature: 0.3,
      maxTokens: 1000,
      topK: 5,
      useHybridSearch: true,
      streamResponses: false,
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50 desktop-hidden animate-fadeIn"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white border-t-4 border-black max-h-[85vh] flex flex-col desktop-hidden animate-slideInUp">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#FFFF00] border-b-4 border-black shrink-0">
          <div className="flex items-center gap-2">
            <SettingsIcon size={20} className="text-black" />
            <h2 className="text-base font-black text-black uppercase tracking-tight">
              Chat Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-black text-[#FFFF00] flex items-center justify-center border-2 border-black active:bg-[#FF006E] transition-colors"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-[#FFFEF0]">
          {/* Temperature Slider */}
          <div>
            <Slider
              label="Temperature"
              value={settings.temperature}
              onChange={(v: number) => onUpdate({ temperature: v })}
              min={0}
              max={1}
              step={0.1}
            />
            <p className="text-xs font-semibold text-black/60 mt-1 uppercase">
              Controls randomness: Lower is more focused, higher is more
              creative
            </p>
          </div>

          {/* Max Tokens */}
          <div>
            <label className="block text-sm font-black text-black mb-2 uppercase tracking-wider">
              Max Tokens
            </label>
            <input
              type="number"
              value={settings.maxTokens}
              onChange={(e) =>
                onUpdate({ maxTokens: parseInt(e.target.value) })
              }
              className="w-full px-4 py-3 border-3 border-black font-bold shadow-[3px_3px_0px_#000] focus:outline-none focus:shadow-[5px_5px_0px_#000] text-base"
            />
            <p className="text-xs font-semibold text-black/60 mt-1 uppercase">
              Maximum length of the response
            </p>
          </div>

          {/* Top K Slider */}
          <div>
            <Slider
              label="Top K Results"
              value={settings.topK}
              onChange={(v: number) => onUpdate({ topK: v })}
              min={1}
              max={20}
              step={1}
            />
            <p className="text-xs font-semibold text-black/60 mt-1 uppercase">
              Number of document chunks to retrieve
            </p>
          </div>

          {/* Hybrid Search Switch */}
          <div>
            <Switch
              checked={settings.useHybridSearch}
              onChange={(v: boolean) => onUpdate({ useHybridSearch: v })}
              label="HYBRID SEARCH"
            />
            <p className="text-xs font-semibold text-black/60 mt-1 uppercase">
              Combines keyword and semantic search
            </p>
          </div>

          {/* Stream Responses Switch */}
          <div>
            <Switch
              checked={settings.streamResponses}
              onChange={(v: boolean) => onUpdate({ streamResponses: v })}
              label="STREAM RESPONSES"
            />
            <p className="text-xs font-semibold text-black/60 mt-1 uppercase">
              Show responses as they are generated
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 px-4 py-4 border-t-4 border-black bg-white shrink-0">
          <Button variant="ghost" onClick={handleReset} className="flex-1">
            RESET
          </Button>
          <Button variant="primary" onClick={onClose} className="flex-1">
            APPLY
          </Button>
        </div>
      </div>
    </>
  );
};
