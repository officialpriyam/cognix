const API_BASE = 'https://cognix.iampriyam.me';

class ApiClient {
  private cookieStore: string = '';

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.cookieStore) {
      headers['Cookie'] = this.cookieStore;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    // Capture Set-Cookie from response
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      // Parse cookie name=value pairs
      const parts = setCookie.split(',');
      for (const part of parts) {
        const [nameValue] = part.split(';');
        const eqIdx = nameValue.indexOf('=');
        if (eqIdx > 0) {
          const name = nameValue.substring(0, eqIdx).trim();
          const value = nameValue.substring(eqIdx + 1).trim();
          // Update cookie string
          const cookiePairs = this.cookieStore ? this.cookieStore.split('; ').filter(c => !c.startsWith(name + '=')) : [];
          cookiePairs.push(`${name}=${value}`);
          this.cookieStore = cookiePairs.join('; ');
        }
      }
    }

    if (!response.ok) {
      let errorMsg = `HTTP ${response.status}`;
      try {
        const errBody = await response.json();
        errorMsg = errBody.message || errBody.error || errorMsg;
      } catch {
        try {
          errorMsg = await response.text() || errorMsg;
        } catch {}
      }
      throw new Error(errorMsg);
    }

    const ct = response.headers.get('content-type');
    if (ct?.includes('application/json')) {
      return response.json();
    }
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return text as T;
    }
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(endpoint: string, body: unknown) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  setCookie(name: string, value: string) {
    const pairs = this.cookieStore ? this.cookieStore.split('; ').filter(c => !c.startsWith(name + '=')) : [];
    pairs.push(`${name}=${value}`);
    this.cookieStore = pairs.join('; ');
  }

  getCookie(name: string) {
    const match = this.cookieStore.split('; ').find(c => c.startsWith(name + '='));
    return match ? match.substring(name.length + 1) : undefined;
  }

  clearCookies() {
    this.cookieStore = '';
  }

  async signInEmail(email: string, password: string): Promise<{ user: any; session: any }> {
    return this.post('/api/auth/sign-in/email', {
      email,
      password,
      callbackURL: '/',
    });
  }

  async signUpEmail(email: string, password: string, name: string): Promise<{ user: any; session: any }> {
    return this.post('/api/auth/sign-up/email', {
      email,
      password,
      name,
      callbackURL: '/',
    });
  }

  async signInSocial(provider: string): Promise<{ url: string }> {
    return this.post('/api/auth/sign-in/social', {
      provider,
      callbackURL: '/',
    });
  }

  async signOut(): Promise<void> {
    await this.post('/api/auth/sign-out');
    this.clearCookies();
  }

  async getSession(): Promise<{ user: any; session: any } | null> {
    try {
      return await this.get('/api/auth/get-session');
    } catch {
      return null;
    }
  }
}

export const api = new ApiClient();

// --- Chat ---
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

export interface McpServer {
  id: string;
  name: string;
  url: string;
  description?: string;
  enabled: boolean;
  tools?: McpTool[];
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
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
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

export async function getChatThreads(): Promise<ChatThread[]> {
  return api.get<ChatThread[]>('/api/chat/threads');
}

export async function createChatThread(title: string): Promise<ChatThread> {
  return api.post<ChatThread>('/api/chat/threads', { title });
}

export async function getChatModels(): Promise<ChatModel[]> {
  return api.get<ChatModel[]>('/api/chat/models');
}

export async function getUserPreferences(): Promise<UserPreferences> {
  return api.get<UserPreferences>('/api/user/preferences');
}

export async function updateUserPreferences(prefs: UserPreferences): Promise<UserPreferences> {
  return api.put<UserPreferences>('/api/user/preferences', prefs);
}

export async function getMcpServers(): Promise<McpServer[]> {
  return api.get<McpServer[]>('/api/mcp');
}

export async function createMcpServer(server: Omit<McpServer, 'id'>): Promise<McpServer> {
  return api.post<McpServer>('/api/mcp', server);
}

export async function getAgents(): Promise<Agent[]> {
  return api.get<Agent[]>('/api/agent');
}

export async function createAgent(agent: Omit<Agent, 'id'>): Promise<Agent> {
  return api.post<Agent>('/api/agent', agent);
}

export async function getWorkflows(): Promise<Workflow[]> {
  return api.get<Workflow[]>('/api/workflow');
}

export async function getVoiceChatToken(provider: 'openai' | 'gemini', options: {
  voice?: string;
  model?: string;
}): Promise<{ token: string; model: string; systemPrompt: string; voice: string }> {
  const endpoint = provider === 'openai' ? '/api/chat/openai-realtime' : '/api/chat/gemini-realtime';
  return api.post(endpoint, options);
}
