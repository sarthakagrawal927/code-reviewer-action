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
          <h2>Existing Workspaces</h2>
          {workspacesResponse.workspaces.length === 0 ? (
            <p className="muted">No workspace yet. Create one below.</p>
          ) : (
            <div className="stack">
              {workspacesResponse.workspaces.map(workspace => (
                <div key={workspace.id}>
                  <Link href={`/w/${workspace.slug}/overview`}>
                    {workspace.name} <span className="muted">({workspace.role})</span>
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
