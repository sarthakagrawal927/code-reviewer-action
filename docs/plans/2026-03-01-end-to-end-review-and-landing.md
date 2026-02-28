# End-to-End Review Pipeline + Landing Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire the review worker to actually process PRs end-to-end, fill wrangler.toml secrets, and redesign the landing page.

**Architecture:** Review worker polls `review_runs` table via CockroachDB for `pending` jobs, fetches PR diffs via GitHub App, calls the free-ai gateway, writes findings back to DB, and posts inline comments to the PR. Landing page is a standalone Next.js page replacing the current JS file.

**Tech Stack:** Node.js, TypeScript, `pg` (postgres driver), GitHub App JWT auth, `@code-reviewer/db`, `@code-reviewer/ai-gateway-client`, Next.js, CSS modules.

---

## Task 1: Add DB + GitHub + AI config to review worker

**Files:**
- Modify: `workers/review/src/config.ts`
- Modify: `workers/review/package.json`

**Step 1: Add `pg` and `jsonwebtoken` dependencies**

In `workers/review/package.json`, update `dependencies`:

```json
{
  "name": "@code-reviewer/worker-review",
  "version": "0.1.0",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@code-reviewer/ai-gateway-client": "file:../../packages/ai-gateway-client",
    "@code-reviewer/db": "file:../../packages/db",
    "@code-reviewer/shared-types": "file:../../packages/shared-types",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.13.3",
    "tree-sitter": "^0.21.1",
    "tree-sitter-javascript": "^0.23.1",
    "tree-sitter-python": "^0.25.0",
    "tree-sitter-typescript": "^0.23.2"
  },
  "devDependencies": {
    "@types/jsonwebtoken": "^9.0.9",
    "@types/pg": "^8.11.13"
  }
}
```

**Step 2: Extend `loadReviewWorkerConfig` in `workers/review/src/config.ts`**

Add these fields to `ReviewWorkerConfig` and load them from env:

```typescript
export type ReviewWorkerConfig = {
  // existing fields ...
  pollIntervalMs: number;
  maxIterations: number;
  maxRetries: number;
  retryBaseDelayMs: number;
  retryMaxDelayMs: number;
  maxIndexFileBytes: number;
  indexChunkStrategy: 'tree-sitter';
  indexMaxChunkLines: number;
  reviewQueueName: string;
  indexingQueueName: string;
  // new fields:
  cockroachDatabaseUrl: string | undefined;
  githubApiBaseUrl: string;
  githubAppId: string | undefined;
  githubAppPrivateKey: string | undefined;
  aiGatewayBaseUrl: string | undefined;
  aiGatewayApiKey: string | undefined;
  aiGatewayModel: string;
};
```

Add to the bottom of `loadReviewWorkerConfig()` before the return:

```typescript
const cockroachDatabaseUrl = process.env.COCKROACH_DATABASE_URL?.trim() || undefined;
const githubApiBaseUrl = process.env.GITHUB_API_BASE_URL?.trim() || 'https://api.github.com';
const githubAppId = process.env.GITHUB_APP_ID?.trim() || undefined;
// Private key may have literal \n from env — normalize
const githubAppPrivateKeyRaw = process.env.GITHUB_APP_PRIVATE_KEY?.trim() || undefined;
const githubAppPrivateKey = githubAppPrivateKeyRaw?.replace(/\\n/g, '\n');
const aiGatewayBaseUrl = process.env.AI_GATEWAY_BASE_URL?.trim() || undefined;
const aiGatewayApiKey = process.env.AI_GATEWAY_API_KEY?.trim() || undefined;
const aiGatewayModel = process.env.AI_GATEWAY_MODEL?.trim() || 'auto';
```

And add them to the returned object.

**Step 3: Install deps**

```bash
npm install -w workers/review
```

Expected: packages installed without error.

**Step 4: Build to verify types compile**

```bash
npm run build:review-core && npm run -w workers/review build
```

Expected: no TypeScript errors.

**Step 5: Commit**

```bash
git add workers/review/package.json workers/review/src/config.ts
git commit -m "feat(review-worker): add DB, GitHub App, and AI gateway config"
```

---

## Task 2: DB polling queue adapter

**Files:**
- Modify: `workers/review/src/queue.ts`

**Step 1: Replace the file contents with a real Postgres adapter**

The adapter polls `review_runs WHERE status = 'pending'`, atomically claims a batch by setting `status = 'processing'`, and returns typed job records.

