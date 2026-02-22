import { notFound } from 'next/navigation';
import { WorkspaceRulesForm } from '../../../../components/workspace-rules-form';
import { getWorkspaceBySlug, platformFetch } from '../../../../lib/platform';

export default async function WorkspaceRulesPage({
  params
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const workspace = await getWorkspaceBySlug(workspaceSlug);
  if (!workspace) {
    notFound();
  }

  const [workspaceRules, repositories] = await Promise.all([
    platformFetch<{ config: unknown }>(`/v1/workspaces/${encodeURIComponent(workspace.id)}/rules/default`),
    platformFetch<{ repositories: Array<{ id: string; fullName: string }> }>(
      `/v1/workspaces/${encodeURIComponent(workspace.id)}/repositories`
    )
  ]);

  return (
    <article className="span-12">
      <WorkspaceRulesForm
        workspaceId={workspace.id}
        initialConfig={workspaceRules.config}
        repositories={repositories.repositories}
      />
    </article>
  );
}
