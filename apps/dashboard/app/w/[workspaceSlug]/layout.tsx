import { notFound, redirect } from 'next/navigation';
import { LogoutButton } from '../../../components/session-actions';
import { WorkspaceNav } from '../../../components/workspace-nav';
import { getSession, getWorkspaceBySlug } from '../../../lib/platform';

export default async function WorkspaceLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const session = await getSession();

  if (!session.authenticated || !session.user) {
    redirect('/login');
  }

  const workspace = await getWorkspaceBySlug(workspaceSlug);
  if (!workspace) {
    notFound();
  }

  return (
    <main className="shell">
      <section className="hero">
        <span className="eyebrow">Workspace</span>
        <div className="topbar">
          <div>
            <h1>{workspace.name}</h1>
            <p>
              Workspace slug: <code>{workspace.slug}</code> | Role: <code>{workspace.role}</code>
            </p>
          </div>
          <LogoutButton />
        </div>
        <WorkspaceNav workspaceSlug={workspace.slug} />
      </section>

      <section className="grid">{children}</section>
    </main>
  );
}
