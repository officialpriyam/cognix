import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithProvider: (provider: string) => Promise<string>;
  signOut: () => Promise<void>;
  checkSession: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      error: null,

      signIn: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.signInEmail(email, password);
          const user = res?.user || res?.data?.user;
          if (user) {
            set({ user, isLoading: false });
          } else {
            throw new Error('Invalid response from server');
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Sign in failed';
          set({ error: msg, isLoading: false });
          throw error;
        }
      },

      signUp: async (email: string, password: string, name: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.signUpEmail(email, password, name);
          const user = res?.user || res?.data?.user;
          if (user) {
            set({ user, isLoading: false });
          } else {
            throw new Error('Invalid response from server');
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Sign up failed';
          set({ error: msg, isLoading: false });
          throw error;
        }
      },

      signInWithProvider: async (provider: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.signInSocial(provider);
          const url = res?.url || res?.data?.url;
          if (!url) throw new Error('No OAuth URL returned');
          set({ isLoading: false });
          return url;
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'OAuth sign in failed';
          set({ error: msg, isLoading: false });
          throw error;
        }
      },

      signOut: async () => {
        set({ isLoading: true });
        try {
          await api.signOut();
          set({ user: null, isLoading: false });
        } catch (error) {
          set({ user: null, isLoading: false, error: error instanceof Error ? error.message : 'Sign out failed' });
        }
      },

      checkSession: async () => {
        try {
          const res = await api.getSession();
          const user = res?.user || res?.data?.user;
          set({ user: user || null, isLoading: false });
        } catch {
          set({ user: null, isLoading: false });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'cognix-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user }),
    }
  )
);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};