import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getSession, signOut as apiSignOut } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  authState: string | null;
  openBrowserAuth: () => void;
  handleDeepLink: (url: string) => void;
  signOut: () => Promise<void>;
  checkSession: () => Promise<void>;
  clearError: () => void;
}

function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,
      authState: null,

      openBrowserAuth: async () => {
        const state = generateState();
        set({ authState: state, error: null });
        const url = `https://cognix.iampriyam.me/app-auth?state=${state}`;
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          await invoke('open_url', { url });
        } catch (e) {
          console.error('Failed to open browser:', e);
          window.open(url, '_blank');
        }
        set({ error: 'Complete sign-in in your browser. The app will update automatically.' });
      },

      handleDeepLink: async (url: string) => {
        try {
          const parsed = new URL(url);
          const token = parsed.searchParams.get('token');
          const state = parsed.searchParams.get('state');
          const errorParam = parsed.searchParams.get('error');

          if (errorParam) {
            set({ error: errorParam, isLoading: false });
            return;
          }

          if (!token) {
            set({ error: 'No token received from authentication.', isLoading: false });
            return;
          }

          const savedState = get().authState;
          if (savedState && state && state !== savedState) {
            set({ error: 'Authentication state mismatch. Please try again.', isLoading: false });
            return;
          }

          localStorage.setItem('cognix-token', token);
          set({ token, authState: null, isLoading: true, error: null });

          const res = await getSession();
          if (res?.user) {
            set({ user: res.user as User, isLoading: false, error: null });
          } else {
            set({ user: null, token: null, isLoading: false, error: 'Session expired. Please sign in again.' });
            localStorage.removeItem('cognix-token');
          }
        } catch {
          set({ error: 'Failed to process authentication response.', isLoading: false });
        }
      },

      signOut: async () => {
        set({ isLoading: true });
        try {
          await apiSignOut();
        } catch {}
        localStorage.removeItem('cognix-token');
        set({ user: null, token: null, isLoading: false });
      },

      checkSession: async () => {
        set({ isLoading: true });
        try {
          const res = await getSession();
          const user = res?.user;
          if (user) {
            set({ user, isLoading: false, error: null });
          } else {
            localStorage.removeItem('cognix-token');
            set({ user: null, token: null, isLoading: false });
          }
        } catch {
          localStorage.removeItem('cognix-token');
          set({ user: null, token: null, isLoading: false });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'cognix-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);

export function initDeepLinkListener() {
  const setup = async () => {
    try {
      const { getCurrent, onOpenUrl } = await import('@tauri-apps/plugin-deep-link');

      const startUrls = await getCurrent();
      if (startUrls && startUrls.length > 0) {
        for (const url of startUrls) {
          if (url.startsWith('cognix://')) {
            useAuthStore.getState().handleDeepLink(url);
          }
        }
      }

      await onOpenUrl((urls: string[]) => {
        for (const url of urls) {
          if (url.startsWith('cognix://')) {
            useAuthStore.getState().handleDeepLink(url);
          }
        }
      });
    } catch {
      console.warn('Deep link listener not available (running in browser?)');
    }
  };

  setup();
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};
