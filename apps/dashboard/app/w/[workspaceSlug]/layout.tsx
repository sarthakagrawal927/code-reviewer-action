import { notFound, redirect } from 'next/navigation';
import { Sidebar } from '../../../components/sidebar';
import { Topbar } from '../../../components/topbar';
import { getSession, getWorkspaceBySlug } from '../../../lib/platform';

const DEV_BYPASS = process.env.NODE_ENV === 'development' && process.env.DEV_BYPASS === 'true';

export default async function WorkspaceLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;

  if (DEV_BYPASS) {
    const workspace = { slug: workspaceSlug, name: workspaceSlug, id: 'dev-id', role: 'owner' };
    return (
      <div className="workspace-shell">
        <Sidebar workspaceSlug={workspace.slug} workspaceName={workspace.name} userLogin="dev-user" />
        <div className="workspace-main">
          <Topbar workspaceSlug={workspace.slug} />
          <main className="page-content">{children}</main>
        </div>
      </div>
    );
  }

  const session = await getSession();
  if (!session.authenticated || !session.user) {
    redirect('/login');
  }

  const workspace = await getWorkspaceBySlug(workspaceSlug);
  if (!workspace) {
    notFound();
  }

  const userLogin = session.user.githubLogin || session.user.displayName || 'User';

  return (
    <div className="workspace-shell">
      <Sidebar workspaceSlug={workspace.slug} workspaceName={workspace.name} userLogin={userLogin} />
      <div className="workspace-main">
        <Topbar workspaceSlug={workspace.slug} />
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
