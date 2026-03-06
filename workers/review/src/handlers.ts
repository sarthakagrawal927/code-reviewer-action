import { ControlPlaneDatabase, createControlPlaneDatabase } from '@code-reviewer/db';
import { AIGatewayClient } from '@code-reviewer/ai-gateway-client';
import { IndexingJob, ReviewJob, WorkerJob } from '@code-reviewer/shared-types';
import {
  getInstallationToken,
  getRepoTree,
  getFileContent,
  getPrDiff,
  getPrFiles,
  postPrReview,
  ReviewComment,
} from './github';
import { ReviewWorkerConfig } from './config';
import { detectLanguage, chunkFileWithTreeSitter } from './indexing';
import type { SourceFileForIndexing } from './indexing';

function nowIso(): string {
  return new Date().toISOString();
}

type HandlerConfig = {
  maxIndexFileBytes: number;
  indexChunkStrategy: 'tree-sitter';
  indexMaxChunkLines: number;
  workerConfig: ReviewWorkerConfig;
  db?: ControlPlaneDatabase;
};

// Score: 100 minus weighted penalties per finding
function computeScore(findings: Array<{ severity: string }>): number {
  if (findings.length === 0) return 100;
  const weights: Record<string, number> = { critical: 20, high: 10, medium: 5, low: 2 };
  const penalty = findings.reduce((sum, f) => sum + (weights[f.severity] ?? 2), 0);
  return Math.max(0, 100 - penalty);
}

function buildOverallBody(findings: Array<{ severity: string; title: string }>, score: number): string {
  const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) {
    counts[f.severity] = (counts[f.severity] ?? 0) + 1;
  }
  const parts = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([s, n]) => `${n} ${s}`)
    .join(', ');
  return `## AI Code Review\n\n**Score:** ${score.toFixed(0)}/100 | **Findings:** ${parts || 'none'}\n\n*Automated review by CodeVetter*`;
}

/** Supported file extensions for indexing */
const INDEXABLE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.java', '.cs', '.rb', '.php',
  '.rs', '.kt', '.swift', '.sql', '.yaml', '.yml', '.json', '.md',
]);

function hasIndexableExtension(path: string): boolean {
  const dot = path.lastIndexOf('.');
  if (dot === -1) return false;
  return INDEXABLE_EXTENSIONS.has(path.slice(dot).toLowerCase());
}

