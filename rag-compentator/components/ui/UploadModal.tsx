"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  XIcon,
  UploadIcon,
  SettingsIcon,
  ChevronDownIcon,
  CheckIcon,
} from "./Icons";
import { Button, Input, Switch } from "./Components";
import {
  UploadSettings,
  Namespace,
  MultimodalProcessResponse,
} from "@/lib/types";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (
    file: File,
    settings: UploadSettings
  ) => Promise<MultimodalProcessResponse>;
  namespaces: Namespace[];
  currentNamespace?: string | null;
  uploadProgress?: number;
}

type UploadStep = "upload" | "processing" | "success";

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  namespaces,
  currentNamespace,
  uploadProgress = 0,
}) => {
  const [step, setStep] = useState<UploadStep>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [namespace, setNamespace] = useState(currentNamespace || "");
  const [newNamespace, setNewNamespace] = useState("");
  const [isCreatingNamespace, setIsCreatingNamespace] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processResponse, setProcessResponse] =
    useState<MultimodalProcessResponse | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const [settings, setSettings] = useState<UploadSettings>({
    strategy: "hi_res",
    max_chunk_size: 3000,
    enable_ai_enhancement: true,
    upsert_to_pinecone: true,
    pinecone_namespace: currentNamespace || "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Sync namespace changes with settings
  useEffect(() => {
    const targetNamespace = isCreatingNamespace ? newNamespace : namespace;
    if (targetNamespace) {
      setSettings((prev) => ({
        ...prev,
        pinecone_namespace: targetNamespace,
      }));
    }
  }, [namespace, newNamespace, isCreatingNamespace]);

  // Simulate processing steps progression
  useEffect(() => {
    if (step === "processing" && uploadProgress >= 100) {
      // Adjust timing based on processing settings
      const isHiRes = settings.strategy === "hi_res";
      const hasAI = settings.enable_ai_enhancement;

      // Calculate realistic timings based on actual backend processing
      const steps = [
        {
          delay: 500,
          index: 0,
        }, // Partitioning starts immediately
        {
          delay: isHiRes ? 13000 : 3000,
          index: 1,
        }, // Chunking (hi_res takes ~13s, fast ~3s)
        {
          delay: isHiRes ? 14000 : 4000,
          index: 2,
        }, // AI/Processing (if AI: +27s, else +1s)
        {
          delay: hasAI && isHiRes ? 42000 : isHiRes ? 15000 : 5000,
          index: 3,
        }, // Database (after AI completes)
        {
          delay: hasAI && isHiRes ? 45000 : isHiRes ? 18000 : 8000,
          index: 4,
        }, // Pinecone upserting
      ];

      const timers = steps.map(({ delay, index }) =>
        setTimeout(() => setCurrentStep(index), delay)
      );

      return () => timers.forEach(clearTimeout);
    } else if (step === "upload") {
      setCurrentStep(0);
    }
  }, [step, uploadProgress, settings.strategy, settings.enable_ai_enhancement]);

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

    // Log current settings state BEFORE processing
    console.log("🔍 Current settings state at upload time:", settings);

    setStep("processing");
    setError(null);

    try {
      // Create fresh settings object with current state
      const uploadSettings: UploadSettings = {
        strategy: settings.strategy,
        max_chunk_size: settings.max_chunk_size,
        enable_ai_enhancement: settings.enable_ai_enhancement,
        upsert_to_pinecone: settings.upsert_to_pinecone,
        pinecone_namespace: targetNamespace,
      };

      console.log("=".repeat(60));
      console.log("📤 UPLOAD MODAL - Final Settings Before Upload:");
      console.log("=".repeat(60));
      console.log("📁 Target Namespace:", targetNamespace);
      console.log("⚙️  Strategy:", uploadSettings.strategy);
      console.log("🤖 AI Enhancement:", uploadSettings.enable_ai_enhancement);
      console.log("📏 Chunk Size:", uploadSettings.max_chunk_size);
      console.log("💾 Upsert to Pinecone:", uploadSettings.upsert_to_pinecone);
      console.log("📄 File:", selectedFile.name);
      console.log("=".repeat(60));

      const response = await onUpload(selectedFile, uploadSettings);
      setProcessResponse(response);
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
    setProcessResponse(null);
    setShowAdvanced(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleChatWithDocument = () => {
    if (!processResponse) return;

    // Get the namespace that was used for upload
    const targetNamespace = isCreatingNamespace ? newNamespace : namespace;

    // Navigate to chat with the namespace (document will be available in the namespace)
    const chatUrl = `/chat?namespace=${encodeURIComponent(
      targetNamespace
    )}&mode=namespace`;

    router.push(chatUrl);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 md:p-4">
      {/* Neo-Brutalist Modal */}
      <div
        className={`bg-white border-4 border-black w-full mx-2 sm:mx-4 max-h-[90vh] overflow-y-auto ${
          step === "upload"
            ? showAdvanced
              ? "max-w-4xl"
              : "max-w-xl"
            : "max-w-md"
        }`}
        style={{
          boxShadow: "8px 8px 0px #000000",
          transition: "max-width 0.3s ease-out",
        }}
      >
        {/* Header - Yellow Banner */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-[#FFFF00] border-b-4 border-black">
          <h2 className="text-base md:text-xl font-black text-black uppercase tracking-tight truncate min-w-0 flex-1">
            {step === "success" ? "✓ UPLOAD SUCCESS" : "📄 UPLOAD DOCUMENT"}
          </h2>
          <button
            onClick={handleClose}
            className="w-9 h-9 md:w-10 md:h-10 bg-black text-white flex items-center justify-center hover:bg-[#FF006E] transition-colors border-2 border-black shrink-0 ml-2"
          >
            <XIcon size={18} className="md:w-5 md:h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 bg-[#FFFEF0]">
          {step === "upload" && (
            <div
              className={
                showAdvanced
                  ? "grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6"
                  : ""
              }
            >
              {/* Left Column or Full Width */}
              <div className={showAdvanced ? "space-y-4 md:space-y-6" : ""}>
                {/* Namespace Selection */}
                <div className="mb-4 md:mb-6">
                  <label className="block text-xs md:text-sm font-black text-black uppercase tracking-wide mb-2">
                    📁 NAMESPACE
                  </label>
                  <p className="text-xs font-bold text-black/60 mb-3 uppercase">
                    Organize documents by project, topic, or category
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center">
                    {!isCreatingNamespace ? (
                      <>
                        <select
                          value={namespace}
                          onChange={(e) => {
                            const newNamespace = e.target.value;
                            setNamespace(newNamespace);
                            console.log("✅ Namespace selected:", newNamespace);
                          }}
                          className="flex-1 px-3 md:px-4 py-2.5 md:py-3 border-4 border-black bg-white text-black font-bold focus:outline-none focus:ring-0 focus:border-[#FF006E] appearance-none cursor-pointer text-sm md:text-base"
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
                            <option key={ns.id} value={ns.name}>
                              {ns.name}
                            </option>
                          ))}
                        </select>
                        <Button
                          variant="secondary"
                          size="md"
                          onClick={() => setIsCreatingNamespace(true)}
                          className="w-full sm:w-auto whitespace-nowrap"
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
                          className="w-full sm:w-auto whitespace-nowrap"
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
                  className={`border-4 border-dashed border-black p-4 md:p-8 text-center cursor-pointer transition-all ${
                    isDragging
                      ? "bg-[#00FFFF] border-solid"
                      : selectedFile
                      ? "bg-[#CCFF00] border-solid"
                      : "bg-white hover:bg-[#FFFF00]/30"
                  }`}
                  style={{
                    boxShadow:
                      isDragging || selectedFile
                        ? "4px 4px 0px #000000"
                        : "none",
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
                        className="w-12 h-12 md:w-16 md:h-16 bg-black flex items-center justify-center mb-3 md:mb-4 border-4 border-black"
                        style={{ boxShadow: "4px 4px 0px #CCFF00" }}
                      >
                        <CheckIcon
                          size={24}
                          className="md:w-8 md:h-8 text-[#CCFF00]"
                        />
                      </div>
                      <p className="font-black text-black text-base md:text-lg wrap-break-word text-center px-2">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs md:text-sm font-bold text-black/70 mt-1 uppercase">
                        {formatFileSize(selectedFile.size)}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                        }}
                        className="mt-3 px-3 md:px-4 py-1.5 md:py-2 bg-[#FF006E] text-white font-bold text-xs md:text-sm uppercase border-2 border-black hover:bg-black transition-colors"
                      >
                        ✕ REMOVE
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div
                        className="w-12 h-12 md:w-16 md:h-16 bg-[#00FFFF] flex items-center justify-center mb-3 md:mb-4 border-4 border-black"
                        style={{ boxShadow: "4px 4px 0px #000000" }}
                      >
                        <UploadIcon
                          size={24}
                          className="md:w-8 md:h-8 text-black"
                        />
                      </div>
                      <p className="font-black text-black text-base md:text-lg uppercase">
                        DRAG & DROP PDF HERE
                      </p>
                      <p className="text-xs md:text-sm font-bold text-black/60 mt-1 uppercase">
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

                {/* Advanced Settings Toggle - Only show when not expanded */}
                {!showAdvanced && (
                  <div className="mt-4 md:mt-6">
                    <button
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="flex items-center gap-2 text-xs md:text-sm font-black text-black uppercase hover:text-[#FF006E] transition-colors duration-200"
                    >
                      <SettingsIcon size={14} className="md:w-4 md:h-4" />
                      <span>ADVANCED SETTINGS</span>
                      <ChevronDownIcon size={14} className="md:w-4 md:h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Advanced Settings - Shown as second column when expanded */}
              {showAdvanced && (
                <div
                  className="opacity-0 animate-fadeInSmooth space-y-4 md:space-y-6"
                  style={{
                    animationFillMode: "forwards",
                  }}
                >
                  <div className="flex items-center justify-between mb-3 md:mb-4">
                    <h3 className="text-xs md:text-sm font-black text-black uppercase">
                      <SettingsIcon
                        size={14}
                        className="md:w-4 md:h-4 inline mr-2"
                      />
                      ADVANCED SETTINGS
                    </h3>
                    <button
                      onClick={() => setShowAdvanced(false)}
                      className="text-xs font-black text-black hover:text-[#FF006E] uppercase"
                    >
                      ✕ CLOSE
                    </button>
                  </div>
                  <div
                    className="space-y-4 md:space-y-5 p-3 md:p-4 bg-white border-4 border-black"
                    style={{ boxShadow: "4px 4px 0px #000000" }}
                  >
                    {/* Processing Strategy */}
                    <div>
                      <label className="block text-xs font-black text-black uppercase tracking-wide mb-3">
                        ⚡ PROCESSING STRATEGY
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          onClick={() => {
                            setSettings((prev) => ({
                              ...prev,
                              strategy: "hi_res",
                            }));
                            console.log("✅ Strategy changed to: hi_res");
                          }}
                          className={`p-3 border-4 border-black font-bold text-xs md:text-sm uppercase transition-all ${
                            settings.strategy === "hi_res"
                              ? "bg-[#00FFFF] text-black"
                              : "bg-white text-black hover:bg-[#FFFEF0]"
                          }`}
                          style={{
                            boxShadow:
                              settings.strategy === "hi_res"
                                ? "4px 4px 0px #000000"
                                : "none",
                          }}
                        >
                          🎯 HIGH RESOLUTION
                          <span className="block text-xs font-normal mt-1 normal-case">
                            Accurate, Slower
                          </span>
                        </button>
                        <button
                          onClick={() => {
                            setSettings((prev) => ({
                              ...prev,
                              strategy: "fast",
                            }));
                            console.log("✅ Strategy changed to: fast");
                          }}
                          className={`p-3 border-4 border-black font-bold text-xs md:text-sm uppercase transition-all ${
                            settings.strategy === "fast"
                              ? "bg-[#00FFFF] text-black"
                              : "bg-white text-black hover:bg-[#FFFEF0]"
                          }`}
                          style={{
                            boxShadow:
                              settings.strategy === "fast"
                                ? "4px 4px 0px #000000"
                                : "none",
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
                      <p className="text-xs font-bold text-black/60 mb-2 md:mb-3 uppercase">
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
                          onChange={(e) => {
                            const newSize = parseInt(e.target.value);
                            setSettings((prev) => ({
                              ...prev,
                              max_chunk_size: newSize,
                            }));
                            console.log("✅ Chunk size changed to:", newSize);
                          }}
                          className="w-full h-3 bg-white border-4 border-black appearance-none cursor-pointer"
                          style={{
                            boxShadow: "2px 2px 0px #000000",
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
                    <div className="flex items-center justify-between gap-3 p-3 md:p-4 bg-[#FFFEF0] border-2 border-black">
                      <div className="flex-1 min-w-0">
                        <label className="block text-xs font-black text-black uppercase tracking-wide">
                          🤖 AI-POWERED ENHANCEMENT
                        </label>
                        <p className="text-xs font-bold text-black/60 mt-1 uppercase">
                          AI will generate summaries for tables and images
                        </p>
                      </div>
                      <div className="shrink-0">
                        <Switch
                          checked={settings.enable_ai_enhancement}
                          onChange={(v) => {
                            setSettings((prev) => ({
                              ...prev,
                              enable_ai_enhancement: v,
                            }));
                            console.log("✅ AI Enhancement changed to:", v);
                          }}
                          label=""
                        />
                      </div>
                    </div>

                    {/* Auto-save to Pinecone Toggle */}
                    <div className="flex items-center justify-between gap-3 p-3 md:p-4 bg-[#FFFEF0] border-2 border-black">
                      <div className="flex-1 min-w-0">
                        <label className="block text-xs font-black text-black uppercase tracking-wide">
                          💾 AUTO-SAVE TO PINECONE
                        </label>
                        <p className="text-xs font-bold text-black/60 mt-1 uppercase">
                          Disable if you want to review chunks first
                        </p>
                      </div>
                      <div className="shrink-0">
                        <Switch
                          checked={settings.upsert_to_pinecone}
                          onChange={(v) => {
                            setSettings((prev) => ({
                              ...prev,
                              upsert_to_pinecone: v,
                            }));
                            console.log("✅ Upsert to Pinecone changed to:", v);
                          }}
                          label=""
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === "processing" && (
            <div className="py-4 md:py-8 text-center">
              {/* Progress Bar */}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mb-4 md:mb-6">
                  <div className="w-full h-6 md:h-8 border-4 border-black bg-white relative overflow-hidden">
                    <div
                      className="h-full bg-[#FFFF00] transition-all duration-300 flex items-center justify-center"
                      style={{
                        width: `${uploadProgress}%`,
                        boxShadow: "inset 2px 2px 0px rgba(0,0,0,0.2)",
                      }}
                    >
                      <span className="font-black text-xs text-black mix-blend-difference">
                        {uploadProgress}%
                      </span>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-black/60 mt-2 uppercase">
                    📤 Uploading file...
                  </p>
                </div>
              )}

              {/* Neo-Brutalist Spinner */}
              <div className="relative w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6">
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

              <p className="text-black font-black text-base md:text-xl uppercase">
                {uploadProgress < 100
                  ? "UPLOADING..."
                  : "PROCESSING DOCUMENT..."}
              </p>
              <p className="text-xs md:text-sm font-bold text-black/60 mt-2 uppercase px-2">
                {settings.strategy === "hi_res"
                  ? "Using high-resolution extraction for maximum accuracy"
                  : "Using fast processing mode"}
              </p>
              {settings.enable_ai_enhancement && (
                <p className="text-xs font-bold text-black/50 mt-2 uppercase">
                  🤖 AI enhancement enabled
                </p>
              )}

              {/* Dynamic Processing Steps */}
              <div className="mt-4 md:mt-6 space-y-2 md:space-y-3">
                {[
                  {
                    icon: "📄",
                    text:
                      settings.strategy === "hi_res"
                        ? "Partitioning PDF with high-resolution extraction"
                        : "Partitioning PDF with fast extraction",
                    show: currentStep >= 0,
                  },
                  {
                    icon: "✂️",
                    text: "Chunking content by title boundaries",
                    show: currentStep >= 1,
                  },
                  {
                    icon: "🤖",
                    text: settings.enable_ai_enhancement
                      ? "Processing chunks with AI enhancement"
                      : "Processing chunks",
                    show: currentStep >= 2,
                  },
                  {
                    icon: "💾",
                    text: "Saving document metadata to database",
                    show: currentStep >= 3,
                  },
                  {
                    icon: "🔍",
                    text: "Upserting vectors to Pinecone",
                    show: currentStep >= 4,
                  },
                ].map((stepItem, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 md:gap-3 text-xs md:text-sm font-bold transition-all duration-300 ${
                      stepItem.show
                        ? "opacity-100 translate-x-0"
                        : "opacity-0 -translate-x-4"
                    }`}
                    style={{
                      transitionDelay: stepItem.show ? "0ms" : "0ms",
                    }}
                  >
                    <span className="text-base md:text-lg">
                      {stepItem.icon}
                    </span>
                    <span
                      className={`flex-1 text-left ${
                        stepItem.show ? "text-black" : "text-black/30"
                      }`}
                    >
                      {stepItem.text}
                    </span>
                    {stepItem.show && currentStep > idx && (
                      <span className="text-[#CCFF00] text-base md:text-lg animate-fadeIn shrink-0">
                        ✓
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === "success" && processResponse && (
            <div className="text-center">
              {/* Success Icon */}
              <div
                className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 bg-[#CCFF00] border-4 border-black flex items-center justify-center"
                style={{ boxShadow: "6px 6px 0px #000000" }}
              >
                <CheckIcon size={28} className="md:w-8 md:h-8 text-black" />
              </div>

              {/* File Info */}
              <p className="text-black font-black text-base md:text-lg mb-2 wrap-break-word px-2">
                {processResponse.filename}
              </p>
              <p className="inline-block px-2 md:px-3 py-1 bg-[#00FFFF] border-2 border-black text-xs font-bold uppercase">
                {processResponse.processing_stats.total_pages} PAGES •{" "}
                {processResponse.total_chunks} CHUNKS
              </p>

              {/* Processing Stats */}
              <div className="mt-3 md:mt-4 grid grid-cols-2 gap-2">
                <div className="p-2 bg-white border-2 border-black">
                  <p className="text-xl font-black text-[#FF006E]">
                    {processResponse.processing_stats.ai_enhanced_chunks}
                  </p>
                  <p className="text-xs font-bold text-black/60 uppercase">
                    AI Enhanced
                  </p>
                </div>
                <div className="p-2 bg-white border-2 border-black">
                  <p className="text-xl font-black text-[#00FFFF]">
                    {processResponse.processing_stats.total_tables_found}
                  </p>
                  <p className="text-xs font-bold text-black/60 uppercase">
                    Tables Found
                  </p>
                </div>
                <div className="p-2 bg-white border-2 border-black">
                  <p className="text-xl font-black text-[#FFFF00]">
                    {processResponse.processing_stats.total_images_found}
                  </p>
                  <p className="text-xs font-bold text-black/60 uppercase">
                    Images Found
                  </p>
                </div>
                <div className="p-2 bg-white border-2 border-black">
                  <p className="text-xl font-black text-black">
                    {processResponse.processing_time_seconds.toFixed(1)}s
                  </p>
                  <p className="text-xs font-bold text-black/60 uppercase">
                    Processing Time
                  </p>
                </div>
              </div>

              {/* Warnings */}
              {processResponse.warnings &&
                processResponse.warnings.length > 0 && (
                  <div className="mt-3 p-2 bg-[#FFFF00] border-2 border-black text-left">
                    <p className="text-xs font-black text-black uppercase mb-1">
                      ⚠️ Warnings:
                    </p>
                    {processResponse.warnings.map((warning, idx) => (
                      <p key={idx} className="text-xs font-bold text-black/70">
                        • {warning}
                      </p>
                    ))}
                  </div>
                )}

              {/* Action Buttons */}
              <div className="mt-3 md:mt-4 space-y-2">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  onClick={handleChatWithDocument}
                >
                  💬 CHAT WITH DOCUMENT
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  className="w-full"
                  onClick={handleClose}
                >
                  📚 VIEW ALL DOCUMENTS
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  className="w-full"
                  onClick={() => {
                    resetModal();
                  }}
                >
                  📄 UPLOAD ANOTHER
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "upload" && (
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 px-4 md:px-6 py-3 md:py-4 bg-white border-t-4 border-black">
            <Button
              variant="ghost"
              onClick={handleClose}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              CANCEL
            </Button>
            <Button
              variant="primary"
              onClick={handleUpload}
              disabled={!selectedFile || (!namespace && !newNamespace)}
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              {!selectedFile || (!namespace && !newNamespace)
                ? "SELECT FILE & NAMESPACE"
                : "UPLOAD & PROCESS →"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadModal;