```typescript
import { Pool } from 'pg';
import { IndexingJob, ReviewJob } from '@code-reviewer/shared-types';

export interface JobQueueAdapter {
  pullReviewJobs(batchSize: number): Promise<ReviewJob[]>;
  pullIndexingJobs(batchSize: number): Promise<IndexingJob[]>;
}

// ── In-memory (dev / fallback) ────────────────────────────────────────────────

export class InMemoryQueueAdapter implements JobQueueAdapter {
  private reviewQueue: ReviewJob[];
  private indexingQueue: IndexingJob[];

  constructor(seed: { reviews: ReviewJob[]; indexing: IndexingJob[] }) {
    this.reviewQueue = [...seed.reviews];
    this.indexingQueue = [...seed.indexing];
  }

  async pullReviewJobs(batchSize: number): Promise<ReviewJob[]> {
    if (batchSize <= 0) return [];
    const next = this.reviewQueue.slice(0, batchSize);
    this.reviewQueue = this.reviewQueue.slice(batchSize);
    return next;
  }

  async pullIndexingJobs(batchSize: number): Promise<IndexingJob[]> {
    if (batchSize <= 0) return [];
    const next = this.indexingQueue.slice(0, batchSize);
    this.indexingQueue = this.indexingQueue.slice(batchSize);
    return next;
  }
}

// ── Postgres / CockroachDB ────────────────────────────────────────────────────

export class PostgresQueueAdapter implements JobQueueAdapter {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString, max: 3, idleTimeoutMillis: 30000 });
  }

  async pullReviewJobs(batchSize: number): Promise<ReviewJob[]> {
    if (batchSize <= 0) return [];
    // Atomically claim up to batchSize pending review runs
    const result = await this.pool.query<{
      id: string;
      repository_id: string;
      pr_number: number;
      head_sha: string | null;
      trigger_source: string;
    }>(
      `UPDATE review_runs
         SET status = 'processing', started_at = NOW()
       WHERE id IN (
         SELECT id FROM review_runs
         WHERE status = 'pending'
         ORDER BY rowid
         LIMIT $1
       )
       RETURNING id, repository_id, pr_number, head_sha, trigger_source`,
      [batchSize]
    );

    return result.rows.map(row => ({
      kind: 'review' as const,
      payload: {
        reviewRunId: row.id,
        repositoryId: row.repository_id,
        prNumber: row.pr_number,
        headSha: row.head_sha || '',
        triggeredBy: (row.trigger_source as ReviewJob['payload']['triggeredBy']) || 'webhook',
      },
    }));
  }

  async pullIndexingJobs(batchSize: number): Promise<IndexingJob[]> {
    if (batchSize <= 0) return [];
    const result = await this.pool.query<{
      id: string;
      repository_id: string;
      source_ref: string | null;
    }>(
      `UPDATE indexing_runs
         SET status = 'processing', started_at = NOW()
       WHERE id IN (
         SELECT id FROM indexing_runs
         WHERE status = 'pending'
         ORDER BY rowid
         LIMIT $1
       )
       RETURNING id, repository_id, source_ref`,
      [batchSize]
    );

    return result.rows.map(row => ({
      kind: 'indexing' as const,
      payload: {
        indexingRunId: row.id,
        repositoryId: row.repository_id,
        sourceRef: row.source_ref || undefined,
      },
    }));
  }

  async end(): Promise<void> {
    await this.pool.end();
  }
}

// ── Seed helpers (dev) ────────────────────────────────────────────────────────

export function createDefaultSeedJobs(): { reviews: ReviewJob[]; indexing: IndexingJob[] } {
  return { indexing: [], reviews: [] };
}
```

**Step 2: Update `ReviewJob` and `IndexingJob` types in `packages/shared-types/src/review.ts` to include the new fields**

Check what fields exist:

```bash
cat packages/shared-types/src/review.ts
```

Add `reviewRunId` and `indexingRunId` if missing:

```typescript
export type ReviewJob = {
  kind: 'review';
  payload: {
    reviewRunId?: string;
    repositoryId: string;
    prNumber: number;
    headSha: string;
    triggeredBy: 'webhook' | 'manual' | 'action';
  };
};

export type IndexingJob = {
  kind: 'indexing';
  payload: {
    indexingRunId?: string;
    repositoryId: string;
    sourceRef?: string;
  };
};

export type WorkerJob = ReviewJob | IndexingJob;
```

**Step 3: Update `workers/review/src/index.ts` to use `PostgresQueueAdapter` when DB URL is set**

Replace the queue construction lines in `run()`:

```typescript
const queue = config.cockroachDatabaseUrl
  ? new PostgresQueueAdapter(config.cockroachDatabaseUrl)
  : new InMemoryQueueAdapter(createDefaultSeedJobs());
```

Import `PostgresQueueAdapter` at the top.

**Step 4: Build**

```bash
npm run build:types && npm run -w workers/review build
```

Expected: no errors.

**Step 5: Commit**

