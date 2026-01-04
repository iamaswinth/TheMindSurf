"use client";

import React, { useState, useRef, useEffect } from "react";
import { Message, Source, ChatSettings } from "@/lib/types";
import { Button, Switch, Slider } from "@/components/ui/Components";
import {
  SendIcon,
  SettingsIcon,
  PaperclipIcon,
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

// Source Citation Pill - NEO-BRUTALIST
interface SourcePillProps {
  source: Source;
  onClick: () => void;
}

const SourcePill: React.FC<SourcePillProps> = ({ source, onClick }) => (
  <button onClick={onClick} className="source-pill">
    <FileTextIcon size={12} />
    <span className="font-bold">{source.document_name}</span>
    <span className="font-bold">P.{source.page_number}</span>
  </button>
);

// Message Component - NEO-BRUTALIST
interface MessageBubbleProps {
  message: Message;
  onSourceClick?: (source: Source) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onSourceClick,
}) => {
  const isUser = message.role === "user";

  if (message.isLoading) {
    return (
      <div className="flex gap-4 animate-fadeIn">
        <div className="flex-shrink-0 w-12 h-12 bg-[#00FFFF] border-4 border-black flex items-center justify-center shadow-[4px_4px_0px_#000]">
          <BotIcon size={20} className="text-black" />
        </div>
        <div className="message-ai px-4 py-2">
          <TypingIndicator />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex gap-4 animate-slideInUp ${
        isUser ? "flex-row-reverse" : ""
      }`}
    >
      <div
        className={`
          flex-shrink-0 w-12 h-12 border-4 border-black flex items-center justify-center shadow-[4px_4px_0px_#000]
          ${isUser ? "bg-[#FF006E]" : "bg-[#00FFFF]"}
        `}
      >
        {isUser ? (
          <UserIcon size={20} className="text-white" />
        ) : (
          <BotIcon size={20} className="text-black" />
        )}
      </div>

      <div className={`max-w-[70%] ${isUser ? "items-end" : "items-start"}`}>
        <div className={isUser ? "message-user" : "message-ai"}>
          <div className="px-5 py-4">
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

        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {message.sources.map((source, idx) => (
              <SourcePill
                key={idx}
                source={source}
                onClick={() => onSourceClick?.(source)}
              />
            ))}
          </div>
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
  onSourceClick: (source: Source) => void;
  onUpdateSettings: (settings: Partial<ChatSettings>) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  isLoading,
  settings,
  onSendMessage,
  onSourceClick,
  onUpdateSettings,
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
    <div className="flex flex-col h-full bg-white border-4 border-black shadow-[8px_8px_0px_#000]">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FFFEF0]">
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
              onSourceClick={onSourceClick}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - NEO-BRUTALIST */}
      <div className="border-t-4 border-black p-4 bg-[#00FFFF]">
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-end gap-3">
            {/* Settings Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className={`
                  p-3 border-4 border-black transition-all duration-100
                  ${
                    showSettings
                      ? "bg-[#FF006E] text-white shadow-[2px_2px_0px_#000]"
                      : "bg-white text-black shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px]"
                  }
                `}
              >
                <SettingsIcon size={20} />
              </button>
              <SettingsDropdown
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                settings={settings}
                onUpdate={onUpdateSettings}
              />
            </div>

            {/* Attachment Button */}
            <button
              type="button"
              className="p-3 bg-white text-black border-4 border-black shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-100"
            >
              <PaperclipIcon size={20} />
            </button>

            {/* Input */}
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="TYPE YOUR QUESTION..."
                rows={1}
                className="w-full px-5 py-4 border-4 border-black bg-white text-black font-semibold placeholder:text-black/40 placeholder:font-bold placeholder:uppercase shadow-[4px_4px_0px_#000] focus:outline-none focus:shadow-[6px_6px_0px_#000] resize-none"
                style={{ maxHeight: "150px" }}
              />
            </div>

            {/* Send Button */}
            <Button
              type="submit"
              variant="primary"
              disabled={!input.trim() || isLoading}
              className="flex-shrink-0"
            >
              <SendIcon size={18} />
              <span className="ml-2">SEND</span>
            </Button>
          </div>
        </form>
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
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileTextIcon size={16} />
                  <span className="text-sm font-black uppercase truncate">
                    {source.document_name}
                  </span>
                </div>
                <span
                  className={`
                  text-xs px-2 py-1 font-black border-2 border-current
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
              >
                {source.chunk_text}
              </p>
              <button
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
    </div>
  );
};

export default ChatArea;
