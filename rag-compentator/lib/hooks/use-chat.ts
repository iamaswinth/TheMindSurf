import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../api-client";
import {
  ChatMode,
  ChatSettings,
  Message,
  ChatResponse,
  Source,
} from "../types";
import { useState, useCallback, useRef } from "react";

// ============================================
// CHAT HOOK OPTIONS
// ============================================
export interface UseChatOptions {
  // Mode configuration
  mode: ChatMode;
  namespaceId?: string; // Required for namespace mode
  documentId?: string; // Required for single mode
  documentIds?: string[]; // Required for multi mode

  // Callbacks
  onMessage?: (message: Message) => void;
  onError?: (error: Error) => void;
  onStreamStart?: () => void;
  onStreamEnd?: () => void;
}

// ============================================
// CHAT HOOK RETURN TYPE
// ============================================
export interface UseChatReturn {
  // Actions
  sendMessage: (message: string, settings: ChatSettings) => void;
  sendMessageAsync: (
    message: string,
    settings: ChatSettings
  ) => Promise<ChatResponse>;
  sendStreamingMessage: (
    message: string,
    settings: ChatSettings
  ) => Promise<void>;
  abort: () => void;

  // State
  isLoading: boolean;
  isStreaming: boolean;
  error: Error | null;
  lastResponse: ChatResponse | null;
}

// ============================================
// MAIN CHAT HOOK
// ============================================
export function useChat(options: UseChatOptions): UseChatReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastResponse, setLastResponse] = useState<ChatResponse | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Build chat options based on mode
  const buildChatOptions = useCallback(
    (settings: ChatSettings) => {
      const baseOptions = {
        mode: options.mode,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        topK: settings.topK,
        useHybridSearch: settings.useHybridSearch,
      };

      switch (options.mode) {
        case "namespace":
          return { ...baseOptions, namespaceId: options.namespaceId };
        case "single":
          return { ...baseOptions, documentId: options.documentId };
        case "multi":
          return { ...baseOptions, documentIds: options.documentIds };
        default:
          return baseOptions;
      }
    },
    [options.mode, options.namespaceId, options.documentId, options.documentIds]
  );

  // ============================================
  // REGULAR (NON-STREAMING) CHAT
  // ============================================
  const sendMessageMutation = useMutation({
    mutationFn: async ({
      message,
      settings,
    }: {
      message: string;
      settings: ChatSettings;
    }) => {
      const chatOptions = buildChatOptions(settings);
      console.log("🚀 Sending chat message:", { message, ...chatOptions });
      return apiClient.sendMessage(message, chatOptions);
    },
    onSuccess: (data) => {
      console.log("✅ Chat response received:", data);
      setLastResponse(data);

      if (options.onMessage) {
        options.onMessage({
          id: `msg-${Date.now()}`,
          role: "assistant",
          content: data.response,
          sources: data.sources,
          timestamp: new Date().toISOString(),
        });
      }
    },
    onError: (error) => {
      console.error("❌ Chat error:", error);
      if (options.onError) {
        options.onError(error as Error);
      }
    },
  });

  // ============================================
  // STREAMING CHAT
  // ============================================
  const sendStreamingMessage = useCallback(
    async (message: string, settings: ChatSettings) => {
      setIsStreaming(true);
      options.onStreamStart?.();

      let fullResponse = "";
      let sources: Source[] = [];
      const messageId = `msg-${Date.now()}`;

      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();

      try {
        const chatOptions = buildChatOptions(settings);
        console.log("🌊 Starting streaming chat:", { message, ...chatOptions });

        const reader = await apiClient.streamChat(message, chatOptions);
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            console.log("✅ Stream complete");
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                // Handle content chunk
                if (data.content) {
                  fullResponse += data.content;

                  if (options.onMessage) {
                    options.onMessage({
                      id: messageId,
                      role: "assistant",
                      content: fullResponse,
                      sources: data.sources || sources,
                      timestamp: new Date().toISOString(),
                      isStreaming: true,
                    });
                  }
                }

                // Handle sources update
                if (data.sources) {
                  sources = data.sources;
                }

                // Handle stream completion
                if (data.done) {
                  setLastResponse({
                    response: fullResponse,
                    sources: data.sources || sources,
                    metadata: data.metadata,
                  });

                  if (options.onMessage) {
                    options.onMessage({
                      id: messageId,
                      role: "assistant",
                      content: fullResponse,
                      sources: data.sources || sources,
                      timestamp: new Date().toISOString(),
                      isStreaming: false,
                    });
                  }
                  break;
                }
              } catch (e) {
                console.error("Error parsing SSE data:", e);
              }
            }
          }
        }
      } catch (error) {
        console.error("❌ Streaming error:", error);
        if (options.onError) {
          options.onError(error as Error);
        }
        throw error;
      } finally {
        setIsStreaming(false);
        options.onStreamEnd?.();
        abortControllerRef.current = null;
      }
    },
    [options, buildChatOptions]
  );

  // ============================================
  // ABORT FUNCTION
  // ============================================
  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  }, []);

  return {
    sendMessage: (message: string, settings: ChatSettings) =>
      sendMessageMutation.mutate({ message, settings }),
    sendMessageAsync: (message: string, settings: ChatSettings) =>
      sendMessageMutation.mutateAsync({ message, settings }),
    sendStreamingMessage,
    abort,
    isLoading: sendMessageMutation.isPending,
    isStreaming,
    error: sendMessageMutation.error as Error | null,
    lastResponse,
  };
}

// ============================================
// CHAT VALIDATION HELPERS
// ============================================
export function validateChatMode(
  mode: ChatMode,
  namespaceId?: string,
  documentId?: string,
  documentIds?: string[]
): { valid: boolean; error?: string } {
  switch (mode) {
    case "namespace":
      if (!namespaceId) {
        return {
          valid: false,
          error: "Please select a namespace to chat with",
        };
      }
      break;
    case "single":
      if (!documentId) {
        return { valid: false, error: "Please select a document to chat with" };
      }
      break;
    case "multi":
      if (!documentIds || documentIds.length === 0) {
        return {
          valid: false,
          error: "Please select at least one document to chat with",
        };
      }
      break;
  }
  return { valid: true };
}

// ============================================
// OPTIMISTIC MESSAGE HELPER
// ============================================
export function createUserMessage(content: string): Message {
  return {
    id: `user-${Date.now()}`,
    role: "user",
    content,
    timestamp: new Date().toISOString(),
  };
}

export function createLoadingMessage(): Message {
  return {
    id: `loading-${Date.now()}`,
    role: "assistant",
    content: "",
    timestamp: new Date().toISOString(),
    isLoading: true,
  };
}
