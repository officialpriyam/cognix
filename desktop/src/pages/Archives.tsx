import { useState, useEffect } from 'react';
import { Archive, Loader2, Download } from 'lucide-react';

const API_BASE = 'https://cognix.iampriyam.me';

interface ExportItem {
  id: string;
  title: string;
  createdAt: string;
  messageCount: number;
}

export default function Archives() {
  const [exports, setExports] = useState<ExportItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/export`, { credentials: 'include' })
      .then((r) => r.json())
      .then(setExports)
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Archives</h1>
        <p className="text-muted-foreground mt-1">View and manage exported conversations</p>
      </div>

      <div className="grid gap-4">
        {exports.map((item) => (
          <div key={item.id} className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Archive className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString()} · {item.messageCount} messages
                  </p>
                </div>
              </div>
              <button className="p-2 rounded-lg hover:bg-accent text-muted-foreground">
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        {exports.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Archive className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No archived conversations.</p>
          </div>
        )}
      </div>
    </div>
  );
}