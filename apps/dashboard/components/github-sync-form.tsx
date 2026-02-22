'use client';

import { useState } from 'react';
import { clientApiRequest } from './client-api';

export function GitHubSyncForm({ workspaceId }: { workspaceId: string }) {
  const [installationId, setInstallationId] = useState('');
  const [accountType, setAccountType] = useState<'organization' | 'user'>('organization');
  const [accountId, setAccountId] = useState('');
  const [accountLogin, setAccountLogin] = useState('');
  const [repositoriesJson, setRepositoriesJson] = useState(
    JSON.stringify(
      [
        {
          owner: 'owner',
          name: 'repo',
          defaultBranch: 'main',
          isPrivate: true
        }
      ],
      null,
      2
    )
  );
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <section className="panel">
      <h2>GitHub Installation Sync</h2>
      <p className="muted">Sync organization or personal installation repositories into workspace records.</p>
      <div className="stack">
        <div className="form-grid">
          <div>
            <label htmlFor="installation-id">Installation ID</label>
            <input id="installation-id" value={installationId} onChange={event => setInstallationId(event.target.value)} />
          </div>
          <div>
            <label htmlFor="account-type">Account Type</label>
            <select id="account-type" value={accountType} onChange={event => setAccountType(event.target.value as 'organization' | 'user')}>
              <option value="organization">organization</option>
              <option value="user">user</option>
            </select>
          </div>
          <div>
            <label htmlFor="account-id">Account ID</label>
            <input id="account-id" value={accountId} onChange={event => setAccountId(event.target.value)} />
          </div>
          <div>
            <label htmlFor="account-login">Account Login</label>
            <input id="account-login" value={accountLogin} onChange={event => setAccountLogin(event.target.value)} />
          </div>
        </div>

        <div>
          <label htmlFor="repositories-json">Repositories JSON (optional if API has GITHUB_SYNC_TOKEN)</label>
          <textarea
            id="repositories-json"
            value={repositoriesJson}
            onChange={event => setRepositoriesJson(event.target.value)}
          />
        </div>

        <div className="button-row">
          <button
            type="button"
            className="primary"
            disabled={busy}
            onClick={async () => {
              try {
                setBusy(true);
                setStatus('Syncing installation repositories...');

                let repositories: unknown = undefined;
                if (repositoriesJson.trim()) {
                  repositories = JSON.parse(repositoriesJson);
                }

                const payload = await clientApiRequest(`/v1/workspaces/${encodeURIComponent(workspaceId)}/github/sync`, {
                  method: 'POST',
                  body: JSON.stringify({
                    installationId,
                    accountType,
                    accountId,
                    accountLogin,
                    repositories
                  })
                });

                setStatus(JSON.stringify(payload, null, 2));
              } catch (error) {
                setStatus(error instanceof Error ? error.message : 'Sync failed.');
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Syncing...' : 'Sync Installation'}
          </button>
        </div>

        {status ? <pre>{status}</pre> : null}
      </div>
    </section>
  );
}
