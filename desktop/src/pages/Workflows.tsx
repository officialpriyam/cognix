import { useEffect, useState } from 'react';
import { Workflow as WorkflowIcon, Trash2, Loader2 } from 'lucide-react';
import { getWorkflows, type Workflow } from '@/lib/api';

const API_BASE = 'https://cognix.iampriyam.me';

export default function Workflows() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWorkflows().then(setWorkflows).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/workflow/${id}`, { method: 'DELETE', credentials: 'include' });
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

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
          <h1 className="text-2xl font-bold text-foreground">Workflows</h1>
          <p className="text-muted-foreground mt-1">Create and manage AI workflows</p>
        </div>
      </div>

      <div className="grid gap-4">
        {workflows.map((wf) => (
          <div key={wf.id} className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">
                  {wf.icon || '⚡'}
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{wf.name}</h3>
                  <p className="text-sm text-muted-foreground">{wf.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {wf.nodes?.length ?? 0} nodes · {wf.edges?.length ?? 0} edges
                  </p>
                </div>
              </div>
              <button onClick={() => handleDelete(wf.id)} className="p-2 rounded-lg hover:bg-accent text-muted-foreground">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        {workflows.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <WorkflowIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No workflows yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}