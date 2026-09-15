'use client';

import { useState } from 'react';
import { exportBackup, importBackup } from '@/lib/backup';

export function BackupSettings() {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  return (
    <div className="settings-block backup-panel glass">
      <div className="settings-block-title">Backup &amp; Restore</div>
      <div className="backup-copy">
        Export copies everything: sets, exercise lists, weekly history, to text. Paste it into Notes or
        email it to yourself. Import restores from a saved backup.
      </div>
      <div className="backup-actions">
        <button
          type="button"
          className="btn btn-add"
          onClick={() => {
            try {
              const payload = exportBackup();
              setText(payload);
              setStatus({ kind: 'ok', msg: 'Exported. Copy the text above and save it somewhere safe.' });
            } catch (e) {
              setStatus({
                kind: 'err',
                msg: e instanceof Error ? `Export failed: ${e.message}` : 'Export failed',
              });
            }
          }}
        >
          Export Backup
        </button>
        <button
          type="button"
          className="btn btn-save"
          onClick={() => {
            const result = importBackup(text.trim());
            if (!result.ok) {
              setStatus({
                kind: 'err',
                msg: text.trim() ? 'That backup text looks invalid.' : 'Paste a backup into the box first.',
              });
              return;
            }
            setStatus({ kind: 'ok', msg: 'Restored successfully.' });
          }}
        >
          Import Backup
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Backup text appears here after Export. Paste a backup here before Import."
      />
      {status ? (
        <div className={`status-msg${status.kind === 'err' ? ' err' : ''}`} style={{ display: 'block' }}>
          {status.msg}
        </div>
      ) : null}
    </div>
  );
}
