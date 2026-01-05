# Frontend Implementation: Vercel AI SDK Integration

## 🎯 Overview

Integrate Vercel AI SDK into the frontend for:
1. **Streaming chat responses** - Real-time token-by-token display
2. **Better UX** - Show responses as they're generated
3. **Type-safe chat management** - Built-in state management
4. **Optimistic updates** - Instant UI feedback

---

## 📦 Why Vercel AI SDK?

### Current Implementation Issues:
- ❌ Custom streaming implementation is complex
- ❌ Manual message state management
- ❌ No retry/error handling
- ❌ Poor loading states

### Vercel AI SDK Benefits:
- ✅ **`useChat` hook** - Complete chat state management
- ✅ **Built-in streaming** - Handles SSE/streaming automatically
- ✅ **Message history** - Manages messages array automatically
- ✅ **Loading states** - `isLoading` built-in
- ✅ **Error handling** - Automatic error recovery
- ✅ **Input management** - `input`, `handleInputChange`, `handleSubmit`
- ✅ **Type-safe** - Full TypeScript support

---

## 🚀 Where to Use Vercel AI SDK

### Primary Use Case: Chat Page
**File**: `rag-compentator/app/chat/page.tsx`

**Replace**: Current mock chat implementation with Vercel AI SDK's `useChat` hook

**Features**:
- Stream responses from backend
- Handle 3 chat modes (namespace, single, multi)
- Display sources alongside streaming responses
- Show typing indicators automatically

### Secondary Use Cases (Future):
1. **AI-powered document summarization** (optional)
2. **Smart search suggestions** (optional)
3. **Document Q&A preview** (optional)

---

## 📋 Implementation Plan

### Phase 1: Install Dependencies ✅
```bash
npm install ai @ai-sdk/openai
# or
pnpm add ai @ai-sdk/openai
```

### Phase 2: Backend Streaming Endpoint ✅
**Already implemented**: `POST /api/v1/chat/stream`

**Verify the backend returns SSE (Server-Sent Events) format**:
```
data: {"content": "DHCP ", "done": false}
data: {"content": "is a ", "done": false}
data: {"content": "protocol...", "done": false}
data: {"sources": [...], "done": true}
```

### Phase 3: Create Custom API Route (CRITICAL)

**Why needed**: Vercel AI SDK's `useChat` expects a Next.js API route that returns `StreamingTextResponse`

**Create**: `rag-compentator/app/api/chat/route.ts`

```typescript
import { StreamingTextResponse, Message as VercelMessage } from 'ai';

export const runtime = 'edge'; // Optional: Use edge runtime for better performance

export async function POST(req: Request) {
  try {
    const { messages, mode, namespace_id, document_id, document_ids, temperature, max_tokens, top_k, use_hybrid_search } = await req.json();

    // Get the last user message
    const lastMessage = messages[messages.length - 1];
    const userMessage = lastMessage.content;

    // Call your Python backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/api/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: userMessage,
        mode,
        namespace_id,
        document_id,
        document_ids,
        temperature: temperature || 0.3,
        max_tokens: max_tokens || 1000,
        top_k: top_k || 5,
        use_hybrid_search: use_hybrid_search !== false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.statusText}`);
    }

    const data = await response.json();

    // Convert backend response to streaming format
    // Option 1: If backend doesn't stream, fake it for smooth UX
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Split response into chunks for streaming effect
        const words = data.response.split(' ');
        for (let i = 0; i < words.length; i++) {
          const chunk = words[i] + (i < words.length - 1 ? ' ' : '');
          controller.enqueue(encoder.encode(chunk));
          await new Promise(resolve => setTimeout(resolve, 30)); // Delay for effect
        }
        
        // Send sources as metadata at the end
        if (data.sources && data.sources.length > 0) {
          const sourcesData = JSON.stringify({ sources: data.sources, metadata: data.metadata });
          controller.enqueue(encoder.encode(`\n\n__SOURCES__:${sourcesData}`));
        }
        
        controller.close();
      },
    });

    return new StreamingTextResponse(stream);

  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(JSON.stringify({ error: 'Failed to process chat request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
```

**Alternative (if backend already streams)**:
```typescript
// If your backend already returns SSE format
const response = await fetch(`${backendUrl}/api/v1/chat/stream`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: userMessage, mode, ... }),
});

