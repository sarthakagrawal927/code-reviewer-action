import { notFound } from 'next/navigation';
import { ReviewTriggerForm } from '../../../../components/review-trigger-form';
import { getWorkspaceBySlug, platformFetch } from '../../../../lib/platform';

type PullRequestRow = {
  id: string;
  repositoryId: string;
  prNumber: number;
  title?: string;
  state: string;
  headSha?: string;
};

export default async function WorkspacePullRequestsPage({
  params
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const workspace = await getWorkspaceBySlug(workspaceSlug);
  if (!workspace) {
    notFound();
  }

  const repositoriesResponse = await platformFetch<{ repositories: Array<{ id: string; fullName: string }> }>(
    `/v1/workspaces/${encodeURIComponent(workspace.id)}/repositories`
  );

  const pullRequestsNested = await Promise.all(
    repositoriesResponse.repositories.map(async repository => {
      const response = await platformFetch<{ pullRequests: PullRequestRow[] }>(
        `/v1/repositories/${encodeURIComponent(repository.id)}/pull-requests`
      );

      return response.pullRequests.map(pullRequest => ({
        ...pullRequest,
        repositoryFullName: repository.fullName
      }));
    })
  );

  const pullRequests = pullRequestsNested.flat().sort((left, right) => right.prNumber - left.prNumber);

  return (
    <>
      <article className="panel span-12">
        <h2>Pull Requests</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Repository</th>
                <th>PR</th>
                <th>Title</th>
                <th>State</th>
                <th>Head SHA</th>
              </tr>
            </thead>
            <tbody>
              {pullRequests.length === 0 ? (
                <tr>
                  <td colSpan={6}>No pull requests ingested yet. Trigger webhook deliveries to populate data.</td>
                </tr>
              ) : (
                pullRequests.map(pullRequest => (
                  <tr key={pullRequest.id}>
                    <td>
                      <code>{pullRequest.id}</code>
                    </td>
                    <td>{pullRequest.repositoryFullName}</td>
                    <td>#{pullRequest.prNumber}</td>
                    <td>{pullRequest.title || '-'}</td>
                    <td>{pullRequest.state}</td>
                    <td>
                      <code>{pullRequest.headSha || '-'}</code>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>

      <article className="span-12">
        <ReviewTriggerForm
          pullRequests={pullRequests.map(pullRequest => ({
            id: pullRequest.id,
            prNumber: pullRequest.prNumber,
            title: pullRequest.title
          }))}
        />
      </article>
    </>
  );
}