```bash
git add packages/shared-types/src/review.ts workers/review/src/queue.ts workers/review/src/index.ts
git commit -m "feat(review-worker): replace in-memory queue with Postgres polling adapter"
```

---

## Task 3: GitHub App client for review worker

**Files:**
- Create: `workers/review/src/github.ts`

**Step 1: Create the GitHub client**

This client does three things: generate a GitHub App JWT, exchange it for an installation access token, fetch the PR diff, and post review comments.

```typescript
import * as https from 'https';
import * as crypto from 'crypto';

// ── Minimal JWT signer (no external deps beyond jsonwebtoken) ─────────────────
import * as jwt from 'jsonwebtoken';

export type GitHubAppConfig = {
  appId: string;
  privateKey: string;
  apiBaseUrl?: string;
};

function githubAppJwt(config: GitHubAppConfig): string {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { iat: now - 60, exp: now + 600, iss: config.appId },
    config.privateKey,
    { algorithm: 'RS256' }
  );
}

async function githubFetch<T>(
  path: string,
  token: string,
  options: { method?: string; body?: unknown; accept?: string; baseUrl?: string } = {}
): Promise<T> {
  const baseUrl = (options.baseUrl || 'https://api.github.com').replace(/\/$/, '');
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      authorization: `Bearer ${token}`,
      accept: options.accept || 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'code-reviewer/1.0',
      ...(options.body ? { 'content-type': 'application/json' } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API ${options.method || 'GET'} ${path} failed ${response.status}: ${text.slice(0, 400)}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) as T : ({} as T);
}

export async function getInstallationToken(
  config: GitHubAppConfig,
  installationId: string
): Promise<string> {
  const appToken = githubAppJwt(config);
  const result = await githubFetch<{ token: string }>(
    `/app/installations/${installationId}/access_tokens`,
    appToken,
    { method: 'POST', baseUrl: config.apiBaseUrl }
  );
  return result.token;
}

export async function getPrDiff(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
  baseUrl?: string
): Promise<string> {
  const path = `/repos/${owner}/${repo}/pulls/${prNumber}`;
  const response = await fetch(
    `${(baseUrl || 'https://api.github.com').replace(/\/$/, '')}${path}`,
    {
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github.diff',
        'x-github-api-version': '2022-11-28',
        'user-agent': 'code-reviewer/1.0',
      },
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch PR diff: ${response.status}`);
  }
  return response.text();
}

export type GitHubPrFile = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
};

export async function getPrFiles(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
  baseUrl?: string
): Promise<GitHubPrFile[]> {
  return githubFetch<GitHubPrFile[]>(
    `/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`,
    token,
    { baseUrl }
  );
}

export type ReviewComment = {
  path: string;
  line: number;
  body: string;
};

