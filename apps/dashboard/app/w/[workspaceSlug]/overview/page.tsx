import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWorkspaceBySlug, platformFetch } from '../../../../lib/platform';

export default async function WorkspaceOverviewPage({
  params
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const workspace = await getWorkspaceBySlug(workspaceSlug);
  if (!workspace) {
    notFound();
  }

  const [installations, repositories, members] = await Promise.all([
    platformFetch<{ installations: Array<{ id: string; installationId: string; accountType: string; accountLogin?: string }> }>(
      `/v1/workspaces/${encodeURIComponent(workspace.id)}/github/installations`
    ),
    platformFetch<{ repositories: Array<{ id: string; fullName: string; defaultBranch?: string; installationId?: string }> }>(
      `/v1/workspaces/${encodeURIComponent(workspace.id)}/repositories`
    ),
    platformFetch<{ members: Array<{ id: string }> }>(`/v1/workspaces/${encodeURIComponent(workspace.id)}/members`)
  ]);

  return (
    <>
      <article className="panel span-4">
        <h2>Workspace</h2>
        <div className="stack">
          <div>
            <strong>Name:</strong> {workspace.name}
          </div>
          <div>
            <strong>Role:</strong> {workspace.role}
          </div>
          <div>
            <strong>Slug:</strong> {workspace.slug}
          </div>
        </div>
      </article>

      <article className="panel span-4">
        <h2>Installations</h2>
        <div className="stack">
          <div>
            <strong>Total:</strong> {installations.installations.length}
          </div>
          {installations.installations.slice(0, 3).map(installation => (
            <div key={installation.id} className="muted">
              #{installation.installationId} ({installation.accountType}/{installation.accountLogin || 'n/a'})
            </div>
          ))}
        </div>
      </article>

      <article className="panel span-4">
        <h2>Repositories</h2>
        <div className="stack">
          <div>
            <strong>Total:</strong> {repositories.repositories.length}
          </div>
          {repositories.repositories.slice(0, 3).map(repository => (
            <div key={repository.id} className="muted">
              {repository.fullName}
            </div>
          ))}
        </div>
      </article>

      <article className="panel span-12">
        <h2>Quick Links</h2>
        <div className="nav" style={{ marginTop: 0 }}>
          <Link href={`/w/${workspace.slug}/repositories`}>Manage Repositories</Link>
          <Link href={`/w/${workspace.slug}/rules`}>Manage Rules</Link>
          <Link href={`/w/${workspace.slug}/pull-requests`}>View Pull Requests</Link>
          <Link href={`/w/${workspace.slug}/settings/members`}>Manage Members</Link>
          <Link href={`/w/${workspace.slug}/settings/audit`}>Audit Log</Link>
        </div>
        <p className="muted" style={{ marginTop: 12 }}>
          Current active members: {members.members.length}
        </p>
      </article>
    </>
  );
}
