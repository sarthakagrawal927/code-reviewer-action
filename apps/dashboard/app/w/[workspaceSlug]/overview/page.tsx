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
        <div className="section-head">
          <h2>Workspace</h2>
          <p>Identity</p>
        </div>
        <div className="kv-list">
          <div className="kv-row">
            <strong>Name</strong>
            <span>{workspace.name}</span>
          </div>
          <div className="kv-row">
            <strong>Role</strong>
            <span>{workspace.role}</span>
          </div>
          <div className="kv-row">
            <strong>Slug</strong>
            <span>{workspace.slug}</span>
          </div>
        </div>
      </article>

      <article className="panel span-4">
        <div className="section-head">
          <h2>Installations</h2>
          <p>Connected providers</p>
        </div>
        <div className="kv-list">
          <div className="kv-row">
            <strong>Total</strong>
            <span>{installations.installations.length}</span>
          </div>
          {installations.installations.slice(0, 3).map(installation => (
            <div className="kv-row" key={installation.id}>
              <strong>#{installation.installationId}</strong>
              <span>
                {installation.accountType}/{installation.accountLogin || 'n/a'}
              </span>
            </div>
          ))}
        </div>
      </article>

      <article className="panel span-4">
        <div className="section-head">
          <h2>Repositories</h2>
          <p>Active scope</p>
        </div>
        <div className="kv-list">
          <div className="kv-row">
            <strong>Total</strong>
            <span>{repositories.repositories.length}</span>
          </div>
          {repositories.repositories.slice(0, 3).map(repository => (
            <div className="kv-row" key={repository.id}>
              <strong>Repo</strong>
              <span>{repository.fullName}</span>
            </div>
          ))}
        </div>
      </article>

      <article className="panel span-12">
        <div className="section-head">
          <h2>Quick Links</h2>
          <p>Current active members: {members.members.length}</p>
        </div>
        <div className="route-list">
          <div className="route-item">
            <Link className="muted-link" href={`/w/${workspace.slug}/repositories`}>
              Manage Repositories
            </Link>
          </div>
          <div className="route-item">
            <Link className="muted-link" href={`/w/${workspace.slug}/rules`}>
              Manage Rules
            </Link>
          </div>
          <div className="route-item">
            <Link className="muted-link" href={`/w/${workspace.slug}/pull-requests`}>
              View Pull Requests
            </Link>
          </div>
          <div className="route-item">
            <Link className="muted-link" href={`/w/${workspace.slug}/settings/members`}>
              Manage Members
            </Link>
          </div>
          <div className="route-item">
            <Link className="muted-link" href={`/w/${workspace.slug}/settings/audit`}>
              Audit Log
            </Link>
          </div>
        </div>
      </article>
    </>
  );
}
