import React, { useEffect, useState } from 'react';
import { ACCOUNTS } from '@shared/accounts';

interface LineBreakdownProps {
  onGenerate: () => void;
}

export const LineBreakdown: React.FC<LineBreakdownProps> = ({ onGenerate }) => {
  const [line, setLine] = useState('');
  const [source, setSource] = useState('');
  const [language, setLanguage] = useState('korean');
  const [account, setAccount] = useState(ACCOUNTS[0].id);
  const [style, setStyle] = useState('rotate');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading) return;
    let polls = 0;
    const timer = setInterval(async () => {
      polls++;
      if (polls > 120) {
        clearInterval(timer);
        setLoading(false);
        setError('Timed out. Check the server log.');
        return;
      }
      try {
        const lessons = await (await fetch('/api/lessons')).json();
        if (lessons.some((l: any) => l.topic === line && l.type === 'line-breakdown')) {
          clearInterval(timer);
          setLoading(false);
          setLine('');
          onGenerate();
        }
      } catch {}
    }, 1500);
    return () => clearInterval(timer);
  }, [loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!line.trim()) return;
    setError('');
    const response = await fetch('/api/line-breakdown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ line: line.trim(), source, language, account, style })
    });
    if (response.ok) setLoading(true);
    else setError(`Request failed: ${response.status}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 mb-8">
      <div>
        <label className="nb-label mb-2 block">Line</label>
        <input className="nb-input" value={line} onChange={e => setLine(e.target.value)} placeholder="e.g. 우리 깐부잖아" required />
      </div>
      <div>
        <label className="nb-label mb-2 block">Source</label>
        <input className="nb-input" value={source} onChange={e => setSource(e.target.value)} placeholder="e.g. Squid Game, NewJeans – Ditto" />
        <p className="text-sm nb-muted mt-2">Quote the line as text only. Don't use clips or screenshots from the show.</p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="nb-label mb-2 block">Language</label>
          <select className="nb-input" value={language} onChange={e => setLanguage(e.target.value)}>
            <option value="korean">🇰🇷 Korean</option>
            <option value="japanese">🇯🇵 Japanese</option>
          </select>
        </div>
        <div>
          <label className="nb-label mb-2 block">Account</label>
          <select className="nb-input" value={account} onChange={e => setAccount(e.target.value)}>
            {ACCOUNTS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        </div>
        <div>
          <label className="nb-label mb-2 block">Style</label>
          <select className="nb-input" value={style} onChange={e => setStyle(e.target.value)}>
            <option value="rotate">Rotate (A/B test all three)</option>
            <option value="storybook">Storybook (Hanbok art)</option>
            <option value="variety">Variety-show captions</option>
            <option value="notes">Study notes</option>
          </select>
        </div>
      </div>
      {error && <p className="text-red-400">{error}</p>}
      <button type="submit" disabled={loading} className="w-full nb-button px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed">
        {loading ? 'Generating breakdown...' : 'Generate breakdown'}
      </button>
    </form>
  );
};