export async function postPrReview(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
  headSha: string,
  comments: ReviewComment[],
  overallBody: string,
  baseUrl?: string
): Promise<void> {
  await githubFetch(
    `/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
    token,
    {
      method: 'POST',
      baseUrl,
      body: {
        commit_id: headSha,
        body: overallBody,
        event: 'COMMENT',
        comments: comments.map(c => ({
          path: c.path,
          line: c.line,
          body: c.body,
          side: 'RIGHT',
        })),
      },
    }
  );
}
```

**Step 2: Build**

```bash
npm run -w workers/review build
```

Expected: no errors.

**Step 3: Commit**

```bash
git add workers/review/src/github.ts
git commit -m "feat(review-worker): add GitHub App client (JWT, installation token, diff, review post)"
```

---

## Task 4: Implement `handleReviewJob` end-to-end

**Files:**
- Modify: `workers/review/src/handlers.ts`

**Step 1: Replace `handlers.ts` with full implementation**

```typescript
import { createControlPlaneDatabase } from '@code-reviewer/db';
import { AIGatewayClient } from '@code-reviewer/ai-gateway-client';
import { IndexingJob, ReviewJob, WorkerJob } from '@code-reviewer/shared-types';
import {
  getInstallationToken,
  getPrDiff,
  getPrFiles,
  postPrReview,
  ReviewComment,
} from './github';
import { ReviewWorkerConfig } from './config';

function nowIso(): string {
  return new Date().toISOString();
}

type HandlerConfig = {
  maxIndexFileBytes: number;
  indexChunkStrategy: 'tree-sitter';
  indexMaxChunkLines: number;
  workerConfig: ReviewWorkerConfig;
};

async function handleIndexingJob(job: IndexingJob, config: HandlerConfig): Promise<void> {
  const runId = job.payload.indexingRunId;
  console.log(
    `[worker-review] indexing repository=${job.payload.repositoryId} ` +
      `ref=${job.payload.sourceRef || 'default'} runId=${runId || 'none'}`
  );

  // Stub: mark complete immediately (tree-sitter indexing is future work)
  if (runId && config.workerConfig.cockroachDatabaseUrl) {
    const db = createControlPlaneDatabase({
      cockroachDatabaseUrl: config.workerConfig.cockroachDatabaseUrl,
    });
    await db.updateIndexingRun(runId, {
      status: 'completed',
      completedAt: nowIso(),
    });
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

  const db = createControlPlaneDatabase({ cockroachDatabaseUrl: wc.cockroachDatabaseUrl });

  // 1. Load repository to get owner/name and installationId
  const repository = await db.getRepositoryById(repositoryId);
  if (!repository) {
    throw new Error(`Repository ${repositoryId} not found in DB`);
  }

  const [owner, repoName] = repository.fullName.split('/');
  const installationId = repository.installationId;
  if (!installationId) {
    throw new Error(`Repository ${repository.fullName} has no installationId — cannot auth with GitHub`);
  }

  // 2. Get installation token
  const installToken = await getInstallationToken(
    { appId: wc.githubAppId, privateKey: wc.githubAppPrivateKey, apiBaseUrl: wc.githubApiBaseUrl },
    installationId
  );

  // 3. Fetch diff and file list in parallel
  const [diff, files] = await Promise.all([
    getPrDiff(installToken, owner, repoName, prNumber, wc.githubApiBaseUrl),
    getPrFiles(installToken, owner, repoName, prNumber, wc.githubApiBaseUrl),
  ]);

  // 4. Call AI gateway
  const gateway = new AIGatewayClient({
    baseUrl: `${wc.aiGatewayBaseUrl}/v1`,
    apiKey: wc.aiGatewayApiKey,
    model: wc.aiGatewayModel,
  });

  const reviewResult = await gateway.reviewDiff({
    diff,
    files: files.map(f => ({ path: f.filename, status: f.status as 'added' | 'modified' | 'removed' | 'renamed' })),
    context: {
      repoFullName: repository.fullName,
      prNumber,
    },
  });

  const { findings } = reviewResult;

  // 5. Write findings to DB and update run status
  const runId = reviewRunId;
  const scoreComposite = computeScore(findings);

  if (runId) {
    await Promise.all(
      findings.map(finding =>
        db.addReviewFinding({
          reviewRunId: runId,
          severity: finding.severity,
          title: finding.title,
          summary: finding.summary,
          filePath: finding.filePath,
          line: finding.line,
          confidence: finding.confidence,
        })
      )
    );

    await db.updateReviewRun(runId, {
      status: 'completed',
      scoreComposite,
      findingsCount: findings.length,
      completedAt: nowIso(),
    });
  }

  // 6. Post PR review comments
  if (findings.length > 0) {
    const comments: ReviewComment[] = findings
      .filter(f => f.filePath && f.line)
      .map(f => ({
        path: f.filePath!,
        line: f.line!,
        body: `**[${f.severity.toUpperCase()}]** ${f.title}\n\n${f.summary}`,
      }));

    const overallBody = buildOverallBody(findings, scoreComposite);

    await postPrReview(
      installToken,
      owner,
      repoName,
      prNumber,
      headSha,
      comments,
      overallBody,
      wc.githubApiBaseUrl
    );
  }

  console.log(
    `[worker-review] review completed repository=${repository.fullName} pr=${prNumber} ` +
      `findings=${findings.length} score=${scoreComposite.toFixed(2)}`
  );
}

function computeScore(findings: Array<{ severity: string }>): number {
  if (findings.length === 0) return 100;
  const weights: Record<string, number> = { critical: 20, high: 10, medium: 5, low: 2 };
  const penalty = findings.reduce((sum, f) => sum + (weights[f.severity] || 2), 0);
  return Math.max(0, 100 - penalty);
}

function buildOverallBody(findings: Array<{ severity: string; title: string }>, score: number): string {
  const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) {
    counts[f.severity] = (counts[f.severity] || 0) + 1;
  }
  const parts = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([s, n]) => `${n} ${s}`)
    .join(', ');

  return `## AI Code Review\n\n**Score:** ${score.toFixed(0)}/100 | **Findings:** ${parts || 'none'}\n\n*Automated review by CodeReviewAI*`;
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
```

**Step 2: Update `HandlerConfig` usage in `index.ts`**

The `processJobWithRetry` call needs to pass `workerConfig`:

```typescript
await handleJob(job, {
  maxIndexFileBytes: config.maxIndexFileBytes,
  indexChunkStrategy: config.indexChunkStrategy,
  indexMaxChunkLines: config.indexMaxChunkLines,
  workerConfig: config,
});
```

**Step 3: Check `updateIndexingRun` exists on `ControlPlaneDatabase` interface**

If it doesn't exist, add it to `packages/db/src/controlPlane.ts`:

```typescript
updateIndexingRun(runId: string, patch: UpdateIndexingRunPatch): Promise<IndexingJobRecord | undefined>;
```

And implement in `packages/db/src/postgresControlPlane.ts` (and `controlPlane.ts` in-memory):

```typescript
async updateIndexingRun(runId: string, patch: UpdateIndexingRunPatch): Promise<IndexingJobRecord | undefined> {
  // same pattern as updateReviewRun
}
```

**Step 4: Build everything**

```bash
npm run build:packages && npm run -w workers/review build
```

Expected: no TypeScript errors.

**Step 5: Commit**

```bash
git add workers/review/src/handlers.ts workers/review/src/index.ts packages/db/src/controlPlane.ts packages/db/src/postgresControlPlane.ts
git commit -m "feat(review-worker): implement end-to-end handleReviewJob (diff → AI → findings → PR comments)"
```

---

## Task 5: Fill wrangler.toml for the API worker

**Files:**
- Modify: `workers/api/wrangler.toml`

**Step 1: Replace the file with full configuration**

```toml
name = "code-reviewer-api"
main = "src/index.ts"
compatibility_date = "2026-02-22"
compatibility_flags = ["nodejs_compat"]

[observability]
enabled = true

# Non-secret defaults (override with wrangler secret put for sensitive values)
[vars]
APP_BASE_URL = "https://your-dashboard.vercel.app"
API_WORKER_CORS_ORIGIN = "https://your-dashboard.vercel.app"
GITHUB_API_BASE_URL = "https://api.github.com"
SESSION_TTL_HOURS = "168"
RATE_LIMIT_WINDOW_MS = "60000"
RATE_LIMIT_MAX_REQUESTS = "120"
DB_USE_IN_MEMORY = "false"

# Secrets — run these once:
# wrangler secret put COCKROACH_DATABASE_URL
# wrangler secret put GITHUB_CLIENT_ID
# wrangler secret put GITHUB_CLIENT_SECRET
# wrangler secret put GITHUB_WEBHOOK_SECRET
# wrangler secret put GITHUB_APP_ID
# wrangler secret put GITHUB_APP_PRIVATE_KEY
# wrangler secret put SESSION_SECRET
# wrangler secret put PLATFORM_ACTION_TOKEN
# wrangler secret put WORKSPACE_SECRET_ENCRYPTION_KEY
```

**Step 2: Commit**

```bash
git add workers/api/wrangler.toml
git commit -m "chore(api-worker): fill wrangler.toml with vars and secrets reference"
```

---

## Task 6: Redesign landing page

**Files:**
- Modify: `apps/landing-page/app/page.js` → rename/replace
- Modify: `apps/landing-page/app/globals.css`
- Modify: `apps/landing-page/app/layout.js`

**Step 1: Check current landing page structure**

```bash
cat apps/landing-page/app/page.js
cat apps/landing-page/app/layout.js
cat apps/landing-page/app/globals.css
cat apps/landing-page/next.config.js
```

**Step 2: Replace `apps/landing-page/app/layout.js`**

```javascript
import './globals.css';

export const metadata = {
  title: 'CodeReviewAI — Review Code 10x Faster with AI',
  description: 'Seamlessly integrate with GitHub to automate code quality checks and security scanning before you merge.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

**Step 3: Replace `apps/landing-page/app/globals.css` with dark-theme base**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #0d1117;
  --bg-card: #161b22;
  --bg-card-hover: #1c2128;
  --border: #30363d;
  --text: #e6edf3;
  --text-muted: #8b949e;
  --blue: #3b82f6;
  --blue-light: #60a5fa;
  --purple: #7c3aed;
  --green: #22c55e;
  --red: #ef4444;
}

html { scroll-behavior: smooth; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

a { color: inherit; text-decoration: none; }

/* ── Nav ───────────────────────────────── */
.nav {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  height: 64px;
  background: rgba(13, 17, 23, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
}
.nav-logo { display: flex; align-items: center; gap: 0.5rem; font-weight: 700; font-size: 1rem; }
.nav-logo-icon { width: 28px; height: 28px; background: var(--blue); border-radius: 6px; display: grid; place-items: center; font-size: 0.75rem; color: white; font-weight: 900; }
.nav-links { display: flex; gap: 2rem; }
.nav-links a { color: var(--text-muted); font-size: 0.9rem; transition: color 0.15s; }
.nav-links a:hover { color: var(--text); }
.nav-actions { display: flex; gap: 0.75rem; align-items: center; }
.btn { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.5rem 1.1rem; border-radius: 6px; font-size: 0.875rem; font-weight: 500; cursor: pointer; border: none; transition: all 0.15s; }
.btn-ghost { background: transparent; color: var(--text-muted); border: 1px solid var(--border); }
.btn-ghost:hover { color: var(--text); border-color: var(--text-muted); }
.btn-primary { background: var(--blue); color: white; }
.btn-primary:hover { background: var(--blue-light); }
.btn-secondary { background: transparent; color: var(--text); border: 1px solid var(--border); }
.btn-secondary:hover { background: var(--bg-card); }

/* ── Hero ──────────────────────────────── */
.hero {
  max-width: 1200px;
  margin: 0 auto;
  padding: 6rem 2rem 4rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
}
.hero-left {}
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.75rem;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 100px;
  font-size: 0.75rem;
  color: var(--blue-light);
  margin-bottom: 1.5rem;
}
.hero-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--blue); animation: pulse 2s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
.hero h1 { font-size: clamp(2.2rem, 5vw, 3.5rem); font-weight: 800; line-height: 1.15; letter-spacing: -0.03em; margin-bottom: 1.25rem; }
.hero-highlight { background: linear-gradient(135deg, var(--blue) 0%, var(--purple) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.hero p { color: var(--text-muted); font-size: 1.1rem; line-height: 1.75; margin-bottom: 2rem; max-width: 480px; }
.hero-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 3rem; }
.btn-lg { padding: 0.75rem 1.5rem; font-size: 1rem; border-radius: 8px; }
.trust-bar { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
.trust-label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; white-space: nowrap; }
.trust-logos { display: flex; gap: 1.5rem; }
.trust-logo { font-size: 0.875rem; font-weight: 600; color: #4a5568; letter-spacing: 0.05em; }

/* ── Editor mockup ─────────────────────── */
.editor-mock {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0,0,0,0.4);
}
.editor-titlebar { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; background: #0d1117; border-bottom: 1px solid var(--border); }
.editor-dot { width: 12px; height: 12px; border-radius: 50%; }
.editor-dot.red { background: #ff5f57; }
.editor-dot.yellow { background: #febc2e; }
.editor-dot.green { background: #28c840; }
.editor-filename { margin-left: 0.5rem; font-size: 0.75rem; color: var(--text-muted); }
.editor-body { padding: 1.25rem; font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace; font-size: 0.8rem; line-height: 1.7; }
.line { display: flex; gap: 0.75rem; }
.line-num { color: #484f58; min-width: 1.5rem; text-align: right; user-select: none; }
.line-del { color: #f85149; background: rgba(248, 81, 73, 0.08); }
.line-add { color: #3fb950; background: rgba(63, 185, 80, 0.08); }
.line-neutral { color: var(--text); }
.ai-suggestion {
  margin-top: 1rem;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  animation: fadeIn 0.6s ease-out 0.8s both;
}
@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.ai-suggestion-head { display: flex; align-items: center; gap: 0.4rem; font-size: 0.7rem; color: var(--blue-light); margin-bottom: 0.4rem; font-weight: 600; }
.ai-suggestion-body { font-size: 0.75rem; color: var(--text-muted); }

/* ── Features section ──────────────────── */
.section { max-width: 1200px; margin: 0 auto; padding: 5rem 2rem; }
.section-header { text-align: center; margin-bottom: 3.5rem; }
.section-header h2 { font-size: clamp(1.75rem, 4vw, 2.5rem); font-weight: 700; letter-spacing: -0.02em; margin-bottom: 0.75rem; }
.section-header p { color: var(--text-muted); font-size: 1rem; max-width: 560px; margin: 0 auto; line-height: 1.7; }
.feature-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
.feature-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.75rem;
  transition: border-color 0.2s, background 0.2s;
}
.feature-card:hover { border-color: rgba(59, 130, 246, 0.4); background: var(--bg-card-hover); }
.feature-icon { width: 40px; height: 40px; border-radius: 10px; display: grid; place-items: center; font-size: 1.25rem; margin-bottom: 1rem; }
.feature-card h3 { font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem; }
.feature-card p { color: var(--text-muted); font-size: 0.875rem; line-height: 1.65; }

/* ── Demo section ──────────────────────── */
.demo-section { max-width: 1200px; margin: 0 auto; padding: 5rem 2rem; }
.demo-section h2 { font-size: clamp(1.75rem, 4vw, 2.25rem); font-weight: 700; letter-spacing: -0.02em; margin-bottom: 0.75rem; }
.demo-section > p { color: var(--text-muted); margin-bottom: 3rem; }
.demo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2.5rem; }
.demo-code { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
.demo-code-header { padding: 0.75rem 1rem; background: #0d1117; border-bottom: 1px solid var(--border); font-size: 0.75rem; color: var(--text-muted); font-family: monospace; }
.demo-code-body { padding: 1.25rem; font-family: monospace; font-size: 0.8rem; line-height: 1.8; }
.demo-alert { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.25rem; text-align: center; }
.alert-icon { width: 56px; height: 56px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 50%; display: grid; place-items: center; font-size: 1.5rem; }
.alert-title { font-size: 0.875rem; font-weight: 600; color: var(--red); font-family: monospace; letter-spacing: 0.05em; }
.alert-badge { background: var(--red); color: white; font-size: 0.7rem; font-weight: 700; padding: 0.25rem 0.75rem; border-radius: 4px; letter-spacing: 0.1em; }
.demo-features { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
.demo-feature h3 { font-size: 0.9rem; font-weight: 600; margin-bottom: 0.35rem; }
.demo-feature p { color: var(--text-muted); font-size: 0.8rem; line-height: 1.6; }

/* ── Footer ────────────────────────────── */
.footer {
  border-top: 1px solid var(--border);
  padding: 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.footer-copy { font-size: 0.8rem; color: var(--text-muted); }
.footer-links { display: flex; gap: 1.25rem; }
.footer-links a { color: var(--text-muted); font-size: 0.8rem; transition: color 0.15s; }
.footer-links a:hover { color: var(--text); }

/* ── Divider ───────────────────────────── */
.divider { border: none; border-top: 1px solid var(--border); max-width: 1200px; margin: 0 auto; }

/* ── Scroll animations ─────────────────── */
.fade-up { opacity: 0; transform: translateY(24px); transition: opacity 0.55s ease, transform 0.55s ease; }
.fade-up.visible { opacity: 1; transform: none; }

/* ── Responsive ────────────────────────── */
@media (max-width: 768px) {
  .hero { grid-template-columns: 1fr; gap: 2.5rem; padding: 4rem 1.25rem 2.5rem; }
  .feature-grid { grid-template-columns: 1fr; }
  .demo-grid { grid-template-columns: 1fr; }
  .demo-features { grid-template-columns: 1fr; }
  .nav-links { display: none; }
  .footer { flex-direction: column; gap: 1rem; text-align: center; }
}
```

**Step 4: Replace `apps/landing-page/app/page.js` with full redesign**

```javascript
'use client';
import { useEffect, useRef } from 'react';

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'https://app.codereviewai.dev';

function useScrollFadeIn() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('visible'); observer.disconnect(); } },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function FeatureCard({ icon, iconBg, title, body }) {
  const ref = useScrollFadeIn();
  return (
    <div className="feature-card fade-up" ref={ref}>
      <div className="feature-icon" style={{ background: iconBg }}>{icon}</div>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}

export default function LandingPage() {
  const featuresRef = useScrollFadeIn();
  const demoRef = useScrollFadeIn();

  return (
    <>
      {/* Nav */}
      <nav className="nav">
        <div className="nav-logo">
          <div className="nav-logo-icon">CR</div>
          CodeReviewAI
        </div>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#integrations">Integrations</a>
          <a href="#pricing">Pricing</a>
        </div>
        <div className="nav-actions">
          <a href={`${DASHBOARD_URL}/login`} className="btn btn-ghost">Login</a>
          <a href={`${DASHBOARD_URL}/login`} className="btn btn-primary">Get Started</a>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-left">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            Now in public beta
          </div>
          <h1>
            Review Code <span className="hero-highlight">10x Faster</span> with AI
          </h1>
          <p>
            Seamlessly integrate with GitHub to automate code quality checks and security
            scanning before you merge. Get inline suggestions, severity scoring, and policy gates — all in your existing PR workflow.
          </p>
          <div className="hero-actions">
            <a href={`${DASHBOARD_URL}/login`} className="btn btn-primary btn-lg">Get Started for Free</a>
            <a href="#demo" className="btn btn-secondary btn-lg">▶ Watch Demo</a>
          </div>
          <div className="trust-bar">
            <span className="trust-label">Trusted by engineering teams at</span>
            <div className="trust-logos">
              <span className="trust-logo">ACME</span>
              <span className="trust-logo">Globex</span>
              <span className="trust-logo">Soylent</span>
              <span className="trust-logo">Initech</span>
            </div>
          </div>
        </div>

        {/* Editor mockup */}
        <div className="editor-mock">
          <div className="editor-titlebar">
            <span className="editor-dot red" />
            <span className="editor-dot yellow" />
            <span className="editor-dot green" />
            <span className="editor-filename">calculateTotal.ts</span>
          </div>
          <div className="editor-body">
            <div className="line line-neutral"><span className="line-num">1</span><span>function calculateTotal(items) {'{'}</span></div>
            <div className="line line-neutral"><span className="line-num">2</span><span>  let total = 0;</span></div>
            <div className="line line-del"><span className="line-num">3</span><span>- items.forEach(i {'=> total + i.price'})</span></div>
            <div className="line line-add"><span className="line-num">4</span><span>+ items.forEach(i {'=> total += i.price'})</span></div>
            <div className="line line-neutral"><span className="line-num">5</span><span>  return total;</span></div>
            <div className="line line-neutral"><span className="line-num">6</span><span>{'}'}</span></div>
            <div className="ai-suggestion">
              <div className="ai-suggestion-head">✦ AI Suggestion</div>
              <div className="ai-suggestion-body">Assignment operator missing — total is never mutated. Use += instead of +.</div>
            </div>
          </div>
        </div>
      </section>

      <hr className="divider" />

      {/* Features */}
      <section className="section" id="features">
        <div className="section-header fade-up" ref={featuresRef}>
          <h2>Why Engineering Teams Love Us</h2>
          <p>Supercharge your code review process with intelligent automation that fits right into your existing workflow.</p>
        </div>
        <div className="feature-grid">
          <FeatureCard
            icon="🧠"
            iconBg="rgba(124, 58, 237, 0.15)"
            title="AI-Powered Insights"
            body="Get instant inline code suggestions and automated refactoring tips powered by advanced LLMs trained on millions of repositories."
          />
          <FeatureCard
            icon="⚡"
            iconBg="rgba(59, 130, 246, 0.15)"
            title="Seamless Workflow"
            body="Integrates directly into your PR workflow on GitHub without adding friction. One YAML block and you're live."
          />
          <FeatureCard
            icon="🛡️"
            iconBg="rgba(34, 197, 94, 0.15)"
            title="Security First"
            body="Automated vulnerability scanning ensures your code is secure and compliant before it ever merges to main."
          />
        </div>
      </section>

      <hr className="divider" />

      {/* Demo */}
      <section className="demo-section" id="demo">
        <div className="fade-up" ref={demoRef}>
          <h2>Catch Bugs Before Production</h2>
          <p>Visualizing the impact of automated code analysis on your deployment pipeline.</p>
        </div>
        <div className="demo-grid">
          <div className="demo-code">
            <div className="demo-code-header">calculateTotal.js — changed</div>
            <div className="demo-code-body">
              <div className="line line-neutral"><span className="line-num">1</span><span>function calculateTotal(items) {'{'}</span></div>
              <div className="line line-neutral"><span className="line-num">2</span><span>  let total = 0;</span></div>
              <div className="line line-del"><span className="line-num" style={{color:'#f85149'}}>-</span><span>  items.forEach(i {'=> total + i.price'});</span></div>
              <div className="line line-add"><span className="line-num" style={{color:'#3fb950'}}>+</span><span>  items.forEach(i {'=> total += i.price'});</span></div>
              <div className="line line-neutral"><span className="line-num">5</span><span>  return total;</span></div>
              <div className="line line-neutral"><span className="line-num">6</span><span>{'}'}</span></div>
            </div>
          </div>
          <div className="demo-alert">
            <div className="alert-icon">🛡️</div>
            <div className="alert-title">CRITICAL: Logic Bug Found</div>
            <div className="alert-badge">MERGE BLOCKED</div>
          </div>
        </div>
        <div className="demo-features">
          <div className="demo-feature">
            <h3>Inline Code Suggestions</h3>
            <p>See exactly where improvements can be made directly in your diff view with one-click commit suggestions.</p>
          </div>
          <div className="demo-feature">
            <h3>Automated Security Checks</h3>
            <p>Block merges that contain critical vulnerabilities automatically, ensuring you never ship insecure code.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div className="nav-logo-icon" style={{ width: 22, height: 22, fontSize: '0.6rem' }}>CR</div>
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>CodeReviewAI</span>
        </div>
        <span className="footer-copy">© 2026 CodeReviewAI Inc. All rights reserved.</span>
        <div className="footer-links">
          <a href="#">Twitter</a>
          <a href="#">GitHub</a>
          <a href="#">Docs</a>
        </div>
      </footer>
    </>
  );
}
```

**Step 5: Verify it builds**

```bash
npm run -w apps/landing-page build
```

Expected: no errors, static export generated.

**Step 6: Commit**

```bash
git add apps/landing-page/app/
git commit -m "feat(landing): redesign with dark theme, hero mockup, feature grid, demo section"
```

---

## Task 7: Verify full build

**Step 1: Build everything**

```bash
npm run build:packages && npm run build:workers && npm run -w apps/landing-page build && npm run -w apps/dashboard build
```

Expected: all builds succeed.

**Step 2: Commit if anything was fixed**

```bash
git add -A
git commit -m "chore: full build verification"
```
