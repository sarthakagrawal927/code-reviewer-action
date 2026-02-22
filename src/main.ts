import * as core from '@actions/core';
import * as github from '@actions/github';

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function parseTimeoutMs(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1_000 || parsed > 120_000) {
    return 15_000;
  }

  return parsed;
}

function resolvePullRequestNumber(): number {
  const payload = github.context.payload;
  const fromPullRequest = payload.pull_request?.number;
  if (typeof fromPullRequest === 'number') {
    return fromPullRequest;
  }

  const fromIssue = github.context.issue.number;
  if (typeof fromIssue === 'number' && fromIssue > 0) {
    return fromIssue;
  }

  throw new Error('Unable to resolve pull request number from GitHub event context.');
}

function resolveHeadSha(): string | undefined {
  const payload = github.context.payload;
  const value = payload.pull_request?.head?.sha;
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

async function run() {
  try {
    const platformBaseUrl = normalizeBaseUrl(core.getInput('platform_base_url', { required: true }).trim());
    const platformToken = core.getInput('platform_token', { required: true }).trim();
    const timeoutMs = parseTimeoutMs(core.getInput('request_timeout_ms') || '15000');

    if (!platformBaseUrl.startsWith('http://') && !platformBaseUrl.startsWith('https://')) {
      throw new Error('platform_base_url must be an absolute http(s) URL.');
    }

    const repositoryFullName = process.env.GITHUB_REPOSITORY || `${github.context.repo.owner}/${github.context.repo.repo}`;
    const prNumber = resolvePullRequestNumber();
    const headSha = resolveHeadSha();
    const workflowRunId = core.getInput('workflow_run_id').trim() || process.env.GITHUB_RUN_ID || undefined;

    core.info(`Triggering review run for ${repositoryFullName}#${prNumber}...`);

    const endpoint = `${platformBaseUrl}/v1/actions/reviews/trigger`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${platformToken}`
      },
      body: JSON.stringify({
        repositoryFullName,
        prNumber,
        headSha,
        workflowRunId
      }),
      signal: AbortSignal.timeout(timeoutMs)
    });

    const raw = await response.text();
    let payload: unknown;
    try {
      payload = raw ? JSON.parse(raw) : {};
    } catch {
      payload = { raw };
    }

    if (!response.ok) {
      throw new Error(
        `Platform trigger failed with status ${response.status}. ` +
          `${isObject(payload) && typeof payload.message === 'string' ? payload.message : raw || 'No response body.'}`
      );
    }

    core.info('Platform review trigger accepted.');
    core.info(JSON.stringify(payload, null, 2));

    core.setOutput('platform_trigger_status', 'accepted');
    if (isObject(payload) && isObject(payload.run) && typeof payload.run.id === 'string') {
      core.setOutput('platform_review_run_id', payload.run.id);
    }
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : 'Unknown action execution error.');
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

void run();
