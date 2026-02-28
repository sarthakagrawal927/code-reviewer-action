import { notFound } from 'next/navigation';
import { getWorkspaceBySlug, platformFetch } from '../../../../../lib/platform';

export default async function WorkspaceAuditPage({
  params
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const workspace = await getWorkspaceBySlug(workspaceSlug);
  if (!workspace) {
    notFound();
  }

  const auditResponse = await platformFetch<{
    events: Array<{
      id: string;
      action: string;
      resourceType: string;
      resourceId?: string;
      actorUserId?: string;
      createdAt: string;
      metadata: Record<string, unknown>;
    }>;
  }>(`/v1/workspaces/${encodeURIComponent(workspace.id)}/audit?limit=100`);

  return (
    <>
      <article className="page-card span-12">
        <h2 className="page-title">Audit Timeline</h2>
        <p className="page-subtitle">Immutable workspace activity records for security, compliance, and governance.</p>
      </article>
      <article className="panel span-12">
        <div className="section-head">
          <h2>Audit Events</h2>
          <p>{auditResponse.events.length} events</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Actor</th>
                <th>Metadata</th>
              </tr>
            </thead>
            <tbody>
              {auditResponse.events.length === 0 ? (
                <tr>
                  <td colSpan={5}>No audit logs yet.</td>
                </tr>
              ) : (
                auditResponse.events.map(event => (
                  <tr key={event.id}>
                    <td>{event.createdAt}</td>
                    <td>
                      <code>{event.action}</code>
                    </td>
                    <td>
                      <code>
                        {event.resourceType}
                        {event.resourceId ? `:${event.resourceId}` : ''}
                      </code>
                    </td>
                    <td>{event.actorUserId || '-'}</td>
                    <td>
                      <pre>{JSON.stringify(event.metadata, null, 2)}</pre>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>
    </>
  );
}
