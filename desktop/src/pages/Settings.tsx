import { useEffect, useState } from 'react';
import { Save, Loader2, Check } from 'lucide-react';
import { getUserPreferences, updateUserPreferences, type UserPreferences } from '@/lib/api';

export default function Settings() {
  const [prefs, setPrefs] = useState<UserPreferences>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getUserPreferences().then(setPrefs).catch(console.error);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateUserPreferences(prefs);
      setPrefs(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      <div className="space-y-6">
        {/* Theme */}
        <div className="p-6 rounded-xl border border-border bg-card space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Theme</label>
            <div className="flex gap-2">
              {(['light', 'dark', 'system'] as const).map((theme) => (
                <button
                  key={theme}
                  onClick={() => setPrefs((p) => ({ ...p, theme }))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    prefs.theme === theme
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-border hover:bg-accent'
                  }`}
                >
                  {theme.charAt(0).toUpperCase() + theme.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Language */}
        <div className="p-6 rounded-xl border border-border bg-card space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Language</h2>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Preferred Language</label>
            <select
              value={prefs.language || 'en'}
              onChange={(e) => setPrefs((p) => ({ ...p, language: e.target.value }))}
              className="w-full px-3 py-2 border border-input bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="ja">Japanese</option>
              <option value="ko">Korean</option>
              <option value="zh">Chinese</option>
            </select>
          </div>
        </div>

        {/* Server */}
        <div className="p-6 rounded-xl border border-border bg-card space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Server</h2>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Backend URL</label>
            <input
              type="text"
              value="https://cognix.iampriyam.me"
              readOnly
              className="w-full px-3 py-2 border border-input bg-muted rounded-lg text-sm text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">
              The desktop app connects to this server for all operations. No secrets are stored locally.
            </p>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <Check className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}