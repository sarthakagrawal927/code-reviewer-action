export type SqlQuery<TValues extends unknown[] = unknown[]> = {
    text: string;
    values: TValues;
};
export declare const controlPlaneQueries: {
    listWorkspacesForUser(userId: string): SqlQuery<[string]>;
    getWorkspaceBySlug(slug: string): SqlQuery<[string]>;
    listRepositoriesByWorkspace(workspaceId: string): SqlQuery<[string]>;
    listPullRequestsByRepository(repositoryId: string): SqlQuery<[string]>;
    listReviewRunsByPullRequest(pullRequestId: string): SqlQuery<[string]>;
    listAuditLogsByWorkspace(workspaceId: string, limit?: number): SqlQuery<[string, number]>;
};