/** Fetch file contents with bounded concurrency */
async function fetchFilesContent(
  token: string,
  owner: string,
  repo: string,
  entries: Array<{ path: string; sha: string }>,
  apiBaseUrl?: string,
  concurrency = 10
): Promise<Map<string, { content: string; sha: string }>> {
  const result = new Map<string, { content: string; sha: string }>();
  const queue = [...entries];

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const entry = queue.pop()!;
      try {
        const content = await getFileContent(token, owner, repo, entry.sha, apiBaseUrl);
        result.set(entry.path, { content, sha: entry.sha });
      } catch (err) {
        console.warn(
          `[worker-review] failed to fetch blob ${entry.path} (${entry.sha}): ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, entries.length) }, () => worker());
  await Promise.all(workers);
  return result;
}

async function handleIndexingJob(job: IndexingJob, config: HandlerConfig): Promise<void> {
  const { indexingRunId, repositoryId, sourceRef } = job.payload;
  const wc = config.workerConfig;

  console.log(
    `[worker-review] indexing repository=${repositoryId} ` +
      `ref=${sourceRef || 'default'} runId=${indexingRunId || 'none'}`
  );

  if (!wc.cockroachDatabaseUrl) {
    console.warn('[worker-review] COCKROACH_DATABASE_URL not set — skipping indexing');
    return;
  }
  if (!wc.githubAppId || !wc.githubAppPrivateKey) {
    console.warn('[worker-review] GitHub App credentials not set — skipping indexing');
    return;
  }

  const db =
    config.db ??
    createControlPlaneDatabase({ cockroachDatabaseUrl: wc.cockroachDatabaseUrl });

  // Mark as running
  if (indexingRunId) {
    await db.updateIndexingRun(indexingRunId, { status: 'running' });
  }

  try {
    // 1. Load repository
    const repository = await db.getRepositoryById(repositoryId);
    if (!repository) {
      throw new Error(`Repository ${repositoryId} not found in DB`);
    }

    const parts = repository.fullName.split('/');
    if (parts.length !== 2) {
      throw new Error(`Invalid repository fullName: ${repository.fullName}`);
    }
    const [owner, repoName] = parts as [string, string];
    const installationId = repository.installationId;
    if (!installationId) {
      throw new Error(`Repository ${repository.fullName} has no installationId`);
    }

    // 2. Get installation token
    const installToken = await getInstallationToken(
      { appId: wc.githubAppId, privateKey: wc.githubAppPrivateKey, apiBaseUrl: wc.githubApiBaseUrl },
      installationId
    );

    // 3. Resolve ref
    const ref = sourceRef || repository.defaultBranch || 'main';

    // 4. Fetch file tree from GitHub
    const treeEntries = await getRepoTree(installToken, owner, repoName, ref, wc.githubApiBaseUrl);

    // 5. Filter to indexable blobs within size limit
    const blobs = treeEntries.filter(
      (e) => e.type === 'blob' && hasIndexableExtension(e.path) && e.size <= config.maxIndexFileBytes
    );

    console.log(
      `[worker-review] indexing ${blobs.length} files out of ${treeEntries.length} tree entries`
    );

    // 6. Fetch file contents
    const fileContents = await fetchFilesContent(
      installToken,
      owner,
      repoName,
      blobs,
      wc.githubApiBaseUrl
    );

    // 7. Chunk each file
    const chunkConfig = {
      maxFileBytes: config.maxIndexFileBytes,
      maxChunkLines: config.indexMaxChunkLines,
    };

    let totalChunks = 0;
    const languageCounts: Record<string, number> = {};

    for (const [filePath, { content, sha }] of fileContents) {
      const file: SourceFileForIndexing = {
        repositoryId,
        sourceRef: ref,
        path: filePath,
        blobSha: sha,
        content,
      };

      const { fileRecord, chunks } = await chunkFileWithTreeSitter(file, chunkConfig);
      totalChunks += chunks.length;

      const lang = fileRecord.language;
      languageCounts[lang] = (languageCounts[lang] ?? 0) + 1;
    }

    // 8. Update indexing run with summary
    const summary = {
      fileCount: fileContents.size,
      chunkCount: totalChunks,
      languages: languageCounts,
    };

    if (indexingRunId) {
      await db.updateIndexingRun(indexingRunId, {
        status: 'completed',
        summary,
        completedAt: nowIso(),
      });
    }

    console.log(
      `[worker-review] indexing completed repository=${repository.fullName} ` +
        `files=${fileContents.size} chunks=${totalChunks}`
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[worker-review] indexing failed: ${msg}`);
    if (indexingRunId) {
      await db.updateIndexingRun(indexingRunId, {
        status: 'failed',
        errorMessage: msg,
        completedAt: nowIso(),
      });
    }
    throw err;
  }
}

