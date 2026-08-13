import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

const API_BASE = 'https://cognix.iampriyam.me';

function getAuthToken(): string | null {
  return localStorage.getItem('cognix-token');
}

async function request<T>(
  endpoint: string,
  options: {
    method?: string;
    body?: unknown;
  } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await tauriFetch(`${API_BASE}${endpoint}`, {
    method: (options.method || 'GET') as any,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`;
    try {
      const text = await response.text();
      try {
        const errBody = JSON.parse(text);
        errorMsg = errBody.message || errBody.error || text || errorMsg;
      } catch {
        errorMsg = text || errorMsg;
      }
    } catch {}
    throw new Error(errorMsg);
  }

  const ct = response.headers.get('content-type');
  if (ct?.includes('application/json')) {
    return response.json() as Promise<T>;
  }
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
}

export async function signOut() {
  await request('/api/auth/sign-out', { method: 'POST' });
  localStorage.removeItem('cognix-token');
}

export async function getSession() {
  try {
    return await request<{ user: any; session: any }>('/api/auth/get-session');
  } catch {
    return null;
  }
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  parts?: Array<{ type: string; [key: string]: unknown }>;
  createdAt: string;
}

export interface ChatThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface ChatModel {
  id: string;
  name: string;
  provider: string;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  defaultModel?: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  model: string;
  tools: string[];
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  icon: string;
  nodes: any[];
  edges: any[];
}

export interface McpServer {
  id: string;
  name: string;
  url: string;
  description?: string;
  enabled: boolean;
  tools?: any[];
}

export async function getChatThreads() {
  return request<ChatThread[]>('/api/chat/threads');
}

export async function createChatThread(title: string) {
  return request<ChatThread>('/api/chat/threads', { method: 'POST', body: { title } });
}

export async function getChatModels() {
  return request<ChatModel[]>('/api/chat/models');
}

export async function getUserPreferences() {
  return request<UserPreferences>('/api/user/preferences');
}

export async function updateUserPreferences(prefs: UserPreferences) {
  return request<UserPreferences>('/api/user/preferences', { method: 'PUT', body: prefs });
}

export async function getAgents() {
  return request<Agent[]>('/api/agent');
}

export async function createAgent(agent: Omit<Agent, 'id'>) {
  return request<Agent>('/api/agent', { method: 'POST', body: agent });
}

export async function getWorkflows() {
  return request<Workflow[]>('/api/workflow');
}

export async function getMcpServers() {
  return request<McpServer[]>('/api/mcp');
}

export async function getVoiceChatToken(provider: 'openai' | 'gemini', options: { voice?: string; model?: string }) {
  const endpoint = provider === 'openai' ? '/api/chat/openai-realtime' : '/api/chat/gemini-realtime';
  return request<{ token: string; model: string; systemPrompt: string; voice: string }>(endpoint, { method: 'POST', body: options });
}

export async function streamChat(
  threadId: string,
  message: { role: string; content: string; id: string },
  model?: string,
  onChunk?: (text: string) => void,
  onDone?: () => void,
  onError?: (err: Error) => void
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const response = await tauriFetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id: threadId,
        message,
        chatModel: model || undefined,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('0:')) {
          try {
            const text = JSON.parse(line.slice(2));
            if (typeof text === 'string' && onChunk) {
              onChunk(text);
            }
          } catch {}
        }
      }
    }

    if (onDone) onDone();
  } catch (err) {
    if (onError) onError(err instanceof Error ? err : new Error(String(err)));
  }
}
