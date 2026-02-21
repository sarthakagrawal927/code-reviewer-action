export type ReviewWorkerConfig = {
  pollIntervalMs: number;
  maxIterations: number;
};

export function loadReviewWorkerConfig(): ReviewWorkerConfig {
  const pollIntervalRaw = process.env.REVIEW_WORKER_POLL_MS?.trim() || '2000';
  const maxIterationsRaw = process.env.REVIEW_WORKER_MAX_ITERATIONS?.trim() || '10';

  const pollIntervalMs = Number(pollIntervalRaw);
  const maxIterations = Number(maxIterationsRaw);

  if (!Number.isInteger(pollIntervalMs) || pollIntervalMs < 250) {
    throw new Error(`Invalid REVIEW_WORKER_POLL_MS: "${pollIntervalRaw}".`);
  }

  if (!Number.isInteger(maxIterations) || maxIterations < 1) {
    throw new Error(`Invalid REVIEW_WORKER_MAX_ITERATIONS: "${maxIterationsRaw}".`);
  }

  return {
    pollIntervalMs,
    maxIterations,
  };
}
