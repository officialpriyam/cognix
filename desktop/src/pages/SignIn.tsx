import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { ExternalLink, Loader2 } from 'lucide-react';

export default function SignIn() {
  const navigate = useNavigate();
  const { user, isLoading, error, openBrowserAuth, clearError } = useAuthStore();

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  useEffect(() => {
    const init = async () => {
      const { initDeepLinkListener } = await import('@/store/auth');
      initDeepLinkListener();
    };
    init();
  }, []);

  useEffect(() => {
    const unsub = useAuthStore.subscribe((state, prev) => {
      if (state.user && !prev.user) {
        navigate('/');
      }
    });
    return unsub;
  }, [navigate]);

  if (isLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cognix</h1>
          <p className="text-muted-foreground mt-2">Sign in to your account</p>
        </div>

        {error && (
          <div className="p-3 text-sm text-muted-foreground bg-muted rounded-lg">
            {error}
            <button
              onClick={clearError}
              className="ml-2 text-primary hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={openBrowserAuth}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            <ExternalLink className="h-5 w-5" />
            Sign in with browser
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Opens cognix.iampriyam.me in your browser. After authorizing, the app will update automatically.
        </p>
      </div>
    </div>
  );
}
