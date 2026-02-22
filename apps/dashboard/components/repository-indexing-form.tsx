'use client';

import { useState } from 'react';
import { clientApiRequest } from './client-api';

type RepositoryOption = {
  id: string;
  fullName: string;
};

export function RepositoryIndexingForm({
  workspaceId,
  repositories
}: {
  workspaceId: string;
  repositories: RepositoryOption[];
}) {
  const [repositoryId, setRepositoryId] = useState(repositories[0]?.id || '');
  const [sourceRef, setSourceRef] = useState('main');
  const [status, setStatus] = useState('');

  return (
    <section className="panel">
      <h2>Indexing Trigger</h2>
      <p className="muted">Queue indexing runs per connected repository.</p>
      <div className="stack">
        <div className="form-grid">
          <div>
            <label htmlFor="repository-select">Repository</label>
            <select
              id="repository-select"
              value={repositoryId}
              onChange={event => setRepositoryId(event.target.value)}
            >
              {repositories.map(repository => (
                <option key={repository.id} value={repository.id}>
                  {repository.fullName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="source-ref">Source Ref</label>
            <input id="source-ref" value={sourceRef} onChange={event => setSourceRef(event.target.value)} />
          </div>
        </div>

        <div className="button-row">
          <button
            type="button"
            className="primary"
            disabled={!repositoryId}
            onClick={async () => {
              if (!repositoryId) {
                return;
              }

              try {
                const payload = await clientApiRequest(
                  `/v1/workspaces/${encodeURIComponent(workspaceId)}/repositories/${encodeURIComponent(repositoryId)}/indexing/trigger`,
                  {
                    method: 'POST',
                    body: JSON.stringify({
                      sourceRef
                    })
                  }
                );
                setStatus(JSON.stringify(payload, null, 2));
              } catch (error) {
                setStatus(error instanceof Error ? error.message : 'Indexing trigger failed.');
              }
            }}
          >
            Trigger Indexing
          </button>
        </div>

        {status ? <pre>{status}</pre> : null}
      </div>
    </section>
  );
}
