import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../api-client";
import { ChatMode, ChatSettings, Message } from "../types";
import { useState, useCallback } from "react";

interface UseChatOptions {
  mode: ChatMode;
  namespace?: string;
  documentIds?: string[];
  onMessage?: (message: Message) => void;
  onError?: (error: Error) => void;
}

export function useChat(options: UseChatOptions) {
  const [isStreaming, setIsStreaming] = useState(false);

  // Regular (non-streaming) chat
  const sendMessage = useMutation({
    mutationFn: async ({
      message,
      settings,
    }: {
      message: string;
      settings: ChatSettings;
    }) => {
      return apiClient.sendMessage(message, {
        ...settings,
        mode: options.mode,
        namespace: options.namespace,
        documentIds: options.documentIds,
      });
    },
    onSuccess: (data) => {
      if (options.onMessage) {
        options.onMessage({
          id: Date.now().toString(),
          role: "assistant",
          content: data.response,
          sources: data.sources,
          timestamp: new Date().toISOString(),
        });
      }
    },
    onError: (error) => {
      if (options.onError) {
        options.onError(error as Error);
      }
    },
  });

  // Streaming chat
  const sendStreamingMessage = useCallback(
    async (message: string, settings: ChatSettings) => {
      setIsStreaming(true);
      let fullResponse = "";
      const messageId = Date.now().toString();

      try {
        const reader = await apiClient.streamChat(message, {
          ...settings,
          mode: options.mode,
          namespace: options.namespace,
          documentIds: options.documentIds,
        });

        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            setIsStreaming(false);
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.content) {
                  fullResponse += data.content;

                  if (options.onMessage) {
                    options.onMessage({
                      id: messageId,
                      role: "assistant",
                      content: fullResponse,
                      sources: data.sources,
                      timestamp: new Date().toISOString(),
                      isStreaming: true,
                    });
                  }
                }

                if (data.done) {
                  if (options.onMessage) {
                    options.onMessage({
                      id: messageId,
                      role: "assistant",
                      content: fullResponse,
                      sources: data.sources,
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
        setIsStreaming(false);
        if (options.onError) {
          options.onError(error as Error);
        }
        throw error;
      }
    },
    [options]
  );

  return {
    sendMessage: sendMessage.mutate,
    sendStreamingMessage,
    isLoading: sendMessage.isPending,
    isStreaming,
    error: sendMessage.error,
  };
}