async function handleReviewJob(job: ReviewJob, config: HandlerConfig): Promise<void> {
  const { reviewRunId, repositoryId, prNumber, headSha } = job.payload;
  const wc = config.workerConfig;

  if (!wc.cockroachDatabaseUrl) {
    console.warn('[worker-review] COCKROACH_DATABASE_URL not set — skipping DB write');
    return;
  }
  if (!wc.githubAppId || !wc.githubAppPrivateKey) {
    console.warn('[worker-review] GitHub App credentials not set — skipping review');
    return;
  }
  if (!wc.aiGatewayBaseUrl || !wc.aiGatewayApiKey) {
    console.warn('[worker-review] AI gateway not configured — skipping review');
    return;
  }

  const db =
    config.db ?? createControlPlaneDatabase({ cockroachDatabaseUrl: wc.cockroachDatabaseUrl });

  // 1. Load repository
  const repository = await db.getRepositoryById(repositoryId);
  if (!repository) {
    throw new Error(`Repository ${repositoryId} not found in DB`);
  }

  const parts = repository.fullName.split('/');
  if (parts.length !== 2) {
    throw new Error(`Invalid repository fullName: ${repository.fullName}`);
  }
  const [owner, repoName] = parts as [string, string];
  const installationId = repository.installationId;
  if (!installationId) {
    throw new Error(`Repository ${repository.fullName} has no installationId`);
  }

  // 2. Get installation token
  const installToken = await getInstallationToken(
    { appId: wc.githubAppId, privateKey: wc.githubAppPrivateKey, apiBaseUrl: wc.githubApiBaseUrl },
    installationId
  );

  // 3. Fetch diff and files in parallel
  const [diff, files] = await Promise.all([
    getPrDiff(installToken, owner, repoName, prNumber, wc.githubApiBaseUrl),
    getPrFiles(installToken, owner, repoName, prNumber, wc.githubApiBaseUrl),
  ]);

  // 4. Call AI gateway
  const gateway = new AIGatewayClient({
    baseUrl: `${wc.aiGatewayBaseUrl}/v1`,
    apiKey: wc.aiGatewayApiKey,
    model: wc.aiGatewayModel,
    reviewTone: 'balanced',
  });

  const reviewResult = await gateway.reviewDiff({
    diff,
    files: files.map(f => ({
      path: f.filename,
      status: f.status as 'added' | 'modified' | 'removed' | 'renamed',
    })),
    context: {
      repoFullName: repository.fullName,
      prNumber,
    },
  });

  const { findings } = reviewResult;
  const scoreComposite = computeScore(findings);

  // 5. Write findings + update run
  if (reviewRunId) {
    try {
      await Promise.all(
        findings.map(finding =>
          db.addReviewFinding({
            reviewRunId,
            severity: finding.severity,
            title: finding.title,
            summary: finding.summary,
            filePath: finding.filePath,
            line: finding.line,
            confidence: finding.confidence,
          })
        )
      );
      await db.updateReviewRun(reviewRunId, {
        status: 'completed',
        scoreComposite,
        findingsCount: findings.length,
        completedAt: nowIso(),
      });
    } catch (err) {
      await db.updateReviewRun(reviewRunId, {
        status: 'failed',
        errorMessage: err instanceof Error ? err.message : String(err),
        completedAt: nowIso(),
      });
      throw err;
    }
  }

  // 6. Post PR review comments (only anchored findings)
  const anchoredComments: ReviewComment[] = findings
    .filter(f => f.filePath && typeof f.line === 'number')
    .map(f => ({
      path: f.filePath as string,
      line: f.line as number,
      body: `**[${f.severity.toUpperCase()}]** ${f.title}\n\n${f.summary}`,
    }));

  const overallBody = buildOverallBody(findings, scoreComposite);
  try {
    await postPrReview(
      installToken,
      owner,
      repoName,
      prNumber,
      headSha,
      anchoredComments,
      overallBody,
      wc.githubApiBaseUrl
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[worker-review] postPrReview failed pr=${prNumber}: ${msg}`);
    // Update errorMessage but keep status=completed (DB findings are written)
    if (reviewRunId) {
      await db.updateReviewRun(reviewRunId, { errorMessage: `GitHub comment post failed: ${msg}` });
    }
  }

  console.log(
    `[worker-review] review completed repository=${repository.fullName} pr=${prNumber} ` +
      `findings=${findings.length} score=${scoreComposite.toFixed(2)}`
  );
}

export async function handleJob(job: WorkerJob, config: HandlerConfig): Promise<void> {
  switch (job.kind) {
    case 'indexing':
      await handleIndexingJob(job, config);
      break;
    case 'review':
      await handleReviewJob(job, config);
      break;
    default: {
      const neverJob: never = job;
      throw new Error(`Unhandled job kind: ${String((neverJob as WorkerJob).kind)}`);
    }
  }
}
