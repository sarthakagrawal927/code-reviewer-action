import { notFound } from 'next/navigation';
import { GitHubSyncForm } from '../../../../components/github-sync-form';
import { RepositoryIndexingForm } from '../../../../components/repository-indexing-form';
import { getWorkspaceBySlug, platformFetch } from '../../../../lib/platform';

export default async function WorkspaceRepositoriesPage({
  params
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const workspace = await getWorkspaceBySlug(workspaceSlug);
  if (!workspace) {
    notFound();
  }

  const repositoriesResponse = await platformFetch<{
    repositories: Array<{ id: string; fullName: string; defaultBranch?: string; installationId?: string; updatedAt: string }>;
  }>(`/v1/workspaces/${encodeURIComponent(workspace.id)}/repositories`);

  return (
    <>
      <article className="panel span-12">
        <h2>Connected Repositories</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Repository</th>
                <th>Default Branch</th>
                <th>Installation</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {repositoriesResponse.repositories.length === 0 ? (
                <tr>
                  <td colSpan={5}>No repositories connected yet.</td>
                </tr>
              ) : (
                repositoriesResponse.repositories.map(repository => (
                  <tr key={repository.id}>
                    <td>
                      <code>{repository.id}</code>
                    </td>
                    <td>{repository.fullName}</td>
                    <td>{repository.defaultBranch || 'main'}</td>
                    <td>{repository.installationId || 'n/a'}</td>
                    <td>{repository.updatedAt}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>

      <div className="span-6">
        <GitHubSyncForm workspaceId={workspace.id} />
      </div>

      <div className="span-6">
        <RepositoryIndexingForm
          workspaceId={workspace.id}
          repositories={repositoriesResponse.repositories.map(repository => ({
            id: repository.id,
            fullName: repository.fullName
          }))}
        />
      </div>
    </>
  );
}
