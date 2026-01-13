"use client";

import React, { useState, useRef, useEffect } from "react";
import { Message, Source, ChatSettings } from "@/lib/types";
import { Button, Switch, Slider } from "@/components/ui/Components";
import {
  SendIcon,
  BotIcon,
  UserIcon,
  ChevronDownIcon,
  XIcon,
  FileTextIcon,
  ExternalLinkIcon,
} from "@/components/ui/Icons";

// Typing Indicator - NEO-BRUTALIST
const TypingIndicator: React.FC = () => (
  <div className="flex items-center gap-2 px-4 py-3">
    <div className="w-3 h-3 bg-black typing-dot" />
    <div className="w-3 h-3 bg-black typing-dot" />
    <div className="w-3 h-3 bg-black typing-dot" />
  </div>
);

// Loading Steps Indicator - NEO-BRUTALIST
const LoadingStepsIndicator: React.FC = () => {
  const [currentStep, setCurrentStep] = React.useState(0);

  const steps = [
    { icon: "🔍", text: "Initializing search...", duration: 2000 },
    { icon: "🔎", text: "Performing hybrid search...", duration: 5000 },
    { icon: "📊", text: "Filtering & ranking results...", duration: 2000 },
    { icon: "🤖", text: "Generating answer with AI...", duration: 4000 },
  ];

  React.useEffect(() => {
    let totalTime = 0;
    const timers: NodeJS.Timeout[] = [];

    steps.forEach((step, index) => {
      totalTime += step.duration;
      const timer = setTimeout(() => {
        setCurrentStep(index);
      }, totalTime - step.duration);
      timers.push(timer);
    });

    return () => timers.forEach((timer) => clearTimeout(timer));
  }, []);

  return (
    <div className="space-y-3 w-full max-w-[300px]">
      {steps.map((step, index) => (
        <div
          key={index}
          className={`flex items-center gap-3 transition-all duration-300 ${
            index <= currentStep ? "opacity-100" : "opacity-30"
          }`}
        >
          <div
            className={`w-8 h-8 shrink-0 border-2 border-black flex items-center justify-center text-lg transition-all duration-300 ${
              index === currentStep
                ? "bg-[#FFFF00] shadow-[2px_2px_0px_#000] scale-110"
                : index < currentStep
                ? "bg-[#00FFFF] shadow-[2px_2px_0px_#000]"
                : "bg-white"
            }`}
          >
            {index < currentStep ? "✓" : step.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={`text-xs md:text-sm font-bold uppercase truncate ${
                index === currentStep
                  ? "text-black"
                  : index < currentStep
                  ? "text-black/60"
                  : "text-black/40"
              }`}
            >
              {step.text}
            </p>
            {index === currentStep && (
              <div className="mt-1 h-1 bg-black/10 relative overflow-hidden">
                <div className="absolute inset-0 bg-[#FFFF00] border border-black animate-loading-bar" />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// Message Component - NEO-BRUTALIST
interface MessageBubbleProps {
  message: Message;
  onMessageClick?: (message: Message) => void;
  isSelected?: boolean;
  onSourcesBadgeClick?: (message: Message) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onMessageClick,
  isSelected,
  onSourcesBadgeClick,
}) => {
  const isUser = message.role === "user";

  if (message.isLoading) {
    return (
      <div className="flex gap-3 md:gap-4 animate-fadeIn">
        <div className="hidden md:flex flex-shrink-0 w-12 h-12 bg-[#00FFFF] border-4 border-black items-center justify-center shadow-[4px_4px_0px_#000]">
          <BotIcon size={20} className="text-black" />
        </div>
        <div className="message-ai px-4 md:px-5 py-3 md:py-4">
          <LoadingStepsIndicator />
        </div>
      </div>
    );
  }

  // Check if this message has sources (only AI messages can have sources)
  const hasSources = !isUser && message.sources && message.sources.length > 0;

  return (
    <div
      className={`flex gap-3 md:gap-4 animate-slideInUp ${
        isUser ? "flex-row-reverse" : ""
      }`}
    >
      {/* Avatar - Hidden on mobile, shown on desktop */}
      <div
        className={`
          hidden md:flex flex-shrink-0 w-12 h-12 border-4 border-black items-center justify-center shadow-[4px_4px_0px_#000]
          ${isUser ? "bg-[#FF006E]" : "bg-[#00FFFF]"}
        `}
      >
        {isUser ? (
          <UserIcon size={20} className="text-white" />
        ) : (
          <BotIcon size={20} className="text-black" />
        )}
      </div>

      <div
        className={`flex flex-col max-w-[95%] md:max-w-[70%] ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        <div
          className={`${isUser ? "message-user" : "message-ai"} ${
            hasSources ? "cursor-pointer" : ""
          } ${isSelected ? "ring-4 ring-[#FF006E] ring-offset-2" : ""}`}
          onClick={() => hasSources && onMessageClick?.(message)}
        >
          <div className="px-4 md:px-5 py-3 md:py-4">
            {message.error ? (
              <p className="text-[#FF0000] font-bold uppercase">
                {message.error}
              </p>
            ) : (
              <p className="text-sm font-semibold whitespace-pre-wrap leading-relaxed">
                {message.content}
              </p>
            )}
          </div>
        </div>

        {/* Sources indicator - Desktop */}
        {hasSources && (
          <div className="hidden md:flex items-center gap-2 mt-3">
            <span className="text-xs font-bold uppercase text-black/60">
              📚 {message.sources!.length} source
              {message.sources!.length > 1 ? "s" : ""}
              {isSelected ? " (viewing)" : " - click to view"}
            </span>
          </div>
        )}

        {/* Sources indicator - Mobile (tappable badge) */}
        {hasSources && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSourcesBadgeClick?.(message);
            }}
            className="md:hidden flex items-center gap-2 mt-3 px-3 py-2 bg-[#00BCD4] text-white border-2 border-black shadow-[2px_2px_0px_#000] active:shadow-[1px_1px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all"
          >
            <span className="text-xs font-bold uppercase">
              📎 {message.sources!.length} SOURCE
              {message.sources!.length > 1 ? "S" : ""} - CLICK TO VIEW
            </span>
          </button>
        )}

        {/* Timestamp */}
        <p
          className={`text-xs font-bold text-black/50 mt-2 uppercase ${
            isUser ? "text-right" : ""
          }`}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
};

// Settings Dropdown - NEO-BRUTALIST
interface SettingsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ChatSettings;
  onUpdate: (settings: Partial<ChatSettings>) => void;
}

const SettingsDropdown: React.FC<SettingsDropdownProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute bottom-full left-0 mb-2 w-80 bg-white border-4 border-black shadow-[8px_8px_0px_#000] animate-slideInUp">
      <div className="flex items-center justify-between px-5 py-4 border-b-4 border-black bg-[#FFFF00]">
        <h3 className="font-black text-black uppercase">CHAT SETTINGS</h3>
        <button
          onClick={onClose}
          className="text-black hover:bg-black hover:text-[#FFFF00] p-1 transition-colors duration-100"
        >
          <XIcon size={18} />
        </button>
      </div>

      <div className="p-5 space-y-5">
        <Slider
          label="Temperature"
          value={settings.temperature}
          onChange={(v: number) => onUpdate({ temperature: v })}
          min={0}
          max={1}
          step={0.1}
        />

        <div>
          <label className="block text-sm font-black text-black mb-2 uppercase">
            Max Tokens
          </label>
          <input
            type="number"
            value={settings.maxTokens}
            onChange={(e) => onUpdate({ maxTokens: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border-4 border-black font-bold shadow-[3px_3px_0px_#000] focus:outline-none focus:shadow-[5px_5px_0px_#000]"
          />
        </div>

        <Slider
          label="Top K Results"
          value={settings.topK}
          onChange={(v: number) => onUpdate({ topK: v })}
          min={1}
          max={20}
          step={1}
        />

        <Switch
          checked={settings.useHybridSearch}
          onChange={(v: boolean) => onUpdate({ useHybridSearch: v })}
          label="HYBRID SEARCH"
        />

        <Switch
          checked={settings.streamResponses}
          onChange={(v: boolean) => onUpdate({ streamResponses: v })}
          label="STREAM RESPONSES"
        />
      </div>

      <div className="flex justify-end gap-3 px-5 py-4 border-t-4 border-black bg-[#FFFEF0]">
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onUpdate({
              temperature: 0.3,
              maxTokens: 1000,
              topK: 5,
              useHybridSearch: true,
              streamResponses: false,
            })
          }
        >
          RESET
        </Button>
        <Button variant="primary" size="sm" onClick={onClose}>
          APPLY
        </Button>
      </div>
    </div>
  );
};

// Main Chat Area Component - NEO-BRUTALIST
interface ChatAreaProps {
  messages: Message[];
  isLoading: boolean;
  settings: ChatSettings;
  onSendMessage: (message: string) => void;
  onUpdateSettings: (settings: Partial<ChatSettings>) => void;
  onMessageClick?: (message: Message) => void;
  onSourcesBadgeClick?: (message: Message) => void;
  selectedMessageId?: string;
  error?: string | null;
  onClearError?: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  isLoading,
  settings,
  onSendMessage,
  onUpdateSettings,
  onMessageClick,
  onSourcesBadgeClick,
  selectedMessageId,
  error,
  onClearError,
}) => {
  const [input, setInput] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-full bg-white border-3 md:border-4 border-black shadow-[4px_4px_0px_#000] md:shadow-[8px_8px_0px_#000] pt-14 lg:pt-0">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-6 space-y-3 md:space-y-6 bg-[#FFFEF0]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-24 h-24 bg-[#FFFF00] border-4 border-black shadow-[6px_6px_0px_#000] flex items-center justify-center mb-6">
              <BotIcon size={48} className="text-black" />
            </div>
            <h3 className="text-2xl font-black text-black mb-3 uppercase">
              START A CONVERSATION
            </h3>
            <p className="text-base font-semibold text-black/60 max-w-md uppercase">
              Ask questions about your documents and I&apos;ll find relevant
              information
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onMessageClick={onMessageClick}
              onSourcesBadgeClick={onSourcesBadgeClick}
              isSelected={selectedMessageId === message.id}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mb-2 p-3 bg-[#FF006E] border-4 border-black text-white font-bold text-sm flex items-center justify-between shadow-[4px_4px_0px_#000]">
          <span>⚠️ {error}</span>
          {onClearError && (
            <button
              onClick={onClearError}
              className="ml-2 p-1 hover:bg-black/20 rounded"
            >
              <XIcon size={16} />
            </button>
          )}
        </div>
      )}

      {/* Input Area - Modern Chat Style */}
      <div className="flex-shrink-0 border-t-3 md:border-t-4 border-black p-3 md:p-4 bg-[#FFFEF0]">
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-end gap-2">
            {/* Input */}
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  // Auto-resize textarea
                  e.target.style.height = "auto";
                  const newHeight = Math.min(e.target.scrollHeight, 150);
                  e.target.style.height = newHeight + "px";
                  // Only show scrollbar when content exceeds max height
                  e.target.style.overflowY =
                    e.target.scrollHeight > 150 ? "auto" : "hidden";
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question..."
                rows={1}
                className="w-full px-4 py-3 md:px-5 md:py-4 border-3 border-black bg-white text-black font-semibold placeholder:text-black/50 placeholder:font-medium rounded-2xl shadow-[3px_3px_0px_#000] focus:outline-none focus:shadow-[4px_4px_0px_#000] focus:border-[#FF006E] resize-none transition-all text-base overflow-y-hidden"
                style={{ minHeight: "48px", maxHeight: "150px" }}
              />
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="flex-shrink-0 w-12 h-12 md:w-14 md:h-14 flex items-center justify-center bg-[#FF006E] text-white border-3 border-black rounded-full shadow-[3px_3px_0px_#000] hover:shadow-[4px_4px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-[1px_1px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[3px_3px_0px_#000] disabled:hover:translate-x-0 disabled:hover:translate-y-0"
            >
              <SendIcon size={20} />
            </button>
          </div>
        </form>
      </div>

      {/* Hidden Settings Dropdown - can be triggered from overflow menu */}
      <SettingsDropdown
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onUpdate={onUpdateSettings}
      />
    </div>
  );
};

// Source Detail Modal - NEO-BRUTALIST
interface SourceDetailModalProps {
  source: Source | null;
  isOpen: boolean;
  onClose: () => void;
}

const SourceDetailModal: React.FC<SourceDetailModalProps> = ({
  source,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !source) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="bg-white border-4 border-black max-w-3xl w-full max-h-[80vh] flex flex-col animate-slideInUp"
        style={{ boxShadow: "8px 8px 0px #000000" }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#00FFFF] border-b-4 border-black">
          <h2 className="text-xl font-black text-black uppercase tracking-tight flex items-center gap-2">
            <FileTextIcon size={24} />
            SOURCE DETAILS
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-black text-white flex items-center justify-center hover:bg-[#FF006E] transition-colors border-2 border-black"
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#FFFEF0] space-y-4">
          {/* Document Info */}
          <div className="p-4 bg-[#FFFF00] border-4 border-black shadow-[4px_4px_0px_#000]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-black text-black uppercase">
                {source.document_name}
              </h3>
              <span className="px-3 py-1 bg-white border-2 border-black text-xs font-black">
                SCORE: {(source.score * 100).toFixed(1)}%
              </span>
            </div>
            <p className="text-sm font-bold text-black/70">
              PAGE {source.page_number}
            </p>
            {source.metadata && (
              <p className="text-xs font-bold text-black/60 mt-1">
                Document ID: {source.document_id}
              </p>
            )}
          </div>

          {/* Full Content */}
          <div className="p-4 bg-white border-4 border-black shadow-[4px_4px_0px_#000]">
            <h4 className="text-sm font-black text-black uppercase mb-3 flex items-center gap-2">
              <span className="inline-block w-3 h-3 bg-[#FF006E] border-2 border-black"></span>
              FULL CONTENT
            </h4>
            <div className="prose prose-sm max-w-none">
              <p className="text-sm font-semibold text-black leading-relaxed whitespace-pre-wrap">
                {source.chunk_text}
              </p>
            </div>
          </div>

          {/* Metadata Section */}
          {source.metadata && Object.keys(source.metadata).length > 0 && (
            <div className="p-4 bg-[#CCFF00] border-4 border-black shadow-[4px_4px_0px_#000]">
              <h4 className="text-sm font-black text-black uppercase mb-3 flex items-center gap-2">
                <span className="inline-block w-3 h-3 bg-[#00FFFF] border-2 border-black"></span>
                METADATA
              </h4>
              <div className="space-y-2">
                {Object.entries(source.metadata).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <span className="text-xs font-black text-black/60 uppercase min-w-[100px]">
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

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 bg-white border-t-4 border-black">
          <Button variant="secondary" onClick={onClose}>
            CLOSE
          </Button>
        </div>
      </div>
    </div>
  );
};

// Sources Panel Component - NEO-BRUTALIST
interface SourcesPanelProps {
  sources: Source[];
  activeSource: Source | null;
  onSourceSelect: (source: Source | null) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const SourcesPanel: React.FC<SourcesPanelProps> = ({
  sources,
  activeSource,
  onSourceSelect,
  isOpen,
  onToggle,
}) => {
  const [showModal, setShowModal] = React.useState(false);
  const [modalSource, setModalSource] = React.useState<Source | null>(null);

  const handleViewFull = (source: Source, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalSource(source);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setModalSource(null);
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed right-4 top-1/2 -translate-y-1/2 bg-[#FFFF00] p-3 border-4 border-black shadow-[4px_4px_0px_#000] text-black hover:shadow-[6px_6px_0px_#000] hover:translate-x-[-2px] transition-all duration-100"
      >
        <ChevronDownIcon size={20} className="-rotate-90" />
      </button>
    );
  }

  return (
    <div className="w-80 bg-white border-l-4 border-black flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b-4 border-black bg-[#CCFF00]">
        <h3 className="font-black text-black uppercase">SOURCES</h3>
        <button
          onClick={onToggle}
          className="p-1 text-black hover:bg-black hover:text-[#CCFF00] transition-colors duration-100"
        >
          <ChevronDownIcon size={18} className="rotate-90" />
        </button>
      </div>

      {/* Sources List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FFFEF0]">
        {sources.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto bg-[#FFFF00] border-4 border-black shadow-[4px_4px_0px_#000] flex items-center justify-center mb-4">
              <FileTextIcon size={28} className="text-black" />
            </div>
            <p className="text-sm font-bold text-black/60 uppercase">
              Sources appear here when you ask questions
            </p>
          </div>
        ) : (
          sources.map((source, idx) => (
            <div
              key={idx}
              onClick={() =>
                onSourceSelect(activeSource === source ? null : source)
              }
              className={`
                p-4 border-4 border-black cursor-pointer transition-all duration-100
                ${
                  activeSource === source
                    ? "bg-[#FF006E] text-white shadow-[6px_6px_0px_#000] translate-x-[-3px] translate-y-[-3px]"
                    : "bg-white shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px]"
                }
              `}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FileTextIcon size={16} className="shrink-0" />
                  <span
                    className="text-sm font-black uppercase truncate block"
                    title={source.document_name}
                  >
                    {source.document_name}
                  </span>
                </div>
                <span
                  className={`
                  text-xs px-2 py-1 font-black border-2 border-current shrink-0
                  ${
                    activeSource === source
                      ? "text-white border-white"
                      : "text-black"
                  }
                `}
                >
                  {(source.score * 100).toFixed(0)}%
                </span>
              </div>
              <p
                className={`text-xs font-bold mb-2 ${
                  activeSource === source ? "text-white/80" : "text-black/60"
                }`}
              >
                PAGE {source.page_number}
              </p>
              <p
                className={`text-sm font-semibold line-clamp-3 ${
                  activeSource === source ? "text-white/90" : "text-black/80"
                }`}
                title={source.chunk_text}
              >
                {source.chunk_text}
              </p>
              <button
                onClick={(e) => handleViewFull(source, e)}
                className={`
                mt-3 text-xs font-black uppercase flex items-center gap-1
                ${
                  activeSource === source
                    ? "text-white hover:text-[#FFFF00]"
                    : "text-[#FF006E] hover:text-black"
                }
              `}
              >
                <ExternalLinkIcon size={12} />
                VIEW FULL
              </button>
            </div>
          ))
        )}
      </div>

      {/* Source Detail Modal */}
      <SourceDetailModal
        source={modalSource}
        isOpen={showModal}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default ChatArea;
