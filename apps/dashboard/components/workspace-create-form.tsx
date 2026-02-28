'use client';

import { useState } from 'react';
import { clientApiRequest } from './client-api';

export function WorkspaceCreateForm() {
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'organization' | 'personal'>('organization');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <section className="panel">
      <div className="section-head">
        <h2>Create Workspace</h2>
        <p>Organization or personal</p>
      </div>
      <p className="muted">Create an organization or personal workspace and become owner.</p>
      <div className="stack">
        <div className="form-grid">
          <div>
            <label htmlFor="workspace-slug">Slug</label>
            <input id="workspace-slug" value={slug} onChange={event => setSlug(event.target.value)} placeholder="acme" />
          </div>
          <div>
            <label htmlFor="workspace-name">Name</label>
            <input id="workspace-name" value={name} onChange={event => setName(event.target.value)} placeholder="Acme Inc" />
          </div>
          <div>
            <label htmlFor="workspace-kind">Kind</label>
            <select id="workspace-kind" value={kind} onChange={event => setKind(event.target.value as 'organization' | 'personal')}>
              <option value="organization">organization</option>
              <option value="personal">personal</option>
            </select>
          </div>
        </div>

        <div className="button-row">
          <button
            type="button"
            className="primary"
            disabled={busy}
            onClick={async () => {
              try {
                setBusy(true);
                setStatus('Creating workspace...');
                const payload = await clientApiRequest('/v1/workspaces', {
                  method: 'POST',
                  body: JSON.stringify({
                    slug,
                    name,
                    kind
                  })
                });

                if (
                  payload &&
                  typeof payload === 'object' &&
                  'workspace' in payload &&
                  payload.workspace &&
                  typeof payload.workspace === 'object' &&
                  'slug' in payload.workspace &&
                  typeof payload.workspace.slug === 'string'
                ) {
                  setStatus('Workspace created. Redirecting...');
                  window.location.href = `/w/${payload.workspace.slug}/overview`;
                  return;
                }

                setStatus('Workspace created. Refreshing...');
                window.location.reload();
              } catch (error) {
                setStatus(error instanceof Error ? error.message : 'Workspace create failed.');
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Creating...' : 'Create Workspace'}
          </button>
        </div>

        {status ? <div className="status">{status}</div> : null}
      </div>
    </section>
  );
}
