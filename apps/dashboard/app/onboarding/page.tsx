import Link from 'next/link';
import { redirect } from 'next/navigation';
import { WorkspaceCreateForm } from '../../components/workspace-create-form';
import { GitHubSyncForm } from '../../components/github-sync-form';
import { LogoutButton } from '../../components/session-actions';
import { getSession, getWorkspaceBySlug, platformFetch } from '../../lib/platform';

export default async function OnboardingPage() {
  const session = await getSession();

  if (!session.authenticated || !session.user) {
    redirect('/login');
  }

  const workspacesResponse = await platformFetch<{ workspaces: Array<{ id: string; slug: string; name: string; role: string }> }>(
    '/v1/workspaces'
  );

  const firstWorkspace = workspacesResponse.workspaces[0];
  const resolvedWorkspace = firstWorkspace ? await getWorkspaceBySlug(firstWorkspace.slug) : null;

  return (
    <main className="shell">
      <section className="hero">
        <span className="eyebrow">Workspace Setup</span>
        <div className="topbar">
          <div>
            <h1>Onboarding</h1>
            <p>Welcome @{session.user.githubLogin}. Create or select a workspace, then sync GitHub installations.</p>
          </div>
          <LogoutButton />
        </div>
      </section>

      <section className="grid">
        <article className="panel span-12">
          <div className="section-head">
            <h2>Existing Workspaces</h2>
            <p>Jump back into any connected environment.</p>
          </div>
          {workspacesResponse.workspaces.length === 0 ? (
            <div className="empty-state">No workspace yet. Create one below.</div>
          ) : (
            <div className="route-list">
              {workspacesResponse.workspaces.map(workspace => (
                <div key={workspace.id} className="route-item">
                  <Link className="muted-link" href={`/w/${workspace.slug}/overview`}>
                    {workspace.name} ({workspace.role})
                  </Link>
                </div>
              ))}
            </div>
          )}
        </article>

        <div className="span-6">
          <WorkspaceCreateForm />
        </div>

        <div className="span-6">
          {resolvedWorkspace ? (
            <GitHubSyncForm workspaceId={resolvedWorkspace.id} />
          ) : (
            <section className="panel">
              <h2>GitHub Installation Sync</h2>
              <p className="muted">Create a workspace first to enable installation sync.</p>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
