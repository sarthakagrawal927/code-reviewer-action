import {
  DriftCheckInput,
  DriftCheckRecord,
  DriftSignal,
  GitHubWebhookEnvelope,
  OrganizationMemberRecord,
  OrganizationRecord,
  ReconcileRunRecord,
  RepositoryConnection,
  RepositoryRuleConfig,
  ReviewRunRecord,
} from '@code-reviewer/shared-types';

function nowIso(): string {
  return new Date().toISOString();
}

export class InMemoryApiStore {
  private organizations = new Map<string, OrganizationRecord>();
  private organizationMembers = new Map<string, OrganizationMemberRecord>();
  private repositories = new Map<string, RepositoryConnection>();
  private rules = new Map<string, RepositoryRuleConfig>();
  private reviewRuns = new Map<string, ReviewRunRecord>();
  private driftChecks = new Map<string, DriftCheckRecord>();
  private reconcileRuns = new Map<string, ReconcileRunRecord>();
  private webhookEvents: GitHubWebhookEnvelope[] = [];

  listOrganizations(): OrganizationRecord[] {
    return Array.from(this.organizations.values());
  }

  getOrganization(organizationId: string): OrganizationRecord | undefined {
    return this.organizations.get(organizationId);
  }

  upsertOrganization(
    input: Omit<OrganizationRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): OrganizationRecord {
    const existing =
      (input.id ? this.organizations.get(input.id) : undefined) ||
      Array.from(this.organizations.values()).find(org => org.slug === input.slug);
    const id = existing?.id ?? input.id ?? `org_${this.organizations.size + 1}`;
    const timestamp = nowIso();

    const organization: OrganizationRecord = {
      ...input,
      id,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };

    this.organizations.set(id, organization);
    return organization;
  }

  listOrganizationMembers(organizationId: string): OrganizationMemberRecord[] {
    return Array.from(this.organizationMembers.values()).filter(
      member => member.organizationId === organizationId
    );
  }

  upsertOrganizationMember(
    input: Omit<OrganizationMemberRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): OrganizationMemberRecord {
    const existing =
      (input.id ? this.organizationMembers.get(input.id) : undefined) ||
      Array.from(this.organizationMembers.values()).find(
        member =>
          member.organizationId === input.organizationId && member.githubUserId === input.githubUserId
      );
    const id = existing?.id ?? input.id ?? `member_${this.organizationMembers.size + 1}`;
    const timestamp = nowIso();

    const member: OrganizationMemberRecord = {
      ...input,
      id,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };

    this.organizationMembers.set(id, member);
    return member;
  }

  listRepositories(): RepositoryConnection[] {
    return Array.from(this.repositories.values());
  }

  listRepositoriesByOrganization(organizationId: string): RepositoryConnection[] {
    return this.listRepositories().filter(repository => repository.workspaceId === organizationId);
  }

  getRepositoryByFullName(fullName: string): RepositoryConnection | undefined {
    return Array.from(this.repositories.values()).find(repo => repo.fullName === fullName);
  }

  upsertRepository(input: Omit<RepositoryConnection, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): RepositoryConnection {
    const existing = input.id ? this.repositories.get(input.id) : this.getRepositoryByFullName(input.fullName);
    const id = existing?.id ?? input.id ?? `repo_${this.repositories.size + 1}`;
    const timestamp = nowIso();

    const repository: RepositoryConnection = {
      ...input,
      id,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };

    this.repositories.set(id, repository);
    return repository;
  }

  getRuleConfig(repositoryId: string): RepositoryRuleConfig | undefined {
    return this.rules.get(repositoryId);
  }

  upsertRuleConfig(config: Omit<RepositoryRuleConfig, 'updatedAt'>): RepositoryRuleConfig {
    const next: RepositoryRuleConfig = {
      ...config,
      updatedAt: nowIso(),
    };

    this.rules.set(config.repositoryId, next);
    return next;
  }

  addReviewRun(run: ReviewRunRecord): ReviewRunRecord {
    this.reviewRuns.set(run.id, run);
    return run;
  }

  listReviewRuns(repositoryId?: string): ReviewRunRecord[] {
    const values = Array.from(this.reviewRuns.values());
    return repositoryId ? values.filter(item => item.repositoryId === repositoryId) : values;
  }

