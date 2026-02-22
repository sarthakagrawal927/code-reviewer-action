"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryControlPlaneDatabase = void 0;
function nowIso() {
    return new Date().toISOString();
}
function id(prefix) {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}
function clone(value) {
    return JSON.parse(JSON.stringify(value));
}
function compareIsoDesc(left, right) {
    return (right || '').localeCompare(left || '');
}
class InMemoryControlPlaneDatabase {
    users = new Map();
    sessions = new Map();
    workspaces = new Map();
    workspaceMembers = new Map();
    workspaceInvites = new Map();
    githubInstallations = new Map();
    repositories = new Map();
    workspaceRuleDefaults = new Map();
    repositoryRuleOverrides = new Map();
    pullRequests = new Map();
    reviewRuns = new Map();
    reviewFindings = new Map();
    indexingRuns = new Map();
    webhookEvents = new Map();
    auditLogs = [];
    workspaceSecrets = new Map();
    async upsertUserFromGithub(input) {
        const existing = Array.from(this.users.values()).find(user => user.githubUserId === input.githubUserId);
        const timestamp = nowIso();
        const user = {
            id: existing?.id || id('usr'),
            githubUserId: input.githubUserId,
            githubLogin: input.githubLogin,
            displayName: input.displayName,
            avatarUrl: input.avatarUrl,
            email: input.email,
            createdAt: existing?.createdAt || timestamp,
            updatedAt: timestamp
        };
        this.users.set(user.id, user);
        return clone(user);
    }
    async getUserById(userId) {
        const user = this.users.get(userId);
        return user ? clone(user) : undefined;
    }
    async getUserByGithubId(githubUserId) {
        const user = Array.from(this.users.values()).find(item => item.githubUserId === githubUserId);
        return user ? clone(user) : undefined;
    }
    async listUsers() {
        return clone(Array.from(this.users.values()));
    }
    async createSession(input) {
        const timestamp = nowIso();
        const session = {
            id: id('sess'),
            userId: input.userId,
            sessionTokenHash: input.sessionTokenHash,
            expiresAt: input.expiresAt,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
            createdAt: timestamp,
            updatedAt: timestamp
        };
        this.sessions.set(session.id, session);
        return clone(session);
    }
    async getSessionByTokenHash(sessionTokenHash) {
        const session = Array.from(this.sessions.values()).find(item => item.sessionTokenHash === sessionTokenHash);
        return session ? clone(session) : undefined;
    }
    async revokeSession(sessionId) {
        const existing = this.sessions.get(sessionId);
        if (!existing) {
            return undefined;
        }
        const next = {
            ...existing,
            revokedAt: nowIso(),
            updatedAt: nowIso()
        };
        this.sessions.set(sessionId, next);
        return clone(next);
    }
    async listWorkspacesForUser(userId) {
        const workspaceIds = Array.from(this.workspaceMembers.values())
            .filter(member => member.userId === userId && member.status === 'active')
            .map(member => member.workspaceId);
        const workspaces = workspaceIds
            .map(workspaceId => this.workspaces.get(workspaceId))
            .filter((workspace) => Boolean(workspace))
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        return clone(workspaces);
    }
    async listAllWorkspaces() {
        const workspaces = Array.from(this.workspaces.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        return clone(workspaces);
    }
    async createWorkspace(input) {
        const duplicate = Array.from(this.workspaces.values()).find(workspace => workspace.slug === input.slug);
        if (duplicate) {
            throw new Error(`Workspace slug already exists: ${input.slug}`);
        }
        const timestamp = nowIso();
        const workspace = {
            id: id('ws'),
            slug: input.slug,
            name: input.name,
            kind: input.kind,
            githubAccountType: input.githubAccountType,
            githubAccountId: input.githubAccountId,
            createdByUserId: input.createdByUserId,
            createdAt: timestamp,
            updatedAt: timestamp
        };
        this.workspaces.set(workspace.id, workspace);
        await this.addWorkspaceMember({
            workspaceId: workspace.id,
            userId: input.createdByUserId,
            githubUserId: '',
            githubLogin: '',
            role: 'owner',
            status: 'active'
        });
        return clone(workspace);
    }
    async getWorkspaceById(workspaceId) {
        const workspace = this.workspaces.get(workspaceId);
        return workspace ? clone(workspace) : undefined;
    }
    async getWorkspaceBySlug(slug) {
        const workspace = Array.from(this.workspaces.values()).find(item => item.slug === slug);
        return workspace ? clone(workspace) : undefined;
    }
    async addWorkspaceMember(input) {
        const existing = Array.from(this.workspaceMembers.values()).find(member => member.workspaceId === input.workspaceId && member.userId === input.userId);
        const timestamp = nowIso();
        const member = {
            id: existing?.id || id('wm'),
            workspaceId: input.workspaceId,
            userId: input.userId,
            githubUserId: input.githubUserId,
            githubLogin: input.githubLogin,
            role: input.role,
            status: input.status,
            invitedByUserId: input.invitedByUserId,
            createdAt: existing?.createdAt || timestamp,
            updatedAt: timestamp
        };
        this.workspaceMembers.set(member.id, member);
        return clone(member);
    }
    async listWorkspaceMembers(workspaceId) {
        const members = Array.from(this.workspaceMembers.values())
            .filter(member => member.workspaceId === workspaceId)
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        return clone(members);
    }
    async getWorkspaceMember(workspaceId, userId) {
        const member = Array.from(this.workspaceMembers.values()).find(item => item.workspaceId === workspaceId && item.userId === userId);
        return member ? clone(member) : undefined;
    }
    async updateWorkspaceMember(workspaceId, memberId, patch) {
        const existing = this.workspaceMembers.get(memberId);
        if (!existing || existing.workspaceId !== workspaceId) {
            return undefined;
        }
        const next = {
            ...existing,
            ...patch,
            updatedAt: nowIso()
        };
        this.workspaceMembers.set(memberId, next);
        return clone(next);
    }
    async createWorkspaceInvite(input) {
        const timestamp = nowIso();
        const invite = {
            id: id('inv'),
            workspaceId: input.workspaceId,
            inviteTokenHash: input.inviteTokenHash,
            inviteeGithubLogin: input.inviteeGithubLogin,
            inviteeEmail: input.inviteeEmail,
            role: input.role,
            status: 'pending',
            invitedByUserId: input.invitedByUserId,
            expiresAt: input.expiresAt,
            createdAt: timestamp,
            updatedAt: timestamp
        };
        this.workspaceInvites.set(invite.id, invite);
        return clone(invite);
    }
    async getWorkspaceInviteByTokenHash(tokenHash) {
        const invite = Array.from(this.workspaceInvites.values()).find(item => item.inviteTokenHash === tokenHash);
        return invite ? clone(invite) : undefined;
    }
    async consumeWorkspaceInvite(inviteId, acceptedByUserId) {
        const existing = this.workspaceInvites.get(inviteId);
        if (!existing) {
            return undefined;
        }
        const next = {
            ...existing,
            status: 'accepted',
            acceptedByUserId,
            updatedAt: nowIso()
        };
        this.workspaceInvites.set(inviteId, next);
        return clone(next);
    }
    async listGitHubInstallations(workspaceId) {
        const installations = Array.from(this.githubInstallations.values())
            .filter(item => item.workspaceId === workspaceId)
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        return clone(installations);
    }
    async upsertGitHubInstallation(input) {
        const existing = Array.from(this.githubInstallations.values()).find(item => item.workspaceId === input.workspaceId && item.installationId === input.installationId);
        const timestamp = nowIso();
        const installation = {
            id: existing?.id || id('ghi'),
            workspaceId: input.workspaceId,
            installationId: input.installationId,
            accountType: input.accountType,
            accountId: input.accountId,
            accountLogin: input.accountLogin,
            createdAt: existing?.createdAt || timestamp,
            updatedAt: timestamp
        };
        this.githubInstallations.set(installation.id, installation);
        return clone(installation);
    }
    async listRepositories(workspaceId) {
        const repositories = Array.from(this.repositories.values())
            .filter(item => item.workspaceId === workspaceId)
            .sort((a, b) => a.fullName.localeCompare(b.fullName));
        return clone(repositories);
    }
    async listAllRepositories() {
        const repositories = Array.from(this.repositories.values()).sort((a, b) => a.fullName.localeCompare(b.fullName));
        return clone(repositories);
    }
    async upsertRepository(input) {
        const existing = Array.from(this.repositories.values()).find(item => item.workspaceId === input.workspaceId && item.fullName === input.fullName);
        const timestamp = nowIso();
        const repository = {
            id: existing?.id || id('repo'),
            workspaceId: input.workspaceId,
            provider: input.provider,
            owner: input.owner,
            name: input.name,
            fullName: input.fullName,
            githubRepoId: input.githubRepoId,
            installationId: input.installationId,
            defaultBranch: input.defaultBranch,
            isPrivate: input.isPrivate,
            isActive: input.isActive,
            createdAt: existing?.createdAt || timestamp,
            updatedAt: timestamp
        };
        this.repositories.set(repository.id, repository);
        return clone(repository);
    }
    async getRepositoryById(repositoryId) {
        const repository = this.repositories.get(repositoryId);
        return repository ? clone(repository) : undefined;
    }
    async getRepositoryByFullName(workspaceId, fullName) {
        const repository = Array.from(this.repositories.values()).find(item => item.workspaceId === workspaceId && item.fullName === fullName);
        return repository ? clone(repository) : undefined;
    }
    async getWorkspaceRuleDefaults(workspaceId) {
        const rules = this.workspaceRuleDefaults.get(workspaceId);
        return rules ? clone(rules) : undefined;
    }
    async upsertWorkspaceRuleDefaults(input) {
        const next = {
            ...input,
            updatedAt: input.updatedAt || nowIso()
        };
        this.workspaceRuleDefaults.set(input.workspaceId, next);
        return clone(next);
    }
    async getRepositoryRuleOverride(repositoryId) {
        const override = this.repositoryRuleOverrides.get(repositoryId);
        return override ? clone(override) : undefined;
    }
    async upsertRepositoryRuleOverride(input) {
        const next = {
            ...input,
            updatedAt: input.updatedAt || nowIso()
        };
        this.repositoryRuleOverrides.set(input.repositoryId, next);
        return clone(next);
    }
    async upsertPullRequest(input) {
        const existing = Array.from(this.pullRequests.values()).find(item => item.repositoryId === input.repositoryId && item.prNumber === input.prNumber);
        const timestamp = nowIso();
        const pullRequest = {
            id: existing?.id || id('pr'),
            repositoryId: input.repositoryId,
            githubPrId: input.githubPrId,
            prNumber: input.prNumber,
            title: input.title,
            authorGithubLogin: input.authorGithubLogin,
            baseRef: input.baseRef,
            headRef: input.headRef,
            headSha: input.headSha,
            state: input.state,
            mergedAt: input.mergedAt,
            closedAt: input.closedAt,
            createdAt: existing?.createdAt || timestamp,
            updatedAt: timestamp
        };
        this.pullRequests.set(pullRequest.id, pullRequest);
        return clone(pullRequest);
    }
    async getPullRequestById(pullRequestId) {
        const pullRequest = this.pullRequests.get(pullRequestId);
        return pullRequest ? clone(pullRequest) : undefined;
    }
    async listPullRequestsByRepository(repositoryId) {
        const pullRequests = Array.from(this.pullRequests.values())
            .filter(item => item.repositoryId === repositoryId)
            .sort((a, b) => b.prNumber - a.prNumber);
        return clone(pullRequests);
    }
    async createReviewRun(input) {
        const run = {
            id: id('rr'),
            repositoryId: input.repositoryId,
            pullRequestId: input.pullRequestId,
            prNumber: input.prNumber,
            headSha: input.headSha,
            triggerSource: input.triggerSource,
            status: input.status,
            scoreVersion: input.scoreVersion,
            startedAt: input.startedAt || nowIso()
        };
        this.reviewRuns.set(run.id, run);
        return clone(run);
    }
    async getReviewRunById(reviewRunId) {
        const run = this.reviewRuns.get(reviewRunId);
        return run ? clone(run) : undefined;
    }
    async updateReviewRun(reviewRunId, patch) {
        const existing = this.reviewRuns.get(reviewRunId);
        if (!existing) {
            return undefined;
        }
        const next = {
            ...existing,
            ...patch
        };
        this.reviewRuns.set(reviewRunId, next);
        return clone(next);
    }
    async listReviewRunsByPullRequest(pullRequestId) {
        const runs = Array.from(this.reviewRuns.values())
            .filter(item => item.pullRequestId === pullRequestId)
            .sort((a, b) => compareIsoDesc(a.startedAt, b.startedAt));
        return clone(runs);
    }
    async listReviewRunsByRepository(repositoryId) {
        const runs = Array.from(this.reviewRuns.values())
            .filter(item => item.repositoryId === repositoryId)
            .sort((a, b) => compareIsoDesc(a.startedAt, b.startedAt));
        return clone(runs);
    }
    async addReviewFinding(input) {
        const finding = {
            id: id('rf'),
            reviewRunId: input.reviewRunId,
            severity: input.severity,
            title: input.title,
            summary: input.summary,
            filePath: input.filePath,
            line: input.line,
            confidence: input.confidence,
            createdAt: input.createdAt || nowIso()
        };
        this.reviewFindings.set(finding.id, finding);
        return clone(finding);
    }
    async listReviewFindingsByRun(reviewRunId) {
        const findings = Array.from(this.reviewFindings.values()).filter(item => item.reviewRunId === reviewRunId);
        return clone(findings);
    }
    async createIndexingRun(input) {
        const run = {
            id: id('idx'),
            repositoryId: input.repositoryId,
            status: input.status,
            sourceRef: input.sourceRef,
            summary: input.summary,
            startedAt: input.startedAt || nowIso(),
            completedAt: input.completedAt,
            errorMessage: input.errorMessage
        };
        this.indexingRuns.set(run.id, run);
        return clone(run);
    }
    async updateIndexingRun(indexingRunId, patch) {
        const existing = this.indexingRuns.get(indexingRunId);
        if (!existing) {
            return undefined;
        }
        const next = {
            ...existing,
            ...patch
        };
        this.indexingRuns.set(indexingRunId, next);
        return clone(next);
    }
    async listIndexingRunsByRepository(repositoryId) {
        const runs = Array.from(this.indexingRuns.values())
            .filter(item => item.repositoryId === repositoryId)
            .sort((a, b) => compareIsoDesc(a.startedAt, b.startedAt));
        return clone(runs);
    }
    async getWebhookEventByDeliveryId(provider, deliveryId) {
        const key = `${provider}:${deliveryId}`;
        const event = this.webhookEvents.get(key);
        return event ? clone(event) : undefined;
    }
    async recordWebhookEvent(input) {
        const key = `github:${input.deliveryId}`;
        const event = {
            ...input,
            processingStatus: input.processingStatus || 'received',
            receivedAt: input.receivedAt || nowIso()
        };
        this.webhookEvents.set(key, event);
        return clone(event);
    }
    async updateWebhookEvent(provider, deliveryId, patch) {
        const key = `${provider}:${deliveryId}`;
        const existing = this.webhookEvents.get(key);
        if (!existing) {
            return undefined;
        }
        const next = {
            ...existing,
            ...patch
        };
        this.webhookEvents.set(key, next);
        return clone(next);
    }
    async appendAuditLog(input) {
        const log = {
            id: id('audit'),
            workspaceId: input.workspaceId,
            actorUserId: input.actorUserId,
            action: input.action,
            resourceType: input.resourceType,
            resourceId: input.resourceId,
            metadata: input.metadata,
            requestId: input.requestId,
            createdAt: input.createdAt || nowIso()
        };
        this.auditLogs.push(log);
        return clone(log);
    }
    async listAuditLogs(workspaceId, limit = 100) {
        const logs = this.auditLogs
            .filter(item => item.workspaceId === workspaceId)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, Math.max(1, limit));
        return clone(logs);
    }
    async upsertWorkspaceSecret(input) {
        const existing = Array.from(this.workspaceSecrets.values()).find(item => item.workspaceId === input.workspaceId && item.kind === input.kind);
        const timestamp = nowIso();
        const secret = {
            id: existing?.id || id('sec'),
            workspaceId: input.workspaceId,
            kind: input.kind,
            keyId: input.keyId,
            encryptedValue: input.encryptedValue,
            createdByUserId: input.createdByUserId,
            createdAt: existing?.createdAt || timestamp,
            updatedAt: timestamp
        };
        this.workspaceSecrets.set(secret.id, secret);
        return clone(secret);
    }
    async getWorkspaceSecret(workspaceId, kind) {
        const secret = Array.from(this.workspaceSecrets.values()).find(item => item.workspaceId === workspaceId && item.kind === kind);
        return secret ? clone(secret) : undefined;
    }
}
exports.InMemoryControlPlaneDatabase = InMemoryControlPlaneDatabase;
