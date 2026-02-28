import Link from 'next/link';

export function WorkspaceNav({ workspaceSlug }: { workspaceSlug: string }) {
  const prefix = `/w/${workspaceSlug}`;

  return (
    <nav className="workspace-nav">
      <Link href={`${prefix}/overview`}>Overview</Link>
      <Link href={`${prefix}/repositories`}>Repositories</Link>
      <Link href={`${prefix}/rules`}>Rules</Link>
      <Link href={`${prefix}/pull-requests`}>Pull Requests</Link>
      <Link href={`${prefix}/settings/members`}>Members</Link>
      <Link href={`${prefix}/settings/audit`}>Audit</Link>
    </nav>
  );
}