  runDriftCheck(organizationId: string, input: DriftCheckInput): DriftCheckRecord {
    const organization = this.organizations.get(organizationId);
    if (!organization) {
      throw new Error(`Organization not found: ${organizationId}`);
    }

    const observedRepositoryCount = this.listRepositoriesByOrganization(organizationId).length;
    const observedMemberCount = this.listOrganizationMembers(organizationId).length;
    const observedInstallationIds = Array.from(
      new Set(
        this.listRepositoriesByOrganization(organizationId)
          .map(repository => repository.installationId?.trim())
          .concat(organization.githubInstallationId?.trim())
          .filter((value): value is string => Boolean(value))
      )
    );

    const signals: DriftSignal[] = [];

    if (
      typeof input.expectedRepositoryCount === 'number' &&
      Number.isInteger(input.expectedRepositoryCount) &&
      input.expectedRepositoryCount >= 0 &&
      input.expectedRepositoryCount !== observedRepositoryCount
    ) {
      signals.push({
        code: 'repository_count_mismatch',
        message: `Expected ${input.expectedRepositoryCount} repos but found ${observedRepositoryCount}.`,
      });
    }

    if (
      typeof input.expectedMemberCount === 'number' &&
      Number.isInteger(input.expectedMemberCount) &&
      input.expectedMemberCount >= 0 &&
      input.expectedMemberCount !== observedMemberCount
    ) {
      signals.push({
        code: 'member_count_mismatch',
        message: `Expected ${input.expectedMemberCount} members but found ${observedMemberCount}.`,
      });
    }

    if (
      input.expectedInstallationId &&
      !observedInstallationIds.includes(input.expectedInstallationId.trim())
    ) {
      signals.push({
        code: 'installation_mismatch',
        message: `Expected installation ${input.expectedInstallationId} was not found.`,
      });
    }

    const lastWebhookEvent =
      this.webhookEvents.length > 0
        ? this.webhookEvents[this.webhookEvents.length - 1]
        : undefined;
    const staleAfterMs = 24 * 60 * 60 * 1000;
    if (observedRepositoryCount > 0 && (!lastWebhookEvent || Date.now() - Date.parse(lastWebhookEvent.receivedAt) > staleAfterMs)) {
      signals.push({
        code: 'webhook_stale',
        message: 'No recent webhook activity detected in the last 24 hours.',
      });
    }

    const driftCheck: DriftCheckRecord = {
      id: `drift_${Date.now()}_${this.driftChecks.size + 1}`,
      organizationId,
      checkedAt: nowIso(),
      expectedRepositoryCount: input.expectedRepositoryCount,
      expectedMemberCount: input.expectedMemberCount,
      expectedInstallationId: input.expectedInstallationId,
      observedRepositoryCount,
      observedMemberCount,
      observedInstallationIds,
      driftDetected: signals.length > 0,
      signals,
    };

    this.driftChecks.set(driftCheck.id, driftCheck);
    return driftCheck;
  }

  listDriftChecks(organizationId: string): DriftCheckRecord[] {
    return Array.from(this.driftChecks.values())
      .filter(record => record.organizationId === organizationId)
      .sort((a, b) => a.checkedAt.localeCompare(b.checkedAt));
  }

  getLatestDriftCheck(organizationId: string): DriftCheckRecord | undefined {
    const matches = this.listDriftChecks(organizationId);
    return matches.length > 0 ? matches[matches.length - 1] : undefined;
  }

  queueReconcileRun(input: {
    organizationId: string;
    reason: ReconcileRunRecord['reason'];
    driftCheckId?: string;
  }): ReconcileRunRecord {
    const run: ReconcileRunRecord = {
      id: `reconcile_${Date.now()}_${this.reconcileRuns.size + 1}`,
      organizationId: input.organizationId,
      status: 'queued',
      requestedBy: 'manual',
      triggeredAt: nowIso(),
      driftCheckId: input.driftCheckId,
      reason: input.reason,
    };

    this.reconcileRuns.set(run.id, run);
    return run;
  }

  listReconcileRuns(organizationId: string): ReconcileRunRecord[] {
    return Array.from(this.reconcileRuns.values())
      .filter(record => record.organizationId === organizationId)
      .sort((a, b) => a.triggeredAt.localeCompare(b.triggeredAt));
  }

  recordWebhookEvent(event: GitHubWebhookEnvelope): void {
    this.webhookEvents.push(event);
  }

  listWebhookEvents(limit = 50): GitHubWebhookEnvelope[] {
    return this.webhookEvents.slice(-limit);
  }
}
