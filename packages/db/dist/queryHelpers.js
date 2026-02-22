"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.controlPlaneQueries = void 0;
const schema_1 = require("./schema");
exports.controlPlaneQueries = {
    listWorkspacesForUser(userId) {
        return {
            text: `SELECT w.* FROM ${schema_1.TABLES.workspaces} w ` +
                `JOIN ${schema_1.TABLES.workspaceMembers} m ON m.workspace_id = w.id ` +
                `WHERE m.user_id = $1 AND m.status = 'active' ORDER BY w.created_at ASC`,
            values: [userId]
        };
    },
    getWorkspaceBySlug(slug) {
        return {
            text: `SELECT * FROM ${schema_1.TABLES.workspaces} WHERE slug = $1 LIMIT 1`,
            values: [slug]
        };
    },
    listRepositoriesByWorkspace(workspaceId) {
        return {
            text: `SELECT * FROM ${schema_1.TABLES.repositories} ` +
                `WHERE workspace_id = $1 ORDER BY full_name ASC`,
            values: [workspaceId]
        };
    },
    listPullRequestsByRepository(repositoryId) {
        return {
            text: `SELECT * FROM ${schema_1.TABLES.pullRequests} ` +
                `WHERE repository_id = $1 ORDER BY pr_number DESC`,
            values: [repositoryId]
        };
    },
    listReviewRunsByPullRequest(pullRequestId) {
        return {
            text: `SELECT * FROM ${schema_1.TABLES.reviewRuns} ` +
                `WHERE pull_request_id = $1 ORDER BY started_at DESC NULLS LAST`,
            values: [pullRequestId]
        };
    },
    listAuditLogsByWorkspace(workspaceId, limit = 100) {
        return {
            text: `SELECT * FROM ${schema_1.TABLES.auditLogs} ` +
                `WHERE workspace_id = $1 ORDER BY created_at DESC LIMIT $2`,
            values: [workspaceId, limit]
        };
    }
};
