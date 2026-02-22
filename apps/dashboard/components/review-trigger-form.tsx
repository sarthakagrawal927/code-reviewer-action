'use client';

import { useState } from 'react';
import { clientApiRequest } from './client-api';

type PullRequestOption = {
  id: string;
  prNumber: number;
  title?: string;
};

export function ReviewTriggerForm({ pullRequests }: { pullRequests: PullRequestOption[] }) {
  const [pullRequestId, setPullRequestId] = useState(pullRequests[0]?.id || '');
  const [status, setStatus] = useState('');

  return (
    <section className="panel">
      <h2>Manual Re-Review Trigger</h2>
      <div className="stack">
        <div>
          <label htmlFor="pull-request-id">Pull Request</label>
          <select
            id="pull-request-id"
            value={pullRequestId}
            onChange={event => setPullRequestId(event.target.value)}
          >
            {pullRequests.map(pullRequest => (
              <option key={pullRequest.id} value={pullRequest.id}>
                #{pullRequest.prNumber} {pullRequest.title || ''}
              </option>
            ))}
          </select>
        </div>

        <div className="button-row">
          <button
            type="button"
            className="primary"
            disabled={!pullRequestId}
            onClick={async () => {
              if (!pullRequestId) {
                return;
              }

              try {
                const payload = await clientApiRequest(
                  `/v1/pull-requests/${encodeURIComponent(pullRequestId)}/reviews/trigger`,
                  {
                    method: 'POST',
                    body: JSON.stringify({})
                  }
                );
                setStatus(JSON.stringify(payload, null, 2));
              } catch (error) {
                setStatus(error instanceof Error ? error.message : 'Review trigger failed.');
              }
            }}
          >
            Trigger Review Run
          </button>
        </div>

        {status ? <pre>{status}</pre> : null}
      </div>
    </section>
  );
}