// Simply proxy the stream
return new StreamingTextResponse(response.body);
```

### Phase 4: Update Chat Page Component

**File**: `rag-compentator/app/chat/page.tsx`

```typescript
"use client";

import React, { useState } from "react";
import { useChat } from "ai/react";
import { Sidebar } from "@/components/ui/Sidebar";
import { ModeSelector } from "@/components/ui/ModeSelector";
import { ChatArea, SourcesPanel } from "@/components/chat/ChatArea";
import { ChatMode, Source } from "@/lib/types";

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sourcesPanelOpen, setSourcesPanelOpen] = useState(true);
  const [chatMode, setChatMode] = useState<ChatMode>("namespace");
  const [selectedNamespace, setSelectedNamespace] = useState<string>("ns1");
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [activeSource, setActiveSource] = useState<Source | null>(null);

  // 🚀 Vercel AI SDK - useChat Hook
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    setMessages,
  } = useChat({
    api: "/api/chat", // Points to your Next.js API route
    body: {
      mode: chatMode,
      namespace_id: chatMode === "namespace" ? selectedNamespace : undefined,
      document_id: chatMode === "single" ? selectedDocuments[0] : undefined,
      document_ids: chatMode === "multi" ? selectedDocuments : undefined,
      temperature: 0.3,
      max_tokens: 1000,
      top_k: 5,
      use_hybrid_search: true,
    },
    onResponse: (response) => {
      console.log("Response received:", response);
    },
    onFinish: (message) => {
      // Extract sources from the message if embedded
      const content = message.content;
      const sourcesMatch = content.match(/__SOURCES__:(.+)$/);
      
      if (sourcesMatch) {
        try {
          const sourcesData = JSON.parse(sourcesMatch[1]);
          setSources(sourcesData.sources || []);
          
          // Clean the message content to remove sources marker
          const cleanContent = content.replace(/__SOURCES__:.+$/, '').trim();
          const updatedMessages = messages.map(msg => 
            msg.id === message.id ? { ...msg, content: cleanContent } : msg
          );
          setMessages(updatedMessages);
        } catch (e) {
          console.error("Failed to parse sources:", e);
        }
      }
    },
    onError: (error) => {
      console.error("Chat error:", error);
    },
  });

  const handleSourceClick = (source: Source) => {
    setActiveSource(source);
    if (!sourcesPanelOpen) {
      setSourcesPanelOpen(true);
    }
  };

  return (
    <div className="flex h-screen bg-[#FFFEF0]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header with Mode Selector */}
        <header className="h-20 bg-[#CCFF00] border-b-4 border-black">
          <ModeSelector 
            mode={chatMode} 
            onChange={setChatMode}
          />
        </header>

        {/* Chat Messages Area */}
        <ChatArea
          messages={messages.map(msg => ({
            id: msg.id,
            role: msg.role as "user" | "assistant",
            content: msg.content,
            timestamp: new Date().toISOString(),
            isLoading: isLoading && msg.role === "assistant" && !msg.content,
            error: error?.message,
          }))}
          onSourceClick={handleSourceClick}
          isLoading={isLoading}
        />

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="border-t-4 border-black p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Ask a question..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 border-4 border-black text-black font-bold"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-[#FF006E] border-4 border-black font-black text-white hover:bg-[#CCFF00] hover:text-black"
            >
              {isLoading ? "SENDING..." : "SEND"}
            </button>
          </div>
        </form>
      </div>

      {/* Sources Panel */}
      {sourcesPanelOpen && (
        <SourcesPanel
          sources={sources}
          activeSource={activeSource}
          onClose={() => setSourcesPanelOpen(false)}
          onSourceClick={setActiveSource}
        />
      )}
    </div>
  );
}
```

### Phase 5: Update ChatArea Component

**File**: `rag-compentator/components/chat/ChatArea.tsx`

**Key changes**:
- Remove custom streaming logic
- Use messages from `useChat`
- Display streaming content automatically
- Handle loading states with built-in `isLoading`

```typescript
"use client";

