import { create } from 'zustand';
import {
  getChatThreads,
  createChatThread,
  type ChatThread,
  type ChatMessage,
} from '@/lib/api';

interface ChatState {
  threads: ChatThread[];
  activeThreadId: string | null;
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  selectedModel: string;
  error: string | null;
  loadThreads: () => Promise<void>;
  selectThread: (id: string) => Promise<void>;
  createThread: (title: string) => Promise<string>;
  sendMessage: (content: string) => Promise<void>;
  setModel: (model: string) => void;
}

const API_BASE = 'https://cognix.iampriyam.me';

export const useChatStore = create<ChatState>((set, get) => ({
  threads: [],
  activeThreadId: null,
  messages: [],
  isLoading: false,
  isStreaming: false,
  selectedModel: '',
  error: null,

  loadThreads: async () => {
    try {
      const threads = await getChatThreads();
      set({ threads });
    } catch (e) {
      console.error('Failed to load threads', e);
    }
  },

  selectThread: async (id: string) => {
    set({ activeThreadId: id, isLoading: true });
    try {
      const res = await fetch(`${API_BASE}/api/chat/threads/${id}`, { credentials: 'include' });
      const data = await res.json();
      set({ messages: data.messages ?? [], isLoading: false });
    } catch {
      set({ isLoading: false, error: 'Failed to load messages' });
    }
  },

  createThread: async (title: string) => {
    const thread = await createChatThread(title);
    set((s) => ({ threads: [thread, ...s.threads], activeThreadId: thread.id }));
    return thread.id;
  },

  sendMessage: async (content: string) => {
    const { activeThreadId, messages, selectedModel } = get();
    if (!activeThreadId) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };

    set({ messages: [...messages, userMsg], isStreaming: true, error: null });

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: activeThreadId,
          message: { role: 'user', content, id: userMsg.id },
          chatModel: selectedModel || undefined,
        }),
      });

      if (!res.ok) throw new Error(`Chat failed: ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let assistantContent = '';
      const assistantId = crypto.randomUUID();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('0:')) {
            try {
              const text = JSON.parse(line.slice(2));
              if (typeof text === 'string') {
                assistantContent += text;
                set((s) => {
                  const msgs = [...s.messages];
                  const last = msgs[msgs.length - 1];
                  if (last?.id === assistantId && last.role === 'assistant') {
                    msgs[msgs.length - 1] = { ...last, content: assistantContent };
                  } else {
                    msgs.push({
                      id: assistantId,
                      role: 'assistant',
                      content: assistantContent,
                      createdAt: new Date().toISOString(),
                    });
                  }
                  return { messages: msgs };
                });
              }
            } catch {
              // skip non-json lines
            }
          }
        }
      }
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to send message' });
    } finally {
      set({ isStreaming: false });
    }
  },

  setModel: (model: string) => set({ selectedModel: model }),
}));