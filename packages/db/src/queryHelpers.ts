import { TABLES } from './schema';

export type SqlQuery<TValues extends unknown[] = unknown[]> = {
  text: string;
  values: TValues;
};

export const controlPlaneQueries = {
  listWorkspacesForUser(userId: string): SqlQuery<[string]> {
    return {
      text:
        `SELECT w.* FROM ${TABLES.workspaces} w ` +
        `JOIN ${TABLES.workspaceMembers} m ON m.workspace_id = w.id ` +
        `WHERE m.user_id = $1 AND m.status = 'active' ORDER BY w.created_at ASC`,
      values: [userId]
    };
  },

  getWorkspaceBySlug(slug: string): SqlQuery<[string]> {
    return {
      text: `SELECT * FROM ${TABLES.workspaces} WHERE slug = $1 LIMIT 1`,
      values: [slug]
    };
  },

  listRepositoriesByWorkspace(workspaceId: string): SqlQuery<[string]> {
    return {
      text:
        `SELECT * FROM ${TABLES.repositories} ` +
        `WHERE workspace_id = $1 ORDER BY full_name ASC`,
      values: [workspaceId]
    };
  },

  listPullRequestsByRepository(repositoryId: string): SqlQuery<[string]> {
    return {
      text:
        `SELECT * FROM ${TABLES.pullRequests} ` +
        `WHERE repository_id = $1 ORDER BY pr_number DESC`,
      values: [repositoryId]
    };
  },

  listReviewRunsByPullRequest(pullRequestId: string): SqlQuery<[string]> {
    return {
      text:
        `SELECT * FROM ${TABLES.reviewRuns} ` +
        `WHERE pull_request_id = $1 ORDER BY started_at DESC NULLS LAST`,
      values: [pullRequestId]
    };
  },

  listAuditLogsByWorkspace(workspaceId: string, limit = 100): SqlQuery<[string, number]> {
    return {
      text:
        `SELECT * FROM ${TABLES.auditLogs} ` +
        `WHERE workspace_id = $1 ORDER BY created_at DESC LIMIT $2`,
      values: [workspaceId, limit]
    };
  }
};