import React, { useEffect, useRef } from "react";
import { Message } from "ai/react"; // Use Vercel AI SDK types
import { Source } from "@/lib/types";
import { BotIcon, UserIcon } from "@/components/ui/Icons";

interface ChatAreaProps {
  messages: Message[];
  onSourceClick?: (source: Source) => void;
  isLoading: boolean;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  onSourceClick,
  isLoading,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {messages.length === 0 && (
        <div className="text-center mt-20">
          <h2 className="text-4xl font-black mb-4">START CHATTING</h2>
          <p className="text-lg">Ask questions about your documents</p>
        </div>
      )}

      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          onSourceClick={onSourceClick}
        />
      ))}

      {/* Streaming indicator - shown automatically while content is loading */}
      {isLoading && (
        <div className="flex gap-4 animate-pulse">
          <div className="w-12 h-12 bg-[#00FFFF] border-4 border-black">
            <BotIcon size={20} />
          </div>
          <div className="px-4 py-2">
            <div className="flex gap-2">
              <div className="w-3 h-3 bg-black rounded-full animate-bounce" />
              <div className="w-3 h-3 bg-black rounded-full animate-bounce delay-100" />
              <div className="w-3 h-3 bg-black rounded-full animate-bounce delay-200" />
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};
```

### Phase 6: Handle Sources Display

**Option A: Embed in message content** (Already shown above)
- Backend appends `__SOURCES__:{json}` to response
- Frontend extracts and displays separately

**Option B: Use custom data** (Better approach)
Update API route to use Vercel AI SDK's data field:

```typescript
// In app/api/chat/route.ts
import { StreamingTextResponse } from 'ai';

// After getting response from backend
return new StreamingTextResponse(stream, {
  headers: {
    'X-Sources': JSON.stringify(data.sources),
    'X-Metadata': JSON.stringify(data.metadata),
  },
});

// In chat page
const { messages, data } = useChat({
  // ... config
  onFinish: (message, { finishReason, usage }) => {
    // Access sources from response headers or data
  }
});
```

### Phase 7: Clean Up Old Code

**Delete/Remove**:
1. `lib/hooks/use-chat.ts` - Old custom hook (replaced by Vercel AI SDK)
2. Custom streaming logic in `ChatArea.tsx`
3. Manual message state management
4. `apiClient.sendMessage()` and `apiClient.streamChat()` methods (keep for other features if needed)

---

## 🎨 Enhanced Features with Vercel AI SDK

### 1. **Regenerate Response**
```typescript
const { messages, reload } = useChat({ ... });

// In UI
<button onClick={() => reload()}>Regenerate</button>
```

### 2. **Stop Generation**
```typescript
const { stop, isLoading } = useChat({ ... });

// In UI
{isLoading && (
  <button onClick={stop}>Stop Generating</button>
)}
```

### 3. **Message Editing** (Pro feature)
```typescript
const { messages, setMessages } = useChat({ ... });

const editMessage = (id: string, newContent: string) => {
  setMessages(messages.map(msg => 
    msg.id === id ? { ...msg, content: newContent } : msg
  ));
};
```

### 4. **Optimistic Updates**
```typescript
const { append } = useChat({ ... });

// Add message immediately, then stream response
const handleQuickReply = (question: string) => {
  append({
    role: 'user',
    content: question,
  });
};
```

---

## 🔧 Configuration Options

### Environment Variables
```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
BACKEND_API_KEY=your-optional-api-key
```

### Chat Settings per Mode
```typescript
const getChatConfig = (mode: ChatMode) => {
  switch (mode) {
    case 'namespace':
      return {
        body: {
          mode: 'namespace',
          namespace_id: selectedNamespace,
          temperature: 0.3,
          top_k: 10, // More results for namespace mode
        }
      };
    case 'single':
      return {
        body: {
          mode: 'single',
          document_id: selectedDocuments[0],
          temperature: 0.2, // More precise for single doc
          top_k: 5,
        }
      };
    case 'multi':
      return {
        body: {
          mode: 'multi',
          document_ids: selectedDocuments,
          temperature: 0.3,
          top_k: 8,
        }
      };
  }
};

const { messages } = useChat({
  api: '/api/chat',
  ...getChatConfig(chatMode),
});
```

---

## 📊 Implementation Checklist

### Backend Requirements ✅
- [x] `POST /api/v1/chat` - Returns JSON response
- [x] `POST /api/v1/chat/stream` - Returns SSE stream (optional if you fake it)
- [x] Supports 3 modes (namespace, single, multi)
- [x] Returns sources in response

### Frontend Implementation
- [ ] Install Vercel AI SDK (`ai` package)
- [ ] Create Next.js API route (`app/api/chat/route.ts`)
- [ ] Update chat page to use `useChat` hook
- [ ] Remove old custom streaming logic
- [ ] Update `ChatArea` component for Vercel AI SDK messages
- [ ] Handle sources extraction and display
- [ ] Test all 3 chat modes (namespace, single, multi)
- [ ] Add loading states and error handling
- [ ] Test stop/regenerate functionality

### Nice-to-Have Features
- [ ] Message persistence (save to localStorage)
- [ ] Export chat history
- [ ] Share conversations
- [ ] Voice input integration
- [ ] Multi-language support

---

## 🐛 Troubleshooting

### Issue: "useChat is not working"
**Solution**: Ensure API route returns `StreamingTextResponse`
```typescript
return new StreamingTextResponse(stream);
```

### Issue: "Sources not displaying"
**Solution**: Check if backend includes sources in response, extract correctly in `onFinish`

### Issue: "Streaming is slow"
**Solution**: 
1. Use edge runtime in API route
2. Check backend response time
3. Reduce chunk delay if faking streaming

### Issue: "Messages not persisting"
**Solution**: Use `initialMessages` prop
```typescript
const { messages } = useChat({
  initialMessages: loadedMessages,
});
```

---

## 🚀 Advanced: Real Streaming from Backend

If you want TRUE streaming from your Python backend (recommended for production):

### Backend Change (Python/FastAPI):
```python
from fastapi.responses import StreamingResponse

@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    async def generate():
        # Stream from OpenAI or your LLM
        async for chunk in llm_response:
            yield f"data: {json.dumps({'content': chunk, 'done': False})}\n\n"
        
        # Send sources at the end
        yield f"data: {json.dumps({'sources': sources, 'done': True})}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")
```

### Frontend API Route (Direct Proxy):
```typescript
// app/api/chat/route.ts
export async function POST(req: Request) {
  const body = await req.json();
  
  const response = await fetch(`${BACKEND_URL}/api/v1/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  // Proxy the stream directly
  return new StreamingTextResponse(response.body);
}
```

---

## 📚 Resources

- [Vercel AI SDK Docs](https://sdk.vercel.ai/docs)
- [useChat API Reference](https://sdk.vercel.ai/docs/reference/ai-sdk-ui/use-chat)
- [Streaming Best Practices](https://sdk.vercel.ai/docs/guides/streaming)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

---

**Last Updated**: January 5, 2026  
**Status**: Ready for Implementation  
**Priority**: HIGH - Improves UX significantly with streaming chat
