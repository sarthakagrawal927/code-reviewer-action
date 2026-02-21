export type ReviewWorkerConfig = {
  pollIntervalMs: number;
  maxIterations: number;
  maxRetries: number;
  retryBaseDelayMs: number;
  retryMaxDelayMs: number;
  maxIndexFileBytes: number;
  reviewQueueName: string;
  indexingQueueName: string;
};

export function loadReviewWorkerConfig(): ReviewWorkerConfig {
  const pollIntervalRaw = process.env.REVIEW_WORKER_POLL_MS?.trim() || '2000';
  const maxIterationsRaw = process.env.REVIEW_WORKER_MAX_ITERATIONS?.trim() || '10';
  const maxRetriesRaw = process.env.REVIEW_WORKER_MAX_RETRIES?.trim() || '3';
  const retryBaseDelayRaw = process.env.REVIEW_WORKER_RETRY_BASE_MS?.trim() || '1000';
  const retryMaxDelayRaw = process.env.REVIEW_WORKER_RETRY_MAX_MS?.trim() || '30000';
  const maxIndexFileBytesRaw = process.env.INDEX_MAX_FILE_BYTES?.trim() || `${10 * 1024 * 1024}`;
  const reviewQueueName = process.env.CF_REVIEW_QUEUE_NAME?.trim() || 'review-jobs';
  const indexingQueueName = process.env.CF_INDEXING_QUEUE_NAME?.trim() || 'indexing-jobs';

  const pollIntervalMs = Number(pollIntervalRaw);
  const maxIterations = Number(maxIterationsRaw);
  const maxRetries = Number(maxRetriesRaw);
  const retryBaseDelayMs = Number(retryBaseDelayRaw);
  const retryMaxDelayMs = Number(retryMaxDelayRaw);
  const maxIndexFileBytes = Number(maxIndexFileBytesRaw);

  if (!Number.isInteger(pollIntervalMs) || pollIntervalMs < 250) {
    throw new Error(`Invalid REVIEW_WORKER_POLL_MS: "${pollIntervalRaw}".`);
  }

  if (!Number.isInteger(maxIterations) || maxIterations < 1) {
    throw new Error(`Invalid REVIEW_WORKER_MAX_ITERATIONS: "${maxIterationsRaw}".`);
  }

  if (!Number.isInteger(maxRetries) || maxRetries < 0 || maxRetries > 10) {
    throw new Error(`Invalid REVIEW_WORKER_MAX_RETRIES: "${maxRetriesRaw}".`);
  }

  if (!Number.isInteger(retryBaseDelayMs) || retryBaseDelayMs < 50) {
    throw new Error(`Invalid REVIEW_WORKER_RETRY_BASE_MS: "${retryBaseDelayRaw}".`);
  }

  if (!Number.isInteger(retryMaxDelayMs) || retryMaxDelayMs < retryBaseDelayMs) {
    throw new Error(`Invalid REVIEW_WORKER_RETRY_MAX_MS: "${retryMaxDelayRaw}".`);
  }

  if (!Number.isInteger(maxIndexFileBytes) || maxIndexFileBytes < 1) {
    throw new Error(`Invalid INDEX_MAX_FILE_BYTES: "${maxIndexFileBytesRaw}".`);
  }

  return {
    pollIntervalMs,
    maxIterations,
    maxRetries,
    retryBaseDelayMs,
    retryMaxDelayMs,
    maxIndexFileBytes,
    reviewQueueName,
    indexingQueueName,
  };
}
