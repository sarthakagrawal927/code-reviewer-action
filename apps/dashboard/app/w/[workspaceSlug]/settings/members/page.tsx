import { notFound } from 'next/navigation';
import { MembersPanel } from '../../../../../components/members-panel';
import { getWorkspaceBySlug, platformFetch } from '../../../../../lib/platform';

export default async function WorkspaceMembersPage({
  params
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const workspace = await getWorkspaceBySlug(workspaceSlug);
  if (!workspace) {
    notFound();
  }

  const membersResponse = await platformFetch<{
    members: Array<{
      id: string;
      githubLogin: string;
      role: 'owner' | 'admin' | 'member' | 'viewer';
      status: 'active' | 'invited' | 'suspended' | 'removed';
    }>;
  }>(`/v1/workspaces/${encodeURIComponent(workspace.id)}/members`);

  return (
    <>
      <article className="page-card span-12">
        <h2 className="page-title">Members and Access</h2>
        <p className="page-subtitle">
          View active users, invite collaborators, and update role or status with workspace-scoped RBAC.
        </p>
      </article>
      <article className="panel span-12">
        <div className="section-head">
          <h2>Active Membership</h2>
          <p>{membersResponse.members.length} members</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Member ID</th>
                <th>GitHub Login</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {membersResponse.members.map(member => (
                <tr key={member.id}>
                  <td>
                    <code>{member.id}</code>
                  </td>
                  <td>{member.githubLogin || '-'}</td>
                  <td>{member.role}</td>
                  <td>{member.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="span-12">
        <MembersPanel workspaceId={workspace.id} members={membersResponse.members} />
      </article>
    </>
  );
}
