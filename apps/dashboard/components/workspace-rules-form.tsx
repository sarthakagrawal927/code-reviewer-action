'use client';

import { useState } from 'react';
import { clientApiRequest } from './client-api';

type RepositoryOption = {
  id: string;
  fullName: string;
};

export function WorkspaceRulesForm({
  workspaceId,
  initialConfig,
  repositories
}: {
  workspaceId: string;
  initialConfig: unknown;
  repositories: RepositoryOption[];
}) {
  const [workspaceJson, setWorkspaceJson] = useState(JSON.stringify(initialConfig, null, 2));
  const [selectedRepositoryId, setSelectedRepositoryId] = useState(repositories[0]?.id || '');
  const [repositoryJson, setRepositoryJson] = useState(
    JSON.stringify(
      {
        failOnFindings: false,
        failOnSeverity: 'high',
        maxInlineFindings: 5,
        minInlineSeverity: 'medium',
        reviewTone: 'balanced',
        blockedPatterns: [],
        requiredChecks: [],
        severityThresholds: { low: true, medium: true, high: true, critical: true }
      },
      null,
      2
    )
  );
  const [status, setStatus] = useState('');

  return (
    <div className="stack">
      <section className="panel">
        <h2>Workspace Default Rules</h2>
        <label htmlFor="workspace-rules-json">Rule Config JSON</label>
        <textarea id="workspace-rules-json" value={workspaceJson} onChange={event => setWorkspaceJson(event.target.value)} />
        <div className="button-row">
          <button
            type="button"
            className="primary"
            onClick={async () => {
              try {
                const payload = JSON.parse(workspaceJson);
                const response = await clientApiRequest(
                  `/v1/workspaces/${encodeURIComponent(workspaceId)}/rules/default`,
                  {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                  }
                );
                setStatus(`Workspace rules updated:\n${JSON.stringify(response, null, 2)}`);
              } catch (error) {
                setStatus(error instanceof Error ? error.message : 'Workspace rule update failed.');
              }
            }}
          >
            Save Workspace Defaults
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Repository Rule Override</h2>
        <div className="form-grid">
          <div>
            <label htmlFor="repository-id">Repository</label>
            <select
              id="repository-id"
              value={selectedRepositoryId}
              onChange={event => setSelectedRepositoryId(event.target.value)}
            >
              {repositories.map(repository => (
                <option key={repository.id} value={repository.id}>
                  {repository.fullName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label htmlFor="repository-rules-json">Override JSON</label>
        <textarea id="repository-rules-json" value={repositoryJson} onChange={event => setRepositoryJson(event.target.value)} />

        <div className="button-row">
          <button
            type="button"
            className="primary"
            disabled={!selectedRepositoryId}
            onClick={async () => {
              if (!selectedRepositoryId) {
                return;
              }

              try {
                const payload = JSON.parse(repositoryJson);
                const response = await clientApiRequest(
                  `/v1/repositories/${encodeURIComponent(selectedRepositoryId)}/rules`,
                  {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                  }
                );
                setStatus(`Repository rules updated:\n${JSON.stringify(response, null, 2)}`);
              } catch (error) {
                setStatus(error instanceof Error ? error.message : 'Repository rule update failed.');
              }
            }}
          >
            Save Repository Override
          </button>
        </div>
      </section>

      {status ? <pre>{status}</pre> : null}
    </div>
  );
}
