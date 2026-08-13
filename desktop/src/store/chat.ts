import { create } from 'zustand';
import {
  getChatThreads,
  createChatThread,
  streamChat,
  type ChatThread,
  type ChatMessage,
} from '@/lib/api';

const API_BASE = 'https://cognix.iampriyam.me';

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
    set({ activeThreadId: id, isLoading: true, messages: [] });
    try {
      const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
      const response = await tauriFetch(`${API_BASE}/api/chat/threads/${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      set({ messages: data.messages ?? data ?? [], isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createThread: async (title: string) => {
    const thread = await createChatThread(title);
    set((s) => ({ threads: [thread, ...s.threads], activeThreadId: thread.id, messages: [] }));
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

    const assistantId = crypto.randomUUID();
    let assistantContent = '';

    set({
      messages: [
        ...messages,
        userMsg,
        { id: assistantId, role: 'assistant', content: '', createdAt: new Date().toISOString() },
      ],
      isStreaming: true,
      error: null,
    });

    await streamChat(
      activeThreadId,
      { role: 'user', content, id: userMsg.id },
      selectedModel || undefined,
      (chunk) => {
        assistantContent += chunk;
        set((s) => {
          const msgs = [...s.messages];
          const idx = msgs.findIndex((m) => m.id === assistantId);
          if (idx >= 0) {
            msgs[idx] = { ...msgs[idx], content: assistantContent };
          }
          return { messages: msgs };
        });
      },
      () => set({ isStreaming: false }),
      (err) => set({ error: err.message, isStreaming: false })
    );
  },

  setModel: (model: string) => set({ selectedModel: model }),
}));
