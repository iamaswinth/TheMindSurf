"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  XIcon,
  UploadIcon,
  SettingsIcon,
  ChevronDownIcon,
  CheckIcon,
} from "./Icons";
import { Button, Input, Switch } from "./Components";
import { UploadSettings, Namespace } from "@/lib/types";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, settings: UploadSettings) => Promise<void>;
  namespaces: Namespace[];
  currentNamespace?: string | null;
}

type UploadStep = "upload" | "processing" | "success";

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  namespaces,
  currentNamespace,
}) => {
  const [step, setStep] = useState<UploadStep>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [namespace, setNamespace] = useState(currentNamespace || "");
  const [newNamespace, setNewNamespace] = useState("");
  const [isCreatingNamespace, setIsCreatingNamespace] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedInfo, setUploadedInfo] = useState<{
    name: string;
    pages: number;
    size: string;
  } | null>(null);

  const [settings, setSettings] = useState<UploadSettings>({
    strategy: 'hi_res',
    max_chunk_size: 3000,
    enable_ai_enhancement: true,
    upsert_to_pinecone: true,
    pinecone_namespace: currentNamespace || '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
      setError(null);
    } else {
      setError("Please upload a PDF file");
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === "application/pdf") {
        setSelectedFile(file);
        setError(null);
      } else {
        setError("Please upload a PDF file");
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a file");
      return;
    }

    const targetNamespace = isCreatingNamespace ? newNamespace : namespace;
    
    if (!targetNamespace) {
      setError("Please select or create a namespace");
      return;
    }

    setStep("processing");
    setError(null);

    try {
      // Update settings with the selected namespace
      const uploadSettings = {
        ...settings,
        pinecone_namespace: targetNamespace,
      };
      
      await onUpload(selectedFile, uploadSettings);
      setUploadedInfo({
        name: selectedFile.name,
        pages: 0,
        size: formatFileSize(selectedFile.size),
      });
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setStep("upload");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const resetModal = () => {
    setStep("upload");
    setSelectedFile(null);
    setError(null);
    setUploadedInfo(null);
    setShowAdvanced(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      {/* Neo-Brutalist Modal */}
      <div
        className="bg-white border-4 border-black max-w-md w-full mx-4 animate-slideInUp"
        style={{ boxShadow: "8px 8px 0px #000000" }}
      >
        {/* Header - Yellow Banner */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#FFFF00] border-b-4 border-black">
          <h2 className="text-xl font-black text-black uppercase tracking-tight">
            {step === "success" ? "✓ UPLOAD SUCCESS" : "📄 UPLOAD DOCUMENT"}
          </h2>
          <button
            onClick={handleClose}
            className="w-10 h-10 bg-black text-white flex items-center justify-center hover:bg-[#FF006E] transition-colors border-2 border-black"
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 bg-[#FFFEF0]">
          {step === "upload" && (
            <>
              {/* Namespace Selection */}
              <div className="mb-6">
                <label className="block text-sm font-black text-black uppercase tracking-wide mb-2">
                  📁 NAMESPACE
                </label>
                <p className="text-xs font-bold text-black/60 mb-3 uppercase">
                  Organize documents by project, topic, or category
                </p>
                <div className="flex gap-3">
                  {!isCreatingNamespace ? (
                    <>
                      <select
                        value={namespace}
                        onChange={(e) => setNamespace(e.target.value)}
                        className="flex-1 px-4 py-3 border-4 border-black bg-white text-black font-bold focus:outline-none focus:ring-0 focus:border-[#FF006E] appearance-none cursor-pointer"
                        style={{
                          boxShadow: "4px 4px 0px #000000",
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='black' stroke-width='3'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 12px center",
                          backgroundSize: "20px",
                          paddingRight: "48px",
                        }}
                      >
                        <option value="">Select namespace...</option>
                        {namespaces.map((ns) => (
                          <option key={ns.id} value={ns.id}>
                            {ns.name}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="secondary"
                        size="md"
                        onClick={() => setIsCreatingNamespace(true)}
                      >
                        + NEW
                      </Button>
                    </>
                  ) : (
                    <>
                      <Input
                        value={newNamespace}
                        onChange={(e) => setNewNamespace(e.target.value)}
                        placeholder="Enter namespace name"
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="md"
                        onClick={() => {
                          setIsCreatingNamespace(false);
                          setNewNamespace("");
                        }}
                      >
                        CANCEL
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Neo-Brutalist Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-4 border-dashed border-black p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? "bg-[#00FFFF] border-solid"
                    : selectedFile
                    ? "bg-[#CCFF00] border-solid"
                    : "bg-white hover:bg-[#FFFF00]/30"
                }`}
                style={{
                  boxShadow:
                    isDragging || selectedFile ? "4px 4px 0px #000000" : "none",
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="flex flex-col items-center">
                    <div
                      className="w-16 h-16 bg-black flex items-center justify-center mb-4 border-4 border-black"
                      style={{ boxShadow: "4px 4px 0px #CCFF00" }}
                    >
                      <CheckIcon size={32} className="text-[#CCFF00]" />
                    </div>
                    <p className="font-black text-black text-lg">
                      {selectedFile.name}
                    </p>
                    <p className="text-sm font-bold text-black/70 mt-1 uppercase">
                      {formatFileSize(selectedFile.size)}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                      className="mt-3 px-4 py-2 bg-[#FF006E] text-white font-bold text-sm uppercase border-2 border-black hover:bg-black transition-colors"
                    >
                      ✕ REMOVE
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div
                      className="w-16 h-16 bg-[#00FFFF] flex items-center justify-center mb-4 border-4 border-black"
                      style={{ boxShadow: "4px 4px 0px #000000" }}
                    >
                      <UploadIcon size={32} className="text-black" />
                    </div>
                    <p className="font-black text-black text-lg uppercase">
                      DRAG & DROP PDF HERE
                    </p>
                    <p className="text-sm font-bold text-black/60 mt-1 uppercase">
                      or click to browse
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <div
                  className="mt-4 p-3 bg-[#FF006E] border-4 border-black text-white font-bold text-sm"
                  style={{ boxShadow: "4px 4px 0px #000000" }}
                >
                  ⚠️ {error}
                </div>
              )}

              {/* Advanced Settings */}
              <div className="mt-6">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm font-black text-black uppercase hover:text-[#FF006E] transition-colors"
                >
                  <SettingsIcon size={16} />
                  <span>ADVANCED SETTINGS</span>
                  <ChevronDownIcon
                    size={16}
                    className={`transform transition-transform ${
                      showAdvanced ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showAdvanced && (
                  <div
                    className="mt-4 space-y-5 p-4 bg-white border-4 border-black"
                    style={{ boxShadow: "4px 4px 0px #000000" }}
                  >
                    {/* Processing Strategy */}
                    <div>
                      <label className="block text-xs font-black text-black uppercase tracking-wide mb-3">
                        ⚡ PROCESSING STRATEGY
                      </label>
                      <div className="flex gap-3">
                        <button
                          onClick={() =>
                            setSettings({ ...settings, strategy: 'hi_res' })
                          }
                          className={`flex-1 p-3 border-4 border-black font-bold text-sm uppercase transition-all ${
                            settings.strategy === 'hi_res'
                              ? 'bg-[#00FFFF] text-black'
                              : 'bg-white text-black hover:bg-[#FFFEF0]'
                          }`}
                          style={{
                            boxShadow:
                              settings.strategy === 'hi_res'
                                ? '4px 4px 0px #000000'
                                : 'none',
                          }}
                        >
                          🎯 HIGH RESOLUTION
                          <span className="block text-xs font-normal mt-1 normal-case">
                            Accurate, Slower
                          </span>
                        </button>
                        <button
                          onClick={() =>
                            setSettings({ ...settings, strategy: 'fast' })
                          }
                          className={`flex-1 p-3 border-4 border-black font-bold text-sm uppercase transition-all ${
                            settings.strategy === 'fast'
                              ? 'bg-[#00FFFF] text-black'
                              : 'bg-white text-black hover:bg-[#FFFEF0]'
                          }`}
                          style={{
                            boxShadow:
                              settings.strategy === 'fast'
                                ? '4px 4px 0px #000000'
                                : 'none',
                          }}
                        >
                          ⚡ FAST
                          <span className="block text-xs font-normal mt-1 normal-case">
                            Quick, Less Accurate
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Chunk Size Slider */}
                    <div>
                      <label className="block text-xs font-black text-black uppercase tracking-wide mb-2">
                        📏 CHUNK SIZE: {settings.max_chunk_size} CHARACTERS
                      </label>
                      <p className="text-xs font-bold text-black/60 mb-3 uppercase">
                        Smaller chunks = more precise, larger chunks = more
                        context
                      </p>
                      <div className="relative">
                        <input
                          type="range"
                          min="500"
                          max="10000"
                          step="500"
                          value={settings.max_chunk_size}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              max_chunk_size: parseInt(e.target.value),
                            })
                          }
                          className="w-full h-3 bg-white border-4 border-black appearance-none cursor-pointer"
                          style={{
                            boxShadow: '2px 2px 0px #000000',
                          }}
                        />
                        <div className="flex justify-between mt-2">
                          {[500, 3000, 6000, 10000].map((mark) => (
                            <span
                              key={mark}
                              className="text-xs font-bold text-black/70"
                            >
                              {mark}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* AI Enhancement Toggle */}
                    <div className="flex items-start justify-between p-3 bg-[#FFFEF0] border-2 border-black">
                      <div className="flex-1">
                        <label className="block text-xs font-black text-black uppercase tracking-wide">
                          🤖 AI-POWERED ENHANCEMENT
                        </label>
                        <p className="text-xs font-bold text-black/60 mt-1 uppercase">
                          AI will generate summaries for tables and images
                        </p>
                      </div>
                      <Switch
                        checked={settings.enable_ai_enhancement}
                        onChange={(v) =>
                          setSettings({ ...settings, enable_ai_enhancement: v })
                        }
                        label=""
                      />
                    </div>

                    {/* Auto-save to Pinecone Toggle */}
                    <div className="flex items-start justify-between p-3 bg-[#FFFEF0] border-2 border-black">
                      <div className="flex-1">
                        <label className="block text-xs font-black text-black uppercase tracking-wide">
                          💾 AUTO-SAVE TO PINECONE
                        </label>
                        <p className="text-xs font-bold text-black/60 mt-1 uppercase">
                          Disable if you want to review chunks first
                        </p>
                      </div>
                      <Switch
                        checked={settings.upsert_to_pinecone}
                        onChange={(v) =>
                          setSettings({ ...settings, upsert_to_pinecone: v })
                        }
                        label=""
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {step === "processing" && (
            <div className="py-8 text-center">
              {/* Neo-Brutalist Spinner */}
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div
                  className="absolute inset-0 border-4 border-black bg-[#FFFF00] animate-spin"
                  style={{
                    boxShadow: "4px 4px 0px #000000",
                    animationDuration: "1s",
                  }}
                />
                <div
                  className="absolute inset-2 border-4 border-black bg-[#00FFFF] animate-spin"
                  style={{
                    animationDuration: "0.75s",
                    animationDirection: "reverse",
                  }}
                />
                <div className="absolute inset-4 border-4 border-black bg-[#FF006E]" />
              </div>
              <p className="text-black font-black text-xl uppercase">
                PROCESSING DOCUMENT...
              </p>
              <p className="text-sm font-bold text-black/60 mt-2 uppercase">
                {settings.strategy === 'hi_res' 
                  ? 'Using high-resolution extraction for maximum accuracy' 
                  : 'Using fast processing mode'}
              </p>
              {settings.enable_ai_enhancement && (
                <p className="text-xs font-bold text-black/50 mt-2 uppercase">
                  🤖 AI enhancement enabled
                </p>
              )}
            </div>
          )}

          {step === "success" && uploadedInfo && (
            <div className="text-center">
              {/* Success Icon */}
              <div
                className="w-20 h-20 mx-auto mb-6 bg-[#CCFF00] border-4 border-black flex items-center justify-center"
                style={{ boxShadow: "6px 6px 0px #000000" }}
              >
                <CheckIcon size={40} className="text-black" />
              </div>
              <p className="text-black font-black text-xl">
                {uploadedInfo.name}
              </p>
              <p className="inline-block mt-2 px-3 py-1 bg-[#00FFFF] border-2 border-black text-sm font-bold uppercase">
                {uploadedInfo.pages} PAGES • {uploadedInfo.size}
              </p>

              <div className="mt-8 space-y-3">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={handleClose}
                >
                  💬 CHAT WITH DOCUMENT
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full"
                  onClick={handleClose}
                >
                  📚 ADD TO MULTI-DOC
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  className="w-full"
                  onClick={handleClose}
                >
                  🏠 BACK TO DASHBOARD
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "upload" && (
          <div className="flex justify-end gap-3 px-6 py-4 bg-white border-t-4 border-black">
            <Button variant="ghost" onClick={handleClose}>
              CANCEL
            </Button>
            <Button
              variant="primary"
              onClick={handleUpload}
              disabled={!selectedFile || (!namespace && !newNamespace)}
            >
              {!selectedFile || (!namespace && !newNamespace)
                ? 'SELECT FILE & NAMESPACE'
                : 'UPLOAD & PROCESS →'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadModal;
