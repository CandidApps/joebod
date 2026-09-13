'use client';

import { useEffect, useState } from 'react';

type Status = { configured: boolean; model: string | null };

export function ClaudeCoachCard() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/coach/status');
        const json = (await res.json()) as Status;
        setStatus(json);
      } catch {
        setStatus({ configured: false, model: null });
      }
    })();
  }, []);

  return (
    <div className="card glass mb14">
      <div className="h-supp-name">Claude Coach</div>
      <div className="h-supp-note" style={{ marginTop: 6 }}>
        Ask for on-demand workouts in the Coach tab. Your weekly Push / Pull / Legs templates stay
        put until you load a Coach session into Log.
      </div>
      <div className="h-supp-note" style={{ marginTop: 10 }}>
        Status:{' '}
        {!status
          ? 'Checking…'
          : status.configured
            ? `Ready${status.model ? ` · ${status.model}` : ''}`
            : 'Not configured — add ANTHROPIC_API_KEY'}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        <a
          className="btn btn-ghost"
          href="https://console.anthropic.com/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
        >
          Anthropic Console
        </a>
      </div>
      {!status?.configured ? (
        <div className="edit-note" style={{ marginTop: 10 }}>
          Local: set <code>ANTHROPIC_API_KEY</code> in <code>.env.local</code>. Phone / Vercel: add
          the same key under Project → Settings → Environment Variables, then redeploy.
        </div>
      ) : null}
    </div>
  );
}
