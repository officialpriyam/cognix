import { useEffect, useState } from 'react';
import { Plus, Bot, Trash2, Loader2 } from 'lucide-react';
import { getAgents, createAgent, type Agent } from '@/lib/api';

const API_BASE = 'https://cognix.iampriyam.me';

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', systemPrompt: '', model: 'gpt-4o' });

  useEffect(() => {
    getAgents().then(setAgents).finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    try {
      const agent = await createAgent(form);
      setAgents((prev) => [agent, ...prev]);
      setShowCreate(false);
      setForm({ name: '', description: '', systemPrompt: '', model: 'gpt-4o' });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/agent/${id}`, { method: 'DELETE', credentials: 'include' });
      setAgents((prev) => prev.filter((a) => a.id !== id));
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
          <h1 className="text-2xl font-bold text-foreground">Agents</h1>
          <p className="text-muted-foreground mt-1">Create and manage AI agents</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Agent
        </button>
      </div>

      {showCreate && (
        <div className="p-6 rounded-xl border border-border bg-card space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Create Agent</h2>
          <input
            placeholder="Agent name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border border-input bg-background rounded-lg text-sm"
          />
          <input
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2 border border-input bg-background rounded-lg text-sm"
          />
          <textarea
            placeholder="System prompt"
            value={form.systemPrompt}
            onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-input bg-background rounded-lg text-sm resize-none"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-accent">
              Cancel
            </button>
            <button onClick={handleCreate} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
              Create
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {agents.map((agent) => (
          <div key={agent.id} className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{agent.name}</h3>
                  <p className="text-sm text-muted-foreground">{agent.description}</p>
                </div>
              </div>
              <button onClick={() => handleDelete(agent.id)} className="p-2 rounded-lg hover:bg-accent text-muted-foreground">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        {agents.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No agents yet. Create one to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}