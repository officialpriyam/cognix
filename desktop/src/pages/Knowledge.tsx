import { useState, useEffect } from 'react';
import { BookOpen, Loader2 } from 'lucide-react';

const API_BASE = 'https://cognix.iampriyam.me';

interface Archive {
  id: string;
  name: string;
  description?: string;
  itemCount: number;
  createdAt: string;
}

export default function Knowledge() {
  const [archives, setArchives] = useState<Archive[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/archive`, { credentials: 'include' })
      .then((r) => r.json())
      .then(setArchives)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Knowledge</h1>
          <p className="text-muted-foreground mt-1">Manage your knowledge bases and archives</p>
        </div>
      </div>

      <div className="grid gap-4">
        {archives.map((archive) => (
          <div key={archive.id} className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground">{archive.name}</h3>
                {archive.description && (
                  <p className="text-sm text-muted-foreground">{archive.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {archive.itemCount} items
                </p>
              </div>
            </div>
          </div>
        ))}

        {archives.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No knowledge bases yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}